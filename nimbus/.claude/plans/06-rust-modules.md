# Nimbus — Rust Modules (Clean Architecture)

## Workspace Structure

The backend is a Cargo workspace with five crates, organized by clean architecture layers.

```toml
# backend/Cargo.toml (workspace root)
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
anyhow = "1"
thiserror = "2"
async-trait = "0.1"
```

### Dependency Graph

```
nimbus-api → nimbus-app → nimbus-domain ← nimbus-infra
                 │              ↑              │
                 └──────────────┘              │
                                               │
                                         nimbus-shared
```

- `nimbus-domain` depends on **nothing** (only std + serde/uuid/chrono for data modeling)
- `nimbus-app` depends on `nimbus-domain`
- `nimbus-infra` depends on `nimbus-domain` (implements its traits)
- `nimbus-api` depends on `nimbus-app`, `nimbus-domain`, `nimbus-infra` (wiring only), `nimbus-shared`
- `nimbus-shared` has minimal dependencies (shared event types)

---

## `nimbus-domain` — Domain Layer

The innermost layer. Pure business logic with zero framework or IO dependencies.

### Dependencies
- `serde`, `serde_json`, `uuid`, `chrono` — data modeling only
- `thiserror` — domain error types
- `async-trait` — for async trait definitions

### Module Breakdown

```
nimbus-domain/src/
├── lib.rs              # Public API re-exports
├── entities/
│   ├── mod.rs
│   ├── diagram.rs      # Diagram, Viewport
│   ├── node.rs         # Node, NodeType, Position, Size, NodeProperties
│   ├── edge.rs         # Edge, EdgeType, EdgeProperties
│   └── cloud_catalog.rs # Cloud provider mappings, translation logic
├── ports/
│   ├── mod.rs
│   ├── diagram_repository.rs   # trait DiagramRepository
│   └── ai_provider.rs          # trait AiProvider
├── services/
│   ├── mod.rs
│   ├── layout_service.rs       # Auto-layout algorithm
│   ├── validation_service.rs   # Diagram validation (generic component rules)
│   ├── translation_service.rs  # Generic → cloud provider translation
│   ├── terraform_service.rs    # Terraform HCL generation from provider-translated diagrams
│   └── docker_compose_service.rs  # Docker Compose YAML generation from generic diagrams
└── errors.rs                   # DomainError enum
```

### Port Traits

```rust
// ports/diagram_repository.rs
#[async_trait]
pub trait DiagramRepository: Send + Sync {
    async fn list(&self) -> Result<Vec<DiagramListItem>, DomainError>;
    async fn get(&self, id: Uuid) -> Result<Diagram, DomainError>;
    async fn create(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError>;
    async fn update(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
}

// ports/ai_provider.rs
#[async_trait]
pub trait AiProvider: Send + Sync {
    /// Generate a diagram from a natural language prompt.
    /// Returns a stream of GenerateEvent items.
    async fn generate(&self, prompt: &str) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError>;

    /// Modify an existing diagram based on a prompt and context.
    async fn modify(
        &self,
        prompt: &str,
        existing_diagram: &Diagram,
        selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError>;
}
```

### Domain Services

```rust
// services/layout_service.rs
pub struct LayoutService;

impl LayoutService {
    /// Applies a layered graph layout to the diagram.
    /// Uses a simplified Sugiyama algorithm.
    pub fn auto_layout(diagram: &mut Diagram) { /* ... */ }
}

// services/validation_service.rs
pub struct ValidationService;

impl ValidationService {
    pub fn validate(diagram: &Diagram) -> Vec<ValidationWarning> { /* ... */ }
}

// services/translation_service.rs
pub struct TranslationService;

impl TranslationService {
    /// Translate a generic diagram to a specific cloud provider.
    /// Populates `provider_mappings` on each node using the cloud catalog.
    pub fn translate(diagram: &mut Diagram, provider: CloudProvider) { /* ... */ }

    /// Clear provider translation, returning to generic view.
    pub fn clear_translation(diagram: &mut Diagram) { /* ... */ }
}

// services/terraform_service.rs
pub struct TerraformService;

impl TerraformService {
    /// Generate Terraform HCL files from a provider-translated diagram.
    /// Requires `active_provider` to be set on the diagram.
    pub fn generate(diagram: &Diagram) -> Result<Vec<TerraformFile>, DomainError> { /* ... */ }
}

// services/docker_compose_service.rs
pub struct DockerComposeService;

impl DockerComposeService {
    /// Generate docker-compose.yml from a generic diagram.
    /// No cloud translation required — maps generic components to Docker images.
    pub fn generate(diagram: &Diagram) -> Result<String, DomainError> { /* ... */ }
}
```

