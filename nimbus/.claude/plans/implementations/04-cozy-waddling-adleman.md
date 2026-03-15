# Phase 2, Week 3: AI Generation Core

## Context

Phase 1 is complete — the backend has full CRUD endpoints with PostgreSQL persistence, and the frontend has the Angular shell with clean architecture (domain/application/infrastructure/presentation layers). The `AiProvider` trait and `GenerateEvent` types are already defined but unimplemented. This session builds the end-to-end AI diagram generation flow: user types a prompt → backend calls Claude API with tool use → parses structured output → validates → auto-layouts → saves → returns diagram to frontend.

---

## Implementation Order

Build bottom-up: domain services → infrastructure → app use case → API wiring → frontend.

---

### Step 1: Workspace Dependencies

**`backend/Cargo.toml`** — add to `[workspace.dependencies]`:
- `reqwest = { version = "0.12", features = ["json"] }`
- `futures-util = "0.3"`

**`backend/crates/nimbus-infra/Cargo.toml`** — add:
- `reqwest`, `serde`, `tokio`, `futures-util` (workspace), `nimbus-shared = { path = "../nimbus-shared" }`

**`backend/crates/nimbus-app/Cargo.toml`** — add:
- `nimbus-shared`, `async-trait`, `serde_json`, `tokio`, `futures-util`, `tracing` (workspace)

---

### Step 2: Layout Service (nimbus-domain)

**New file: `backend/crates/nimbus-domain/src/services/layout_service.rs`**

Pure domain logic, no external deps.

- `LayoutService::apply_layout(nodes: &mut Vec<Node>, edges: &[Edge]) -> Viewport`
- Algorithm: Kahn's topological sort → layer assignment → grid placement
- Constants: `COLUMN_SPACING = 300.0`, `ROW_SPACING = 200.0`, `START_X = 100.0`, `START_Y = 100.0`
- Nodes with in-degree 0 go to layer 0; cycle nodes go to last layer + 1
- Returns viewport centered on the bounding box

**Modify: `backend/crates/nimbus-domain/src/services/mod.rs`** → `pub mod layout_service;`

---

### Step 3: AI Response Parser (nimbus-infra)

**New file: `backend/crates/nimbus-infra/src/ai/parser.rs`**

Intermediate types matching Claude's tool use output:
```rust
struct AiDiagramResponse { name, description, nodes: Vec<AiNode>, edges: Vec<AiEdge> }
struct AiNode { id: String, category, component, label, parent_id: Option<String> }
struct AiEdge { source_id, target_id, edge_type, label, protocol }
```

`parse_ai_response(response: &AiDiagramResponse) -> Result<(String, Option<String>, Vec<Node>, Vec<Edge>), DomainError>`
- Maps temporary string IDs ("node_1") → real UUIDs via HashMap
- Parses category+component strings into `NodeType` tagged enum
- Creates nodes with default position (0,0) and size (180×80)
- Resolves edge source/target IDs through the map

---

### Step 4: Validation Layer (nimbus-infra)

**New file: `backend/crates/nimbus-infra/src/ai/validator.rs`**

`validate_ai_output(nodes: &[Node], edges: &[Edge]) -> Result<(), DomainError>`

Rules:
1. At least 1 node
2. Edge source/target reference existing node IDs
3. No duplicate node IDs
4. No self-loops
5. No duplicate edges (same source+target)
6. Non-empty labels, max 100 chars
7. Parent must exist and be a Group type
8. Max 50 nodes, 100 edges

---

### Step 5: System Prompt (nimbus-infra)

**New file: `backend/crates/nimbus-infra/src/ai/prompts/system_prompt.rs`**

Contains the system prompt as a `pub const SYSTEM_PROMPT: &str`. Covers:
- Role: system architecture expert designing cloud-agnostic diagrams
- Full NodeType taxonomy (all categories + components exactly matching the enum)
- EdgeType explanations (Synchronous, Asynchronous, DataFlow, Dependency)
- Architecture style guidance (microservices, event-driven, CQRS, etc.)
- Rules: use temporary string IDs, concise labels, appropriate edge types
- 1-2 short examples of valid tool call output

