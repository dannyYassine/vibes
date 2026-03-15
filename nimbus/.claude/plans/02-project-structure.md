# Nimbus — Project Structure

## Top-Level Layout

```
nimbus/
├── backend/                      # Rust backend (Cargo workspace)
│   ├── Cargo.toml                # Workspace manifest
│   ├── Cargo.lock
│   ├── .env.example
│   ├── crates/
│   │   ├── nimbus-api/           # Presentation layer (Axum handlers)
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── main.rs       # Server startup, DI wiring
│   │   │       ├── config.rs     # AppConfig (port, db_url, api_key, cors)
│   │   │       ├── state.rs      # AppState (holds Arc<dyn trait> dependencies)
│   │   │       ├── handlers/
│   │   │       │   ├── mod.rs
│   │   │       │   ├── diagrams.rs   # CRUD handlers
│   │   │       │   ├── generate.rs   # AI generation + AI modify (SSE)
│   │   │       │   ├── validate.rs   # Validation (deterministic) + AI fix (SSE)
│   │   │       │   ├── translate.rs  # Cloud provider translation (no AI)
│   │   │       │   ├── terraform.rs       # Terraform export (no AI)
│   │   │       │   ├── docker_compose.rs  # Docker Compose export (no AI)
│   │   │       │   └── health.rs
│   │   │       ├── routes.rs     # Router composition
│   │   │       ├── dto/          # Request/Response DTOs
│   │   │       │   ├── mod.rs
│   │   │       │   ├── diagram_dto.rs
│   │   │       │   └── generate_dto.rs
│   │   │       ├── middleware/
│   │   │       │   ├── mod.rs
│   │   │       │   └── error_handler.rs
│   │   │       └── extractors/
│   │   │           └── mod.rs
│   │   │
│   │   ├── nimbus-app/           # Application layer (use cases)
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── lib.rs
│   │   │       └── use_cases/
│   │   │           ├── mod.rs
│   │   │           ├── create_diagram.rs
│   │   │           ├── get_diagram.rs
│   │   │           ├── update_diagram.rs
│   │   │           ├── delete_diagram.rs
│   │   │           ├── list_diagrams.rs
│   │   │           ├── generate_diagram.rs
│   │   │           ├── validate_diagram.rs     # Deterministic validation (no AI)
│   │   │           ├── fix_diagram.rs          # AI-powered fix for validation issues
│   │   │           ├── translate_diagram.rs    # Generic → cloud provider (no AI)
│   │   │           ├── export_terraform.rs     # Terraform HCL generation (no AI)
│   │   │           └── export_docker_compose.rs  # Docker Compose generation (no AI)
│   │   │
│   │   ├── nimbus-domain/        # Domain layer (entities, ports, services)
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── lib.rs
│   │   │       ├── entities/
│   │   │       │   ├── mod.rs
│   │   │       │   ├── diagram.rs
│   │   │       │   ├── node.rs          # Generic, cloud-agnostic component types
│   │   │       │   ├── edge.rs
│   │   │       │   ├── cloud_catalog.rs  # Cloud provider mappings (generic → AWS/GCP/Azure)
│   │   │       │   └── docker_catalog.rs # Docker image mappings (generic → Docker images)
│   │   │       ├── ports/
│   │   │       │   ├── mod.rs
│   │   │       │   ├── diagram_repository.rs   # trait DiagramRepository
│   │   │       │   └── ai_provider.rs          # trait AiProvider
│   │   │       ├── services/
│   │   │       │   ├── mod.rs
│   │   │       │   ├── layout_service.rs       # Auto-layout algorithm
│   │   │       │   ├── validation_service.rs   # Generic component validation
│   │   │       │   ├── translation_service.rs  # Generic → cloud provider translation
│   │   │       │   ├── terraform_service.rs    # Terraform HCL generation
│   │   │       │   └── docker_compose_service.rs  # Docker Compose YAML generation
│   │   │       └── errors.rs                   # Domain error types
│   │   │
│   │   ├── nimbus-infra/         # Infrastructure layer (trait implementations)
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── lib.rs
│   │   │       ├── persistence/
│   │   │       │   ├── mod.rs
│   │   │       │   ├── postgres_diagram_repo.rs  # impl DiagramRepository
│   │   │       │   └── pool.rs                   # Connection pool setup
│   │   │       └── ai/
│   │   │           ├── mod.rs
│   │   │           ├── claude_ai_provider.rs     # impl AiProvider
│   │   │           ├── prompts/
│   │   │           │   ├── mod.rs
│   │   │           │   ├── system.rs
│   │   │           │   └── templates.rs
│   │   │           └── parser.rs
│   │   │
│   │   └── nimbus-shared/        # Shared types (DTOs crossing layer boundaries)
│   │       ├── Cargo.toml
│   │       └── src/
│   │           ├── lib.rs
│   │           └── events.rs     # GenerateEvent, SSE event types
│   │
│   ├── migrations/               # SQLx migrations
│   │   └── 001_initial.sql
│   └── tests/                    # Integration tests
│       └── api/
│           └── diagram_tests.rs
│
├── frontend/                     # Angular application
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── index.html
│   │   ├── styles.scss
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.prod.ts
│   │   └── app/
│   │       ├── app.component.ts
│   │       ├── app.component.html
│   │       ├── app.component.scss
│   │       ├── app.routes.ts
│   │       │
│   │       ├── domain/                         # Domain layer (framework-agnostic)
│   │       │   ├── models/
│   │       │   │   ├── diagram.model.ts
│   │       │   │   ├── node.model.ts
│   │       │   │   ├── edge.model.ts
│   │       │   │   ├── cloud-provider.model.ts
│   │       │   │   └── component-catalog.model.ts
│   │       │   ├── interfaces/
│   │       │   │   ├── diagram-repository.interface.ts
│   │       │   │   ├── ai-provider.interface.ts
│   │       │   │   └── translation-provider.interface.ts
│   │       │   └── state/
│   │       │       ├── diagram.state.ts        # Pure business state logic
│   │       │       ├── selection.state.ts
│   │       │       └── undo-redo.manager.ts
│   │       │
│   │       ├── application/                    # Application layer (facades / use cases)
│   │       │   ├── facades/
│   │       │   │   ├── diagram.facade.ts
│   │       │   │   ├── ai.facade.ts
│   │       │   │   ├── translation.facade.ts   # Cloud provider translation
│   │       │   │   └── export.facade.ts        # PNG, JSON, Terraform export
│   │       │   └── mappers/
│   │       │       ├── diagram.mapper.ts       # DTO ↔ domain entity mapping
│   │       │       └── node.mapper.ts
│   │       │
│   │       ├── infrastructure/                 # Infrastructure layer (external I/O)
│   │       │   ├── gateways/
│   │       │   │   ├── api.gateway.ts          # HTTP client (impl DiagramRepository)
│   │       │   │   └── sse.client.ts           # SSE streaming (impl AiProvider)
│   │       │   ├── adapters/
│   │       │   │   └── local-storage.adapter.ts
│   │       │   └── interceptors/
│   │       │       └── error.interceptor.ts
│   │       │
│   │       ├── presentation/                   # Presentation layer (Angular components)
│   │       │   ├── editor/
│   │       │   │   └── editor.component.ts     # Layout shell for the editor page
│   │       │   ├── canvas/
│   │       │   │   ├── canvas.component.ts
│   │       │   │   ├── canvas.component.html
│   │       │   │   ├── canvas.component.scss
│   │       │   │   ├── renderers/
│   │       │   │   │   ├── node-renderer.ts
│   │       │   │   │   ├── edge-renderer.ts
│   │       │   │   │   └── grid-renderer.ts
│   │       │   │   └── handlers/
│   │       │   │       ├── drag-handler.ts
│   │       │   │       ├── zoom-handler.ts
│   │       │   │       └── selection-handler.ts
│   │       │   ├── sidebar/
│   │       │   │   ├── sidebar.component.ts
│   │       │   │   ├── properties-panel/
│   │       │   │   │   └── properties-panel.component.ts
│   │       │   │   ├── service-library/
│   │       │   │   │   └── service-library.component.ts
│   │       │   │   └── provider-selector/
│   │       │   │       └── provider-selector.component.ts
│   │       │   ├── chat/
│   │       │   │   └── chat.component.ts
│   │       │   ├── toolbar/
│   │       │   │   └── toolbar.component.ts
│   │       │   └── diagram-list/
│   │       │       └── diagram-list.component.ts
│   │       │
│   │       └── shared/                         # Shared UI components
│   │           ├── components/
│   │           │   ├── toast/
│   │           │   │   └── toast.component.ts
│   │           │   └── confirm-dialog/
│   │           │       └── confirm-dialog.component.ts
│   │           └── pipes/
│   │               └── component-icon.pipe.ts
│   │
│   └── assets/
│       └── icons/                # Generic + cloud provider SVG icons
│
├── .claude/
│   └── plans/                    # Plan files (this directory)
│
├── docker-compose.yml            # PostgreSQL + app services
└── README.md
```

