# Nimbus — Dependencies

## Rust Crates

### Workspace-Level Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `serde` | 1.x | Serialization/deserialization framework |
| `serde_json` | 1.x | JSON parsing and generation |
| `uuid` | 1.x | UUID v4 generation and parsing |
| `chrono` | 0.4.x | Date/time types with serde support |
| `tokio` | 1.x | Async runtime |
| `tracing` | 0.1.x | Structured logging |
| `anyhow` | 1.x | Ad-hoc error contexts |
| `thiserror` | 2.x | Derive macro for typed errors |
| `async-trait` | 0.1.x | Async functions in trait definitions |

### `nimbus-api` (Presentation Layer)

| Crate | Version | Purpose |
|-------|---------|---------|
| `axum` | 0.8.x | HTTP framework (routing, extractors, SSE) |
| `tower` | 0.5.x | Middleware framework |
| `tower-http` | 0.6.x | CORS, tracing, compression middleware |
| `tracing-subscriber` | 0.3.x | Log output formatting |
| `dotenv` | 0.15.x | Load .env files |

### `nimbus-app` (Application Layer)

No additional crates beyond workspace dependencies. Depends on `nimbus-domain` only.

### `nimbus-domain` (Domain Layer)

No additional crates beyond `serde`, `serde_json`, `uuid`, `chrono`, `thiserror`, `async-trait`. Zero IO dependencies.

### `nimbus-infra` (Infrastructure Layer)

| Crate | Version | Purpose |
|-------|---------|---------|
| `sqlx` | 0.8.x | Async PostgreSQL driver with compile-time checked queries |
| `reqwest` | 0.12.x | HTTP client for Claude API |
| `tokio-stream` | 0.1.x | Async stream utilities for SSE |
| `futures` | 0.3.x | Stream combinators |

SQLx features: `runtime-tokio`, `tls-rustls`, `postgres`, `uuid`, `chrono`, `json`

### `nimbus-shared`

No additional crates beyond `serde`, `serde_json`.

### Dev Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `axum-test` | 0.9.x | Axum integration test helpers |
| `testcontainers` | 0.23.x | Spin up PostgreSQL in Docker for integration tests |
| `wiremock` | 0.6.x | Mock HTTP server for AI client tests |
| `tokio-test` | 0.4.x | Async test utilities |

---

## npm Packages (Angular Frontend)

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@angular/core` | ^19.x | Angular framework |
| `@angular/common` | ^19.x | Common directives and pipes |
| `@angular/router` | ^19.x | Client-side routing |
| `@angular/forms` | ^19.x | Template-driven and reactive forms |
| `@angular/platform-browser` | ^19.x | Browser platform |
| `rxjs` | ^7.x | Reactive programming (observables, subjects) |
| `zone.js` | ^0.15.x | Angular change detection |

### UI / Canvas

| Package | Version | Purpose |
|---------|---------|---------|
| *None* | — | Canvas rendering is custom (no library needed) |

Note: We intentionally avoid canvas libraries (fabric.js, konva, etc.) to keep full control over rendering performance and behavior. If custom canvas proves too complex, `konva` is the fallback option.

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@angular/cli` | ^19.x | Build tooling |
| `typescript` | ^5.6.x | TypeScript compiler |
| `jest` | ^29.x | Test runner (if replacing Karma) |
| `@types/jest` | ^29.x | Jest type definitions |
| `jest-preset-angular` | ^14.x | Angular Jest integration |
| `cypress` | ^13.x | E2E testing |
| `eslint` | ^9.x | Linting |
| `@angular-eslint/*` | ^19.x | Angular-specific lint rules |
| `prettier` | ^3.x | Code formatting |

---

## Infrastructure / Tooling

| Tool | Purpose |
|------|---------|
| Docker Compose | Run PostgreSQL locally |
| PostgreSQL 16 | Primary database |
| Node.js 22 LTS | Angular dev server and build |
| Rust 1.83+ (stable) | Backend compilation |
| `cargo-watch` | Auto-recompile Rust on file changes during dev |
| `sqlx-cli` | Run database migrations |

### Docker Compose Services

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: nimbus
      POSTGRES_USER: nimbus
      POSTGRES_PASSWORD: nimbus_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Dependency Decisions & Rationale

**Why Axum?**
Axum is built on tower, giving access to a rich middleware ecosystem. It has first-class SSE support via `axum::response::Sse`, type-safe extractors, and composes naturally with the tower service pattern. Its `State` extractor works well with clean architecture's dependency injection via `Arc<AppState>`.

**Why SQLx over Diesel?**
SQLx's compile-time query checking and async-native design align well with Axum's async model. Diesel requires a separate connection pool model and has a steeper learning curve for JSONB operations.

**Why `async-trait`?**
Domain port traits need async methods (for repository and AI provider). `async-trait` provides this cleanly until Rust's native async trait support stabilizes fully.

**Why custom canvas over a library?**
Canvas libraries (konva, fabric.js) add significant bundle size and impose their own event models. For a diagramming app where performance matters and interactions are custom, a thin custom layer gives better control. If this proves too costly, konva is the escape hatch.

**Why no NgRx?**
Clean architecture already provides structured state management via domain state classes and application facades. NgRx would add redundant boilerplate (actions, reducers, effects) on top of the facade pattern. RxJS BehaviorSubjects in facades are sufficient.
