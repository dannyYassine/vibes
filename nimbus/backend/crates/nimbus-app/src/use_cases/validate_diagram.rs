use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::validation::ValidationResult;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::validation_service::ValidationService;

#[derive(Clone)]
pub struct ValidateDiagram {
    repo: Arc<dyn DiagramRepository>,
}

impl ValidateDiagram {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<ValidationResult, DomainError> {
        let diagram = self.repo.get(id).await?;
        Ok(ValidationService::validate(&diagram))
    }
}
