use anyhow::Result;
use bollard::{
    container::{ListContainersOptions, MemoryStatsStats, StatsOptions},
    Docker, API_DEFAULT_VERSION,
};
use futures_util::{future, StreamExt};
use std::path::Path;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ContainerStats {
    pub id: String,
    pub name: String,
    pub status: String,
    pub cpu_percent: f64,
    pub mem_usage: u64,
    pub mem_limit: u64,
    pub net_rx: u64,
    pub net_tx: u64,
    pub block_read: u64,
    pub block_write: u64,
}

impl ContainerStats {
    pub fn mem_percent(&self) -> f64 {
        if self.mem_limit == 0 {
            return 0.0;
        }
        (self.mem_usage as f64 / self.mem_limit as f64) * 100.0
    }
}

fn connect() -> Result<Docker> {
    if std::env::var("DOCKER_HOST").is_ok() {
        return Ok(Docker::connect_with_local_defaults()?);
    }

    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        format!("{home}/.orbstack/run/docker.sock"),
        format!("{home}/.docker/run/docker.sock"),
        "/var/run/docker.sock".to_string(),
        format!("{home}/.docker/desktop/docker.sock"),
    ];

    for path in &candidates {
        if Path::new(path).exists() {
            return Ok(Docker::connect_with_unix(path, 120, API_DEFAULT_VERSION)?);
        }
    }

    anyhow::bail!(
        "Could not find Docker socket. Tried: {}. \
         Set DOCKER_HOST or ensure Docker Desktop is running.",
        candidates.join(", ")
    )
}

pub struct DockerClient {
    docker: Docker,
}

impl DockerClient {
    pub fn new() -> Result<Self> {
        let docker = connect()?;
        Ok(Self { docker })
    }

    pub async fn containers_for_services(
        &self,
        services: &[String],
    ) -> Result<Vec<(String, String)>> {
        let options = ListContainersOptions::<String> {
            all: false,
            ..Default::default()
        };
        let containers = self.docker.list_containers(Some(options)).await?;

        let mut result = Vec::new();
        for c in containers {
            let names = c.names.unwrap_or_default();
            let id = c.id.unwrap_or_default();

            for raw_name in &names {
                let name = raw_name.trim_start_matches('/').to_string();
                let matches = services.is_empty()
                    || services.iter().any(|svc| name.contains(svc.as_str()));
                if matches {
                    result.push((id.clone(), name));
                    break;
                }
            }
        }

        Ok(result)
    }

    /// Fetch stats for all containers in parallel.
    pub async fn fetch_stats(&self, containers: &[(String, String)]) -> Vec<ContainerStats> {
        let futs = containers
            .iter()
            .map(|(id, name)| self.fetch_single_stats(id, name));

        future::join_all(futs)
            .await
            .into_iter()
            .filter_map(|r| r.ok())
            .collect()
    }

    async fn fetch_single_stats(&self, id: &str, name: &str) -> Result<ContainerStats> {
        // stream=false + one_shot=false: Docker waits for two internal readings (~1s)
        // and returns the delta — this is how `docker stats --no-stream` computes CPU%.
        let options = StatsOptions {
            stream: false,
            one_shot: false,
        };

        let mut stream = self.docker.stats(id, Some(options));
        let raw = stream
            .next()
            .await
            .ok_or_else(|| anyhow::anyhow!("no stats"))??;

        // CPU %
        let cpu_delta = raw
            .cpu_stats
            .cpu_usage
            .total_usage
            .saturating_sub(raw.precpu_stats.cpu_usage.total_usage);
        let system_delta = raw
            .cpu_stats
            .system_cpu_usage
            .unwrap_or(0)
            .saturating_sub(raw.precpu_stats.system_cpu_usage.unwrap_or(0));
        let num_cpus = raw.cpu_stats.online_cpus.unwrap_or(1) as f64;
        let cpu_percent = if system_delta > 0 {
            (cpu_delta as f64 / system_delta as f64) * num_cpus * 100.0
        } else {
            0.0
        };

        // Memory
        let mem_stats = &raw.memory_stats;
        let cache = mem_stats
            .stats
            .as_ref()
            .map(|s| match s {
                MemoryStatsStats::V1(v1) => v1.cache,
                MemoryStatsStats::V2(_) => 0,
            })
            .unwrap_or(0);
        let mem_usage = mem_stats.usage.unwrap_or(0).saturating_sub(cache);
        let mem_limit = mem_stats.limit.unwrap_or(0);

        // Network I/O
        let (net_rx, net_tx) = raw
            .networks
            .as_ref()
            .map(|nets| {
                nets.values()
                    .fold((0u64, 0u64), |(rx, tx), n| (rx + n.rx_bytes, tx + n.tx_bytes))
            })
            .unwrap_or((0, 0));

        // Block I/O
        let (block_read, block_write) = raw
            .blkio_stats
            .io_service_bytes_recursive
            .as_deref()
            .map(|entries| {
                entries.iter().fold((0u64, 0u64), |(r, w), e| {
                    match e.op.to_lowercase().as_str() {
                        "read" => (r + e.value, w),
                        "write" => (r, w + e.value),
                        _ => (r, w),
                    }
                })
            })
            .unwrap_or((0, 0));

        let inspect = self.docker.inspect_container(id, None).await;
        let status = inspect
            .ok()
            .and_then(|i| i.state)
            .and_then(|s| s.status)
            .map(|s| format!("{s:?}"))
            .unwrap_or_else(|| "running".to_string());

        Ok(ContainerStats {
            id: id.to_string(),
            name: name.to_string(),
            status,
            cpu_percent,
            mem_usage,
            mem_limit,
            net_rx,
            net_tx,
            block_read,
            block_write,
        })
    }
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{bytes} B")
    }
}
