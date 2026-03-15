use std::pin::Pin;

use async_trait::async_trait;
use futures_core::Stream;
use uuid::Uuid;

use crate::entities::diagram::Diagram;
use crate::errors::DomainError;
use nimbus_shared::events::GenerateEvent;

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn generate(
        &self,
        prompt: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError>;

    async fn modify(
        &self,
        prompt: &str,
        existing_diagram: &Diagram,
        selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError>;
}
