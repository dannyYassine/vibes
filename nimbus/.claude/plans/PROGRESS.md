# Nimbus — Progress Tracker

## Current Phase: Phase 1, Week 1

---

## Phase 1, Week 1: Backend Scaffolding & Core Models

**Backend:**
- [ ] Initialize Cargo workspace with five crates (`nimbus-api`, `nimbus-app`, `nimbus-domain`, `nimbus-infra`, `nimbus-shared`)
- [ ] Define domain entity: `Diagram` (nimbus-domain/src/entities/diagram.rs)
- [ ] Define domain entity: `Node`, `NodeType`, `Position`, `Size`, `NodeProperties` (nimbus-domain/src/entities/node.rs)
- [ ] Define domain entity: `Edge`, `EdgeType`, `EdgeProperties` (nimbus-domain/src/entities/edge.rs)
- [ ] Define domain entity: `CloudServiceMapping` (nimbus-domain/src/entities/cloud_catalog.rs)
- [ ] Define domain entity: `DockerServiceMapping` (nimbus-domain/src/entities/docker_catalog.rs)
- [ ] Define port trait: `DiagramRepository` (nimbus-domain/src/ports/diagram_repository.rs)
- [ ] Define port trait: `AiProvider` (nimbus-domain/src/ports/ai_provider.rs)
- [ ] Define domain errors (nimbus-domain/src/errors.rs)
- [ ] Set up Axum server with health check endpoint in `nimbus-api`
- [ ] Configure CORS (tower-http), logging (tracing), and error handling middleware
- [ ] Set up PostgreSQL with Docker Compose (docker-compose.yml)
- [ ] Write initial SQL migration (migrations/001_initial.sql)
- [ ] Implement `PostgresDiagramRepo` in `nimbus-infra` (impl DiagramRepository)
- [ ] Set up connection pool in `nimbus-infra` (persistence/pool.rs)
- [ ] Wire dependency injection in `main.rs` (Arc<dyn Trait> → concrete impls)
- [ ] Define `AppConfig` (nimbus-api/src/config.rs)
- [ ] Define `AppState` (nimbus-api/src/state.rs)
- [ ] Verify: `cargo build` succeeds for all crates

**Frontend:**
- [ ] Initialize Angular project with standalone components
- [ ] Set up routing (`/diagrams`, `/diagrams/:id`)
- [ ] Create domain models: `Diagram`, `DiagramNode`, `DiagramEdge`, `NodeType`, `EdgeType` (domain/models/)
- [ ] Create domain interfaces: `DiagramRepository`, `AiProvider`, `TranslationProvider` (domain/interfaces/)
- [ ] Create domain state: `DiagramState`, `SelectionState`, `UndoRedoManager` (domain/state/)
- [ ] Create infrastructure: `ApiGateway` impl DiagramRepository (infrastructure/gateways/)
- [ ] Create infrastructure: DI token wiring
- [ ] Create application: `DiagramFacade` with BehaviorSubjects (application/facades/)
- [ ] Create application: `DiagramMapper`, `NodeMapper` (application/mappers/)
- [ ] Create presentation: basic layout shell — toolbar, canvas area, sidebar panel
- [ ] Set up environment files (environments/)
- [ ] Verify: `ng build` succeeds

---

## Phase 1, Week 2: Canvas Basics & CRUD

**Frontend:**
- [ ] Implement `CanvasComponent` with HTML5 Canvas setup
- [ ] Implement `GridRenderer` (background grid)
- [ ] Implement `NodeRenderer` (draw rectangular nodes with labels)
- [ ] Implement `EdgeRenderer` (straight lines with arrows)
- [ ] Implement `ZoomHandler` (scroll wheel zoom with min/max bounds)
- [ ] Implement `DragHandler` (node dragging + canvas panning)
- [ ] Implement `SelectionHandler` (click select, shift-click multi-select, drag selection box)
- [ ] Wire canvas to `DiagramFacade` (render from state, update state on interactions)

