use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Clone)]
struct CacheEntry {
    data: serde_json::Value,
    expires_at: Instant,
}

#[derive(Clone)]
pub struct Cache {
    store: Arc<RwLock<HashMap<String, CacheEntry>>>,
}

impl Cache {
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &str) -> Option<serde_json::Value> {
        let store = self.store.read().await;
        if let Some(entry) = store.get(key) {
            if entry.expires_at > Instant::now() {
                return Some(entry.data.clone());
            }
        }
        None
    }

    pub async fn set(&self, key: String, data: serde_json::Value, ttl: Duration) {
        let mut store = self.store.write().await;
        store.insert(
            key,
            CacheEntry {
                data,
                expires_at: Instant::now() + ttl,
            },
        );

        // Evict expired entries periodically
        store.retain(|_, v| v.expires_at > Instant::now());
    }

    pub fn weather_key(lat: f64, lon: f64) -> String {
        format!("weather:{:.2},{:.2}", lat, lon)
    }

    pub fn forecast_key(lat: f64, lon: f64) -> String {
        format!("forecast:{:.2},{:.2}", lat, lon)
    }
}
