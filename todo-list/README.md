# Todo List

Full-stack todo app — Rust Axum backend + React TypeScript frontend + PostgreSQL.

## Quick Start

```bash
# Terminal 1 — PostgreSQL (required by backend)
docker run --name todo-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=todo -p 5432:5432 -d postgres:16-alpine

# Terminal 2 — Backend (Rust)
cd backend
cargo run           # starts on http://127.0.0.1:3000

# Terminal 3 — Frontend (React)
cd frontend
npm install
npm run dev         # starts on http://localhost:5173
```

## Docker

Both services can be run together with Docker Compose. Hot-reload is enabled for
both — code changes in `backend/src/` or `frontend/src/` are reflected immediately.

```bash
# Build and start both services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove the database volume
docker compose down -v
```

| Service | URL | Hot-Reload |
|---------|-----|------------|
| PostgreSQL | `localhost:5432` | — |
| Backend (Axum) | [http://localhost:3000](http://localhost:3000) | `cargo-watch` rebuilds & restarts on `.rs` changes |
| Frontend (Vite) | [http://localhost:5173](http://localhost:5173) | Vite HMR on `.tsx`/`.ts`/`.html` changes |

## Project Structure

```
backend/
├── migrations/             # PostgreSQL schema
└── src/
    ├── models/             # Domain entity (Todo)
    ├── dtos/               # Plain data transfer objects
    ├── repositories/       # Trait + PostgreSQL implementation
    ├── services/           # Business logic
    ├── usecases/           # One use case per user intent
    └── delivery/           # Axum handlers + AppState (DI container)

frontend/
├── src/
│   ├── infra/              # DI container, HTTP client, Presenter base, React hooks
│   ├── features/todo/
│   │   ├── data/           # DataSource, DTO
│   │   ├── domain/         # Repository, Entity, Service
│   │   ├── presentation/   # Presenter, ViewModel, View
│   │   ├── todoModule.ts   # DI registration
│   │   └── __tests__/      # Integration + component tests
│   └── main.tsx            # App bootstrap
└── vitest.config.ts
```

## Architecture

### Backend — Clean Architecture

| Layer | Rust Implementation |
|-------|---------------------|
| Delivery | Axum handlers — parse JSON, build DTO, call usecase |
| DTO | `CreateTodoDto`, `CompleteTodoDto`, `TodoResponse` |
| Usecases | `CreateTodoUseCase`, `GetAllTodosUseCase`, etc. |
| Services | `TodoService` — validation, coordination |
| Repository | `TodoRepository` trait + `SqlTodoRepository` (PostgreSQL) |
| Model | `Todo` struct with `from_row()` hydration |

Dependency direction: **handlers → usecases → service → repository → model**

### Frontend — MVP Architecture

| # | Layer | Responsibility |
|---|-------|----------------|
| 0 | Container | DI registration & resolution |
| 1 | DataSource | Raw HTTP transport, returns DTOs |
| 2 | DTO | API shape (snake_case) |
| 3 | Repository | DTO→Entity mapping, error normalization |
| 4 | Entity | Pure domain model |
| 5 | Service | Business logic, use cases |
| 6 | Presenter | UI state, calls services, produces ViewModels |
| 7 | ViewModel | UI-ready props from entities |
| 8 | View | React component, renders ViewModels |

Data flow: **API → DataSource → Repository → Service → Presenter → ViewModel → View**

## Testing

### Frontend (Vitest)

```bash
cd frontend
npm test              # 20 tests — 11 integration + 9 component
```

- **Service integration tests** — real Repository→Service→Entity→ViewModel pipeline, fake DataSource
- **Component tests** — View rendering with mocked Presenter via test container

### Backend (Cargo)

Requires a running PostgreSQL instance (e.g. via the Docker Compose `db` service).

```bash
cd backend
cargo test            # requires DATABASE_URL or localhost PostgreSQL
```

> Run tests sequentially (`-- --test-threads=1`) to avoid table conflicts.

## AI Assistant Setup

This repo requires several MCP servers and plugins for AI-assisted development.
Configure in `opencode.json` (project-level) or `~/.config/opencode/opencode.json` (global).

| Tool | Purpose | Where Configured |
|------|---------|-----------------|
| [code-review-graph](https://code-review-graph.com) | Code knowledge graph — change detection, impact analysis, semantic search | `opencode.json` → `mcp.code-review-graph` |
| [codegraph](https://colbymchenry.github.io/codegraph/) | Lightweight codebase graph — alternative to code-review-graph | Not configured (optional alternative) |
| [Context7](https://context7.com) | Live library/framework documentation via MCP | `~/.config/opencode/opencode.json` → `mcp.context7` |
| [Caveman](https://caveman.so) | Ultra-compressed AI communication mode (~65% token reduction) | `~/.config/opencode/opencode.json` → `plugin` |
| [OKF (Open Knowledge Format)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) | Structured knowledge files for AI-consumable feature/product docs | `.agents/skills/knowledge/` — YAML frontmatter, bundle-relative cross-links |

### code-review-graph

[code-review-graph.com](https://code-review-graph.com) — Persistent knowledge graph
that indexes functions, classes, files, and cross-references. Auto-updates on file
changes. Key tools:

- `detect_changes` — risk-scored review of uncommitted changes
- `query_graph` — trace callers, callees, imports, tests
- `get_impact_radius` — blast radius of a change
- `semantic_search_nodes` — find code by name or keyword

### codegraph

[colbymchenry.github.io/codegraph/](https://colbymchenry.github.io/codegraph/) —
Alternative MCP-based code graph tool. Lighter weight than code-review-graph.
Use as a drop-in replacement or complement.

### Context7

[context7.com](https://context7.com) — MCP server that fetches current docs for
libraries, frameworks, SDKs, and APIs. Uses `resolve-library-id` + `query-docs`.
Prevents stale answers by always referencing latest API surface.

### Caveman

[caveman.so](https://caveman.so) — Communication plugin that compresses AI output
~65% by dropping articles, filler, pleasantries, and hedging while preserving
technical accuracy. Levels: `lite`, `full` (default), `ultra`. Companion skills:

- `caveman-help` — quick-reference card
- `caveman-commit` — compressed commit messages
- `caveman-review` — compressed code review
- `caveman-stats` — token savings metrics
- `caveman-compress` — compress memory files

### OKF (Open Knowledge Format)

[Spec & Google Cloud blog](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) —
Structured markdown with YAML frontmatter (`type`, `title`, `tags`, `timestamp`)
for AI-consumable knowledge. Used in `.agents/skills/knowledge/` to document
features, products, and architecture. Bundle root: `index.md` with cross-links
via bundle-relative paths. Conformance: every `.md` (except `index.md`/`log.md`)
must have parseable frontmatter with non-empty `type`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/todos` | List all todos |
| `POST` | `/api/todos` | Create a todo `{ "title": "..." }` |
| `GET` | `/api/todos/:id` | Get a todo by ID |
| `PATCH` | `/api/todos/:id/complete` | Toggle completion `{ "completed": true }` |
| `DELETE` | `/api/todos/:id` | Delete a todo |