**New file: `backend/crates/nimbus-infra/src/ai/prompts/mod.rs`** → `pub mod system_prompt;`

---

### Step 6: ClaudeAiProvider (nimbus-infra)

**New file: `backend/crates/nimbus-infra/src/ai/claude_provider.rs`**

```rust
pub struct ClaudeAiProvider {
    client: reqwest::Client,
    api_key: String,
    model: String,  // default: "claude-sonnet-4-20250514"
}
```

`impl AiProvider for ClaudeAiProvider`:

**`generate()` method:**
1. POST `https://api.anthropic.com/v1/messages` with:
   - `system`: system prompt
   - `messages`: [{ role: "user", content: prompt }]
   - `tools`: single `create_diagram` tool with JSON schema matching `AiDiagramResponse`
   - `tool_choice`: `{ type: "tool", name: "create_diagram" }` (forces tool use)
   - `max_tokens`: 4096
2. Extract `tool_use` block from response `content` array
3. Deserialize `input` field as `AiDiagramResponse`
4. Call `parser::parse_ai_response()` → nodes, edges
5. Call `validator::validate_ai_output()` — on failure, retry with error appended (max 3 attempts)
6. Emit events via `futures_util::stream::iter()`: NodeAdded per node, EdgeAdded per edge, Complete with `{ name, description, nodes, edges }` as JSON

**`modify()` method:** stub returning `DomainError::AiError("Not implemented")` (Week 4)

**Modify: `backend/crates/nimbus-infra/src/ai/mod.rs`:**
```rust
pub mod claude_provider;
pub mod parser;
pub mod prompts;
pub mod validator;
pub use claude_provider::ClaudeAiProvider;
```

---

### Step 7: GenerateDiagram Use Case (nimbus-app)

**New file: `backend/crates/nimbus-app/src/use_cases/generate_diagram.rs`**

Following existing use case pattern:
```rust
pub struct GenerateDiagram {
    ai_provider: Arc<dyn AiProvider>,
    repo: Arc<dyn DiagramRepository>,
}
```

`execute(prompt: &str) -> Result<Diagram, DomainError>`:
1. Validate prompt non-empty
2. Call `ai_provider.generate(prompt).await?` → stream
3. Collect events, find `Complete` event, deserialize its data to get name, description, nodes, edges
4. Call `LayoutService::apply_layout(&mut nodes, &edges)` → viewport
5. `repo.create(&name, description.as_deref())` → diagram with DB ID
6. Set nodes, edges, viewport on diagram, `repo.update(id, &diagram)` → final diagram
7. Return diagram

**Modify: `backend/crates/nimbus-app/src/use_cases/mod.rs`** → add `pub mod generate_diagram;`

---

### Step 8: API Layer Wiring

**`backend/crates/nimbus-api/src/config.rs`** — add:
- `anthropic_api_key: String` (from `ANTHROPIC_API_KEY` env var)
- `anthropic_model: String` (from `ANTHROPIC_MODEL`, default `"claude-sonnet-4-20250514"`)

**`backend/crates/nimbus-api/src/state.rs`** — add field:
- `pub generate_diagram: GenerateDiagram`

**`backend/crates/nimbus-api/src/dto/diagram.rs`** — add:
```rust
pub struct GenerateDiagramRequest {
    pub prompt: String,
    pub existing_diagram_id: Option<Uuid>,
}
```

**`backend/crates/nimbus-api/src/handlers/diagram.rs`** — add handler:
```rust
pub async fn generate_diagram(State(state), Json(req)) -> Result<(StatusCode::CREATED, Json<Diagram>), AppError>
```

**`backend/crates/nimbus-api/src/routes.rs`** — add route:
```rust
.route("/api/diagrams/generate", post(handlers::diagram::generate_diagram))
```
Place BEFORE `/api/diagrams/{id}` to prevent "generate" matching as an ID param.

**`backend/crates/nimbus-api/src/main.rs`** — wire:
```rust
let ai_provider: Arc<dyn AiProvider> = Arc::new(ClaudeAiProvider::new(config.anthropic_api_key, Some(config.anthropic_model)));
// add generate_diagram: GenerateDiagram::new(ai_provider, diagram_repo.clone()) to AppState
```

