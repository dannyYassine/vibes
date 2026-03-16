use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct DeleteDiagramEdge {
    repo: Arc<dyn DiagramRepository>,
}

impl DeleteDiagramEdge {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, diagram_id: Uuid, edge_id: Uuid) -> Result<(), DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        let existed = diagram.edges.iter().any(|e| e.id == edge_id);
        if !existed {
            return Err(DomainError::NotFound(format!(
                "Edge {} not found",
                edge_id
            )));
        }

        diagram.edges.retain(|e| e.id != edge_id);
        self.repo.update(diagram_id, &diagram).await?;
        Ok(())
    }
}