### Domain Errors

```rust
// errors.rs
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Entity not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("AI provider error: {0}")]
    AiError(String),
    #[error("Persistence error: {0}")]
    PersistenceError(String),
}
```

---

## `nimbus-app` — Application Layer

Use cases that orchestrate domain logic. Each use case is a struct with an `execute()` method. Receives domain port traits via constructor injection.

### Dependencies
- `nimbus-domain` — entities, ports, services
- `async-trait`, `tokio` — async execution

### Module Breakdown

```
nimbus-app/src/
├── lib.rs
└── use_cases/
    ├── mod.rs
    ├── create_diagram.rs
    ├── get_diagram.rs
    ├── update_diagram.rs
    ├── delete_diagram.rs
    ├── list_diagrams.rs
    ├── generate_diagram.rs
    ├── validate_diagram.rs        # Run deterministic validation rules (no AI)
    ├── fix_diagram.rs             # AI-powered fix for a specific validation issue
    ├── translate_diagram.rs       # Translate generic → cloud provider (no AI)
    ├── export_terraform.rs        # Generate Terraform from translated diagram (no AI)
    └── export_docker_compose.rs   # Generate docker-compose.yml from generic diagram (no AI)
```

### Use Case Pattern

```rust
// use_cases/generate_diagram.rs
pub struct GenerateDiagramUseCase {
    ai_provider: Arc<dyn AiProvider>,
    diagram_repo: Arc<dyn DiagramRepository>,
}

impl GenerateDiagramUseCase {
    pub fn new(
        ai_provider: Arc<dyn AiProvider>,
        diagram_repo: Arc<dyn DiagramRepository>,
    ) -> Self {
        Self { ai_provider, diagram_repo }
    }

    pub async fn execute(&self, prompt: &str) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        // 1. Call AI provider to generate diagram structure
        let event_stream = self.ai_provider.generate(prompt).await?;

        // 2. Stream is returned to the presentation layer
        //    Validation and layout happen per-event or after completion
        Ok(event_stream)
    }
}

// use_cases/update_diagram.rs
pub struct UpdateDiagramUseCase {
    diagram_repo: Arc<dyn DiagramRepository>,
}

impl UpdateDiagramUseCase {
    pub fn new(diagram_repo: Arc<dyn DiagramRepository>) -> Self {
        Self { diagram_repo }
    }

    pub async fn execute(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError> {
        // 1. Validate the diagram using domain services
        let warnings = ValidationService::validate(diagram);
        if warnings.iter().any(|w| w.severity == Severity::Error) {
            return Err(DomainError::Validation("Diagram has validation errors".into()));
        }

        // 2. Persist via repository port
        self.diagram_repo.update(id, diagram).await
    }
}
```

---

## `nimbus-infra` — Infrastructure Layer

Concrete implementations of domain port traits. Contains all IO: database, HTTP clients, file system.

### Dependencies
- `nimbus-domain` — implements its port traits
- `sqlx` — PostgreSQL async driver
- `reqwest` — HTTP client for Claude API
- `tokio-stream` — async stream utilities
- `serde`, `serde_json` — serialization

### Module Breakdown

```
nimbus-infra/src/
├── lib.rs              # Re-exports
├── persistence/
│   ├── mod.rs
│   ├── postgres_diagram_repo.rs  # impl DiagramRepository for PostgresDiagramRepo
│   └── pool.rs                   # DbPool type alias, connection setup
└── ai/
    ├── mod.rs
    ├── claude_ai_provider.rs     # impl AiProvider for ClaudeAiProvider
    ├── prompts/
    │   ├── mod.rs
    │   ├── system.rs             # System prompt for Claude
    │   └── templates.rs          # Prompt templates
    └── parser.rs                 # Parse Claude JSON → domain entities
```

