# Nimbus — Implementation Phases

## Phase 1: Foundation (Weeks 1–2)

### Week 1: Project Scaffolding & Core Models

**Backend:**
- [ ] Initialize Cargo workspace with five crates (`nimbus-api`, `nimbus-app`, `nimbus-domain`, `nimbus-infra`, `nimbus-shared`)
- [ ] Define all domain entities in `nimbus-domain` (Diagram, Node, Edge, NodeType, etc.)
- [ ] Define port traits in `nimbus-domain` (`DiagramRepository`, `AiProvider`)
- [ ] Set up Axum server with health check endpoint in `nimbus-api`
- [ ] Configure CORS (tower-http), logging (tracing), and error handling middleware
- [ ] Set up PostgreSQL with Docker Compose
- [ ] Write initial SQL migration (diagrams, nodes, edges tables)
- [ ] Implement `PostgresDiagramRepo` in `nimbus-infra` (impl DiagramRepository)
- [ ] Wire dependency injection in `main.rs` (Arc<dyn Trait> → concrete impls)

**Frontend:**
- [ ] Initialize Angular project with standalone components
- [ ] Set up routing (`/diagrams`, `/diagrams/:id`)
- [ ] Create domain layer: TypeScript models and repository/provider interfaces
- [ ] Create infrastructure layer: `ApiGateway` (impl DiagramRepository), DI token wiring
- [ ] Create application layer: `DiagramFacade` with BehaviorSubjects
- [ ] Create presentation layer: basic layout shell (toolbar, canvas area, sidebar panel)

**Deliverable:** Backend serves API, frontend renders empty editor layout, end-to-end POST/GET diagram works.

### Week 2: Canvas Basics

**Frontend:**
- [ ] Implement `CanvasComponent` with HTML5 Canvas setup
- [ ] Implement `GridRenderer` (background grid)
- [ ] Implement `NodeRenderer` (draw rectangular nodes with labels)
- [ ] Implement `EdgeRenderer` (straight lines with arrows)
- [ ] Implement `ZoomHandler` (scroll wheel zoom, pan)
- [ ] Implement `DragHandler` (node dragging, canvas panning)
- [ ] Implement `SelectionHandler` (click select, multi-select)
- [ ] Wire canvas to `DiagramFacade` (render from state, update state on interactions)

**Backend:**
- [ ] Implement diagram CRUD endpoints (GET, POST, PATCH, DELETE /api/diagrams)
- [ ] Create use cases in `nimbus-app` (CreateDiagram, GetDiagram, UpdateDiagram, etc.)
- [ ] Wire use cases to Axum handlers via AppState
- [ ] Add request validation and DTO mapping in handlers

**Deliverable:** Users can create a diagram, manually add nodes via API, and interact with them on the canvas (drag, zoom, select).

---

## Phase 2: AI Integration (Weeks 3–4)

### Week 3: AI Generation Core

**Backend:**
- [ ] Implement `ClaudeAiProvider` in `nimbus-infra` (impl AiProvider trait, reqwest client)
- [ ] Write system prompt for diagram generation (JSON schema, generic component taxonomy, system design concepts, examples)
- [ ] Implement `generate_diagram()` — single-shot (non-streaming) first
- [ ] Implement `parser.rs` — parse Claude's JSON response into domain models
- [ ] Implement validation layer — validate AI output against generic component rules
- [ ] Implement basic auto-layout (topological sort + grid placement)
- [ ] Wire to `POST /api/diagrams/generate` endpoint (non-streaming response)

**Frontend:**
- [ ] Build `ChatComponent` — text input + message display
- [ ] Wire chat to `AiFacade` — send prompt, receive diagram
- [ ] Load AI-generated diagram into `DiagramFacade` / domain state and render on canvas

**Deliverable:** Users type a prompt, AI generates a diagram, it appears on the canvas.

### Week 4: Streaming, AI Assistant & Validation

**Backend:**
- [ ] Convert AI generation to streaming (SSE)
- [ ] Implement chunked parsing of Claude's streaming response
- [ ] Stream `node_added` / `edge_added` events to the frontend
- [ ] Implement `POST /api/diagrams/:id/modify` — AI assistant for on-demand modifications
- [ ] Implement `POST /api/diagrams/:id/validate` — deterministic validation rules (no AI)
- [ ] Implement `POST /api/diagrams/:id/fix` — AI-powered fix for validation issues (SSE)
- [ ] Write validation rules: orphan nodes, missing redundancy, invalid containment, circular deps, missing observability/security

**Frontend:**
- [ ] Implement SSE consumption in `SseClient` (infra layer, impl AiProvider)
- [ ] Progressive rendering: add nodes to canvas as SSE events arrive
- [ ] Add loading/streaming indicator in chat panel
- [ ] Wire AI assistant: user types in chat → `POST /modify` → changes appear on canvas
- [ ] Implement `ValidationFacade` + validation results panel
- [ ] "Validate" button in toolbar, warning list with "Fix with AI" buttons
- [ ] Implement generic architecture icons (SVG icons for each component category)
- [ ] Polish node rendering: icons, styled labels, group node borders

