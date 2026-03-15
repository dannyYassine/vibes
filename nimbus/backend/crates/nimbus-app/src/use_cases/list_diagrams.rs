use std::sync::Arc;

use nimbus_domain::entities::diagram::DiagramListItem;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

#[derive(Clone)]
pub struct ListDiagrams {
    repo: Arc<dyn DiagramRepository>,
}

impl ListDiagrams {
    pub fn new(repo: Arc<dyn DiagramRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self) -> Result<Vec<DiagramListItem>, DomainError> {
        self.repo.list().await
    }
}
