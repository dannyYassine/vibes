use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::edge::{Edge, EdgeProperties, EdgeType};
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct PatchEdgeInput {
    pub edge_type: Option<EdgeType>,
    pub label: Option<Option<String>>,
    pub properties: Option<EdgeProperties>,
}

#[derive(Clone)]
pub struct PatchDiagramEdge {
    repo: Arc<dyn DiagramRepository>,
}

impl PatchDiagramEdge {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(
        &self,
        diagram_id: Uuid,
        edge_id: Uuid,
        input: PatchEdgeInput,
    ) -> Result<Edge, DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        let edge = diagram
            .edges
            .iter_mut()
            .find(|e| e.id == edge_id)
            .ok_or_else(|| DomainError::NotFound(format!("Edge {} not found", edge_id)))?;

        if let Some(edge_type) = input.edge_type {
            edge.edge_type = edge_type;
        }
        if let Some(label) = input.label {
            edge.label = label;
        }
        if let Some(properties) = input.properties {
            edge.properties = properties;
        }

        let patched = edge.clone();
        self.repo.update(diagram_id, &diagram).await?;
        Ok(patched)
    }
}
