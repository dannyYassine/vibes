use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::node::Node;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct AddDiagramNode {
    repo: Arc<dyn DiagramRepository>,
}

impl AddDiagramNode {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, diagram_id: Uuid, node: Node) -> Result<Node, DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        if diagram.nodes.iter().any(|n| n.id == node.id) {
            return Err(DomainError::Validation(format!(
                "Node with id {} already exists",
                node.id
            )));
        }

        let added = node.clone();
        diagram.nodes.push(node);
        self.repo.update(diagram_id, &diagram).await?;
        Ok(added)
    }
}
