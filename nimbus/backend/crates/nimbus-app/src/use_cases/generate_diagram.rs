use std::sync::Arc;

use futures_util::StreamExt;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::layout_service::LayoutService;
use nimbus_shared::events::GenerateEventType;

#[derive(Clone)]
pub struct GenerateDiagram {
    ai_provider: Arc<dyn AiProvider>,
    repo: Arc<dyn DiagramRepository>,
}

impl GenerateDiagram {
    pub fn new(ai_provider: Arc<dyn AiProvider>, repo: Arc<dyn DiagramRepository>) -> Self {
        Self { ai_provider, repo }
    }

    pub async fn execute(&self, prompt: &str) -> Result<Diagram, DomainError> {
        if prompt.trim().is_empty() {
            return Err(DomainError::Validation("Prompt cannot be empty".into()));
        }

        // Generate via AI
        let stream = self.ai_provider.generate(prompt).await?;
        let events: Vec<_> = stream.collect().await;

        // Find Complete event
        let complete_event = events
            .iter()
            .find(|e| matches!(e.event_type, GenerateEventType::Complete))
            .ok_or_else(|| DomainError::AiError("No Complete event received from AI".into()))?;

        // Extract data from Complete event
        let name: String = complete_event
            .data
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Diagram")
            .to_string();

        let description: Option<String> = complete_event
            .data
            .get("description")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let mut nodes: Vec<nimbus_domain::entities::node::Node> = serde_json::from_value(
            complete_event
                .data
                .get("nodes")
                .cloned()
                .unwrap_or(serde_json::Value::Array(vec![])),
        )
        .map_err(|e| DomainError::AiError(format!("Failed to deserialize nodes: {}", e)))?;

        let edges: Vec<nimbus_domain::entities::edge::Edge> = serde_json::from_value(
            complete_event
                .data
                .get("edges")
                .cloned()
                .unwrap_or(serde_json::Value::Array(vec![])),
        )
        .map_err(|e| DomainError::AiError(format!("Failed to deserialize edges: {}", e)))?;

        // Apply layout
        let viewport = LayoutService::apply_layout(&mut nodes, &edges);

        // Create diagram in DB
        let mut diagram = self.repo.create(&name, description.as_deref()).await?;

        // Set generated content
        diagram.nodes = nodes;
        diagram.edges = edges;
        diagram.viewport = viewport;

        // Persist the full diagram
        let diagram = self.repo.update(diagram.id, &diagram).await?;

        Ok(diagram)
    }
}