### Repository Implementation

```rust
// persistence/postgres_diagram_repo.rs
pub struct PostgresDiagramRepo {
    pool: PgPool,
}

#[async_trait]
impl DiagramRepository for PostgresDiagramRepo {
    async fn list(&self) -> Result<Vec<DiagramListItem>, DomainError> {
        sqlx::query_as!(/* ... */)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))
    }

    async fn get(&self, id: Uuid) -> Result<Diagram, DomainError> { /* ... */ }
    async fn create(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError> { /* ... */ }

    async fn update(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError> {
        let mut tx = self.pool.begin().await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;

        // Update diagram metadata, replace nodes, replace edges in transaction
        // ...

        tx.commit().await
            .map_err(|e| DomainError::PersistenceError(e.to_string()))?;
        self.get(id).await
    }

    async fn delete(&self, id: Uuid) -> Result<(), DomainError> { /* ... */ }
}
```

### AI Provider Implementation

```rust
// ai/claude_ai_provider.rs
pub struct ClaudeAiProvider {
    http: reqwest::Client,
    api_key: String,
    model: String,
}

#[async_trait]
impl AiProvider for ClaudeAiProvider {
    async fn generate(&self, prompt: &str) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        let system_prompt = system::build_system_prompt();
        let request = self.build_request(&system_prompt, prompt);

        let response = self.http.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .json(&request)
            .send()
            .await
            .map_err(|e| DomainError::AiError(e.to_string()))?;

        let stream = parse_sse_stream(response.bytes_stream());
        Ok(Box::pin(stream))
    }

    async fn modify(
        &self,
        prompt: &str,
        existing_diagram: &Diagram,
        selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>, DomainError> {
        // Build contextual prompt including existing diagram state
        // ...
    }
}
```

---

## `nimbus-api` — Presentation Layer

Axum HTTP handlers, routing, request/response DTOs. This is the outermost layer on the backend.

### Dependencies
- `axum` — HTTP framework
- `tower`, `tower-http` — middleware (CORS, tracing)
- `nimbus-app` — use cases
- `nimbus-domain` — entities (for DTOs)
- `nimbus-infra` — concrete implementations (wired in `main.rs` only)
- `nimbus-shared` — event types
- `serde`, `serde_json` — serialization
- `tracing`, `tracing-subscriber` — structured logging

### Module Breakdown

```
nimbus-api/src/
├── main.rs           # Server startup, DI wiring
├── config.rs         # AppConfig struct
├── state.rs          # AppState (holds use cases with injected dependencies)
├── routes.rs         # Router composition
├── handlers/
│   ├── mod.rs
│   ├── health.rs     # GET /health
│   ├── diagrams.rs   # CRUD handlers
│   ├── generate.rs   # AI generation + AI modify SSE handlers
│   ├── validate.rs   # Diagram validation (deterministic) + AI fix (SSE)
│   ├── translate.rs       # Cloud provider translation handler (no AI)
│   ├── terraform.rs       # Terraform export handler (no AI)
│   └── docker_compose.rs  # Docker Compose export handler (no AI)
├── dto/
│   ├── mod.rs
│   ├── diagram_dto.rs    # CreateDiagramRequest, UpdateDiagramRequest, DiagramResponse
│   └── generate_dto.rs   # GenerateRequest
├── middleware/
│   ├── mod.rs
│   └── error_handler.rs  # Maps DomainError → HTTP responses
└── extractors/
    └── mod.rs
```

### App State & DI Wiring

