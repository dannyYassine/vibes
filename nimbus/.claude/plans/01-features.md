# Nimbus — Feature Breakdown

## AI Philosophy

AI is used only where human effort would be disproportionate or where creative/analytical reasoning is needed. Deterministic operations (cloud translation, Terraform generation, Docker Compose generation) do **not** use AI — they use static mappings and templates.

**Where AI is used:**
1. Natural language → diagram generation (creative interpretation)
2. AI assistant for on-demand modifications ("add a cache layer here")
3. Diagram validation + AI-powered fix suggestions

**Where AI is NOT used:**
- Cloud provider translation (static catalog lookup)
- Terraform export (template-based code generation)
- Docker Compose export (template-based code generation)
- Layout algorithms (deterministic graph layout)

---

## System Design Knowledge

Nimbus must deeply understand system design concepts to generate meaningful architectures. This knowledge is embedded in the AI system prompt, the validation rules, and the component library.

### Architecture Styles
The app must understand when and how to apply each style:

| Style | When to use | Key characteristics |
|-------|------------|---------------------|
| **Monolith** | Small teams, early-stage, simple domains | Single deployable unit, shared DB, internal method calls |
| **Modular Monolith** | Medium complexity, want monolith simplicity with clean boundaries | Single deployable, but internal module boundaries enforced |
| **Microservices** | Large teams, independent deployability, polyglot needs | Service per bounded context, independent DBs, API communication |
| **Event-Driven** | Loose coupling, async workflows, audit trails | Event bus/stream, producers/consumers, eventual consistency |
| **CQRS** | Read/write asymmetry, complex queries | Separate read/write models, often paired with event sourcing |
| **Serverless** | Sporadic traffic, minimal ops, quick prototyping | Functions, managed services, pay-per-invocation |
| **Service-Oriented (SOA)** | Enterprise integration, legacy modernization | Coarser-grained services, ESB, shared data contracts |
| **Hexagonal / Ports & Adapters** | Testability, swappable infrastructure | Core domain isolated, adapters for IO |
| **Pipe & Filter** | Data processing, ETL, stream processing | Sequential stages, each transforms data |
| **Client-Server** | Web apps, mobile backends | Clear frontend/backend split |
| **Peer-to-Peer** | Distributed compute, file sharing | No central server, nodes are equal |
| **Layered / N-Tier** | Traditional enterprise apps, clear separation of concerns | Presentation → Business Logic → Data Access layers |
| **Space-Based** | Extreme scalability, low-latency, unpredictable spikes | In-memory data grids, processing units, no central DB bottleneck |

### Distributed System Patterns
The AI and validation rules must understand these patterns:

**Communication Patterns:**
- Request/Response (HTTP, gRPC)
- Publish/Subscribe (event bus, topics)
- Message Queue (point-to-point, work queues)
- Streaming (continuous data flow, Kafka-style)
- API Gateway (single entry point, routing, auth)
- Service Mesh (sidecar proxies, mTLS, observability)
- Backend for Frontend (BFF) (per-client API layer)
- Service Discovery (registry-based via Consul/Eureka, or DNS-based)
- API Composition / Gateway Aggregation (aggregate multiple downstream calls into one response)

**Background Processing Patterns:**
- Job Queue / Task Queue (app server pushes jobs → broker → workers pull and execute)
- Scheduled Jobs / Cron (periodic background tasks)
- Worker Pool (multiple workers competing for jobs from a shared queue)
- Priority Queues (high/low priority job lanes)
- Delayed Jobs (execute after a delay or at a specific time)
- Job Retry / Dead Letter Queue (failed jobs → retry with backoff → DLQ after max attempts)
- Fan-Out Workers (one job triggers multiple parallel sub-tasks)
- Pipeline / Chain (job A completes → triggers job B → triggers job C)