**Deliverable:** Streaming AI generation, AI assistant for modifications, diagram validation with AI fix.

---

## Phase 3: Editing & Persistence (Weeks 5–6)

### Week 5: Manual Editing

**Frontend:**
- [ ] Implement `PropertiesPanelComponent` — edit node label, type, config
- [ ] Implement edge creation: drag from node port to draw a connection
- [ ] Implement node/edge deletion with confirmation
- [ ] Implement `ServiceLibraryComponent` — categorized generic component library
- [ ] Drag from service library to canvas to add new nodes
- [ ] Implement undo/redo in domain `DiagramState` + expose via `DiagramFacade`
- [ ] Keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Shift+Z, Ctrl+S

**Backend:**
- [ ] Implement PATCH endpoint for partial diagram updates
- [ ] Handle concurrent update conflicts (last-write-wins for MVP)

**Deliverable:** Full manual editing capability. Users can add, move, connect, and delete nodes.

### Week 6: Persistence & Export

**Frontend:**
- [ ] Implement auto-save (debounced 2s after last change)
- [ ] Implement diagram list page with load/delete
- [ ] Implement PNG export (canvas.toDataURL)
- [ ] Implement JSON export/import
- [ ] Save/restore viewport position per diagram

**Backend:**
- [ ] Implement diagram list endpoint with metadata (node count, updated_at)
- [ ] Implement JSON export endpoint
- [ ] Add database indexes for query performance

**Deliverable:** Diagrams persist across sessions. Export to PNG and JSON works.

---

## Phase 4: Cloud Translation & Terraform (Weeks 7–8)

### Week 7: Cloud Provider Translation

**Backend:**
- [ ] Implement `cloud_catalog.rs` — define generic → AWS/GCP/Azure mappings for top ~30 services per provider
- [ ] Implement `TranslationService` — apply catalog mappings, populate `provider_mappings` on nodes
- [ ] Implement `POST /api/diagrams/:id/translate` and `DELETE /api/diagrams/:id/translate` endpoints
- [ ] Implement `TranslateDiagramUseCase`

**Frontend:**
- [ ] Implement `ProviderSelectorComponent` — dropdown with Generic/AWS/GCP/Azure
- [ ] Implement `TranslationFacade` — manages provider state, calls backend
- [ ] Update canvas rendering: show provider-specific icons and labels when a provider is active
- [ ] Update `ServiceLibraryComponent` — show provider-specific names alongside generic names when translated
- [ ] Update `PropertiesPanelComponent` — show provider-specific config fields when translated

**Deliverable:** Users can translate generic diagrams to AWS/GCP/Azure and switch between providers.

### Week 8: Terraform Export & Testing

**Backend:**
- [ ] Implement `TerraformService` — generate HCL from translated diagrams (main.tf, variables.tf, outputs.tf)
- [ ] Implement `GET /api/diagrams/:id/export/terraform` endpoint
- [ ] Implement `ExportTerraformUseCase`
- [ ] Implement `DockerComposeService` — generate docker-compose.yml from generic diagrams
- [ ] Implement `docker_catalog.rs` — generic component → Docker image/ports/env mappings
- [ ] Implement `GET /api/diagrams/:id/export/docker-compose` endpoint
- [ ] Implement `ExportDockerComposeUseCase`
- [ ] Improve AI prompts: better system design awareness, architectural pattern suggestions

**Frontend:**
- [ ] Add "Export Terraform" button (enabled only when provider is active)
- [ ] Add "Export Docker Compose" button (always available — works on generic diagrams)
- [ ] Download terraform files as zip, docker-compose.yml as file
- [ ] Implement node containment: visual nesting, drag-into-group, group auto-resize
- [ ] Improve canvas rendering: shadows, rounded corners, connection ports

**Testing (both weeks):**
- [ ] Write Rust unit tests for domain entities, validation, translation, terraform, docker-compose generation
- [ ] Write Rust integration tests for API endpoints (CRUD, generate, translate, terraform, docker-compose)
- [ ] Write Angular unit tests for domain state classes and application facades
- [ ] Write E2E tests for critical flows (generate, translate, export terraform, export docker-compose)
- [ ] Performance testing with large diagrams (100+ nodes)
- [ ] Fix bugs from testing

**Deliverable:** Cloud translation + Terraform export working. Tested and stable.

---

## Phase 5: Polish & Post-MVP (Weeks 9+)

- [ ] Proper Sugiyama auto-layout algorithm
- [ ] Architecture patterns template library
- [ ] Cost estimation per cloud provider
- [ ] User authentication (JWT)
- [ ] Diagram versioning
- [ ] Real-time collaboration (WebSocket)
- [ ] Template library
- [ ] Deployment pipeline (Docker, AWS hosting)
