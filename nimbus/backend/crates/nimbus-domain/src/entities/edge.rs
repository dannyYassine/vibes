use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Edge {
    pub id: Uuid,
    pub source_id: Uuid,
    pub target_id: Uuid,
    pub edge_type: EdgeType,
    pub label: Option<String>,
    pub properties: EdgeProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeType {
    Synchronous,
    Asynchronous,
    DataFlow,
    Dependency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeProperties {
    pub protocol: Option<String>,
    pub port: Option<u16>,
    pub bidirectional: bool,
    pub communication_pattern: Option<CommunicationPattern>,
    pub style: Option<EdgeStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommunicationPattern {
    RequestResponse,
    FireAndForget,
    PublishSubscribe,
    Streaming,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeStyle {
    pub color: Option<String>,
    pub dash_pattern: Option<Vec<f64>>,
    pub thickness: Option<f64>,
}
