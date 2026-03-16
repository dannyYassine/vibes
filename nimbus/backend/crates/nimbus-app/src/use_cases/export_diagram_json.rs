use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct ExportDiagramJson {
    repo: Arc<dyn DiagramRepository>,
}

impl ExportDiagramJson {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<Diagram, DomainError> {
        self.repo.get(id).await
    }
}
