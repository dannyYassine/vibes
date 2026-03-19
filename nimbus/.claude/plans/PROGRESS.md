# Nimbus — Progress Tracker

## Current Phase: Phase 4, Week 8 (Complete)

---

## Phase 1, Week 1: Backend Scaffolding & Core Models

**Backend:**
- [x] Initialize Cargo workspace with five crates (`nimbus-api`, `nimbus-app`, `nimbus-domain`, `nimbus-infra`, `nimbus-shared`)
- [x] Define domain entity: `Diagram` (nimbus-domain/src/entities/diagram.rs)
- [x] Define domain entity: `Node`, `NodeType`, `Position`, `Size`, `NodeProperties` (nimbus-domain/src/entities/node.rs)
- [x] Define domain entity: `Edge`, `EdgeType`, `EdgeProperties` (nimbus-domain/src/entities/edge.rs)
- [x] Define domain entity: `CloudServiceMapping` (nimbus-domain/src/entities/cloud_catalog.rs)
- [x] Define domain entity: `DockerServiceMapping` (nimbus-domain/src/entities/docker_catalog.rs)
- [x] Define port trait: `DiagramRepository` (nimbus-domain/src/ports/diagram_repository.rs)
- [x] Define port trait: `AiProvider` (nimbus-domain/src/ports/ai_provider.rs)
- [x] Define domain errors (nimbus-domain/src/errors.rs)
- [x] Set up Axum server with health check endpoint in `nimbus-api`
- [x] Configure CORS (tower-http), logging (tracing), and error handling middleware
- [x] Set up PostgreSQL with Docker Compose (docker-compose.yml)
- [x] Write initial SQL migration (migrations/001_initial.sql)
- [x] Implement `PostgresDiagramRepo` in `nimbus-infra` (impl DiagramRepository)
- [x] Set up connection pool in `nimbus-infra` (persistence/pool.rs)
- [x] Wire dependency injection in `main.rs` (Arc<dyn Trait> → concrete impls)
- [x] Define `AppConfig` (nimbus-api/src/config.rs)
- [x] Define `AppState` (nimbus-api/src/state.rs)
- [x] Verify: `cargo build` succeeds for all crates

**Frontend:**
- [x] Initialize Angular 19 project with standalone components (Jest replacing Karma)
- [x] Set up routing (`/diagrams`, `/diagrams/:id`) with lazy-loaded components
- [x] Create domain models: `Diagram`, `DiagramNode`, `DiagramEdge`, `NodeType`, `EdgeType` (domain/models/)
- [x] Create domain interfaces: `DiagramRepository`, `AiProvider`, `TranslationProvider` (domain/interfaces/)
- [x] Create domain state: `DiagramState`, `SelectionState`, `UndoRedoManager` (domain/state/)
- [x] Create infrastructure: `ApiGateway` impl DiagramRepository (infrastructure/gateways/)
- [x] Create infrastructure: DI token wiring (`DIAGRAM_REPOSITORY`, `AI_PROVIDER`, `TRANSLATION_PROVIDER`)
- [x] Create infrastructure: `errorInterceptor` HttpInterceptorFn (infrastructure/interceptors/)
- [x] Create application: `DiagramFacade` with BehaviorSubjects (application/facades/)
- [x] Create application: `DiagramMapper`, `NodeMapper` (application/mappers/)
- [x] Create presentation: basic layout shell — toolbar, canvas area, sidebar panel
- [x] Create presentation: `DiagramListComponent` route, `EditorComponent` route
- [x] Set up environment files (environments/) with apiBaseUrl localhost:8080
- [x] Update angular.json with production fileReplacements for environment
- [x] Global styles: CSS reset, dark theme (Catppuccin Mocha)
- [x] Verify: `ng build` succeeds with zero errors
- [x] Verify: `ng serve` renders at http://localhost:4200

---

## Phase 1, Week 2: Canvas Basics & CRUD

**Frontend:**
- [x] Implement `CanvasComponent` with HTML5 Canvas setup
- [x] Implement `GridRenderer` (background grid)
- [x] Implement `NodeRenderer` (draw rectangular nodes with labels)
- [x] Implement `EdgeRenderer` (straight lines with arrows)
- [x] Implement `ZoomHandler` (scroll wheel zoom with min/max bounds)
- [x] Implement `DragHandler` (node dragging + canvas panning)
- [x] Implement `SelectionHandler` (click select, shift-click multi-select, drag selection box)
- [x] Wire canvas to `DiagramFacade` (render from state, update state on interactions)

