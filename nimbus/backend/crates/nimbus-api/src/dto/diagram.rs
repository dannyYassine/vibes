use serde::Deserialize;

use uuid::Uuid;

use nimbus_domain::entities::diagram::Viewport;
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
