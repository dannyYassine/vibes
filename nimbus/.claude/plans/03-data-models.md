# Nimbus — Data Models

## Rust Structs (Backend)

### Core Domain Entities

```rust
// nimbus-domain/src/entities/diagram.rs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagram {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub viewport: Viewport,
    /// Which cloud provider overlay is currently active (if any)
    pub active_provider: Option<CloudProvider>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CloudProvider {
    Aws,
    Gcp,
    Azure,
}
```

```rust
// nimbus-domain/src/entities/node.rs

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: Uuid,
    pub node_type: NodeType,
    pub label: String,
    pub position: Position,
    pub size: Size,
    pub properties: NodeProperties,
    pub parent_id: Option<Uuid>,  // For nodes inside groups (e.g., server inside a network boundary)
    /// Provider-specific translations for this node
    pub provider_mappings: Option<ProviderMappings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

/// Cloud-agnostic node type taxonomy.
/// These are generic architectural concepts, not tied to any cloud provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComputeComponent {
    ApplicationServer,
    Worker,
    Function,       // Serverless function
    Container,
    VirtualMachine,
    Scheduler,      // Cron / periodic job runner
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataComponent {
    RelationalDb,
    DocumentDb,
    KeyValueStore,
    GraphDb,
    DataWarehouse,
    SearchEngine,
    TimeSeriesDb,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CachingComponent {
    Cache,
    SessionStore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessagingComponent {
    MessageQueue,
    EventBus,
    PubSub,
    StreamProcessor,
    JobBroker,      // Task queue with workers (e.g., Celery/Sidekiq/Laravel Queue pattern)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StorageComponent {
    ObjectStorage,
    BlockStorage,
    FileStorage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityComponent {
    IdentityProvider,
    SecretManager,
    CertificateManager,
    Waf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ObservabilityComponent {
    Logging,
    Monitoring,
    Tracing,
    Alerting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GroupType {
    NetworkBoundary,   // VPC / VNet / VPC Network
    AvailabilityZone,
    Region,
    ServiceCluster,    // Logical grouping of related services
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeProperties {
    /// Architecture-level configuration (replicas, throughput, storage size, etc.)
    pub config: serde_json::Value,
    /// Display-specific properties
    pub style: Option<NodeStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStyle {
    pub color: Option<String>,
    pub icon: Option<String>,
    pub opacity: Option<f64>,
}

/// Provider-specific service mappings for a generic node.
/// Populated when user triggers "Translate to AWS/GCP/Azure".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMappings {
    pub aws: Option<ProviderMapping>,
    pub gcp: Option<ProviderMapping>,
    pub azure: Option<ProviderMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMapping {
    /// Provider-specific service name (e.g., "ALB", "Cloud Load Balancing", "Azure Load Balancer")
    pub service_name: String,
    /// Provider-specific icon key
    pub icon_key: String,
    /// Provider-specific configuration (instance type, SKU, etc.)
    pub config: serde_json::Value,
    /// Terraform resource type (e.g., "aws_lb", "google_compute_backend_service")
    pub terraform_resource_type: Option<String>,
}
```

```rust
// nimbus-domain/src/entities/edge.rs

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: Uuid,
    pub source_id: Uuid,
    pub target_id: Uuid,
    pub edge_type: EdgeType,
    pub label: Option<String>,
    pub properties: EdgeProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeType {
    Synchronous,    // HTTP, gRPC, direct call
    Asynchronous,   // Message queue, event bus
    DataFlow,       // Data replication, ETL
    Dependency,     // Soft dependency
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeProperties {
    pub protocol: Option<String>,     // "HTTP", "gRPC", "AMQP", "TCP", etc.
    pub port: Option<u16>,
    pub bidirectional: bool,
    pub communication_pattern: Option<CommunicationPattern>,
    pub style: Option<EdgeStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommunicationPattern {
    RequestResponse,
    FireAndForget,
    PublishSubscribe,
    Streaming,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeStyle {
    pub color: Option<String>,
    pub dash_pattern: Option<Vec<f64>>,
    pub thickness: Option<f64>,
}
```

### Cloud Translation Models

```rust
// nimbus-domain/src/entities/cloud_catalog.rs

/// Defines how a generic component maps to a specific cloud provider service.
pub struct CloudServiceMapping {
    pub generic_type: NodeType,
    pub provider: CloudProvider,
    pub service_name: String,
    pub display_name: String,
    pub icon_key: String,
    pub terraform_resource_type: String,
    pub default_config: serde_json::Value,
    /// Some generic components have multiple valid mappings per provider.
    /// e.g., "Container" → ECS or EKS on AWS. This field ranks them.
    pub priority: u8,
}

/// Returns the full catalog of cloud service mappings.
pub fn cloud_catalog() -> Vec<CloudServiceMapping> { /* ... */ }

/// Translate a generic diagram to a specific cloud provider.
/// Returns a new diagram with provider_mappings populated on each node.
pub fn translate_to_provider(diagram: &Diagram, provider: CloudProvider) -> Diagram { /* ... */ }
```

