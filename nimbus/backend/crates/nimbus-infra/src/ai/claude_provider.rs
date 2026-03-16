use std::pin::Pin;

use async_trait::async_trait;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_shared::events::{GenerateEvent, GenerateEventType};

use super::parser::{parse_ai_response, AiDiagramResponse, AiModifyResponse};
use super::prompts::fix_prompt::build_fix_messages;
use super::prompts::modify_prompt::build_modify_messages;
use super::prompts::system_prompt::SYSTEM_PROMPT;
use super::validator::validate_ai_output;

pub struct ClaudeAiProvider {
    client: reqwest::Client,
    api_key: String,
    model: String,
}

impl ClaudeAiProvider {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            model: model.unwrap_or_else(|| "claude-sonnet-4-20250514".to_string()),
        }
    }

    fn create_diagram_tool_schema() -> serde_json::Value {
        serde_json::json!({
            "name": "create_diagram",
            "description": "Create a system architecture diagram with nodes and edges",
            "input_schema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Name of the diagram" },
                    "description": { "type": "string", "description": "Brief description of the architecture" },
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "description": "Temporary ID like node_1, node_2" },
                                "category": {
                                    "type": "string",
                                    "enum": ["Compute", "Networking", "Data", "Caching", "Messaging", "Storage", "Security", "Observability", "Group"]
                                },
                                "component": { "type": "string", "description": "Component type within the category" },
                                "label": { "type": "string", "description": "Display label for the node" },
                                "parent_id": { "type": "string", "description": "Optional parent group node ID" }
                            },
                            "required": ["id", "category", "component", "label"]
                        }
                    },
                    "edges": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "source_id": { "type": "string" },
                                "target_id": { "type": "string" },
                                "edge_type": {
                                    "type": "string",
                                    "enum": ["Synchronous", "Asynchronous", "DataFlow", "Dependency"]
                                },
                                "label": { "type": "string" },
                                "protocol": { "type": "string" }
                            },
                            "required": ["source_id", "target_id", "edge_type"]
                        }
                    }
                },
                "required": ["name", "nodes", "edges"]
            }
        })
    }

    fn modify_diagram_tool_schema() -> serde_json::Value {
        serde_json::json!({
            "name": "modify_diagram",
            "description": "Modify an existing system architecture diagram by adding, removing, or updating nodes and edges",
            "input_schema": {
                "type": "object",
                "properties": {
                    "nodes_to_add": {
                        "type": "array",
                        "description": "New nodes to add to the diagram",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "description": "Temporary ID like new_node_1" },
                                "category": {
                                    "type": "string",
                                    "enum": ["Compute", "Networking", "Data", "Caching", "Messaging", "Storage", "Security", "Observability", "Group"]
                                },
                                "component": { "type": "string" },
                                "label": { "type": "string" },
                                "parent_id": { "type": "string", "description": "Optional parent group node ID (can be existing UUID or new temp ID)" }
                            },
                            "required": ["id", "category", "component", "label"]
                        }
                    },
                    "nodes_to_remove": {
                        "type": "array",
                        "description": "UUIDs of nodes to remove",
                        "items": { "type": "string" }
                    },
                    "nodes_to_update": {
                        "type": "array",
                        "description": "Partial updates to existing nodes",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "description": "UUID of existing node to update" },
                                "label": { "type": "string" },
                                "category": { "type": "string" },
                                "component": { "type": "string" }
                            },
                            "required": ["id"]
                        }
                    },
                    "edges_to_add": {
                        "type": "array",
                        "description": "New edges to add",
                        "items": {
                            "type": "object",
                            "properties": {
                                "source_id": { "type": "string", "description": "UUID of existing node or temp ID of new node" },
                                "target_id": { "type": "string", "description": "UUID of existing node or temp ID of new node" },
                                "edge_type": {
                                    "type": "string",
                                    "enum": ["Synchronous", "Asynchronous", "DataFlow", "Dependency"]
                                },
                                "label": { "type": "string" },
                                "protocol": { "type": "string" }
                            },
                            "required": ["source_id", "target_id", "edge_type"]
                        }
                    },
                    "edges_to_remove": {
                        "type": "array",
                        "description": "UUIDs of edges to remove",
                        "items": { "type": "string" }
                    }
                },
                "required": []
            }
        })
    }

    async fn call_claude(
        &self,
        messages: Vec<ClaudeMessage>,
    ) -> Result<AiDiagramResponse, DomainError> {
        let tool_schema = Self::create_diagram_tool_schema();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": messages,
            "tools": [tool_schema],
            "tool_choice": { "type": "tool", "name": "create_diagram" }
        });

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| DomainError::AiError(format!("HTTP request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read response body".into());
            return Err(DomainError::AiError(format!(
                "Claude API returned {}: {}",
                status, text
            )));
        }

        let response_body: ClaudeResponse = response
            .json()
            .await
            .map_err(|e| DomainError::AiError(format!("Failed to parse Claude response: {}", e)))?;

        // Find the tool_use block
        let tool_use = response_body
            .content
            .iter()
            .find(|block| block.content_type == "tool_use")
            .ok_or_else(|| DomainError::AiError("No tool_use block in response".into()))?;

        let ai_response: AiDiagramResponse = serde_json::from_value(tool_use.input.clone())
            .map_err(|e| DomainError::AiError(format!("Failed to parse tool input: {}", e)))?;

        Ok(ai_response)
    }

    async fn call_claude_modify(
        &self,
        messages: Vec<ClaudeMessage>,
        system_prompt: &str,
    ) -> Result<AiModifyResponse, DomainError> {
        let tool_schema = Self::modify_diagram_tool_schema();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": messages,
            "tools": [tool_schema],
            "tool_choice": { "type": "tool", "name": "modify_diagram" }
        });

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| DomainError::AiError(format!("HTTP request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read response body".into());
            return Err(DomainError::AiError(format!(
                "Claude API returned {}: {}",
                status, text
            )));
        }

        let response_body: ClaudeResponse = response
            .json()
            .await
            .map_err(|e| DomainError::AiError(format!("Failed to parse Claude response: {}", e)))?;

        let tool_use = response_body
            .content
            .iter()
            .find(|block| block.content_type == "tool_use")
            .ok_or_else(|| DomainError::AiError("No tool_use block in response".into()))?;

        let ai_response: AiModifyResponse = serde_json::from_value(tool_use.input.clone())
            .map_err(|e| DomainError::AiError(format!("Failed to parse modify tool input: {}", e)))?;

        Ok(ai_response)
    }
}