**Resilience Patterns:**
- Circuit Breaker (fail fast when downstream is unhealthy)
- Bulkhead (isolate failures to prevent cascade)
- Retry with Backoff (transient failure recovery)
- Timeout (bound wait time for responses)
- Fallback (degrade gracefully)
- Health Check (liveness/readiness probes)
- Load Shedding (drop low-priority requests under pressure)
- Rate Limiting (reject excess requests to protect capacity)
- Graceful Degradation (serve partial results instead of failing entirely)

**Data Patterns:**
- Database per Service (microservices data isolation)
- Shared Database (monolith, simpler but coupled)
- Saga (distributed transactions via choreography or orchestration)
- Event Sourcing (store events, derive state)
- CQRS (separate read/write models)
- Change Data Capture (CDC) (DB changes → event stream)
- Data Replication (leader/follower, multi-region)
- Transactional Outbox (reliable event publishing alongside DB writes)
- Materialized View (pre-computed read-optimized projections)
- Polyglot Persistence (different DB types for different services based on access patterns)

**Scalability Patterns:**
- Horizontal Scaling (add more instances behind LB)
- Vertical Scaling (bigger instance)
- Sharding (partition data across nodes)
- Caching (read-through, write-behind, cache-aside)
- CDN (static content at the edge)
- Read Replicas (offload read queries)
- Auto-Scaling (scale based on metrics)
- Queue-Based Load Leveling (buffer request spikes via queue)
- Competing Consumers (multiple consumers processing from the same queue)

**Deployment Patterns:**
- Blue/Green Deployment
- Canary Deployment
- Rolling Update
- Feature Flags
- Sidecar (attach helper process to main service)
- Ambassador (proxy outbound connections)
- Shadow / Dark Launch (mirror production traffic to new version without affecting users)
- Immutable Infrastructure (replace instances, never patch in-place)

**Security Patterns:**
- Zero Trust (verify every request)
- API Key / OAuth2 / JWT
- mTLS (mutual TLS between services)
- Secret Management (vault, rotation)
- WAF (web application firewall at edge)
- Network Segmentation (private/public subnets)

**Integration & Migration Patterns:**
- Strangler Fig (incrementally replace legacy system piece by piece)
- Anti-Corruption Layer (translate between bounded contexts to prevent model leakage)

### Concepts the AI Must Reason About
- CAP theorem (consistency vs availability vs partition tolerance)
- Eventual consistency vs strong consistency
- Idempotency (safe retries)
- Back-pressure (flow control)
- Single point of failure (SPOF) detection
- Blast radius (failure isolation)
- Cold start (serverless latency)
- Connection pooling
- Rate limiting / throttling
- Dead letter queues (failed message handling)
- Leader Election (choosing a coordinator in distributed systems)
- Distributed Locking (mutual exclusion across nodes)
- Consensus Protocols (Raft, Paxos — how nodes agree on state)
- Two-Phase Commit (atomic distributed transactions)
- Compensating Transactions (rollback steps in saga failures)
- Correlation ID (tracing a request across service boundaries)
- Service Discovery (how services find each other at runtime)

---

## Phase 1: MVP Core

### F1.1 — Natural Language Input
- Text input area for describing system architecture
- Prompt understands all architecture styles, patterns, and concepts listed above
- AI generates diagrams using **generic, cloud-agnostic components** (not AWS/GCP/Azure-specific)
- Display loading state during generation
- Show error messages for failed generation

### F1.2 — Diagram Canvas
- Render nodes (generic architecture icons + labels) on an HTML5 Canvas
- Render edges (connections between nodes) with directional arrows
- Pan: click-drag on empty canvas area
- Zoom: scroll wheel with min/max bounds
- Select: click on a node to select it, click on empty area to deselect
- Multi-select: shift-click or drag selection box
- Grid: optional snap-to-grid for alignment

### F1.3 — Node Manipulation
- Drag to reposition nodes
- Resize group nodes (network boundaries, service clusters)
- Delete selected nodes (with confirmation for groups)
- Edit node properties via sidebar panel (name, type, config)
- **Add nodes manually**: drag from component library onto canvas, or right-click canvas → "Add node"

