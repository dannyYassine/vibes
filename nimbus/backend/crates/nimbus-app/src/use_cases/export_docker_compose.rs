use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::docker_compose_service::DockerComposeService;

#[derive(Clone)]
pub struct ExportDockerCompose {
    repo: Arc<dyn DiagramRepository>,
}

impl ExportDockerCompose {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<String, DomainError> {
        let diagram = self.repo.get(id).await?;
        DockerComposeService::generate(&diagram)
    }
}
