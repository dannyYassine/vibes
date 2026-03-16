use std::pin::Pin;
use std::sync::Arc;

use futures_util::Stream;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::layout_service::LayoutService;
use nimbus_shared::events::{GenerateEvent, GenerateEventType};

#[derive(Clone)]
pub struct GenerateDiagram {
    ai_provider: Arc<dyn AiProvider>,
    repo: Arc<dyn DiagramRepository>,
}

impl GenerateDiagram {
    pub fn new(ai_provider: Arc<dyn AiProvider>, repo: Arc<dyn DiagramRepository>) -> Self {
        Self { ai_provider, repo }
    }

    pub async fn execute(
        &self,
        prompt: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        if prompt.trim().is_empty() {
            return Err(DomainError::Validation("Prompt cannot be empty".into()));
        }

        let ai_stream = self.ai_provider.generate(prompt).await?;

        let (tx, rx) = mpsc::channel(32);
        let repo = self.repo.clone();

        tokio::spawn(async move {
            let mut ai_stream = ai_stream;
            let mut all_events: Vec<GenerateEvent> = Vec::new();

            while let Some(event) = ai_stream.next().await {
                all_events.push(event.clone());

                if matches!(event.event_type, GenerateEventType::Complete) {
                    // Intercept Complete event: persist the diagram
                    let name = event
                        .data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Untitled Diagram")
                        .to_string();

                    let description = event
                        .data
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let nodes_result: Result<Vec<nimbus_domain::entities::node::Node>, _> =
                        serde_json::from_value(
                            event
                                .data
                                .get("nodes")
                                .cloned()
                                .unwrap_or(serde_json::Value::Array(vec![])),
                        );

                    let edges_result: Result<Vec<nimbus_domain::entities::edge::Edge>, _> =
                        serde_json::from_value(
                            event
                                .data
                                .get("edges")
                                .cloned()
                                .unwrap_or(serde_json::Value::Array(vec![])),
                        );

                    match (nodes_result, edges_result) {
                        (Ok(mut nodes), Ok(edges)) => {
                            let viewport = LayoutService::apply_layout(&mut nodes, &edges);

                            match repo.create(&name, description.as_deref()).await {
                                Ok(mut diagram) => {
                                    diagram.nodes = nodes;
                                    diagram.edges = edges;
                                    diagram.viewport = viewport;

                                    match repo.update(diagram.id, &diagram).await {
                                        Ok(persisted) => {
                                            // Forward all prior events
                                            for e in &all_events {
                                                if !matches!(
                                                    e.event_type,
                                                    GenerateEventType::Complete
                                                ) {
                                                    let _ = tx.send(e.clone()).await;
                                                }
                                            }
                                            // Send Complete with diagram ID
                                            let complete_data = serde_json::json!({
                                                "id": persisted.id,
                                                "name": persisted.name,
                                                "description": persisted.description,
                                                "nodes": persisted.nodes,
                                                "edges": persisted.edges,
                                                "viewport": persisted.viewport,
                                            });
                                            let _ = tx
                                                .send(GenerateEvent {
                                                    event_type: GenerateEventType::Complete,
                                                    data: complete_data,
                                                })
                                                .await;
                                        }
                                        Err(e) => {
                                            let _ = tx
                                                .send(GenerateEvent {
                                                    event_type: GenerateEventType::Error,
                                                    data: serde_json::json!({
                                                        "message": format!("Failed to persist diagram: {}", e)
                                                    }),
                                                })
                                                .await;
                                        }
                                    }
                                }
                                Err(e) => {
                                    let _ = tx
                                        .send(GenerateEvent {
                                            event_type: GenerateEventType::Error,
                                            data: serde_json::json!({
                                                "message": format!("Failed to create diagram: {}", e)
                                            }),
                                        })
                                        .await;
                                }
                            }
                        }
                        _ => {
                            let _ = tx
                                .send(GenerateEvent {
                                    event_type: GenerateEventType::Error,
                                    data: serde_json::json!({
                                        "message": "Failed to deserialize diagram data"
                                    }),
                                })
                                .await;
                        }
                    }
                } else if matches!(event.event_type, GenerateEventType::Error) {
                    // Forward error events immediately
                    let _ = tx.send(event).await;
                }
                // Non-Complete, non-Error events are buffered and sent after persistence
            }
        });

        Ok(Box::pin(ReceiverStream::new(rx)))
    }
}