**Backend:**
- [ ] Define DTOs: `CreateDiagramRequest`, `UpdateDiagramRequest`, `DiagramListItem` (nimbus-api/src/dto/)
- [ ] Implement handler: `POST /api/diagrams` (nimbus-api/src/handlers/diagrams.rs)
- [ ] Implement handler: `GET /api/diagrams` (list)
- [ ] Implement handler: `GET /api/diagrams/:id`
- [ ] Implement handler: `PATCH /api/diagrams/:id`
- [ ] Implement handler: `DELETE /api/diagrams/:id`
- [ ] Implement use case: `CreateDiagram` (nimbus-app/src/use_cases/create_diagram.rs)
- [ ] Implement use case: `GetDiagram`
- [ ] Implement use case: `UpdateDiagram`
- [ ] Implement use case: `DeleteDiagram`
- [ ] Implement use case: `ListDiagrams`
- [ ] Wire use cases to Axum handlers via AppState
- [ ] Compose router in routes.rs
- [ ] Add request validation and DTO mapping
- [ ] Verify: end-to-end POST/GET diagram works

---

## Phase 2, Week 3: AI Generation Core

**Backend:**
- [ ] Implement `ClaudeAiProvider` in `nimbus-infra` (impl AiProvider, reqwest client)
- [ ] Write system prompt: JSON schema, generic component taxonomy, system design concepts, examples (nimbus-infra/src/ai/prompts/)
- [ ] Implement `generate_diagram()` — single-shot (non-streaming) first
- [ ] Implement `parser.rs` — parse Claude's JSON response into domain models
- [ ] Implement validation layer — validate AI output against generic component rules
- [ ] Implement basic auto-layout: topological sort + grid placement (nimbus-domain/src/services/layout_service.rs)
- [ ] Implement use case: `GenerateDiagram` (nimbus-app)
- [ ] Wire to `POST /api/diagrams/generate` endpoint (non-streaming)

**Frontend:**
- [ ] Build `ChatComponent` — text input + message display
- [ ] Create `AiFacade` — send prompt, receive diagram
- [ ] Wire: load AI-generated diagram into `DiagramFacade` and render on canvas

---

## Phase 2, Week 4: Streaming, AI Assistant & Validation

**Backend:**
- [ ] Define SSE event types in `nimbus-shared` (events.rs)
- [ ] Convert AI generation to streaming (Axum SSE response)
- [ ] Implement chunked parsing of Claude's streaming response
- [ ] Stream `node_added` / `edge_added` events to frontend
- [ ] Implement `POST /api/diagrams/:id/modify` — AI assistant endpoint (SSE)
- [ ] Implement `POST /api/diagrams/:id/validate` — deterministic validation (no AI)
- [ ] Implement `POST /api/diagrams/:id/fix` — AI-powered fix (SSE)
- [ ] Implement validation rules in `ValidationService`:
  - [ ] Orphan nodes (no connections)
  - [ ] Load balancer with single target
  - [ ] Invalid containment / nesting
  - [ ] Circular synchronous dependencies
  - [ ] Single point of failure detection
  - [ ] Missing observability / security (warnings)
  - [ ] Database without backup/replication
  - [ ] Synchronous chain too deep
  - [ ] Message queue without DLQ

**Frontend:**
- [ ] Implement `SseClient` in infrastructure layer (impl AiProvider streaming)
- [ ] Progressive rendering: add nodes to canvas as SSE events arrive
- [ ] Add loading/streaming indicator in chat panel
- [ ] Wire AI assistant: chat input → `POST /modify` → changes on canvas
- [ ] Implement `ValidationFacade` + validation results panel
- [ ] "Validate" button in toolbar
- [ ] Warning list with "Fix with AI" buttons
- [ ] Implement generic architecture icons (SVG per component category)
- [ ] Polish node rendering: icons, styled labels, group node borders

---

## Phase 3, Week 5: Manual Editing

**Frontend:**
- [ ] Implement `PropertiesPanelComponent` — edit node label, type, config
- [ ] Implement edge creation: drag from node port to draw connection
- [ ] Implement node/edge deletion with confirmation dialog
- [ ] Implement `ServiceLibraryComponent` — categorized generic component library
- [ ] Drag from service library to canvas to add new nodes
- [ ] Implement undo/redo in `DiagramState` + expose via `DiagramFacade`
- [ ] Keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Shift+Z, Ctrl+S

