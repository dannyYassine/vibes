use chrono::Utc;
use uuid::Uuid;

use crate::entities::diagram::{Diagram, Viewport};
use crate::entities::edge::{Edge, EdgeProperties, EdgeType};
use crate::entities::node::{Node, NodeProperties, NodeType, Position, Size};

pub fn make_node(node_type: NodeType, label: &str) -> Node {
    Node {
        id: Uuid::new_v4(),
        node_type,
        label: label.to_string(),
        position: Position { x: 0.0, y: 0.0 },
        size: Size { width: 180.0, height: 48.0 },
        properties: NodeProperties {
            config: serde_json::json!({}),
            style: None,
        },
        parent_id: None,
        provider_mappings: None,
    }
}

pub fn make_edge(source: Uuid, target: Uuid, edge_type: EdgeType) -> Edge {
    Edge {
        id: Uuid::new_v4(),
        source_id: source,
        target_id: target,
        edge_type,
        label: None,
        properties: EdgeProperties {
            protocol: None,
            port: None,
            bidirectional: false,
            communication_pattern: None,
            style: None,
        },
    }
}

pub fn make_diagram(nodes: Vec<Node>, edges: Vec<Edge>) -> Diagram {
    Diagram {
        id: Uuid::new_v4(),
        name: "Test Diagram".to_string(),
        description: None,
        nodes,
        edges,
        viewport: Viewport { x: 0.0, y: 0.0, zoom: 1.0 },
        active_provider: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}
