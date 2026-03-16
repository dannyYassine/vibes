use std::pin::Pin;
use std::sync::Arc;

use futures_util::Stream;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use uuid::Uuid;

use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_domain::services::layout_service::LayoutService;
use nimbus_shared::events::{GenerateEvent, GenerateEventType};

#[derive(Clone)]
pub struct ModifyDiagram {
    ai_provider: Arc<dyn AiProvider>,
    repo: Arc<dyn DiagramRepository>,
}

impl ModifyDiagram {
    pub fn new(ai_provider: Arc<dyn AiProvider>, repo: Arc<dyn DiagramRepository>) -> Self {
        Self { ai_provider, repo }
    }

    pub async fn execute(
        &self,
        id: Uuid,
        prompt: &str,
        selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        let diagram = self.repo.get(id).await?;
        let ai_stream = self
            .ai_provider
            .modify(prompt, &diagram, selected_node_ids)
            .await?;

        let (tx, rx) = mpsc::channel(32);
        let repo = self.repo.clone();
        let diagram_id = id;

        tokio::spawn(async move {
            let mut ai_stream = ai_stream;
            let mut all_events: Vec<GenerateEvent> = Vec::new();

            while let Some(event) = ai_stream.next().await {
                all_events.push(event.clone());

                if matches!(event.event_type, GenerateEventType::Complete) {
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

                            let mut diagram = match repo.get(diagram_id).await {
                                Ok(d) => d,
                                Err(e) => {
                                    let _ = tx
                                        .send(GenerateEvent {
                                            event_type: GenerateEventType::Error,
                                            data: serde_json::json!({
                                                "message": format!("Failed to load diagram: {}", e)
                                            }),
                                        })
                                        .await;
                                    return;
                                }
                            };

                            diagram.nodes = nodes;
                            diagram.edges = edges;
                            diagram.viewport = viewport;

                            match repo.update(diagram_id, &diagram).await {
                                Ok(persisted) => {
                                    for e in &all_events {
                                        if !matches!(e.event_type, GenerateEventType::Complete) {
                                            let _ = tx.send(e.clone()).await;
                                        }
                                    }
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
                    let _ = tx.send(event).await;
                }
            }
        });

        Ok(Box::pin(ReceiverStream::new(rx)))
    }
}