**Backend:**
- [x] Define DTOs: `CreateDiagramRequest`, `UpdateDiagramRequest`, `DiagramListItem` (nimbus-api/src/dto/)
- [x] Implement handler: `POST /api/diagrams` (nimbus-api/src/handlers/diagrams.rs)
- [x] Implement handler: `GET /api/diagrams` (list)
- [x] Implement handler: `GET /api/diagrams/:id`
- [x] Implement handler: `PATCH /api/diagrams/:id`
- [x] Implement handler: `DELETE /api/diagrams/:id`
- [x] Implement use case: `CreateDiagram` (nimbus-app/src/use_cases/create_diagram.rs)
- [x] Implement use case: `GetDiagram`
- [x] Implement use case: `UpdateDiagram`
- [x] Implement use case: `DeleteDiagram`
- [x] Implement use case: `ListDiagrams`
- [x] Wire use cases to Axum handlers via AppState
- [x] Compose router in routes.rs
- [x] Add request validation and DTO mapping
- [ ] Verify: end-to-end POST/GET diagram works

---

## Phase 2, Week 3: AI Generation Core

**Backend:**
- [x] Implement `ClaudeAiProvider` in `nimbus-infra` (impl AiProvider, reqwest client)
- [x] Write system prompt: JSON schema, generic component taxonomy, system design concepts, examples (nimbus-infra/src/ai/prompts/)
- [x] Implement `generate_diagram()` — single-shot (non-streaming) first
- [x] Implement `parser.rs` — parse Claude's JSON response into domain models
- [x] Implement validation layer — validate AI output against generic component rules
- [x] Implement basic auto-layout: topological sort + grid placement (nimbus-domain/src/services/layout_service.rs)
- [x] Implement use case: `GenerateDiagram` (nimbus-app)
- [x] Wire to `POST /api/diagrams/generate` endpoint (non-streaming)

**Frontend:**
- [x] Build `ChatComponent` — text input + message display
- [x] Create `AiFacade` — send prompt, receive diagram
- [x] Wire: load AI-generated diagram into `DiagramFacade` and render on canvas

---

## Phase 2, Week 4: Streaming, AI Assistant & Validation

**Backend:**
- [x] Define SSE event types in `nimbus-shared` (events.rs) — added `GenerateEventType::as_str()` for snake_case SSE event names
- [x] Convert AI generation to streaming (Axum SSE response) — channel-based streaming with `mpsc` + `ReceiverStream`
- [x] Implement chunked parsing of Claude's streaming response — collect-then-drip pattern (tool_use must be complete)
- [x] Stream `node_added` / `edge_added` events to frontend — SSE with 15s keepalive
- [x] Implement `POST /api/diagrams/:id/modify` — AI assistant endpoint (SSE) with `modify_diagram` tool schema
- [x] Implement `POST /api/diagrams/:id/validate` — deterministic validation (JSON, no SSE)
- [x] Implement `POST /api/diagrams/:id/fix` — AI-powered fix (SSE) with constrained prompt
- [x] Implement validation rules in `ValidationService`:
  - [x] Orphan nodes (no connections)
  - [x] Load balancer with single target
  - [x] Invalid containment / nesting
  - [x] Circular synchronous dependencies
  - [x] Single point of failure detection
  - [x] Missing observability / security (warnings)
  - [x] Database without backup/replication
  - [x] Synchronous chain too deep
  - [x] Message queue without DLQ

**Frontend:**
- [x] Implement `SseClient` in infrastructure layer (impl AiProvider streaming)
- [x] Progressive rendering: add nodes to canvas as SSE events arrive
- [x] Add loading/streaming indicator in chat panel
- [x] Wire AI assistant: chat input → `POST /modify` → changes on canvas
- [x] Implement `ValidationFacade` + validation results panel
- [x] "Validate" button in toolbar
- [x] Warning list with "Fix with AI" buttons
- [x] Implement generic architecture icons (SVG per component category)
- [x] Polish node rendering: icons, styled labels, group node borders

---

## Phase 3, Week 5: Manual Editing

**Frontend:**
- [x] Implement `PropertiesPanelComponent` — edit node label, type, config
- [x] Implement edge creation: drag from node port to draw connection
- [x] Implement node/edge deletion with confirmation dialog
- [x] Implement `ServiceLibraryComponent` — categorized generic component library
- [x] Drag from service library to canvas to add new nodes
- [x] Implement undo/redo in `DiagramState` + expose via `DiagramFacade`
- [x] Keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Shift+Z, Ctrl+S

