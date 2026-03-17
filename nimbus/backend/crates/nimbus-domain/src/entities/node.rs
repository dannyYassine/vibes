use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: Uuid,
    pub node_type: NodeType,
    pub label: String,
    pub position: Position,
    pub size: Size,
    pub properties: NodeProperties,
    pub parent_id: Option<Uuid>,
    pub provider_mappings: Option<ProviderMappings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "category", content = "component")]
pub enum NodeType {
    Compute(ComputeComponent),
    Networking(NetworkingComponent),
    Data(DataComponent),
    Caching(CachingComponent),
    Messaging(MessagingComponent),
    Storage(StorageComponent),
    Security(SecurityComponent),
    Observability(ObservabilityComponent),
    Group(GroupType),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ComputeComponent {
    ApplicationServer,
    Worker,
    Function,
    Container,
    VirtualMachine,
    Scheduler,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum NetworkingComponent {
    LoadBalancer,
    ApiGateway,
    Cdn,
    Dns,
    Firewall,
    Vpn,
    ServiceMesh,
    ReverseProxy,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DataComponent {
    RelationalDb,
    DocumentDb,
    KeyValueStore,
    GraphDb,
    DataWarehouse,
    SearchEngine,
    TimeSeriesDb,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CachingComponent {
    Cache,
    SessionStore,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MessagingComponent {
    MessageQueue,
    EventBus,
    PubSub,
    StreamProcessor,
    JobBroker,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StorageComponent {
    ObjectStorage,
    BlockStorage,
    FileStorage,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SecurityComponent {
    IdentityProvider,
    SecretManager,
    CertificateManager,
    Waf,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ObservabilityComponent {
    Logging,
    Monitoring,
    Tracing,
    Alerting,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GroupType {
    NetworkBoundary,
    AvailabilityZone,
    Region,
    ServiceCluster,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeProperties {
    pub config: serde_json::Value,
    pub style: Option<NodeStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeStyle {
    pub color: Option<String>,
    pub icon: Option<String>,
    pub opacity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMappings {
    pub aws: Option<ProviderMapping>,
    pub gcp: Option<ProviderMapping>,
    pub azure: Option<ProviderMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMapping {
    pub service_name: String,
    pub icon_key: String,
    pub config: serde_json::Value,
    pub terraform_resource_type: Option<String>,
}
