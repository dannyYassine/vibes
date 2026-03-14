use crate::docker::{ContainerStats, DockerClient};
use anyhow::{Context, Result};
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    fs,
};

const HISTORY_LEN: usize = 60;

#[derive(Debug, Deserialize)]
struct ComposeFile {
    services: HashMap<String, serde_yaml::Value>,
}

#[derive(Default)]
pub struct ContainerHistory {
    pub cpu: VecDeque<f64>,
    pub mem: VecDeque<f64>,
    pub net_rx_rate: VecDeque<f64>,
    pub net_tx_rate: VecDeque<f64>,
    pub disk_read_rate: VecDeque<f64>,
    pub disk_write_rate: VecDeque<f64>,
    prev_net_rx: Option<u64>,
    prev_net_tx: Option<u64>,
    prev_disk_read: Option<u64>,
    prev_disk_write: Option<u64>,
}

impl ContainerHistory {
    fn push(deque: &mut VecDeque<f64>, v: f64) {
        if deque.len() >= HISTORY_LEN {
            deque.pop_front();
        }
        deque.push_back(v);
    }

    fn record(&mut self, stats: &ContainerStats, tick_secs: f64) {
        Self::push(&mut self.cpu, stats.cpu_percent);
        Self::push(&mut self.mem, stats.mem_percent());

        let rx_rate = self.prev_net_rx.map_or(0.0, |prev| {
            stats.net_rx.saturating_sub(prev) as f64 / tick_secs
        });
        let tx_rate = self.prev_net_tx.map_or(0.0, |prev| {
            stats.net_tx.saturating_sub(prev) as f64 / tick_secs
        });
        Self::push(&mut self.net_rx_rate, rx_rate);
        Self::push(&mut self.net_tx_rate, tx_rate);
        self.prev_net_rx = Some(stats.net_rx);
        self.prev_net_tx = Some(stats.net_tx);

        let dr_rate = self.prev_disk_read.map_or(0.0, |prev| {
            stats.block_read.saturating_sub(prev) as f64 / tick_secs
        });
        let dw_rate = self.prev_disk_write.map_or(0.0, |prev| {
            stats.block_write.saturating_sub(prev) as f64 / tick_secs
        });
        Self::push(&mut self.disk_read_rate, dr_rate);
        Self::push(&mut self.disk_write_rate, dw_rate);
        self.prev_disk_read = Some(stats.block_read);
        self.prev_disk_write = Some(stats.block_write);
    }

    fn repeat_last(&mut self) {
        let cpu = self.cpu.back().copied().unwrap_or(0.0);
        let mem = self.mem.back().copied().unwrap_or(0.0);
        let nrx = self.net_rx_rate.back().copied().unwrap_or(0.0);
        let ntx = self.net_tx_rate.back().copied().unwrap_or(0.0);
        let dr = self.disk_read_rate.back().copied().unwrap_or(0.0);
        let dw = self.disk_write_rate.back().copied().unwrap_or(0.0);
        Self::push(&mut self.cpu, cpu);
        Self::push(&mut self.mem, mem);
        Self::push(&mut self.net_rx_rate, nrx);
        Self::push(&mut self.net_tx_rate, ntx);
        Self::push(&mut self.disk_read_rate, dr);
        Self::push(&mut self.disk_write_rate, dw);
    }

    pub fn indexed(deque: &VecDeque<f64>) -> Vec<(f64, f64)> {
        deque
            .iter()
            .enumerate()
            .map(|(i, &v)| (i as f64, v))
            .collect()
    }
}

pub struct App {
    pub title: String,
    pub containers: Vec<ContainerStats>,
    pub history: HashMap<String, ContainerHistory>,
    pub selected: usize,
    pub error: Option<String>,
    pub tick_secs: f64,
    client: DockerClient,
    service_names: Vec<String>,
    known_containers: Vec<(String, String)>,
}

impl App {
    pub async fn new(compose_file: &str, tick_secs: f64) -> Result<Self> {
        let client = DockerClient::new().context("Failed to connect to Docker socket")?;

        let (title, service_names) = match fs::read_to_string(compose_file) {
            Ok(content) => match serde_yaml::from_str::<ComposeFile>(&content) {
                Ok(parsed) => {
                    let names: Vec<String> = parsed.services.keys().cloned().collect();
                    (compose_file.to_string(), names)
                }
                Err(e) => {
                    eprintln!("Warning: could not parse compose file: {e}");
                    (compose_file.to_string(), vec![])
                }
            },
            Err(_) => ("All containers".to_string(), vec![]),
        };

        let known_containers = client
            .containers_for_services(&service_names)
            .await
            .context("Failed to list containers (is Docker running?)")?;

        let mut app = Self {
            title,
            containers: vec![],
            history: HashMap::new(),
            selected: 0,
            error: None,
            tick_secs,
            client,
            service_names,
            known_containers,
        };

        // Start background streaming tasks
        app.client.ensure_streams(&app.known_containers);

        // Give streams a moment to populate the cache
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;

        let containers = app.client.read_stats(&app.known_containers);
        app.record_history(&containers);
        app.containers = containers;
        Ok(app)
    }

    pub async fn refresh(&mut self) {
        // Re-discover containers (handles starts/stops)
        match self
            .client
            .containers_for_services(&self.service_names)
            .await
        {
            Ok(discovered) => {
                self.known_containers = discovered;
                self.client.ensure_streams(&self.known_containers);

                let containers = self.client.read_stats(&self.known_containers);
                self.record_history(&containers);
                self.containers = containers;
                self.error = None;
            }
            Err(e) => {
                self.error = Some(format!("Docker error: {e}"));
            }
        }

        if !self.containers.is_empty() && self.selected >= self.containers.len() {
            self.selected = self.containers.len() - 1;
        }
    }

    fn record_history(&mut self, containers: &[ContainerStats]) {
        let returned: HashSet<&str> = containers.iter().map(|c| c.name.as_str()).collect();

        for c in containers {
            let h = self.history.entry(c.name.clone()).or_default();
            h.record(c, self.tick_secs);
        }

        for (_, name) in &self.known_containers {
            if !returned.contains(name.as_str()) {
                if let Some(h) = self.history.get_mut(name) {
                    h.repeat_last();
                }
            }
        }
    }

    pub fn selected_container(&self) -> Option<&ContainerStats> {
        self.containers.get(self.selected)
    }

    pub fn selected_history(&self) -> Option<&ContainerHistory> {
        self.selected_container()
            .and_then(|c| self.history.get(&c.name))
    }

    pub fn next(&mut self) {
        if !self.containers.is_empty() {
            self.selected = (self.selected + 1) % self.containers.len();
        }
    }

    pub fn previous(&mut self) {
        if !self.containers.is_empty() {
            if self.selected == 0 {
                self.selected = self.containers.len() - 1;
            } else {
                self.selected -= 1;
            }
        }
    }
}
