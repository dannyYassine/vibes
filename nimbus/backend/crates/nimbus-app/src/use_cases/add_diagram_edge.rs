use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::edge::Edge;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct AddDiagramEdge {
    repo: Arc<dyn DiagramRepository>,
}

impl AddDiagramEdge {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, diagram_id: Uuid, edge: Edge) -> Result<Edge, DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        if diagram.edges.iter().any(|e| e.id == edge.id) {
            return Err(DomainError::Validation(format!(
                "Edge with id {} already exists",
                edge.id
            )));
        }

        // Verify source and target nodes exist
        if !diagram.nodes.iter().any(|n| n.id == edge.source_id) {
            return Err(DomainError::Validation(format!(
                "Source node {} not found",
                edge.source_id
            )));
        }
        if !diagram.nodes.iter().any(|n| n.id == edge.target_id) {
            return Err(DomainError::Validation(format!(
                "Target node {} not found",
                edge.target_id
            )));
        }

        let added = edge.clone();
        diagram.edges.push(edge);
        self.repo.update(diagram_id, &diagram).await?;
        Ok(added)
    }
}
