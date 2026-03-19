use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::terraform_service::{TerraformFiles, TerraformService};

#[derive(Clone)]
pub struct ExportTerraform {
    repo: Arc<dyn DiagramRepository>,
}

impl ExportTerraform {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<TerraformFiles, DomainError> {
        let diagram = self.repo.get(id).await?;
        TerraformService::generate(&diagram)
    }
}
