use std::sync::Arc;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct CreateDiagram {
    repo: Arc<dyn DiagramRepository>,
}

impl CreateDiagram {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::Validation("Diagram name cannot be empty".into()));
        }

        self.repo.create(name, description).await
    }
}