#[async_trait]
impl AiProvider for ClaudeAiProvider {
    async fn generate(
        &self,
        prompt: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        if prompt.trim().is_empty() {
            return Err(DomainError::Validation("Prompt cannot be empty".into()));
        }

        let messages = vec![ClaudeMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }];

        let (tx, rx) = mpsc::channel(32);
        let client = self.client.clone();
        let api_key = self.api_key.clone();
        let model = self.model.clone();

        // Clone self's fields for the spawned task
        let provider = ClaudeAiProvider {
            client,
            api_key,
            model,
        };

        tokio::spawn(async move {
            let mut attempt_messages = messages;
            let max_attempts = 3;

            let result = async {
                let (name, description, nodes, edges) = loop {
                    let ai_response = provider.call_claude(attempt_messages.clone()).await?;
                    let (name, description, nodes, edges) = parse_ai_response(&ai_response)?;

                    match validate_ai_output(&nodes, &edges) {
                        Ok(()) => break (name, description, nodes, edges),
                        Err(e) if attempt_messages.len() < max_attempts * 2 => {
                            attempt_messages.push(ClaudeMessage {
                                role: "assistant".to_string(),
                                content: serde_json::to_string(&ai_response).unwrap_or_default(),
                            });
                            attempt_messages.push(ClaudeMessage {
                                role: "user".to_string(),
                                content: format!(
                                    "The diagram had a validation error: {}. Please fix it and try again.",
                                    e
                                ),
                            });
                            tracing::warn!("AI output validation failed, retrying: {}", e);
                        }
                        Err(e) => {
                            return Err(DomainError::AiError(format!(
                                "Validation failed after {} attempts: {}",
                                max_attempts, e
                            )));
                        }
                    }
                };
                Ok::<_, DomainError>((name, description, nodes, edges))
            }
            .await;

            match result {
                Ok((name, description, nodes, edges)) => {
                    for node in &nodes {
                        let _ = tx
                            .send(GenerateEvent {
                                event_type: GenerateEventType::NodeAdded,
                                data: serde_json::to_value(node).unwrap_or_default(),
                            })
                            .await;
                    }

                    for edge in &edges {
                        let _ = tx
                            .send(GenerateEvent {
                                event_type: GenerateEventType::EdgeAdded,
                                data: serde_json::to_value(edge).unwrap_or_default(),
                            })
                            .await;
                    }

                    let complete_data = serde_json::json!({
                        "name": name,
                        "description": description,
                        "nodes": nodes,
                        "edges": edges,
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
                            data: serde_json::json!({ "message": e.to_string() }),
                        })
                        .await;
                }
            }
        });

