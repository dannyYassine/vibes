use std::sync::Arc;

use uuid::Uuid;

use nimbus_domain::entities::diagram::{CloudProvider, Diagram};
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::translation_service::TranslationService;

#[derive(Clone)]
pub struct TranslateDiagram {
    repo: Arc<dyn DiagramRepository>,
}

impl TranslateDiagram {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute_translate(
        &self,
        id: Uuid,
        provider: CloudProvider,
    ) -> Result<Diagram, DomainError> {
        let diagram = self.repo.get(id).await?;
        let translated = TranslationService::translate(&diagram, provider);
        self.repo.update(id, &translated).await
    }

    pub async fn execute_clear(&self, id: Uuid) -> Result<Diagram, DomainError> {
        let diagram = self.repo.get(id).await?;
        let cleared = TranslationService::clear_translation(&diagram);
        self.repo.update(id, &cleared).await
    }
}
