# Nimbus — Build Strategy

## Don't try to build it all in one session

The app is too large for a single context window. Instead, break it into **session-sized chunks** that align with the implementation phases. Each session should produce working, compilable code.

## Approach

### 1. Use `PROGRESS.md` as the session handoff mechanism

`PROGRESS.md` acts as a checklist the AI checks at the start of each session and updates at the end. This is more reliable than subagents for cross-session continuity.

### 2. One session per phase milestone, not one mega-session

Rather than "build the whole app", run sessions like:
- Session 1: "Scaffold backend workspace + domain entities"
- Session 2: "Implement Axum server + CRUD endpoints"
- Session 3: "Scaffold Angular frontend + canvas component"
- etc.

### 3. Subagents within a session — yes, but strategically

Subagents work well for **parallel independent work within a single session** (e.g., building 3 domain entity files at once). They don't work across sessions.

---

## Session Prompt Template

```
Read all plan files in .claude/plans/ and PROGRESS.md.

Current goal: [Phase 1, Week 1 — Backend scaffolding]

Build everything listed under this phase in 08-implementation-phases.md
that isn't already checked off in PROGRESS.md.

Use subagents in parallel where tasks are independent
(e.g., writing multiple entity files, multiple use case files).

Rules:
- Follow the project structure in 02-project-structure.md exactly
- Follow data models in 03-data-models.md exactly
- Follow API contract in 04-api-boundary.md exactly
- Code must compile/build before marking anything done
- Update PROGRESS.md with completed items when done
- If you run out of context, stop cleanly and update PROGRESS.md
  with what's done vs remaining
```

---

## Session Breakdown

### Session 1 — Backend Scaffolding & Domain (Phase 1, Week 1 Backend)
- Cargo workspace with 5 crates
- All domain entities, port traits
- Axum server + health check
- PostgreSQL + migration
- PostgresDiagramRepo
- DI wiring in main.rs

### Session 2 — Backend CRUD (Phase 1, Week 2 Backend)
- Diagram CRUD endpoints
- Use cases (Create, Get, Update, Delete, List)
- Request validation + DTO mapping
- CORS, logging, error middleware

### Session 3 — Angular Scaffolding (Phase 1, Week 1 Frontend)
- Angular project init
- Routing
- Domain models + interfaces
- Infrastructure ApiGateway + DI tokens
- DiagramFacade
- Basic layout shell

### Session 4 — Canvas (Phase 1, Week 2 Frontend)
- CanvasComponent + HTML5 Canvas
- GridRenderer, NodeRenderer, EdgeRenderer
- ZoomHandler, DragHandler, SelectionHandler
- Wire canvas to DiagramFacade

### Session 5 — AI Generation (Phase 2, Week 3)
- ClaudeAiProvider implementation
- System prompt engineering
- generate_diagram() + parser
- Validation layer + auto-layout
- ChatComponent + AiFacade on frontend

### Session 6 — Streaming & Validation (Phase 2, Week 4)
- SSE streaming for AI
- AI assistant (modify endpoint)
- Validation rules (deterministic)
- AI fix endpoint
- Frontend: SSE client, progressive rendering, validation panel

### Session 7 — Manual Editing (Phase 3, Week 5)
- PropertiesPanel, edge creation, deletion
- ServiceLibraryComponent
- Undo/redo system
- Keyboard shortcuts
- PATCH endpoint

### Session 8 — Persistence & Export (Phase 3, Week 6)
- Auto-save, diagram list page
- PNG export, JSON export/import
- Viewport persistence
- List endpoint with metadata

### Session 9 — Cloud Translation (Phase 4, Week 7)
- cloud_catalog.rs
- TranslationService
- Translate/untranslate endpoints
- ProviderSelector, TranslationFacade
- Provider-aware canvas rendering

### Session 10 — Terraform, Docker Compose & Testing (Phase 4, Week 8)
- TerraformService + export endpoint
- DockerComposeService + docker_catalog + export endpoint
- Export buttons in frontend
- Node containment visuals
- Unit tests, integration tests, E2E tests

---

## Why not one giant session with tons of subagents?

- Subagents don't share context with each other — they can write conflicting code
- A subagent building `nimbus-infra` can't see what another subagent wrote in `nimbus-domain`
- Sequential within a session + parallel for independent files is the sweet spot
- You'll want to review and course-correct between phases
