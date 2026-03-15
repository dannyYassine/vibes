use async_trait::async_trait;
use uuid::Uuid;

use crate::entities::diagram::{Diagram, DiagramListItem};
use crate::errors::DomainError;

#[async_trait]
pub trait DiagramRepository: Send + Sync {
    async fn list(&self) -> Result<Vec<DiagramListItem>, DomainError>;
    async fn get(&self, id: Uuid) -> Result<Diagram, DomainError>;
    async fn create(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError>;
    async fn update(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
}
