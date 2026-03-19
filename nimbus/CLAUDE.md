# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nimbus is a cloud infrastructure diagram design tool with AI-powered generation and modification. It consists of an Angular 19 frontend with a canvas-based editor and a Rust/Axum backend with PostgreSQL storage.

## Build & Run Commands

### Backend (Rust)

```bash
cd backend
cargo build                    # compile
cargo test                     # run all tests
cargo test -p nimbus-api       # test a single crate
cargo test test_name           # run a single test by name
cargo run                      # start server (requires .env with DATABASE_URL)
```

### Frontend (Angular 19)

```bash
cd frontend
npm start                      # dev server on port 4200
npm run build                  # production build
npm test                       # unit tests (Jest)
npm run e2e                    # end-to-end tests (Playwright)
```

### Infrastructure

```bash
docker-compose up              # PostgreSQL on port 5433
```

Backend requires `.env` file (see `.env.example`) with `DATABASE_URL`, Anthropic API key, and CORS origin.

## Architecture

### Backend — Rust Cargo Workspace (Hexagonal Architecture)

Five crates with strict dependency direction: `nimbus-api` → `nimbus-app` → `nimbus-domain` ← `nimbus-infra`

- **nimbus-api** — Axum HTTP handlers, routes, DTOs, middleware. Entry point in `main.rs` sets up DI via `AppState` which holds all 22 use cases.
- **nimbus-app** — Use cases (one per operation): CRUD for diagrams/nodes/edges, AI generation/modification/fix, validation, translation, export (JSON/Terraform/Docker Compose).
- **nimbus-domain** — Entities (`Diagram`, `Node`, `Edge`), ports (traits: `DiagramRepository`, `AiProvider`), domain errors. Cloud/Docker service catalogs defined here.
- **nimbus-infra** — Adapters implementing domain ports: `PostgresDiagramRepo` (sqlx), `ClaudeAiProvider` (reqwest to Anthropic API).
- **nimbus-shared** — Cross-cutting types and test helpers.

Dependency inversion via traits: use cases depend on domain ports, infra implements them. All wired in `nimbus-api/src/main.rs`.

### Frontend — Angular 19 (Clean Architecture)

Four layers mirroring the backend pattern:

- **presentation/** — Standalone Angular components. The canvas engine (`canvas-engine.ts`) is a custom 2D renderer handling nodes, edges, grid, pan/zoom, and drag interactions.
- **application/** — Facades orchestrating business logic (diagram, AI, export, validation, translation). State management via Angular signals. DI tokens defined in `tokens.ts`.
- **infrastructure/** — HTTP gateways implementing domain interfaces, HTTP clients, error interceptors.
- **domain/** — Interfaces (repository, AI provider, translation/validation providers) and models (Diagram, Node, Edge, ServiceCatalog).

Two routes: `/diagrams` (list view) and `/diagrams/:id` (editor with canvas, chat, properties panel, service library).

### Key Patterns

- Backend uses one-struct-per-use-case pattern — each use case is its own module with `execute()` method.
- Frontend uses the Facade pattern to mediate between components and infrastructure.
- Angular DI tokens (`InjectionToken`) enable swapping implementations (e.g., gateway adapters).
- Database migrations managed via sqlx in `backend/migrations/`.