### F1.4 — Edge Manipulation
- Draw connections: drag from node port to another node
- Delete connections
- Edge routing: straight lines with elbow connectors for clarity
- Edge labels for protocol/communication type (HTTP, gRPC, async, etc.)

### F1.5 — Generic Component Library
- Cloud-agnostic component categories:
  - **Compute**: Application Server, Worker, Function (serverless), Container, VM, Scheduler (cron/periodic jobs)
  - **Networking**: Load Balancer, API Gateway, CDN, DNS, Firewall, VPN, Service Mesh, Reverse Proxy
  - **Data**: Relational DB, Document DB, Key-Value Store, Graph DB, Data Warehouse, Search Engine, Time-Series DB
  - **Caching**: Cache, Session Store
  - **Messaging**: Message Queue, Event Bus, Pub/Sub, Stream Processor, Job Broker (task queue with workers)
  - **Storage**: Object Storage, Block Storage, File Storage
  - **Security**: Identity Provider, Secret Manager, Certificate Manager, WAF
  - **Observability**: Logging, Monitoring, Tracing, Alerting
  - **Groups**: Network Boundary, Availability Zone, Region, Service Cluster, Custom Group
- Sidebar panel with categorized components
- Drag from library onto canvas to add nodes
- Search/filter components

### F1.6 — Diagram Persistence
- Save diagram to backend (auto-save on change, debounced)
- Load diagram by ID
- List user's saved diagrams
- Delete diagrams

### F1.7 — Export
- Export diagram as PNG image
- Export diagram as JSON (for reimport)

---

## Phase 2: AI Assistant & Validation

### F2.1 — AI Assistant (On-Demand Modifications)
- Chat panel alongside the canvas for conversational interaction
- User can ask the AI to modify the current diagram:
  - "Add a cache layer between the API gateway and the database"
  - "Split the monolith into three microservices"
  - "Add a message queue between the order service and payment service"
  - "What's missing from this architecture for high availability?"
  - "Add a circuit breaker between service A and service B"
  - "Convert this to an event-driven architecture"
  - "Add a saga orchestrator for the checkout flow"
- AI sees the full current diagram context (all nodes, edges, groups) and returns targeted changes (add/remove/update)
- Changes apply to the canvas in real-time
- Chat history persisted per diagram
- Undo/redo support for AI-generated changes
- AI always outputs generic components — never cloud-specific

### F2.2 — Diagram Validation + AI Fix
- **Validate button**: runs deterministic validation rules on the diagram
  - Orphan nodes (no connections)
  - Missing common patterns (e.g., load balancer with only one target)
  - Invalid containment (wrong nesting)
  - Circular synchronous dependencies
  - Single point of failure detection
  - Missing observability / security components (warnings, not errors)
  - Database without backup/replication warning
  - Synchronous chain too deep (latency risk)
  - Message queue without dead letter queue
- Validation results displayed as a list of warnings/errors with severity levels
- Each warning highlights the relevant node(s) on the canvas
- **"Fix with AI" button** on each validation warning:
  - Sends the specific validation issue + current diagram to AI
  - AI suggests a fix (add a node, rearrange edges, etc.)
  - User previews the fix before applying
  - Single undo step for the fix

### F2.3 — Undo/Redo
- Full undo/redo stack for all diagram mutations (manual edits, AI modifications, AI fixes)
- Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z

### F2.4 — Auto-Layout
- Automatic layout algorithm (dagre/ELK-style) for generated diagrams
- Manual trigger to re-layout existing diagrams
- Layout preserves group containment (nodes stay in their network boundary/cluster)

---

## Phase 3: Cloud Translation & Export

