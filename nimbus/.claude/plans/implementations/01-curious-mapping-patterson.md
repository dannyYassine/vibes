# Session 1: Backend Scaffolding & Domain

## Context

Nimbus has no code yet — only plan files. This session creates the entire Rust backend skeleton: Cargo workspace with 5 crates, all domain entities, port traits, PostgreSQL setup, Axum server with health check, and DI wiring. The goal is a compiling, running backend that serves `GET /health` and connects to PostgreSQL.

## Implementation Steps

### Step 1: Root Config Files
Create these files first — everything else depends on them:
- `docker-compose.yml` (project root) — PostgreSQL 16 Alpine, port 5432, db `nimbus`
- `backend/Cargo.toml` — workspace manifest with `[workspace.dependencies]` (serde, uuid, chrono, tokio, tracing, thiserror, async-trait, anyhow)
- `backend/.env.example` — DATABASE_URL, HOST, PORT

### Step 2: nimbus-shared (cross-cutting types)
- `backend/crates/nimbus-shared/Cargo.toml` — depends on serde, serde_json
- `src/lib.rs` + `src/events.rs` — `GenerateEvent`, `GenerateEventType` enum

### Step 3: nimbus-domain (innermost layer, zero IO deps)
- `backend/crates/nimbus-domain/Cargo.toml` — serde, serde_json, uuid, chrono, thiserror, async-trait, futures-core, nimbus-shared
- **Entities** (all from 03-data-models.md verbatim):
  - `entities/diagram.rs` — Diagram, Viewport, CloudProvider, DiagramListItem
  - `entities/node.rs` — Node, NodeType (tagged enum), all component enums, Position, Size, NodeProperties, NodeStyle, ProviderMappings, ProviderMapping
  - `entities/edge.rs` — Edge, EdgeType, EdgeProperties, CommunicationPattern, EdgeStyle
  - `entities/cloud_catalog.rs` — stub (struct + empty fn)
  - `entities/docker_catalog.rs` — stub (struct + empty fn)
- **Ports**:
  - `ports/diagram_repository.rs` — `DiagramRepository` trait (list, get, create, update, delete)
  - `ports/ai_provider.rs` — `AiProvider` trait (generate, modify) — stub signatures only
- **Services**: `services/mod.rs` — empty
- `errors.rs` — DomainError enum (NotFound, Validation, AiError, PersistenceError)
- All structs use `#[serde(rename_all = "camelCase")]`

### Step 4: nimbus-app (application layer — skeleton)
- `backend/crates/nimbus-app/Cargo.toml` — depends on nimbus-domain
- `src/lib.rs` + `src/use_cases/mod.rs` — empty module (use cases come in Session 2)

### Step 5: nimbus-infra (PostgresDiagramRepo)
- `backend/crates/nimbus-infra/Cargo.toml` — depends on nimbus-domain, sqlx (runtime-tokio, tls-rustls, postgres, uuid, chrono, json), async-trait, serde_json, tracing
- `persistence/pool.rs` — `create_pool(database_url) -> PgPool`
- `persistence/postgres_diagram_repo.rs` — full `DiagramRepository` impl:
  - `create`: INSERT diagram, return with empty nodes/edges
  - `get`: SELECT diagram + nodes + edges, assemble Diagram struct
  - `list`: SELECT diagrams with COUNT(nodes)
  - `update`: Transaction — update metadata, DELETE+INSERT nodes/edges
  - `delete`: DELETE FROM diagrams (cascade handles rest)
  - Use `sqlx::query()` with `.bind()` (non-macro) to avoid compile-time DB requirement
- `ai/mod.rs` — empty stub

### Step 6: SQL Migration
- `backend/migrations/001_initial.sql` — CREATE tables (diagrams, nodes, edges) + indexes, verbatim from 03-data-models.md

### Step 7: nimbus-api (Axum server)
- `backend/crates/nimbus-api/Cargo.toml` — depends on all crates + axum, tower, tower-http (cors, trace), tokio, tracing, tracing-subscriber, serde, serde_json, dotenvy, sqlx (for migrate macro)
- `config.rs` — AppConfig (database_url, host, port, cors_origin) loaded from env
- `state.rs` — AppState { diagram_repo: Arc<dyn DiagramRepository> }
- `handlers/health.rs` — returns `{"status":"ok","version":"0.1.0"}`
- `routes.rs` — Router with GET /health, CORS layer, trace layer
- `middleware/error_handler.rs` — AppError wrapping DomainError → HTTP responses
- `dto/mod.rs`, `extractors/mod.rs` — empty for now
- `main.rs` — load .env, init tracing, create pool, run migrations, wire DI, serve

## Key Files (from plan docs)
- `.claude/plans/03-data-models.md` — exact struct definitions + SQL schema
- `.claude/plans/06-rust-modules.md` — workspace config, port traits, DI wiring patterns
- `.claude/plans/10-dependencies.md` — crate versions, docker-compose.yml

## Key Decisions
- Use `sqlx::query()` (non-macro) to avoid needing DATABASE_URL at compile time
- DiagramListItem lives in domain layer (not API DTOs) since port trait references it
- AiProvider trait uses `futures_core::Stream` (lightweight, no-IO dependency)
- Session 1 AppState only holds `diagram_repo` — use cases added in Session 2
- `sqlx::migrate!("../../migrations")` in main.rs for auto-migration on startup

## Parallelization
- **Group A**: docker-compose.yml, backend/Cargo.toml, .env.example (independent)
- **Group B**: nimbus-shared + all nimbus-domain entity files (independent of each other)
- **Group C**: port traits (depend on entities)
- **Group D**: nimbus-app + nimbus-infra (depend on domain)
- **Group E**: nimbus-api (depends on everything)

## Verification
1. `docker compose up -d` — start PostgreSQL
2. `cd backend && cargo build` — must compile with zero errors
3. `cargo run -p nimbus-api` — server starts on :8080
4. `curl http://localhost:8080/health` → `{"status":"ok","version":"0.1.0"}`
5. Check PostgreSQL has diagrams/nodes/edges tables (migration ran)
6. Update PROGRESS.md with completed items