## Clean Architecture — Layer Dependency Rules

```
Presentation → Application → Domain ← Infrastructure
                                ↑            │
                                └────────────┘
                              (implements traits/interfaces)
```

- **Domain** depends on nothing. Pure business logic.
- **Application** depends on Domain only. Orchestrates use cases.
- **Infrastructure** depends on Domain (implements its ports). Never imported by Application directly.
- **Presentation** depends on Application (calls facades/use cases). Never touches Infrastructure directly.

## Key Conventions

### Rust Backend
- **5 workspace crates** separated by clean architecture layer:
  - `nimbus-domain` — entities, ports (traits), domain services. Zero IO dependencies
  - `nimbus-app` — use cases that orchestrate domain logic. Depends only on `nimbus-domain`
  - `nimbus-infra` — implements domain ports (PostgreSQL repo, Claude AI client). Depends on `nimbus-domain`
  - `nimbus-api` — Axum handlers, routing, DTOs. Depends on `nimbus-app` + `nimbus-domain`
  - `nimbus-shared` — cross-cutting types (SSE events) shared between layers
- **Dependency injection** via `Arc<dyn Trait>` in `AppState`, wired in `main.rs`
- Domain traits define the contract; infrastructure provides the implementation

### Angular Frontend
- **4 layer folders** under `src/app/`:
  - `domain/` — models, interfaces, pure state classes. No Angular imports
  - `application/` — facade services, DTO mappers. Orchestrates domain + infra
  - `infrastructure/` — HTTP gateways, SSE client, browser adapters. Implements domain interfaces
  - `presentation/` — Angular components. Thin — delegates to facades immediately
- **Standalone components** (Angular 17+ style, no NgModules)
- **Angular DI** wires infrastructure implementations to domain interfaces via `provide` tokens
- **Renderers/Handlers** in canvas are plain TypeScript classes (not components) for performance