**Backend:**
- [ ] Implement PATCH endpoint for partial diagram updates (nodes/edges individually)
- [ ] Handle concurrent update conflicts (last-write-wins for MVP)

---

## Phase 3, Week 6: Persistence & Export

**Frontend:**
- [ ] Implement auto-save (debounced 2s after last change)
- [ ] Implement `DiagramListComponent` — list page with load/delete
- [ ] Implement PNG export (canvas.toDataURL)
- [ ] Implement JSON export (download diagram as .json)
- [ ] Implement JSON import (upload .json → load diagram)
- [ ] Save/restore viewport position per diagram

**Backend:**
- [ ] Implement diagram list endpoint with metadata (node count, updated_at)
- [ ] Implement `GET /api/diagrams/:id/export/json` endpoint
- [ ] Add database indexes for query performance
- [ ] Implement `ExportFacade` on frontend

---

## Phase 4, Week 7: Cloud Provider Translation

**Backend:**
- [ ] Implement `cloud_catalog.rs` — generic → AWS mappings (~30 services)
- [ ] Implement `cloud_catalog.rs` — generic → GCP mappings (~30 services)
- [ ] Implement `cloud_catalog.rs` — generic → Azure mappings (~30 services)
- [ ] Implement `TranslationService` — apply catalog, populate `provider_mappings`
- [ ] Implement `POST /api/diagrams/:id/translate` endpoint
- [ ] Implement `DELETE /api/diagrams/:id/translate` endpoint
- [ ] Implement `TranslateDiagramUseCase`

**Frontend:**
- [ ] Implement `ProviderSelectorComponent` — dropdown: Generic / AWS / GCP / Azure
- [ ] Implement `TranslationFacade` — manages provider state, calls backend
- [ ] Update canvas: show provider-specific icons + labels when provider active
- [ ] Update `ServiceLibraryComponent` — show provider names alongside generic
- [ ] Update `PropertiesPanelComponent` — show provider-specific config fields

---

## Phase 4, Week 8: Terraform, Docker Compose & Testing

**Backend:**
- [ ] Implement `TerraformService` — generate HCL (main.tf, variables.tf, outputs.tf, providers.tf)
- [ ] Implement `GET /api/diagrams/:id/export/terraform` endpoint
- [ ] Implement `ExportTerraformUseCase`
- [ ] Implement `docker_catalog.rs` — generic component → Docker image/ports/env/volumes
- [ ] Implement `DockerComposeService` — generate docker-compose.yml
- [ ] Implement `GET /api/diagrams/:id/export/docker-compose` endpoint
- [ ] Implement `ExportDockerComposeUseCase`

**Frontend:**
- [ ] Add "Export Terraform" button (enabled only when provider active)
- [ ] Add "Export Docker Compose" button (always available)
- [ ] Download terraform files as zip
- [ ] Download docker-compose.yml as file
- [ ] Implement node containment: visual nesting, drag-into-group, group auto-resize
- [ ] Improve canvas rendering: shadows, rounded corners, connection ports

**Testing:**
- [ ] Rust unit tests: domain entities
- [ ] Rust unit tests: validation rules
- [ ] Rust unit tests: cloud translation
- [ ] Rust unit tests: terraform generation
- [ ] Rust unit tests: docker-compose generation
- [ ] Rust integration tests: CRUD endpoints
- [ ] Rust integration tests: generate endpoint
- [ ] Rust integration tests: translate endpoint
- [ ] Rust integration tests: export endpoints
- [ ] Angular unit tests: domain state classes
- [ ] Angular unit tests: application facades
- [ ] E2E tests: generate diagram flow
- [ ] E2E tests: translate diagram flow
- [ ] E2E tests: export terraform flow
- [ ] E2E tests: export docker-compose flow
- [ ] Performance test: 100+ node diagram

---

## Phase 5: Polish & Post-MVP (Weeks 9+)

- [ ] Proper Sugiyama auto-layout algorithm
- [ ] Architecture patterns template library
- [ ] Cost estimation per cloud provider
- [ ] User authentication (JWT)
- [ ] Diagram versioning
- [ ] Real-time collaboration (WebSocket)
- [ ] Deployment pipeline (Docker, cloud hosting)