```rust
// nimbus-domain/src/entities/docker_catalog.rs

/// Defines how a generic component maps to a Docker Compose service.
pub struct DockerServiceMapping {
    pub generic_type: NodeType,
    pub image: String,              // e.g., "postgres:16-alpine"
    pub default_ports: Vec<String>, // e.g., ["5432:5432"]
    pub environment: Vec<(String, String)>,  // default env vars
    pub volumes: Vec<String>,       // e.g., ["data:/var/lib/postgresql/data"]
    pub is_placeholder: bool,       // true for user app images (needs manual fill)
}

pub fn docker_catalog() -> Vec<DockerServiceMapping> { /* ... */ }
```

### API Request/Response DTOs

```rust
// nimbus-api/src/dto/

#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub prompt: String,
    pub existing_diagram_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct TranslateRequest {
    pub provider: CloudProvider,
}

#[derive(Debug, Deserialize)]
pub struct CreateDiagramRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDiagramRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<Node>>,
    pub edges: Option<Vec<Edge>>,
    pub viewport: Option<Viewport>,
}

#[derive(Debug, Serialize)]
pub struct DiagramListItem {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub node_count: usize,
    pub active_provider: Option<CloudProvider>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct TerraformExportResponse {
    pub files: Vec<TerraformFile>,
}

#[derive(Debug, Serialize)]
pub struct TerraformFile {
    pub filename: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct DockerComposeExportResponse {
    pub filename: String,  // "docker-compose.yml"
    pub content: String,   // YAML content
}
```

---

## TypeScript Interfaces (Frontend)

```typescript
// domain/models/diagram.model.ts

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
  activeProvider?: CloudProvider;
  createdAt: string;
  updatedAt: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type CloudProvider = 'Aws' | 'Gcp' | 'Azure';

export interface DiagramListItem {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  activeProvider?: CloudProvider;
  updatedAt: string;
}
```

```typescript
// domain/models/node.model.ts

export interface DiagramNode {
  id: string;
  nodeType: NodeType;
  label: string;
  position: Position;
  size: Size;
  properties: NodeProperties;
  parentId?: string;
  providerMappings?: ProviderMappings;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeType {
  category: NodeCategory;
  component: string;
}

export type NodeCategory =
  | 'Compute'
  | 'Networking'
  | 'Data'
  | 'Caching'
  | 'Messaging'
  | 'Storage'
  | 'Security'
  | 'Observability'
  | 'Group';

export interface NodeProperties {
  config: Record<string, unknown>;
  style?: NodeStyle;
}

export interface NodeStyle {
  color?: string;
  icon?: string;
  opacity?: number;
}

export interface ProviderMappings {
  aws?: ProviderMapping;
  gcp?: ProviderMapping;
  azure?: ProviderMapping;
}

export interface ProviderMapping {
  serviceName: string;
  iconKey: string;
  config: Record<string, unknown>;
  terraformResourceType?: string;
}
```

```typescript
// domain/models/edge.model.ts

export interface DiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  label?: string;
  properties: EdgeProperties;
}

export type EdgeType = 'Synchronous' | 'Asynchronous' | 'DataFlow' | 'Dependency';

export interface EdgeProperties {
  protocol?: string;
  port?: number;
  bidirectional: boolean;
  communicationPattern?: CommunicationPattern;
  style?: EdgeStyle;
}

export type CommunicationPattern = 'RequestResponse' | 'FireAndForget' | 'PublishSubscribe' | 'Streaming';

export interface EdgeStyle {
  color?: string;
  dashPattern?: number[];
  thickness?: number;
}
```

---

## Database Schema (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE diagrams (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    viewport         JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
    active_provider  VARCHAR(10),     -- NULL (generic), 'Aws', 'Gcp', 'Azure'
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nodes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id        UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    node_type         JSONB NOT NULL,          -- { "category": "Compute", "component": "ApplicationServer" }
    label             VARCHAR(255) NOT NULL,
    position_x        DOUBLE PRECISION NOT NULL,
    position_y        DOUBLE PRECISION NOT NULL,
    width             DOUBLE PRECISION NOT NULL DEFAULT 120,
    height            DOUBLE PRECISION NOT NULL DEFAULT 80,
    properties        JSONB NOT NULL DEFAULT '{}',
    parent_id         UUID REFERENCES nodes(id) ON DELETE SET NULL,
    provider_mappings JSONB,          -- { "aws": {...}, "gcp": {...}, "azure": {...} }
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE edges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id  UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    source_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    edge_type   VARCHAR(50) NOT NULL DEFAULT 'Synchronous',
    label       VARCHAR(255),
    properties  JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nodes_diagram_id ON nodes(diagram_id);
CREATE INDEX idx_edges_diagram_id ON edges(diagram_id);
CREATE INDEX idx_edges_source_id ON edges(source_id);
CREATE INDEX idx_edges_target_id ON edges(target_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
```

### Notes on Schema Design
- **Nodes and edges are stored relationally** rather than as a single JSONB blob — enables efficient partial updates and queries
- **`node_type` as JSONB**: Uses generic component taxonomy `{ "category": "Compute", "component": "ApplicationServer" }` — cloud-agnostic by default
- **`provider_mappings` as JSONB**: Stores per-provider translations inline on each node. `NULL` when no translation has been applied
- **`active_provider`**: Tracks which cloud provider overlay the diagram is currently displaying. `NULL` = generic view
- **`properties` as JSONB**: Flexible per-component configuration without schema changes
- **`parent_id` self-reference**: Models containment (server inside network boundary inside region) as a tree
- **Cascade deletes**: Deleting a diagram removes all its nodes and edges; deleting a node removes its edges
