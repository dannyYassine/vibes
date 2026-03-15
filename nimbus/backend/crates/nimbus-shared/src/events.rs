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
