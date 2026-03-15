# Nimbus — Technical Challenges

## 1. AI Structured Output for System Design

### Challenge
Claude must return valid JSON matching our diagram schema — not free-form text. The output needs cloud-agnostic components from our taxonomy, valid UUIDs, positions, and meaningful edge types. The AI must also understand system design patterns and produce architecturally sound diagrams.

### Approach
- **System prompt engineering**: Provide the exact JSON schema, component taxonomy, and examples. The system prompt encodes Nimbus's philosophy: generic components, architecture patterns, no cloud-specific services
- **Tool use / structured output**: Use Claude's tool use feature to enforce the output schema — define a `create_diagram` tool with the schema as parameters
- **Architecture awareness**: The system prompt includes system design concepts (CAP theorem, microservices patterns, event-driven patterns) so the AI produces meaningful architectures, not just boxes and arrows
- **Validation layer**: `nimbus-domain::services::validation_service` validates every field after parsing. Invalid nodes/edges are dropped with warnings rather than failing the entire generation
- **Fallback**: If structured output fails, attempt a second call with a more constrained prompt. After 3 failures, return an error to the user

### Risks
- AI may generate invalid component combinations (e.g., a message queue inside a cache group)
- AI may produce overlapping node positions
- AI may default to cloud-specific thinking despite generic taxonomy instructions
- Mitigation: post-processing validation and auto-layout fix structural issues; strong system prompt examples reinforce generic components

## 2. Diagram Validation Rules

### Challenge
Defining useful validation rules that catch real architectural problems without being noisy. Rules must work on generic components (not cloud-specific) and produce actionable warnings that AI can fix.

### Approach
- **Rule categories**:
  - **Structural**: orphan nodes (no connections), self-referencing edges, duplicate IDs
  - **Redundancy**: load balancer with single target, single point of failure detection
  - **Containment**: invalid nesting (e.g., a network boundary inside a compute node)
  - **Connectivity**: circular synchronous dependencies, missing data flow paths
  - **Best practices**: no observability components, no security components, no caching for read-heavy paths
- **Severity levels**: Error (broken), Warning (likely problem), Info (suggestion)
- Rules are pure functions in the domain layer — no IO, fully testable
- Each rule has a stable `rule` identifier (e.g., `SINGLE_TARGET_LB`) so the AI fix endpoint can reference it

### AI Fix Integration
- When the user clicks "Fix with AI" on a warning, only the specific warning + current diagram are sent to the AI
- The AI is instructed to make the **minimal change** to resolve the issue
- The fix is streamed via SSE (same format as generate/modify) so the user sees changes appear
- Fix is a single undo step

## 3. Cloud Provider Translation

### Challenge
Translating generic components to cloud-specific services is not a simple 1:1 mapping. Some generic components have multiple valid translations per provider, and the best choice depends on context (e.g., "Container" on AWS could be ECS, EKS, or Fargate depending on the architecture).

