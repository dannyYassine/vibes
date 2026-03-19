# Phase 4, Week 8: Terraform, Docker Compose & Testing

## Context
Phase 4, Week 7 (cloud provider translation) is complete. The backend has cloud catalogs with `terraform_resource_type` fields, translation service, and provider mappings on nodes. The docker catalog exists but is empty. This phase adds infrastructure-as-code export (Terraform + Docker Compose), frontend export buttons, node containment visuals, canvas polish, and comprehensive testing.

---

## Step 1: Populate Docker Catalog

**File:** `backend/crates/nimbus-domain/src/entities/docker_catalog.rs`

- Add `LazyLock<HashMap<NodeType, DockerServiceMapping>>` + `lookup_docker_mapping()` function (mirror cloud catalog pattern)
- Populate ~39 mappings for all non-Group NodeType variants:
  - Compute::ApplicationServer → `node:20-alpine`, port 3000
  - Compute::Function → `openfaas/classic-watchdog:latest`, port 8080
  - Compute::Container → `docker:dind`, port 2376
  - Data::RelationalDb → `postgres:16-alpine`, port 5432, env POSTGRES_PASSWORD
  - Data::DocumentDb → `mongo:7`, port 27017
  - Data::KeyValueStore → `redis:7-alpine`, port 6379
  - Caching::Cache → `redis:7-alpine`, port 6379
  - Messaging::MessageQueue → `rabbitmq:3-management-alpine`, ports 5672/15672
  - Messaging::EventBus → `nats:latest`, port 4222
  - Networking::LoadBalancer → `nginx:alpine`, ports 80/443
  - Networking::ApiGateway → `kong:latest`, ports 8000/8443
  - Storage::ObjectStore → `minio/minio:latest`, port 9000
  - Observability::Monitoring → `prom/prometheus:latest`, port 9090
  - Observability::Logging → `grafana/loki:latest`, port 3100
  - Security::IdentityProvider → `keycloak/keycloak:latest`, port 8080
  - etc. (use `is_placeholder: true` for components without a clean Docker image)

---

## Step 2: TerraformService

**New file:** `backend/crates/nimbus-domain/src/services/terraform_service.rs`
**Modify:** `backend/crates/nimbus-domain/src/services/mod.rs` — add `pub mod terraform_service;`

```rust
pub struct TerraformFiles {
    pub providers_tf: String,
    pub main_tf: String,
    pub variables_tf: String,
    pub outputs_tf: String,
}

pub struct TerraformService;

impl TerraformService {
    pub fn generate(diagram: &Diagram) -> Result<TerraformFiles, DomainError> { ... }
}
```

Logic:
1. Validate `diagram.active_provider` is Some, else return `DomainError::Validation`
2. **providers_tf**: Provider block for AWS (`hashicorp/aws`), GCP (`hashicorp/google`), or Azure (`hashicorp/azurerm`)
3. **variables_tf**: `region` variable with provider-appropriate default, `project_name` from diagram name
4. **main_tf**: For each non-Group node, get `ProviderMapping` from `node.provider_mappings`, use `terraform_resource_type` as resource type, sanitize label for resource name, generate resource block with placeholder attributes
5. **outputs_tf**: Output block per resource referencing its id

Derive `Serialize` on `TerraformFiles` so the handler can return it as JSON.

---

## Step 3: ExportTerraform Use Case + Endpoint

**New file:** `backend/crates/nimbus-app/src/use_cases/export_terraform.rs`
**Modify:** `backend/crates/nimbus-app/src/use_cases/mod.rs` — add `pub mod export_terraform;`

Use case pattern (same as ExportDiagramJson):
```rust
pub async fn execute(&self, id: Uuid) -> Result<TerraformFiles, DomainError> {
    let diagram = self.repo.get(id).await?;
    TerraformService::generate(&diagram)
}
```

**Modify** `backend/crates/nimbus-api/src/handlers/diagram.rs` — add handler returning `Json(TerraformFiles)`
**Modify** `backend/crates/nimbus-api/src/state.rs` — add `pub export_terraform: ExportTerraform` field + import
**Modify** `backend/crates/nimbus-api/src/main.rs` — instantiate `ExportTerraform::new(diagram_repo.clone())`
**Modify** `backend/crates/nimbus-api/src/routes.rs` — add `.route("/api/diagrams/{id}/export/terraform", get(...))`

---

## Step 4: DockerComposeService

**New file:** `backend/crates/nimbus-domain/src/services/docker_compose_service.rs`
**Modify:** `backend/crates/nimbus-domain/src/services/mod.rs` — add `pub mod docker_compose_service;`

```rust
pub struct DockerComposeService;

impl DockerComposeService {
    pub fn generate(diagram: &Diagram) -> Result<String, DomainError> { ... }
}
```

Logic:
1. Generate docker-compose.yml (version 3.8) as YAML string
2. **services**: For each non-Group node, look up `DockerServiceMapping`, create service with sanitized name, image, ports, environment, volumes. Add `depends_on` from edges where node is target
3. **networks**: For each Group node, create a named network. Assign child nodes (by `parent_id`) to that network

---

## Step 5: ExportDockerCompose Use Case + Endpoint