---

### Step 9: Frontend — AI Gateway

**New file: `frontend/src/app/infrastructure/gateways/ai.gateway.ts`**

Implements `AiProvider`. Non-streaming for now:
```typescript
async *generate(prompt: string): AsyncIterable<GenerateEvent> {
  const diagram = await firstValueFrom(this.http.post<Diagram>(url, { prompt }));
  yield { eventType: 'Complete', data: diagram };
}
```

---

### Step 10: Frontend — AI Facade

**New file: `frontend/src/app/application/facades/ai.facade.ts`**

Manages chat state (messages, loading, error) via BehaviorSubjects.

`generateDiagram(prompt: string)`:
1. Set loading, add user message
2. Iterate `aiProvider.generate(prompt)`
3. On `Complete` event: call `diagramFacade.loadDiagramFromData(diagram)`
4. Add assistant message, clear loading

**Modify: `frontend/src/app/application/facades/diagram.facade.ts`** — add:
```typescript
loadDiagramFromData(diagram: Diagram): void {
  this.diagramState.load(diagram);
  this.diagramSubject.next(diagram);
  this.isDirty$.next(false);
}
```

---

### Step 11: Frontend — Chat Component

**New file: `frontend/src/app/presentation/chat/chat.component.ts`**

Standalone component with:
- Scrollable message list (user + assistant messages)
- Text input + Generate button
- Loading indicator
- Injects `AiFacade`, calls `generateDiagram(prompt)` on submit
- Styled to match Catppuccin Mocha dark theme

---

### Step 12: Frontend — Wiring

**Modify: `frontend/src/app/presentation/layout/layout.component.ts`**
- Add `ChatComponent` to imports and template (in sidebar area above `<app-sidebar>`)
- Update grid: sidebar area becomes a flex column with chat + sidebar

**Modify: `frontend/src/app/app.config.ts`**
- Add `{ provide: AI_PROVIDER, useClass: AiGateway }`

---

## Verification

1. `cargo build` — all backend crates compile
2. `ng build` — frontend compiles
3. Set `ANTHROPIC_API_KEY` env var, start backend + postgres
4. Start frontend with `ng serve`
5. Navigate to `/diagrams`, create a diagram, open editor
6. Type a prompt in the chat panel (e.g., "A 3-tier web application")
7. Verify: diagram appears on canvas with nodes positioned in a grid layout
8. Verify: diagram is persisted (refresh page, diagram still loads)

---

## Files Summary

**New files (10):**
- `backend/crates/nimbus-domain/src/services/layout_service.rs`
- `backend/crates/nimbus-infra/src/ai/claude_provider.rs`
- `backend/crates/nimbus-infra/src/ai/parser.rs`
- `backend/crates/nimbus-infra/src/ai/validator.rs`
- `backend/crates/nimbus-infra/src/ai/prompts/mod.rs`
- `backend/crates/nimbus-infra/src/ai/prompts/system_prompt.rs`
- `backend/crates/nimbus-app/src/use_cases/generate_diagram.rs`
- `frontend/src/app/infrastructure/gateways/ai.gateway.ts`
- `frontend/src/app/application/facades/ai.facade.ts`
- `frontend/src/app/presentation/chat/chat.component.ts`

**Modified files (11):**
- `backend/Cargo.toml`
- `backend/crates/nimbus-infra/Cargo.toml`
- `backend/crates/nimbus-app/Cargo.toml`
- `backend/crates/nimbus-domain/src/services/mod.rs`
- `backend/crates/nimbus-infra/src/ai/mod.rs`
- `backend/crates/nimbus-app/src/use_cases/mod.rs`
- `backend/crates/nimbus-api/src/config.rs`
- `backend/crates/nimbus-api/src/state.rs`
- `backend/crates/nimbus-api/src/main.rs`
- `backend/crates/nimbus-api/src/routes.rs`
- `backend/crates/nimbus-api/src/dto/diagram.rs`
- `backend/crates/nimbus-api/src/handlers/diagram.rs`
- `frontend/src/app/application/facades/diagram.facade.ts`
- `frontend/src/app/presentation/layout/layout.component.ts`
- `frontend/src/app/app.config.ts`