**Backend:**
- [x] Implement PATCH endpoint for partial diagram updates (nodes/edges individually)
- [x] Handle concurrent update conflicts (last-write-wins for MVP)

---

## Phase 3, Week 6: Persistence & Export

**Frontend:**
- [x] Implement auto-save (debounced 2s after last change)
- [x] Implement `DiagramListComponent` — list page with load/delete
- [x] Implement PNG export (canvas.toDataURL)
- [x] Implement JSON export (download diagram as .json)
- [x] Implement JSON import (upload .json → load diagram)
- [x] Save/restore viewport position per diagram

**Backend:**
- [x] Implement diagram list endpoint with metadata (node count, updated_at)
- [x] Implement `GET /api/diagrams/:id/export/json` endpoint
- [x] Add database indexes for query performance
- [x] Implement `ExportFacade` on frontend

---

## Phase 4, Week 7: Cloud Provider Translation

**Backend:**
- [x] Implement `cloud_catalog.rs` — generic → AWS mappings (~39 services)
- [x] Implement `cloud_catalog.rs` — generic → GCP mappings (~39 services)
- [x] Implement `cloud_catalog.rs` — generic → Azure mappings (~39 services)
- [x] Implement `TranslationService` — apply catalog, populate `provider_mappings`
- [x] Implement `POST /api/diagrams/:id/translate` endpoint
- [x] Implement `DELETE /api/diagrams/:id/translate` endpoint
- [x] Implement `TranslateDiagramUseCase`

**Frontend:**
- [x] Implement `ProviderSelectorComponent` — dropdown: Generic / AWS / GCP / Azure
- [x] Implement `TranslationFacade` — manages provider state, calls backend
- [x] Update canvas: show provider-specific icons + labels when provider active
- [x] Update `ServiceLibraryComponent` — show provider names alongside generic
- [x] Update `PropertiesPanelComponent` — show provider-specific config fields

---

## Phase 4, Week 8: Terraform, Docker Compose & Testing

**Backend:**
- [x] Implement `TerraformService` — generate HCL (main.tf, variables.tf, outputs.tf, providers.tf)
- [x] Implement `GET /api/diagrams/:id/export/terraform` endpoint
- [x] Implement `ExportTerraformUseCase`
- [x] Implement `docker_catalog.rs` — generic component → Docker image/ports/env/volumes (39 mappings, LazyLock pattern)
- [x] Implement `DockerComposeService` — generate docker-compose.yml (services, ports, env, volumes, depends_on, networks)
- [x] Implement `GET /api/diagrams/:id/export/docker-compose` endpoint
- [x] Implement `ExportDockerComposeUseCase`

**Frontend:**
- [x] Add "Export Terraform" button (enabled only when provider active)
- [x] Add "Export Docker Compose" button (always available)
- [x] Download terraform files as zip (JSZip)
- [x] Download docker-compose.yml as file
- [x] Implement node containment: visual nesting, drag-into-group, group auto-resize
- [x] Improve canvas rendering: enhanced shadows, top border highlight, gradient group headers, port outer rings

**Testing:**
- [x] Rust unit tests: domain entities
- [x] Rust unit tests: validation rules
- [x] Rust unit tests: cloud translation
- [x] Rust unit tests: terraform generation (provider blocks, resources, sanitization, error on no provider)
- [x] Rust unit tests: docker-compose generation (services, depends_on, networks, ports/env, volumes)
- [x] Rust unit tests: docker catalog (all NodeType variants mapped, spot-check images)
- [x] Rust integration tests: CRUD endpoints
- [x] Rust integration tests: generate endpoint
- [x] Rust integration tests: translate endpoint
- [x] Rust integration tests: export endpoints
- [x] Angular unit tests: domain state classes
- [x] Angular unit tests: export facade (terraform zip, docker compose download)
- [x] E2E tests: generate diagram flow
- [x] E2E tests: translate diagram flow
- [x] E2E tests: export terraform flow
- [x] E2E tests: export docker-compose flow
- [x] Performance test: 100+ node diagram (both services < 1s)

---

## Phase 5: Polish & Post-MVP (Weeks 9+)

- [ ] Proper Sugiyama auto-layout algorithm
- [ ] Architecture patterns template library
- [ ] Cost estimation per cloud provider
- [ ] User authentication (JWT)
- [ ] Diagram versioning
- [ ] Real-time collaboration (WebSocket)
- [ ] Deployment pipeline (Docker, cloud hosting)