        Ok(Box::pin(ReceiverStream::new(rx)))
    }

    async fn modify(
        &self,
        prompt: &str,
        existing_diagram: &Diagram,
        selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        if prompt.trim().is_empty() {
            return Err(DomainError::Validation("Prompt cannot be empty".into()));
        }

        let (system_prompt, messages) =
            build_modify_messages(prompt, existing_diagram, selected_node_ids);

        let (tx, rx) = mpsc::channel(32);
        let provider = ClaudeAiProvider {
            client: self.client.clone(),
            api_key: self.api_key.clone(),
            model: self.model.clone(),
        };

        let existing_diagram = existing_diagram.clone();

        tokio::spawn(async move {
            let result = provider.call_claude_modify(messages, &system_prompt).await;

            match result {
                Ok(modify_response) => {
                    match super::parser::apply_modify_response(
                        &modify_response,
                        &existing_diagram,
                    ) {
                        Ok((added_nodes, removed_node_ids, updated_nodes, added_edges, removed_edge_ids)) => {
                            // Emit NodeRemoved events
                            for id in &removed_node_ids {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeRemoved,
                                        data: serde_json::json!({ "id": id }),
                                    })
                                    .await;
                            }

                            // Emit EdgeRemoved events
                            for id in &removed_edge_ids {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::EdgeRemoved,
                                        data: serde_json::json!({ "id": id }),
                                    })
                                    .await;
                            }

                            // Emit NodeUpdated events
                            for node in &updated_nodes {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeUpdated,
                                        data: serde_json::to_value(node).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            // Emit NodeAdded events
                            for node in &added_nodes {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeAdded,
                                        data: serde_json::to_value(node).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            // Emit EdgeAdded events
                            for edge in &added_edges {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::EdgeAdded,
                                        data: serde_json::to_value(edge).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            // Build complete diagram state
                            let mut final_nodes: Vec<_> = existing_diagram
                                .nodes
                                .iter()
                                .filter(|n| !removed_node_ids.contains(&n.id))
                                .cloned()
                                .collect();

                            // Apply updates
                            for updated in &updated_nodes {
                                if let Some(pos) = final_nodes.iter().position(|n| n.id == updated.id) {
                                    final_nodes[pos] = updated.clone();
                                }
                            }

                            final_nodes.extend(added_nodes);

                            let mut final_edges: Vec<_> = existing_diagram
                                .edges
                                .iter()
                                .filter(|e| !removed_edge_ids.contains(&e.id))
                                .cloned()
                                .collect();
                            final_edges.extend(added_edges);

                            let complete_data = serde_json::json!({
                                "name": existing_diagram.name,
                                "description": existing_diagram.description,
                                "nodes": final_nodes,
                                "edges": final_edges,
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
                                    data: serde_json::json!({ "message": e.to_string() }),
                                })
                                .await;
                        }
                    }
                }
                Err(e) => {
                    let _ = tx
                        .send(GenerateEvent {
                            event_type: GenerateEventType::Error,
                            data: serde_json::json!({ "message": e.to_string() }),
                        })
                        .await;
                }
            }
        });

        Ok(Box::pin(ReceiverStream::new(rx)))
    }

    async fn fix(
        &self,
        existing_diagram: &Diagram,
        warning_rule: &str,
        warning_message: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        let (system_prompt, messages) =
            build_fix_messages(existing_diagram, warning_rule, warning_message);

        let (tx, rx) = mpsc::channel(32);
        let provider = ClaudeAiProvider {
            client: self.client.clone(),
            api_key: self.api_key.clone(),
            model: self.model.clone(),
        };

        let existing_diagram = existing_diagram.clone();

        tokio::spawn(async move {
            let result = provider.call_claude_modify(messages, &system_prompt).await;

            match result {
                Ok(modify_response) => {
                    match super::parser::apply_modify_response(
                        &modify_response,
                        &existing_diagram,
                    ) {
                        Ok((added_nodes, removed_node_ids, updated_nodes, added_edges, removed_edge_ids)) => {
                            for id in &removed_node_ids {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeRemoved,
                                        data: serde_json::json!({ "id": id }),
                                    })
                                    .await;
                            }

                            for id in &removed_edge_ids {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::EdgeRemoved,
                                        data: serde_json::json!({ "id": id }),
                                    })
                                    .await;
                            }

                            for node in &updated_nodes {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeUpdated,
                                        data: serde_json::to_value(node).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            for node in &added_nodes {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::NodeAdded,
                                        data: serde_json::to_value(node).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            for edge in &added_edges {
                                let _ = tx
                                    .send(GenerateEvent {
                                        event_type: GenerateEventType::EdgeAdded,
                                        data: serde_json::to_value(edge).unwrap_or_default(),
                                    })
                                    .await;
                            }

                            let mut final_nodes: Vec<_> = existing_diagram
                                .nodes
                                .iter()
                                .filter(|n| !removed_node_ids.contains(&n.id))
                                .cloned()
                                .collect();

                            for updated in &updated_nodes {
                                if let Some(pos) = final_nodes.iter().position(|n| n.id == updated.id) {
                                    final_nodes[pos] = updated.clone();
                                }
                            }

                            final_nodes.extend(added_nodes);

                            let mut final_edges: Vec<_> = existing_diagram
                                .edges
                                .iter()
                                .filter(|e| !removed_edge_ids.contains(&e.id))
                                .cloned()
                                .collect();
                            final_edges.extend(added_edges);

                            let complete_data = serde_json::json!({
                                "name": existing_diagram.name,
                                "description": existing_diagram.description,
                                "nodes": final_nodes,
                                "edges": final_edges,
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
                                    data: serde_json::json!({ "message": e.to_string() }),
                                })
                                .await;
                        }
                    }
                }
                Err(e) => {
                    let _ = tx
                        .send(GenerateEvent {
                            event_type: GenerateEventType::Error,
                            data: serde_json::json!({ "message": e.to_string() }),
                        })
                        .await;
                }
            }
        });

        Ok(Box::pin(ReceiverStream::new(rx)))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ClaudeMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(default)]
    input: serde_json::Value,
}
