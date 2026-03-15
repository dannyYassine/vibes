use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct GetDiagram {
    repo: Arc<dyn DiagramRepository>,
}

impl GetDiagram {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<Diagram, DomainError> {
        self.repo.get(id).await
    }
}
