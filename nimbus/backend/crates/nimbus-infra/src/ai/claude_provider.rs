use std::pin::Pin;

use async_trait::async_trait;
use futures_util::stream;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use nimbus_domain::entities::diagram::Diagram;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_shared::events::{GenerateEvent, GenerateEventType};

use super::parser::{parse_ai_response, AiDiagramResponse};
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

    async fn call_claude(
        &self,
        messages: Vec<ClaudeMessage>,
    ) -> Result<AiDiagramResponse, DomainError> {
        let tool_schema = serde_json::json!({
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
        });

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
}

#[async_trait]
impl AiProvider for ClaudeAiProvider {
    async fn generate(
        &self,
        prompt: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        let messages = vec![ClaudeMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }];

        // Retry loop with validation feedback
        let mut attempt_messages = messages;
        let max_attempts = 3;

        let (name, description, nodes, edges) = loop {
            let ai_response = self.call_claude(attempt_messages.clone()).await?;
            let (name, description, nodes, edges) = parse_ai_response(&ai_response)?;

            match validate_ai_output(&nodes, &edges) {
                Ok(()) => break (name, description, nodes, edges),
                Err(e) if attempt_messages.len() < max_attempts * 2 => {
                    // Add the tool result and error feedback for retry
                    attempt_messages.push(ClaudeMessage {
                        role: "assistant".to_string(),
                        content: serde_json::to_string(&ai_response)
                            .unwrap_or_default(),
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

        // Build events
        let mut events: Vec<GenerateEvent> = Vec::new();

        for node in &nodes {
            events.push(GenerateEvent {
                event_type: GenerateEventType::NodeAdded,
                data: serde_json::to_value(node).unwrap_or_default(),
            });
        }

        for edge in &edges {
            events.push(GenerateEvent {
                event_type: GenerateEventType::EdgeAdded,
                data: serde_json::to_value(edge).unwrap_or_default(),
            });
        }

        // Complete event with full data
        let complete_data = serde_json::json!({
            "name": name,
            "description": description,
            "nodes": nodes,
            "edges": edges,
        });

        events.push(GenerateEvent {
            event_type: GenerateEventType::Complete,
            data: complete_data,
        });

        Ok(Box::pin(stream::iter(events)))
    }

    async fn modify(
        &self,
        _prompt: &str,
        _existing_diagram: &Diagram,
        _selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        Err(DomainError::AiError("Not implemented".into()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeMessage {
    role: String,
    content: String,
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
