use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::diagram::{Diagram, Viewport};
use nimbus_domain::entities::edge::Edge;
use nimbus_domain::entities::node::Node;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct UpdateDiagramInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<Node>>,
    pub edges: Option<Vec<Edge>>,
    pub viewport: Option<Viewport>,
}

#[derive(Clone)]
pub struct UpdateDiagram {
    repo: Arc<dyn DiagramRepository>,
}

impl UpdateDiagram {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid, input: UpdateDiagramInput) -> Result<Diagram, DomainError> {
        let mut diagram = self.repo.get(id).await?;

        if let Some(ref name) = input.name {
            if name.trim().is_empty() {
                return Err(DomainError::Validation("Diagram name cannot be empty".into()));
            }
            diagram.name = name.clone();
        }

        if let Some(description) = input.description {
            diagram.description = Some(description);
        }

        if let Some(nodes) = input.nodes {
            diagram.nodes = nodes;
        }

        if let Some(edges) = input.edges {
            diagram.edges = edges;
        }

        if let Some(viewport) = input.viewport {
            diagram.viewport = viewport;
        }

        self.repo.update(id, &diagram).await
    }
}
