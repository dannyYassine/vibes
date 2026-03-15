# Phase 1, Week 2: Backend CRUD Implementation

## Context

The backend scaffolding (domain entities, ports, infra repo, Axum server) is complete from Week 1. The server only has a `/health` endpoint. We need to add the full diagram CRUD — use cases in `nimbus-app`, DTOs + handlers + routes in `nimbus-api` — so the frontend canvas work can connect to real endpoints.

## Files to Modify/Create

| File | Action |
|------|--------|
| `backend/crates/nimbus-app/Cargo.toml` | Add `uuid` dep |
| `backend/crates/nimbus-app/src/lib.rs` | Already declares `use_cases` module — no change |
| `backend/crates/nimbus-app/src/use_cases/mod.rs` | Replace placeholder comment with 5 submodule declarations |
| `backend/crates/nimbus-app/src/use_cases/create_diagram.rs` | **Create** |
| `backend/crates/nimbus-app/src/use_cases/get_diagram.rs` | **Create** |
| `backend/crates/nimbus-app/src/use_cases/list_diagrams.rs` | **Create** |
| `backend/crates/nimbus-app/src/use_cases/update_diagram.rs` | **Create** (includes `UpdateDiagramInput`) |
| `backend/crates/nimbus-app/src/use_cases/delete_diagram.rs` | **Create** |
| `backend/crates/nimbus-api/Cargo.toml` | Add `uuid` dep with serde feature |
| `backend/crates/nimbus-api/src/dto/mod.rs` | Replace placeholder with `pub mod diagram;` |
| `backend/crates/nimbus-api/src/dto/diagram.rs` | **Create** — `CreateDiagramRequest`, `UpdateDiagramRequest` |
| `backend/crates/nimbus-api/src/handlers/mod.rs` | Add `pub mod diagram;` |
| `backend/crates/nimbus-api/src/handlers/diagram.rs` | **Create** — 5 handler functions |
| `backend/crates/nimbus-api/src/state.rs` | Add 5 use case fields alongside existing `diagram_repo` |
| `backend/crates/nimbus-api/src/routes.rs` | Add diagram CRUD routes |
| `backend/crates/nimbus-api/src/main.rs` | Construct use cases in DI wiring |
| `.claude/plans/PROGRESS.md` | Check off completed items |

## Implementation Steps

### Step 1: nimbus-app use cases

**Cargo.toml** — add `uuid = { workspace = true }` (already in workspace deps).

**use_cases/mod.rs** — declare 5 submodules.

Each use case is a struct holding `Arc<dyn DiagramRepository>` with a `new()` constructor and `execute()` method:

- **create_diagram.rs** — `execute(name: &str, description: Option<&str>) -> Result<Diagram>`. Validates name is non-empty, then calls `repo.create()`.
- **get_diagram.rs** — `execute(id: Uuid) -> Result<Diagram>`. Calls `repo.get(id)`.
- **list_diagrams.rs** — `execute() -> Result<Vec<DiagramListItem>>`. Calls `repo.list()`.
- **delete_diagram.rs** — `execute(id: Uuid) -> Result<()>`. Calls `repo.delete(id)`.
- **update_diagram.rs** — `execute(id: Uuid, input: UpdateDiagramInput) -> Result<Diagram>`. Fetches existing via `repo.get(id)`, merges optional fields from `UpdateDiagramInput`, saves via `repo.update()`.

`UpdateDiagramInput` struct (defined in this file):
```rust
pub struct UpdateDiagramInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<Node>>,
    pub edges: Option<Vec<Edge>>,
    pub viewport: Option<Viewport>,
}
```

### Step 2: nimbus-api DTOs

**dto/diagram.rs** — Two request DTOs with `#[serde(rename_all = "camelCase")]`:
- `CreateDiagramRequest { name: String, description: Option<String> }`
- `UpdateDiagramRequest { name: Option<String>, description: Option<String>, nodes: Option<Vec<Node>>, edges: Option<Vec<Edge>>, viewport: Option<Viewport> }`

Response types reuse domain entities directly (`Diagram`, `DiagramListItem`) since they already have `Serialize` + camelCase.

### Step 3: Handlers

**handlers/diagram.rs** — 5 async functions:
- `create_diagram` — extracts `Json<CreateDiagramRequest>`, calls use case, returns `(StatusCode::CREATED, Json<Diagram>)`
- `list_diagrams` — calls use case, returns `Json<Vec<DiagramListItem>>`
- `get_diagram` — extracts `Path(id): Path<Uuid>`, calls use case, returns `Json<Diagram>`
- `update_diagram` — extracts `Path(id)` + `Json<UpdateDiagramRequest>`, maps to `UpdateDiagramInput`, calls use case
- `delete_diagram` — extracts `Path(id)`, calls use case, returns `StatusCode::NO_CONTENT`

All return `Result<_, AppError>` using the existing error handler.

### Step 4: State & Routing

**state.rs** — Add use case fields to `AppState`:
```rust
pub struct AppState {
    pub diagram_repo: Arc<dyn DiagramRepository>,  // keep for future use
    pub create_diagram: CreateDiagram,
    pub get_diagram: GetDiagram,
    pub update_diagram: UpdateDiagram,
    pub delete_diagram: DeleteDiagram,
    pub list_diagrams: ListDiagrams,
}
```

**routes.rs** — Add diagram routes (Axum 0.8 uses `{id}` path syntax):
```rust
.route("/api/diagrams", get(handlers::diagram::list_diagrams).post(handlers::diagram::create_diagram))
.route("/api/diagrams/{id}", get(handlers::diagram::get_diagram).patch(handlers::diagram::update_diagram).delete(handlers::diagram::delete_diagram))
```

**main.rs** — Construct use cases from `diagram_repo.clone()` and inject into `AppState`.

### Step 5: Validation

- Serde handles JSON parsing (Axum returns 422 on malformed JSON automatically)
- `CreateDiagram` use case validates non-empty name → `DomainError::Validation` → 400
- `UpdateDiagram` validates name non-empty if provided
- Existing `AppError` middleware maps all domain errors to proper HTTP responses

## Verification

1. `cargo build` — all crates compile
2. `cargo test` — no regressions
3. Start Docker Compose (`docker compose up -d`) + `cargo run`
4. Test with curl:
   - `POST /api/diagrams` with `{"name": "Test"}` → 201
   - `GET /api/diagrams` → 200 with list
   - `GET /api/diagrams/{id}` → 200 with full diagram
   - `PATCH /api/diagrams/{id}` with `{"name": "Updated"}` → 200
   - `DELETE /api/diagrams/{id}` → 204
   - `POST /api/diagrams` with `{"name": ""}` → 400 validation error
   - `GET /api/diagrams/{random-uuid}` → 404
