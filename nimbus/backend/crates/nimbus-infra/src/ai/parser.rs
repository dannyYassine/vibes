use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use nimbus_domain::entities::edge::{Edge, EdgeProperties, EdgeType};
use nimbus_domain::entities::node::{
    CachingComponent, ComputeComponent, DataComponent, GroupType, MessagingComponent, Node,
    NetworkingComponent, NodeProperties, NodeType, ObservabilityComponent, Position,
    SecurityComponent, Size, StorageComponent,
};
use nimbus_domain::errors::DomainError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiDiagramResponse {
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<AiNode>,
    pub edges: Vec<AiEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiNode {
    pub id: String,
    pub category: String,
    pub component: String,
    pub label: String,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiEdge {
    pub source_id: String,
    pub target_id: String,
    pub edge_type: String,
    pub label: Option<String>,
    pub protocol: Option<String>,
}

pub fn parse_ai_response(
    response: &AiDiagramResponse,
) -> Result<(String, Option<String>, Vec<Node>, Vec<Edge>), DomainError> {
    // Build temporary ID -> UUID map
    let mut id_map: HashMap<String, Uuid> = HashMap::new();
    for ai_node in &response.nodes {
        id_map.insert(ai_node.id.clone(), Uuid::new_v4());
    }

    // Parse nodes
    let mut nodes = Vec::new();
    for ai_node in &response.nodes {
        let node_type = parse_node_type(&ai_node.category, &ai_node.component)?;
        let parent_id = match &ai_node.parent_id {
            Some(pid) => Some(
                *id_map
                    .get(pid)
                    .ok_or_else(|| DomainError::AiError(format!("Unknown parent_id: {}", pid)))?,
            ),
            None => None,
        };

        nodes.push(Node {
            id: id_map[&ai_node.id],
            node_type,
            label: ai_node.label.clone(),
            position: Position { x: 0.0, y: 0.0 },
            size: Size {
                width: 180.0,
                height: 80.0,
            },
            properties: NodeProperties {
                config: serde_json::Value::Object(serde_json::Map::new()),
                style: None,
            },
            parent_id,
            provider_mappings: None,
        });
    }

    // Parse edges
    let mut edges = Vec::new();
    for ai_edge in &response.edges {
        let source_id = *id_map.get(&ai_edge.source_id).ok_or_else(|| {
            DomainError::AiError(format!("Unknown edge source_id: {}", ai_edge.source_id))
        })?;
        let target_id = *id_map.get(&ai_edge.target_id).ok_or_else(|| {
            DomainError::AiError(format!("Unknown edge target_id: {}", ai_edge.target_id))
        })?;
        let edge_type = parse_edge_type(&ai_edge.edge_type)?;

        edges.push(Edge {
            id: Uuid::new_v4(),
            source_id,
            target_id,
            edge_type,
            label: ai_edge.label.clone(),
            properties: EdgeProperties {
                protocol: ai_edge.protocol.clone(),
                port: None,
                bidirectional: false,
                communication_pattern: None,
                style: None,
            },
        });
    }

    Ok((response.name.clone(), response.description.clone(), nodes, edges))
}

fn parse_node_type(category: &str, component: &str) -> Result<NodeType, DomainError> {
    match category {
        "Compute" => {
            let comp = match component {
                "ApplicationServer" => ComputeComponent::ApplicationServer,
                "Worker" => ComputeComponent::Worker,
                "Function" => ComputeComponent::Function,
                "Container" => ComputeComponent::Container,
                "VirtualMachine" => ComputeComponent::VirtualMachine,
                "Scheduler" => ComputeComponent::Scheduler,
                _ => return Err(DomainError::AiError(format!("Unknown Compute component: {}", component))),
            };
            Ok(NodeType::Compute(comp))
        }
        "Networking" => {
            let comp = match component {
                "LoadBalancer" => NetworkingComponent::LoadBalancer,
                "ApiGateway" => NetworkingComponent::ApiGateway,
                "Cdn" => NetworkingComponent::Cdn,
                "Dns" => NetworkingComponent::Dns,
                "Firewall" => NetworkingComponent::Firewall,
                "Vpn" => NetworkingComponent::Vpn,
                "ServiceMesh" => NetworkingComponent::ServiceMesh,
                "ReverseProxy" => NetworkingComponent::ReverseProxy,
                _ => return Err(DomainError::AiError(format!("Unknown Networking component: {}", component))),
            };
            Ok(NodeType::Networking(comp))
        }
        "Data" => {
            let comp = match component {
                "RelationalDb" => DataComponent::RelationalDb,
                "DocumentDb" => DataComponent::DocumentDb,
                "KeyValueStore" => DataComponent::KeyValueStore,
                "GraphDb" => DataComponent::GraphDb,
                "DataWarehouse" => DataComponent::DataWarehouse,
                "SearchEngine" => DataComponent::SearchEngine,
                "TimeSeriesDb" => DataComponent::TimeSeriesDb,
                _ => return Err(DomainError::AiError(format!("Unknown Data component: {}", component))),
            };
            Ok(NodeType::Data(comp))
        }
        "Caching" => {
            let comp = match component {
                "Cache" => CachingComponent::Cache,
                "SessionStore" => CachingComponent::SessionStore,
                _ => return Err(DomainError::AiError(format!("Unknown Caching component: {}", component))),
            };
            Ok(NodeType::Caching(comp))
        }
        "Messaging" => {
            let comp = match component {
                "MessageQueue" => MessagingComponent::MessageQueue,
                "EventBus" => MessagingComponent::EventBus,
                "PubSub" => MessagingComponent::PubSub,
                "StreamProcessor" => MessagingComponent::StreamProcessor,
                "JobBroker" => MessagingComponent::JobBroker,
                _ => return Err(DomainError::AiError(format!("Unknown Messaging component: {}", component))),
            };
            Ok(NodeType::Messaging(comp))
        }
        "Storage" => {
            let comp = match component {
                "ObjectStorage" => StorageComponent::ObjectStorage,
                "BlockStorage" => StorageComponent::BlockStorage,
                "FileStorage" => StorageComponent::FileStorage,
                _ => return Err(DomainError::AiError(format!("Unknown Storage component: {}", component))),
            };
            Ok(NodeType::Storage(comp))
        }
        "Security" => {
            let comp = match component {
                "IdentityProvider" => SecurityComponent::IdentityProvider,
                "SecretManager" => SecurityComponent::SecretManager,
                "CertificateManager" => SecurityComponent::CertificateManager,
                "Waf" => SecurityComponent::Waf,
                _ => return Err(DomainError::AiError(format!("Unknown Security component: {}", component))),
            };
            Ok(NodeType::Security(comp))
        }
        "Observability" => {
            let comp = match component {
                "Logging" => ObservabilityComponent::Logging,
                "Monitoring" => ObservabilityComponent::Monitoring,
                "Tracing" => ObservabilityComponent::Tracing,
                "Alerting" => ObservabilityComponent::Alerting,
                _ => return Err(DomainError::AiError(format!("Unknown Observability component: {}", component))),
            };
            Ok(NodeType::Observability(comp))
        }
        "Group" => {
            let comp = match component {
                "NetworkBoundary" => GroupType::NetworkBoundary,
                "AvailabilityZone" => GroupType::AvailabilityZone,
                "Region" => GroupType::Region,
                "ServiceCluster" => GroupType::ServiceCluster,
                "Custom" => GroupType::Custom,
                _ => return Err(DomainError::AiError(format!("Unknown Group component: {}", component))),
            };
            Ok(NodeType::Group(comp))
        }
        _ => Err(DomainError::AiError(format!("Unknown category: {}", category))),
    }
}

fn parse_edge_type(edge_type: &str) -> Result<EdgeType, DomainError> {
    match edge_type {
        "Synchronous" => Ok(EdgeType::Synchronous),
        "Asynchronous" => Ok(EdgeType::Asynchronous),
        "DataFlow" => Ok(EdgeType::DataFlow),
        "Dependency" => Ok(EdgeType::Dependency),
        _ => Err(DomainError::AiError(format!("Unknown edge type: {}", edge_type))),
    }
}