### Approach
- **Static mapping catalog**: A `cloud_catalog` in the domain layer defines all generic → provider mappings with priorities
- **Context-aware translation**: For ambiguous mappings, use AI to choose the best provider service based on the full diagram context (e.g., if there's a service mesh, prefer EKS over ECS)
- **Provider overlay model**: Translation doesn't modify the generic diagram — it adds `provider_mappings` alongside the generic `node_type`. Users can switch providers without losing the generic model
- **Progressive enhancement**: Start with static mappings (MVP), add AI-assisted context-aware translation later

### Complexity
- AWS has ~200 services, GCP ~150, Azure ~200. We don't need all of them — focus on the top ~30 per provider that map to our generic taxonomy
- Some components don't have direct equivalents across all providers. Surface this to the user as a warning

## 4. Canvas Performance

### Challenge
Large diagrams (50+ nodes) need smooth 60fps rendering with drag, zoom, and selection interactions.

### Approach
- **HTML5 Canvas** (not SVG/DOM): Avoids DOM node overhead. All rendering is draw calls on a 2D context
- **Dirty rectangle rendering**: Only re-render the region of the canvas that changed (e.g., only the area around a dragged node), not the entire canvas
- **Off-screen canvas**: Pre-render static elements (grid, non-selected nodes) to an off-screen canvas. Composite on each frame
- **Throttled re-renders**: Use `requestAnimationFrame` and skip frames if nothing changed
- **Level-of-detail**: At low zoom levels, simplify node rendering (no icons, just colored rectangles with labels)

### Benchmarks to Target
- 100 nodes + 150 edges: 60fps during drag operations
- 500 nodes: 30fps minimum during pan/zoom

## 5. Auto-Layout Algorithm

### Challenge
AI-generated diagrams need sensible spatial layout. Nodes should be arranged logically: left-to-right data flow, proper containment within groups, no overlaps.

### Approach
- Implement a simplified **layered graph layout** (Sugiyama-style) in Rust:
  1. **Layer assignment**: Topological sort assigns each node a horizontal layer
  2. **Ordering**: Minimize edge crossings within each layer via barycenter heuristic
  3. **Coordinate assignment**: Brandes-Kopf algorithm for compact positioning
  4. **Group containment**: After positioning, expand group nodes (network boundaries, service clusters) to enclose their children with padding
- The algorithm runs on the backend so it can be applied during AI generation before sending to the frontend

### Complexity
- This is the hardest algorithmic piece. Start with a simple topological sort + grid placement for MVP
- Iterate toward a proper Sugiyama implementation in Phase 2
- Consider integrating an existing layout library (e.g., port ELK's algorithm concepts) if custom implementation proves insufficient

## 6. Streaming AI Responses

### Challenge
AI diagram generation can take 5-15 seconds. Users need visual feedback during this time — seeing nodes appear one by one rather than waiting for a blank screen.

### Approach
- **Server-Sent Events (SSE)**: Backend streams events to the frontend as the AI generates output
- **Chunked parsing**: The AI client parses Claude's streaming response, extracting complete JSON objects (nodes/edges) as they appear
- **Progressive rendering**: Frontend adds each node to the canvas as its event arrives. Edges are added once both endpoint nodes exist
- **Layout refinement**: Run a quick layout pass after each batch of nodes to prevent visual chaos during streaming

### Edge Cases
- Partial JSON in a stream chunk: buffer and wait for the complete object
- Edge references a node not yet received: queue the edge, apply when the target node arrives
- User cancels generation mid-stream: close the SSE connection, keep whatever was generated so far

## 7. Node Containment Model

### Challenge
System architectures are hierarchical: Region → Network Boundary → Service Cluster → Individual Services. Nodes must visually nest inside group nodes, and this containment must be maintained during drag operations.

### Approach
- **Data model**: `parent_id` field on nodes creates a tree structure
- **Group rendering**: Group nodes render as expanded rectangles. Children are positioned relative to the group's origin
- **Drag behavior**: Dragging a group moves all its children. Dragging a child keeps it within the group bounds (with visual clamping)
- **Drop-into-group**: Dragging a node over a group highlights it. Dropping sets `parent_id` and repositions within the group
- **Group resize**: Groups auto-resize to fit their children (with padding). Manual resize is also supported with a minimum size that fits all children

## 8. Undo/Redo System

### Challenge
Every user action (drag, add, delete, AI generation, cloud translation) must be undoable. The state can be complex (many nodes + edges changed at once during AI generation).

### Approach
- **Snapshot-based**: Store full diagram snapshots on each undoable action
- **Optimization**: Use structural sharing (only clone the changed parts) to reduce memory
- **Batching**: AI generation events are batched into a single undo step ("Undo AI generation" removes all generated nodes/edges at once). Cloud translation is also a single undo step
- **Stack limits**: Cap at 50 undo steps to bound memory usage

### Alternative Considered
- Command pattern (store individual operations + inverse operations): More memory efficient but significantly more complex to implement correctly, especially for compound operations like AI generation

## 9. Docker Compose Generation

### Challenge
Generating a useful `docker-compose.yml` from a generic architecture diagram. The mapping must produce a file that actually runs locally with `docker compose up`, not just a symbolic representation.

### Approach
- **Docker catalog**: A `docker_catalog` maps each generic component to a Docker image, default ports, environment variables, and volume mounts
- **Service naming**: Derive service names from node labels, sanitized to valid Docker Compose service names (lowercase, hyphens)
- **Dependencies**: Edges → `depends_on` entries. Respect startup order (DB before app server)
- **Networks**: Group nodes (Network Boundary) → Docker `networks`. Nodes in the same group share a network
- **Volumes**: Stateful components (databases, storage) get named volumes
- **Placeholder images**: User application services (Application Server, Worker) get `<your-image>` placeholders with TODO comments
- **Environment variables**: Databases get default credentials (with TODO: change in production), app servers get connection strings pointing to their dependencies

### Edge Cases
- Components with no Docker equivalent (CDN, DNS, WAF): skip with a YAML comment explaining why
- Multi-container components (Kafka = broker + zookeeper): generate multiple services from one node
- Port conflicts: auto-increment host ports when multiple services expose the same port

## 10. Terraform Code Generation

### Challenge
Generating valid, idiomatic Terraform HCL from a visual diagram. Each node maps to one or more Terraform resources, and edges define resource dependencies.

### Approach
- **Resource templates**: Each `terraform_resource_type` in the provider mapping has a corresponding HCL template with interpolation points
- **Dependency graph**: Edges between nodes translate to Terraform resource references (`depends_on` or direct attribute references)
- **File organization**: Generate `main.tf` (resources), `variables.tf` (configurable values), `outputs.tf` (useful outputs), `providers.tf` (provider config)
- **Validation**: Optionally run `terraform validate` on the generated code (requires terraform CLI on the backend)

### Risks
- Generated Terraform may not be complete enough to `apply` without manual edits (missing required fields, credentials, etc.)
- Mitigation: Generate with sensible defaults and TODO comments for fields that need user input

## 11. Cross-Stack Type Consistency

### Challenge
Rust backend and Angular frontend must agree on data shapes. A change to a Rust struct must be reflected in the TypeScript interface, or API calls will silently break.

### Approach
- **Source of truth**: Rust structs are the source of truth
- **Manual sync for MVP**: Keep TypeScript interfaces manually aligned. The API boundary doc (04-api-boundary.md) serves as the contract
- **Future**: Consider code generation (e.g., `ts-rs` crate to auto-generate TypeScript types from Rust structs, or OpenAPI spec generation from Axum routes via `utoipa`)
- **Integration tests**: Backend integration tests verify that serialized JSON matches expected shapes