```rust
// state.rs
pub struct AppState {
    pub create_diagram: CreateDiagramUseCase,
    pub get_diagram: GetDiagramUseCase,
    pub update_diagram: UpdateDiagramUseCase,
    pub delete_diagram: DeleteDiagramUseCase,
    pub list_diagrams: ListDiagramsUseCase,
    pub generate_diagram: GenerateDiagramUseCase,
    pub validate_diagram: ValidateDiagramUseCase,
    pub fix_diagram: FixDiagramUseCase,
    pub translate_diagram: TranslateDiagramUseCase,
    pub export_terraform: ExportTerraformUseCase,
    pub export_docker_compose: ExportDockerComposeUseCase,
}

// main.rs
#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();

    // Infrastructure (concrete implementations)
    let pool = nimbus_infra::persistence::create_pool(&config.database_url).await;
    let diagram_repo: Arc<dyn DiagramRepository> = Arc::new(PostgresDiagramRepo::new(pool));
    let ai_provider: Arc<dyn AiProvider> = Arc::new(ClaudeAiProvider::new(&config.ai_api_key));

    // Application (use cases with injected ports)
    let state = AppState {
        create_diagram: CreateDiagramUseCase::new(diagram_repo.clone()),
        get_diagram: GetDiagramUseCase::new(diagram_repo.clone()),
        update_diagram: UpdateDiagramUseCase::new(diagram_repo.clone()),
        delete_diagram: DeleteDiagramUseCase::new(diagram_repo.clone()),
        list_diagrams: ListDiagramsUseCase::new(diagram_repo.clone()),
        generate_diagram: GenerateDiagramUseCase::new(ai_provider, diagram_repo),
    };

    let app = routes::create_router(Arc::new(state));

    let listener = tokio::net::TcpListener::bind(&config.bind_addr()).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Router & Handlers

```rust
// routes.rs
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/api/diagrams", get(handlers::diagrams::list).post(handlers::diagrams::create))
        .route("/api/diagrams/{id}", get(handlers::diagrams::get_by_id)
            .patch(handlers::diagrams::update)
            .delete(handlers::diagrams::delete))
        .route("/api/diagrams/generate", post(handlers::generate::generate))
        .route("/api/diagrams/{id}/modify", post(handlers::generate::modify))
        .route("/api/diagrams/{id}/validate", post(handlers::validate::validate))
        .route("/api/diagrams/{id}/fix", post(handlers::validate::fix))
        .route("/api/diagrams/{id}/translate", post(handlers::translate::translate)
            .delete(handlers::translate::clear))
        .route("/api/diagrams/{id}/export/terraform", get(handlers::terraform::export))
        .route("/api/diagrams/{id}/export/docker-compose", get(handlers::docker_compose::export))
        .layer(CorsLayer::permissive())  // tighten for production
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

// handlers/diagrams.rs
pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateDiagramRequest>,
) -> Result<(StatusCode, Json<DiagramResponse>), AppError> {
    let diagram = state.create_diagram.execute(&body.name, body.description.as_deref()).await?;
    Ok((StatusCode::CREATED, Json(DiagramResponse::from(diagram))))
}

// handlers/generate.rs
pub async fn generate(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GenerateRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let event_stream = state.generate_diagram.execute(&body.prompt).await?;

    let sse_stream = event_stream.map(|event| {
        Ok(Event::default()
            .event(event.event_type.as_str())
            .json_data(event.data)
            .unwrap())
    });

    Ok(Sse::new(sse_stream))
}
```

### Error Handling

```rust
// middleware/error_handler.rs
pub struct AppError(DomainError);

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self { Self(err) }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match &self.0 {
            DomainError::NotFound(_) => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            DomainError::Validation(_) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR"),
            DomainError::AiError(_) => (StatusCode::BAD_GATEWAY, "AI_ERROR"),
            DomainError::PersistenceError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        };

        let body = json!({
            "error": self.0.to_string(),
            "code": code,
        });

        (status, Json(body)).into_response()
    }
}
```

---

## `nimbus-shared` — Cross-Cutting Types

Lightweight crate for types shared across layer boundaries (e.g., SSE event types).

```rust
// shared/src/events.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateEvent {
    pub event_type: GenerateEventType,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GenerateEventType {
    NodeAdded,
    EdgeAdded,
    NodeRemoved,
    NodeUpdated,
    EdgeRemoved,
    LayoutUpdated,
    Complete,
    Error,
}
```
