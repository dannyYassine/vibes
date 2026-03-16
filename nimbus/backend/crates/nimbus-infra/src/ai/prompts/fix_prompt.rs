use nimbus_domain::entities::diagram::Diagram;

use crate::ai::claude_provider::ClaudeMessage;

pub(crate) fn build_fix_messages(
    diagram: &Diagram,
    warning_rule: &str,
    warning_message: &str,
) -> (String, Vec<ClaudeMessage>) {
    let system_prompt = r#"You are an expert system architecture assistant. You are fixing a specific validation warning in an architecture diagram.

You will receive the current diagram state and a validation warning that needs to be fixed.

IMPORTANT RULES:
- Make the MINIMAL change necessary to fix the specific warning
- Do NOT restructure or redesign the architecture
- Use the modify_diagram tool to specify what to add, remove, or update
- When adding nodes, use temporary IDs like "new_node_1", "new_node_2"
- When referencing existing nodes in new edges, use their UUID strings
- When removing nodes/edges, use their UUID strings

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

    let user_message = format!(
        "Current diagram:\n```json\n{}\n```\n\nValidation warning to fix:\n- Rule: {}\n- Message: {}\n\nPlease make the minimal change to resolve this warning.",
        diagram_json, warning_rule, warning_message
    );

    let messages = vec![ClaudeMessage {
        role: "user".to_string(),
        content: user_message,
    }];

    (system_prompt.to_string(), messages)
}
