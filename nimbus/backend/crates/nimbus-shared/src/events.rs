use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateEvent {
    pub event_type: GenerateEventType,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GenerateEventType {
    NodeAdded,
    EdgeAdded,
    NodeRemoved,
    NodeUpdated,
    EdgeRemoved,
    LayoutUpdated,
    Complete,
    Error,
}

impl GenerateEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            GenerateEventType::NodeAdded => "node_added",
            GenerateEventType::EdgeAdded => "edge_added",
            GenerateEventType::NodeRemoved => "node_removed",
            GenerateEventType::NodeUpdated => "node_updated",
            GenerateEventType::EdgeRemoved => "edge_removed",
            GenerateEventType::LayoutUpdated => "layout_updated",
            GenerateEventType::Complete => "complete",
            GenerateEventType::Error => "error",
        }
    }
}
