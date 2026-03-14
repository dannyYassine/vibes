use crate::docker::{ContainerStats, DockerClient};
use anyhow::{Context, Result};
use serde::Deserialize;
use std::{collections::{HashMap, VecDeque}, fs};

const HISTORY_LEN: usize = 60; // 60 points × 2s = 2 min window

#[derive(Debug, Deserialize)]
struct ComposeFile {
    services: HashMap<String, serde_yaml::Value>,
}

#[derive(Default)]
pub struct ContainerHistory {
    pub cpu: VecDeque<f64>,
    pub mem: VecDeque<f64>,
}

impl ContainerHistory {
    fn push_cpu(&mut self, v: f64) {
        if self.cpu.len() >= HISTORY_LEN {
            self.cpu.pop_front();
        }
        self.cpu.push_back(v);
    }

    fn push_mem(&mut self, v: f64) {
        if self.mem.len() >= HISTORY_LEN {
            self.mem.pop_front();
        }
        self.mem.push_back(v);
    }

    pub fn cpu_data(&self) -> Vec<(f64, f64)> {
        self.cpu
            .iter()
            .enumerate()
            .map(|(i, &v)| (i as f64, v))
            .collect()
    }

    pub fn mem_data(&self) -> Vec<(f64, f64)> {
        self.mem
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
    client: DockerClient,
    service_names: Vec<String>,
    known_containers: Vec<(String, String)>,
}

impl App {
    pub async fn new(compose_file: &str) -> Result<Self> {
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
        let containers = client.fetch_stats(&known_containers).await;

        let mut app = Self {
            title,
            containers: vec![],
            history: HashMap::new(),
            selected: 0,
            error: None,
            client,
            service_names,
            known_containers,
        };

        app.record_history(&containers);
        app.containers = containers;
        Ok(app)
    }

    pub async fn refresh(&mut self) {
        match self.client.containers_for_services(&self.service_names).await {
            Ok(discovered) => {
                self.known_containers = discovered;
                let containers = self.client.fetch_stats(&self.known_containers).await;
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
        // Record new data points for containers that returned stats
        for c in containers {
            let h = self.history.entry(c.name.clone()).or_default();
            h.push_cpu(c.cpu_percent);
            h.push_mem(c.mem_percent());
        }

        // For known containers that didn't return stats this tick,
        // repeat the last value to prevent gaps in the chart line.
        let returned: std::collections::HashSet<&str> =
            containers.iter().map(|c| c.name.as_str()).collect();
        for (_, name) in &self.known_containers {
            if !returned.contains(name.as_str()) {
                if let Some(h) = self.history.get_mut(name) {
                    let last_cpu = h.cpu.back().copied().unwrap_or(0.0);
                    let last_mem = h.mem.back().copied().unwrap_or(0.0);
                    h.push_cpu(last_cpu);
                    h.push_mem(last_mem);
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
        if self.containers.is_empty() {
            return;
        }
        self.selected = (self.selected + 1) % self.containers.len();
    }

    pub fn previous(&mut self) {
        if self.containers.is_empty() {
            return;
        }
        if self.selected == 0 {
            self.selected = self.containers.len() - 1;
        } else {
            self.selected -= 1;
        }
    }
}