**New file:** `backend/crates/nimbus-app/src/use_cases/export_docker_compose.rs`
**Modify:** `backend/crates/nimbus-app/src/use_cases/mod.rs` — add `pub mod export_docker_compose;`

Same use case pattern. Handler returns YAML string with `Content-Type: application/x-yaml` and `Content-Disposition: attachment; filename="docker-compose.yml"`.

**Modify** same files as Step 3: handlers, state, main, routes — add `/api/diagrams/{id}/export/docker-compose`

---

## Step 6: Frontend — API Gateway + ExportFacade

**Modify:** `frontend/src/app/infrastructure/gateways/api.gateway.ts`
- Add `exportTerraform(id: string): Promise<TerraformFiles>` — GET terraform endpoint, returns JSON
- Add `exportDockerCompose(id: string): Promise<Blob>` — GET docker-compose endpoint, returns blob

**Modify:** `frontend/src/app/application/facades/export.facade.ts`
- Inject `ApiGateway` via constructor
- Add `async exportTerraform(diagramId: string, diagramName: string)` — calls API, creates zip with JSZip (providers.tf, main.tf, variables.tf, outputs.tf), triggers download
- Add `async exportDockerCompose(diagramId: string, diagramName: string)` — calls API, gets blob, triggers download as docker-compose.yml

**Dependency:** `npm install jszip` + `npm install -D @types/jszip` for zipping terraform files

---

## Step 7: Frontend — Export Buttons in Toolbar

**Modify:** `frontend/src/app/presentation/toolbar/toolbar.component.ts`
- Add "Export Terraform" button — disabled when `activeProvider$ | async` is null
- Add "Export Docker Compose" button — disabled when no diagram loaded
- Add `@Output()` emitters or call ExportFacade directly

**Modify:** `frontend/src/app/presentation/layout/layout.component.ts`
- Wire new toolbar events to ExportFacade calls (following existing onExportPng pattern)

---

## Step 8: Node Containment Visuals

**Modify:** `frontend/src/app/presentation/canvas/renderers/node.renderer.ts`
- Sort render order: group nodes first (background), then children on top
- Auto-resize groups: before drawing, calculate bounding box of child nodes (those with `parentId` matching group id), expand group bounds with 20px padding

**Modify:** `frontend/src/app/presentation/canvas/handlers/drag.handler.ts`
- On mouseUp after drag: check if dragged node center falls within any Group node bounds
- If yes, set node's `parentId` to that group; if moved out, clear `parentId`

**Modify:** `frontend/src/app/presentation/canvas/canvas-engine.ts`
- Add `onNodeParentChanged` callback, wire from DragHandler

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- Handle `onNodeParentChanged` — call facade to update node's parentId

---

## Step 9: Canvas Rendering Improvements

**Modify:** `frontend/src/app/presentation/canvas/renderers/node.renderer.ts`
- Enhanced shadows: increase shadowBlur, add subtle top border highlight
- Group node gradient header bar for label area

**Modify:** `frontend/src/app/presentation/canvas/handlers/edge-creation.handler.ts`
- Larger port circles (radius 5), white border ring, subtle glow on hover

---

## Step 10: Testing

### Rust Unit Tests
Add `#[cfg(test)] mod tests` in:
- `terraform_service.rs` — test provider blocks, resource generation, sanitization, error on no provider
- `docker_compose_service.rs` — test services, depends_on, networks, ports/env
- `docker_catalog.rs` — test all NodeType variants have mapping, spot-check images
- Domain entity tests, validation rule tests, cloud translation tests (new test files in respective modules)

### Rust Integration Tests
- New test file(s) in `backend/tests/` or `backend/crates/nimbus-api/tests/`
- Test CRUD endpoints, generate endpoint, translate endpoint, export terraform endpoint, export docker-compose endpoint
- Use test harness with in-memory repo or test DB

### Angular Unit Tests
- `export.facade.spec.ts` — mock ApiGateway, verify download triggers
- `diagram.state.spec.ts` — verify state transitions, undo/redo

### E2E Tests
- Generate diagram flow, translate diagram flow, export terraform flow, export docker-compose flow

### Performance Test
- Rust test: 100+ node diagram, assert TerraformService and DockerComposeService complete in < 1s

---

## Execution Order

Parallelizable groups:
1. **Group A** (backend services): Steps 1 → 4 → 5 (docker catalog → docker compose service → use case)
2. **Group B** (backend terraform): Steps 2 → 3 (terraform service → use case)
3. **Group C** (frontend visuals): Steps 8 → 9 (containment → canvas polish)

Sequential after A+B: Step 6 → 7 (frontend API + buttons depend on backend endpoints)
Last: Step 10 (testing after all features)

Use subagents in parallel for Groups A+B+C since they're independent.

---

## Verification

1. `cargo build` — all crates compile
2. `cargo test` — all unit + integration tests pass
3. `cd frontend && ng build` — Angular compiles
4. `ng test` — Angular unit tests pass
5. Manual: create diagram → translate to AWS → Export Terraform → verify zip contains valid HCL files
6. Manual: create diagram → Export Docker Compose → verify valid YAML
7. Manual: drag node into group → verify parentId set and group auto-resizes
8. Manual: generate 100+ node diagram → export both formats → verify performance
