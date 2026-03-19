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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diagram_json_round_trip() {
        let diagram = Diagram {
            id: Uuid::new_v4(),
            name: "My Arch".to_string(),
            description: Some("desc".to_string()),
            nodes: vec![],
            edges: vec![],
            viewport: Viewport { x: 10.0, y: 20.0, zoom: 1.5 },
            active_provider: Some(CloudProvider::Aws),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let json = serde_json::to_string(&diagram).unwrap();
        // Verify camelCase
        assert!(json.contains("activeProvider"));
        assert!(json.contains("createdAt"));
        assert!(!json.contains("active_provider"));

        let deserialized: Diagram = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "My Arch");
        assert_eq!(deserialized.active_provider, Some(CloudProvider::Aws));
    }

    #[test]
    fn cloud_provider_serialization() {
        assert_eq!(serde_json::to_string(&CloudProvider::Aws).unwrap(), "\"Aws\"");
        assert_eq!(serde_json::to_string(&CloudProvider::Gcp).unwrap(), "\"Gcp\"");
        assert_eq!(serde_json::to_string(&CloudProvider::Azure).unwrap(), "\"Azure\"");

        let aws: CloudProvider = serde_json::from_str("\"Aws\"").unwrap();
        assert_eq!(aws, CloudProvider::Aws);
    }
}
