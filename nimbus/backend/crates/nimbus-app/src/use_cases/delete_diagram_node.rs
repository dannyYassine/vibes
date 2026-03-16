use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct DeleteDiagramNode {
    repo: Arc<dyn DiagramRepository>,
}

impl DeleteDiagramNode {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, diagram_id: Uuid, node_id: Uuid) -> Result<(), DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        let existed = diagram.nodes.iter().any(|n| n.id == node_id);
        if !existed {
            return Err(DomainError::NotFound(format!(
                "Node {} not found",
                node_id
            )));
        }

        diagram.nodes.retain(|n| n.id != node_id);
        // Remove edges connected to this node
        diagram
            .edges
            .retain(|e| e.source_id != node_id && e.target_id != node_id);

        self.repo.update(diagram_id, &diagram).await?;
        Ok(())
    }
}
