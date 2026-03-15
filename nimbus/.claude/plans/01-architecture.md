# Nimbus — System Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Angular Frontend                         │
│                                                              │
│  ┌─────────────── Presentation Layer ──────────────────┐     │
│  │  CanvasComponent  SidebarComponent  ChatComponent   │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌─────────────── Application Layer ───────────────────┐     │
│  │  DiagramFacade    AiFacade    ExportFacade           │     │
│  │  (orchestrates use cases, no business logic)        │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌─────────────── Domain Layer ────────────────────────┐     │
│  │  DiagramState    SelectionState    UndoRedoManager   │     │
│  │  (pure business rules, framework-agnostic)          │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌─────────────── Infrastructure Layer ────────────────┐     │
│  │  ApiGateway    SseClient    LocalStorageAdapter      │     │
│  │  (HTTP calls, SSE, browser APIs)                    │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────┴───────────────────────────────────┐
│                      Rust Backend                            │
│                                                              │
│  ┌─────────────── Presentation Layer ──────────────────┐     │
│  │  Axum Handlers (routes, extractors, SSE responses)  │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌─────────────── Application Layer ───────────────────┐     │
│  │  Use Cases: GenerateDiagram, UpdateDiagram, etc.    │     │
│  │  (orchestration, no business logic)                 │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌─────────────── Domain Layer ────────────────────────┐     │
│  │  Entities: Diagram, Node, Edge                      │     │
│  │  Services: LayoutService, ValidationService         │     │
│  │  Ports: DiagramRepository, AiProvider (traits)      │     │
│  │  (pure Rust — zero framework/IO dependencies)       │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │ (trait impls)                       │
│  ┌─────────────── Infrastructure Layer ────────────────┐     │
│  │  PostgresDiagramRepo    ClaudeAiProvider             │     │
│  │  (SQLx, reqwest — concrete implementations)         │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                           │
                     Claude API (external)
```

## Clean Architecture Principles

Both frontend and backend follow the same layered architecture with the **Dependency Rule**: dependencies point inward. Outer layers depend on inner layers, never the reverse.

### Layers (inside → outside)

1. **Domain Layer** — Entities, value objects, business rules, port traits/interfaces. Zero dependencies on frameworks, databases, or external services.
2. **Application Layer** — Use cases that orchestrate domain logic. Depends only on domain. Defines the "what" without the "how."
3. **Infrastructure Layer** — Concrete implementations of domain ports (database repos, HTTP clients, browser APIs). Depends on domain interfaces.
4. **Presentation Layer** — UI components (Angular) or HTTP handlers (Axum). Depends on application layer facades/use cases.

### Key Rules
- Domain layer has **no imports** from infrastructure, presentation, or framework code
- Infrastructure implements domain-defined **traits** (Rust) / **interfaces** (TypeScript)
- Dependency injection wires concrete implementations to abstract ports at startup
- Data crosses layer boundaries via **DTOs** — domain entities are never exposed to the API or UI directly

## Frontend Architecture (Angular)

### Clean Architecture Mapping

| Layer | Angular Concept | Responsibility |
|-------|----------------|----------------|
| Presentation | Components (Canvas, Sidebar, Chat, Toolbar) | Render UI, capture user events, delegate to facades |
| Application | Facade services (DiagramFacade, AiFacade) | Orchestrate use cases, coordinate domain + infra |
| Domain | Pure TypeScript classes/interfaces | Business rules, state logic, entity definitions |
| Infrastructure | Gateway services (ApiGateway, SseClient) | HTTP calls, SSE streaming, browser API access |

### Key Architectural Decisions
- **Canvas rendering**: HTML5 Canvas via a custom Angular component (not SVG — better performance for large diagrams)
- **State management**: Domain-layer state classes exposed through application-layer facades. RxJS observables for reactivity, but business logic is framework-agnostic
- **Component architecture**: Components are thin — they delegate immediately to facades. No business logic in components
- **Dependency injection**: Angular DI wires infrastructure implementations; domain layer uses interfaces only

## Backend Architecture (Rust)

### Clean Architecture Mapping

| Layer | Rust Concept | Responsibility |
|-------|-------------|----------------|
| Presentation | Axum handlers, extractors, response types | Parse HTTP requests, call use cases, format responses |
| Application | Use case structs with `execute()` methods | Orchestrate domain services + repository calls |
| Domain | Entities, value objects, traits (ports) | Business rules, validation, layout algorithms |
| Infrastructure | Trait implementations (repos, AI client) | PostgreSQL via SQLx, Claude API via reqwest |

### Key Architectural Decisions
- **Web framework**: Axum (tower-based, composable, type-safe extractors, first-class SSE support via `axum::response::Sse`)
- **Dependency inversion**: Domain defines `trait DiagramRepository` and `trait AiProvider`. Infrastructure provides `PostgresDiagramRepo` and `ClaudeAiProvider`. Use cases accept trait objects (`Arc<dyn DiagramRepository>`)
- **Database**: SQLx for async PostgreSQL access with compile-time query checking
- **AI integration**: Direct HTTP calls to Claude API via `reqwest`, behind the `AiProvider` trait
- **Serialization**: `serde` for JSON serialization/deserialization throughout
- **Error handling**: `thiserror` for typed errors per layer, mapped at layer boundaries

## Communication Patterns

### Request/Response (primary)
- Frontend sends HTTP requests to backend REST endpoints
- Backend returns JSON responses
- All diagram mutations go through the backend for validation

### Streaming (AI generation)
- AI generation uses Server-Sent Events (SSE) for streaming responses
- Axum's `Sse` response type wraps a `Stream` of `Event` items
- Frontend receives incremental diagram updates as the AI generates nodes
- Provides visual feedback during generation (nodes appearing one by one)

### Data Flow: Natural Language → Diagram

```
1. User types: "VPC with 2 public subnets and an ALB"
2. ChatComponent → AiFacade.generate(prompt)
3. AiFacade → ApiGateway → POST /api/diagrams/generate { prompt: "..." }
4. Axum handler → GenerateDiagramUseCase.execute(prompt)
5. UseCase → AiProvider.generate(prompt) → Claude API (streaming)
6. Claude returns structured JSON: { nodes: [...], edges: [...] }
7. UseCase validates & enriches via domain services (ValidationService, LayoutService)
8. Axum handler streams SSE events back to Angular
9. SseClient → AiFacade → DiagramState applies patches
10. Presentation layer re-renders canvas
```

## Cross-Cutting Concerns

### Authentication (post-MVP)
- JWT-based auth with refresh tokens
- Backend issues tokens, frontend stores in memory (not localStorage)
- Auth middleware in Axum via tower layers

### Error Handling
- Each layer defines its own error types
- Errors are mapped at layer boundaries (domain error → application error → HTTP error)
- Backend returns structured error responses: `{ error: string, code: string, details?: any }`
- Frontend displays errors via a toast notification service
- AI generation errors trigger a retry with exponential backoff (max 3 attempts)

### CORS
- Axum CORS configured via `tower-http::CorsLayer`
- Development: allow Angular dev server origin
- Production: same-origin or configured allowed origins