### F3.1 — Cloud Provider Translation (No AI)
- **One-click translation button**: translates entire generic diagram to a specific cloud provider
- Supported providers: AWS, GCP, Azure
- **Static catalog mapping** — deterministic, no AI involved
- Translation mapping examples:
  | Generic | AWS | GCP | Azure |
  |---------|-----|-----|-------|
  | Load Balancer | ALB/NLB | Cloud Load Balancing | Azure Load Balancer |
  | Application Server | EC2 / ECS | Compute Engine / Cloud Run | App Service / AKS |
  | Relational DB | RDS / Aurora | Cloud SQL / AlloyDB | Azure SQL / Cosmos DB |
  | Message Queue | SQS | Cloud Tasks / Pub/Sub | Azure Queue Storage |
  | Object Storage | S3 | Cloud Storage | Blob Storage |
  | Function | Lambda | Cloud Functions | Azure Functions |
  | API Gateway | API Gateway | API Gateway / Apigee | API Management |
  | Container | ECS / EKS | GKE / Cloud Run | AKS / Container Apps |
  | Key-Value Store | DynamoDB | Firestore / Bigtable | Cosmos DB |
  | CDN | CloudFront | Cloud CDN | Azure CDN |
- Diagram retains generic model internally — translation creates a **provider overlay**
- User can switch between providers to compare
- Provider-specific icons and labels shown when a provider is active
- Node properties panel shows provider-specific config when translated

### F3.2 — Terraform Export (No AI)
- **Template-based code generation** — deterministic, no AI involved
- Generate Terraform HCL from a provider-translated diagram
- Each node's `terraform_resource_type` maps to an HCL resource template
- Generates proper resource dependencies based on edges
- Provider blocks, variable definitions, output blocks included
- Export as downloadable `.tf` files or zip archive
- TODO comments for fields that need user input (credentials, region, etc.)

### F3.3 — Docker Compose Export (No AI)
- **Template-based code generation** — deterministic, no AI involved
- Generate `docker-compose.yml` from the generic diagram (no cloud translation required)
- Each component maps to a known Docker image or placeholder:
  | Generic Component | Docker Image | Notes |
  |---|---|---|
  | Application Server | `<user-app-image>` | Placeholder — user fills in their image |
  | Worker | `<user-worker-image>` | Placeholder |
  | Relational DB | `postgres:16` / `mysql:8` | Configurable via node properties |
  | Document DB | `mongo:7` | |
  | Key-Value Store | `redis:7` | |
  | Cache | `redis:7` | |
  | Message Queue | `rabbitmq:3-management` | |
  | Event Bus | `nats:latest` | |
  | Stream Processor | `confluentinc/cp-kafka` + `cp-zookeeper` | Multi-container |
  | Job Broker | `rabbitmq:3-management` | Workers pull jobs from broker |
  | Scheduler | `mcuadros/ofelia` | Cron-style job scheduler |
  | Search Engine | `elasticsearch:8` | |
  | Time-Series DB | `timescale/timescaledb` | |
  | Object Storage | `minio/minio` | S3-compatible |
  | Reverse Proxy | `nginx:alpine` / `traefik:v3` | |
  | Identity Provider | `keycloak/keycloak` | |
  | Monitoring | `prom/prometheus` | |
  | Logging | `grafana/loki` | |
  | Tracing | `jaegertracing/all-in-one` | |
  | Alerting | `grafana/grafana` | |
  | Graph DB | `neo4j:5` | |
  | Data Warehouse | *(skip — no good Docker equivalent)* | |
- Edges → `depends_on` relationships between services
- Group nodes (Network Boundary) → Docker `networks`
- Port mappings derived from edge protocols (HTTP → 80/443, gRPC → 50051, etc.)
- Environment variables with sensible defaults and TODO placeholders
- Volume mounts for stateful services (databases, storage)
- Export as downloadable `docker-compose.yml` file
- Works on the **generic diagram** — no cloud translation needed (this is for local dev)

---

## Phase 4: Advanced Features

