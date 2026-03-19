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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edge_type_serialization() {
        let types = vec![
            (EdgeType::Synchronous, "\"Synchronous\""),
            (EdgeType::Asynchronous, "\"Asynchronous\""),
            (EdgeType::DataFlow, "\"DataFlow\""),
            (EdgeType::Dependency, "\"Dependency\""),
        ];
        for (et, expected) in types {
            assert_eq!(serde_json::to_string(&et).unwrap(), expected);
        }
    }

    #[test]
    fn edge_json_round_trip() {
        let edge = Edge {
            id: Uuid::new_v4(),
            source_id: Uuid::new_v4(),
            target_id: Uuid::new_v4(),
            edge_type: EdgeType::Synchronous,
            label: Some("HTTP".to_string()),
            properties: EdgeProperties {
                protocol: Some("HTTPS".to_string()),
                port: Some(443),
                bidirectional: false,
                communication_pattern: Some(CommunicationPattern::RequestResponse),
                style: Some(EdgeStyle {
                    color: Some("#00ff00".to_string()),
                    dash_pattern: Some(vec![5.0, 3.0]),
                    thickness: Some(2.0),
                }),
            },
        };

        let json = serde_json::to_string(&edge).unwrap();
        assert!(json.contains("sourceId"));
        assert!(json.contains("edgeType"));

        let deserialized: Edge = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.label, Some("HTTP".to_string()));
        assert_eq!(deserialized.properties.port, Some(443));
        assert!(matches!(deserialized.edge_type, EdgeType::Synchronous));
    }
}
