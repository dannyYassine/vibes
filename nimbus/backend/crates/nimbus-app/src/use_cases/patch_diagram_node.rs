use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::node::{Node, NodeProperties, NodeType, Position, Size};
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct PatchNodeInput {
    pub label: Option<String>,
    pub node_type: Option<NodeType>,
    pub position: Option<Position>,
    pub size: Option<Size>,
    pub properties: Option<NodeProperties>,
    pub parent_id: Option<Option<Uuid>>,
}

#[derive(Clone)]
pub struct PatchDiagramNode {
    repo: Arc<dyn DiagramRepository>,
}

impl PatchDiagramNode {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(
        &self,
        diagram_id: Uuid,
        node_id: Uuid,
        input: PatchNodeInput,
    ) -> Result<Node, DomainError> {
        let mut diagram = self.repo.get(diagram_id).await?;

        let node = diagram
            .nodes
            .iter_mut()
            .find(|n| n.id == node_id)
            .ok_or_else(|| DomainError::NotFound(format!("Node {} not found", node_id)))?;

        if let Some(label) = input.label {
            node.label = label;
        }
        if let Some(node_type) = input.node_type {
            node.node_type = node_type;
        }
        if let Some(position) = input.position {
            node.position = position;
        }
        if let Some(size) = input.size {
            node.size = size;
        }
        if let Some(properties) = input.properties {
            node.properties = properties;
        }
        if let Some(parent_id) = input.parent_id {
            node.parent_id = parent_id;
        }

        let patched = node.clone();
        self.repo.update(diagram_id, &diagram).await?;
        Ok(patched)
    }
}
