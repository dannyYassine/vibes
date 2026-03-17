use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::edge::Edge;
use super::node::Node;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagram {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub viewport: Viewport,
    pub active_provider: Option<CloudProvider>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CloudProvider {
    Aws,
    Gcp,
    Azure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagramListItem {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub node_count: i64,
    pub active_provider: Option<CloudProvider>,
    pub updated_at: DateTime<Utc>,
}
