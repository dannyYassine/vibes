use nimbus_domain::entities::diagram::Diagram;
use uuid::Uuid;

use crate::ai::claude_provider::ClaudeMessage;

pub(crate) fn build_modify_messages(
    prompt: &str,
    diagram: &Diagram,
    selected_node_ids: &[Uuid],
) -> (String, Vec<ClaudeMessage>) {
    let system_prompt = r#"You are an expert system architecture assistant. You are modifying an existing architecture diagram.

You will receive the current diagram state (nodes and edges) and a user request to modify it.

IMPORTANT RULES:
- Return ONLY the changes needed (diff), not the full diagram
- Use the modify_diagram tool to specify what to add, remove, or update
- When adding nodes, use temporary IDs like "new_node_1", "new_node_2"
- When referencing existing nodes in new edges, use their UUID strings
- When removing nodes/edges, use their UUID strings
- Make minimal changes to satisfy the user's request
- Preserve existing structure where possible

Node categories: Compute, Networking, Data, Caching, Messaging, Storage, Security, Observability, Group
Compute components: ApplicationServer, Worker, Function, Container, VirtualMachine, Scheduler
Networking components: LoadBalancer, ApiGateway, Cdn, Dns, Firewall, Vpn, ServiceMesh, ReverseProxy
Data components: RelationalDb, DocumentDb, KeyValueStore, GraphDb, DataWarehouse, SearchEngine, TimeSeriesDb
Caching components: Cache, SessionStore
Messaging components: MessageQueue, EventBus, PubSub, StreamProcessor, JobBroker
Storage components: ObjectStorage, BlockStorage, FileStorage
Security components: IdentityProvider, SecretManager, CertificateManager, Waf
Observability components: Logging, Monitoring, Tracing, Alerting
Group types: NetworkBoundary, AvailabilityZone, Region, ServiceCluster, Custom

Edge types: Synchronous, Asynchronous, DataFlow, Dependency"#;

    let diagram_json = serde_json::to_string_pretty(diagram).unwrap_or_default();

    let selected_info = if selected_node_ids.is_empty() {
        String::new()
    } else {
        let selected_labels: Vec<String> = selected_node_ids
            .iter()
            .filter_map(|id| {
                diagram
                    .nodes
                    .iter()
                    .find(|n| n.id == *id)
                    .map(|n| format!("  - {} ({})", n.label, n.id))
            })
            .collect();
        format!(
            "\n\nSelected nodes (focus modifications on these):\n{}",
            selected_labels.join("\n")
        )
    };

    let user_message = format!(
        "Current diagram:\n```json\n{}\n```{}\n\nUser request: {}",
        diagram_json, selected_info, prompt
    );

    let messages = vec![ClaudeMessage {
        role: "user".to_string(),
        content: user_message,
    }];

    (system_prompt.to_string(), messages)
}
