use serde::Deserialize;

use uuid::Uuid;

use nimbus_domain::entities::diagram::{CloudProvider, Viewport};
use nimbus_domain::entities::edge::Edge;
use nimbus_domain::entities::node::Node;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiagramRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateDiagramRequest {
    pub prompt: String,
    pub existing_diagram_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModifyDiagramRequest {
    pub prompt: String,
    #[serde(default)]
    pub selected_node_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixDiagramRequest {
    pub warning_id: String,
    pub rule: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDiagramRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<Node>>,
    pub edges: Option<Vec<Edge>>,
    pub viewport: Option<Viewport>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddNodeRequest {
    pub node: Node,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchNodeRequest {
    pub label: Option<String>,
    pub node_type: Option<nimbus_domain::entities::node::NodeType>,
    pub position: Option<nimbus_domain::entities::node::Position>,
    pub size: Option<nimbus_domain::entities::node::Size>,
    pub properties: Option<nimbus_domain::entities::node::NodeProperties>,
    pub parent_id: Option<Option<uuid::Uuid>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddEdgeRequest {
    pub edge: Edge,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchEdgeRequest {
    pub edge_type: Option<nimbus_domain::entities::edge::EdgeType>,
    pub label: Option<Option<String>>,
    pub properties: Option<nimbus_domain::entities::edge::EdgeProperties>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequest {
    pub provider: CloudProvider,
}