### F4.1 — Architecture Patterns Library
- Pre-built system design patterns as templates:
  - **Structural**: 3-tier web app, modular monolith, microservices with API gateway, hexagonal architecture
  - **Communication**: event-driven, CQRS + event sourcing, saga orchestration, pub/sub fan-out
  - **Data**: data pipeline (ETL), CDC replication, polyglot persistence, read replica setup
  - **Deployment**: blue/green, canary, multi-region active-active
  - **Background Processing**: job queue with workers, scheduled task runner, fan-out pipeline
  - **Serverless**: serverless API, event-processing pipeline, scheduled jobs
- User can start from a pattern and customize

### F4.2 — Cost Estimation
- Show estimated monthly cost per node (after cloud translation)
- Total diagram cost summary per provider
- Cost comparison table across AWS vs GCP vs Azure

### F4.3 — Real-Time Collaboration
- Multiple users editing the same diagram
- Cursor presence (see where others are working)
- Conflict resolution for concurrent edits

### F4.4 — Diagram Versioning
- Version history for each diagram
- Diff view between versions
- Restore previous versions

---

## Feature Priority Matrix

| Feature | Impact | Effort | AI? | Priority |
|---------|--------|--------|-----|----------|
| Natural Language → Diagram | High | Medium | Yes | P0 |
| Diagram Canvas | High | High | No | P0 |
| Node/Edge Manipulation | High | Medium | No | P0 |
| Generic Component Library | High | Medium | No | P0 |
| Diagram Persistence | High | Low | No | P0 |
| Export (PNG/JSON) | Medium | Low | No | P0 |
| AI Assistant (modifications) | High | High | Yes | P1 |
| Diagram Validation | High | Medium | No | P1 |
| AI Fix for Validation | Medium | Medium | Yes | P1 |
| Undo/Redo | Medium | Medium | No | P1 |
| Auto-Layout | Medium | High | No | P1 |
| Cloud Provider Translation | High | High | No | P1 |
| Terraform Export | High | Medium | No | P1 |
| Docker Compose Export | High | Medium | No | P1 |
| Architecture Patterns | Medium | Medium | No | P2 |
| Cost Estimation | Medium | Medium | No | P2 |
| Versioning | Medium | Medium | No | P2 |
| Real-Time Collab | Medium | Very High | No | P3 |

---

## AI Prompt Strategy

The AI is used in three scenarios, each with a tailored prompt:

### 1. Generate Diagram (from scratch)

System prompt includes:
- **Role**: "You are a system design architect. You help users design software architectures — monoliths, distributed systems, microservices, event-driven systems, and more."
- **Knowledge base**: Full understanding of all architecture styles, distributed system patterns, resilience patterns, data patterns, scalability patterns, and deployment patterns listed in the System Design Knowledge section above
- **Output format**: Generic, cloud-agnostic components using Nimbus's component taxonomy (Compute, Networking, Data, Messaging, etc.)
- **Design thinking**: Consider scalability, reliability, consistency trade-offs. Apply appropriate patterns based on the user's requirements. Don't over-engineer — match complexity to the problem.
- **Architecture styles**: Understand monolith vs microservices vs serverless vs hybrid. Don't default to one style — match the user's requirements. A simple CRUD app doesn't need microservices.
- **No cloud assumptions**: Never use AWS/GCP/Azure-specific service names. Use generic component names only.
- **Structured output**: JSON matching the Nimbus node/edge schema with generic `NodeType` values.

### 2. AI Assistant (modify existing diagram)

System prompt includes everything from #1, plus:
- The full current diagram as context (all nodes, edges, groups serialized as JSON)
- Instruction to return **only the changes** (nodes/edges to add, remove, or update) — not the full diagram
- Awareness of what the user has selected (if any nodes are selected, changes should target that area)
- Understanding of how changes affect the broader system (e.g., adding a cache affects data consistency)

### 3. AI Fix (for validation issues)

System prompt includes everything from #1, plus:
- The specific validation warning/error that needs fixing
- The full current diagram as context
- Instruction to return a **minimal, targeted fix** — don't restructure the whole diagram
- The fix should resolve the specific validation issue and nothing more
