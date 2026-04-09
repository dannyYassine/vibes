# RagVerse — Implementation Phases

## How to Start a Phase

To implement a phase, simply say:

```
implement phase N
```

Each phase will be implemented by reading the relevant plan documents, creating tasks for each checklist item, and working through them sequentially. Review and test the deliverable before moving to the next phase. You can also go granular, e.g. "implement phase 3, but skip website indexing" or "implement just the backend auth routes from phase 2".

**Reference documents per phase:**
- All phases: `02-project-structure.md` (directory layout), `01-architecture.md` (clean architecture layers)
- Phase 1: `10-dependencies.md`, `02-project-structure.md` (docker-compose)
- Phase 2: `03-data-models.md` (users), `04-api-boundary.md` (auth endpoints), `01-designs.md` (theme)
- Phase 3–5: `03-data-models.md` (documents/chunks), `04-api-boundary.md` (document endpoints), `06-backend-modules.md`
- Phase 4–5: `01-features.md` (document page), `design.md` (upload UI), `05-frontend-modules.md`
- Phase 6: `03-data-models.md` (conversations/messages), `04-api-boundary.md` (message endpoints, SSE), `06-backend-modules.md`
- Phase 7: `01-features.md` (chat page), `design.md` (chat UI), `05-frontend-modules.md`, `07-technical-challenges.md` (SSE, citations)
- Phase 8: `09-testing-strategy.md`

---

## Phase 1: Project Scaffolding & Infrastructure

**Goal:** Docker Compose running with all three services (DB, backend, frontend) communicating.

- [ ] Create `docker-compose.yml` with pgvector, backend, frontend services
- [ ] Create `.env.example`
- [ ] Scaffold FastAPI backend (`pyproject.toml`, `app/main.py`, `config.py`)
- [ ] Set up SQLAlchemy async + Alembic for migrations
- [ ] Scaffold Angular 19 app (`ng new`, Angular Material, custom theme)
- [ ] Configure `proxy.conf.json` for dev API proxying
- [ ] Create Dockerfiles for backend and frontend
- [ ] Verify all three containers start and communicate

**Deliverable:** `docker-compose up` boots all services, Angular shows a blank page, FastAPI returns health check.

---

## Phase 2: Auth System

**Goal:** Users can register, log in, and access protected routes.

### Backend
- [ ] Domain: User entity, UserRepository interface
- [ ] Infrastructure: SQLAlchemy User model, migration, SqlAlchemyUserRepository
- [ ] Infrastructure: JWT handler, password hasher
- [ ] Application: RegisterUserUseCase, LoginUserUseCase, RefreshTokenUseCase
- [ ] Infrastructure: Auth routes (`/api/auth/*`), `get_current_user` dependency

### Frontend
- [ ] Domain: User model
- [ ] Data: AuthApiService, auth DTOs, AuthInterceptor, AuthGuard
- [ ] Application: AuthFacade, AuthStore
- [ ] Presentation: LoginComponent, RegisterComponent
- [ ] Presentation: MainLayoutComponent (navbar with user menu, nav links, logout)
- [ ] Route configuration with guards

**Deliverable:** Full register → login → protected route flow working.

---

## Phase 3: Document Indexing (Backend)

**Goal:** Documents can be uploaded, chunked, embedded, and stored.

### Backend
- [ ] Domain: Document entity, DocumentChunk entity, ChunkConfig value object
- [ ] Domain: DocumentRepository, ChunkRepository interfaces
- [ ] Domain: EmbeddingService, DocumentLoader interfaces
- [ ] Infrastructure: SQLAlchemy models + migration for documents & chunks
- [ ] Infrastructure: SqlAlchemyDocumentRepository, SqlAlchemyChunkRepository
- [ ] Infrastructure: OpenAIEmbeddingService (text-embedding-3-small)
- [ ] Infrastructure: LangChainDocumentLoader (PDF, DOCX, TXT, CSV, HTML, MD)
- [ ] Application: UploadDocumentUseCase, IndexDocumentUseCase
- [ ] Application: ListDocumentsUseCase, GetDocumentUseCase, DeleteDocumentUseCase
- [ ] Infrastructure: Document routes, chunking routes
- [ ] Background task wiring for async indexing

**Deliverable:** Upload a PDF via API → chunks appear in DB with embeddings.

---

## Phase 4: Document Indexing (Frontend)

**Goal:** Full document management UI.

### Frontend
- [ ] Domain: Document model, ChunkConfig
- [ ] Data: DocumentApiService, document DTOs
- [ ] Application: DocumentFacade, DocumentStore
- [ ] Presentation: DocumentsPageComponent (container)
- [ ] Presentation: DocumentUploadComponent (drag-drop, file select)
- [ ] Presentation: ChunkConfigComponent (auto/custom toggle)
- [ ] Presentation: DocumentListComponent (table with status)
- [ ] Presentation: DocumentStatusComponent (status chip)
- [ ] Status polling for processing documents

**Deliverable:** Upload documents via UI, see status update to "completed", view document list.

---

## Phase 5: Website Indexing

**Goal:** Index websites with configurable crawl depth.

### Backend
- [ ] Domain: WebCrawler interface
- [ ] Infrastructure: LangChainWebCrawler (RecursiveUrlLoader)
- [ ] Application: IndexWebsiteUseCase
- [ ] Infrastructure: Website index route

### Frontend
- [ ] Presentation: WebsiteIndexFormComponent (URL + depth + chunk config)
- [ ] Wire into DocumentsPageComponent

**Deliverable:** Submit a URL → pages crawled, chunked, embedded, stored. Visible in document list.

---

## Phase 6: Conversation & RAG (Backend)

**Goal:** Full RAG pipeline with streaming responses.

### Backend
- [ ] Domain: Conversation, Message, MessageSource entities
- [ ] Domain: ConversationRepository, MessageRepository interfaces
- [ ] Domain: LLMService interface
- [ ] Infrastructure: SQLAlchemy models + migration for conversations, messages, message_sources
- [ ] Infrastructure: Repository implementations
- [ ] Infrastructure: AnthropicLLMService (Claude streaming)
- [ ] Application: Conversation CRUD use cases
- [ ] Application: SendMessageUseCase (embed query → vector search → build prompt → stream Claude → save)
- [ ] Application: ListMessagesUseCase (with sources)
- [ ] Infrastructure: Conversation routes, message routes (SSE streaming)
- [ ] Prompt template with citation instructions

**Deliverable:** Send a message via API → streamed response with sources, grounded in indexed documents.

---

## Phase 7: Conversation & RAG (Frontend)

**Goal:** Full chat UI with streaming, citations, and source panel.

### Frontend
- [ ] Domain: Conversation, Message, MessageSource models
- [ ] Data: ConversationApiService, MessageApiService
- [ ] Application: ChatFacade, ChatStore
- [ ] Presentation: ChatPageComponent (3-column layout)
- [ ] Presentation: ConversationListComponent (left sidebar)
- [ ] Presentation: EmptyStateComponent (greeting + prompt suggestions)
- [ ] Presentation: ChatViewComponent (message list, auto-scroll)
- [ ] Presentation: MessageBubbleComponent (user/assistant, markdown rendering)
- [ ] Presentation: ChatInputComponent (input bar + send)
- [ ] SSE stream consumption (fetch + ReadableStream)
- [ ] Presentation: CitationComponent (inline [n] chips, expandable)
- [ ] Presentation: SourcePanelComponent (collapsible right sidebar)

**Deliverable:** Full chat experience: create conversation, send messages, see streaming responses with citations and source panel.

---

## Phase 8: Polish & Integration Testing

**Goal:** End-to-end polish and quality.

- [ ] Error handling: upload failures, indexing errors, LLM errors, network errors
- [ ] Loading states across all features
- [ ] Responsive layout (mobile-friendly)
- [ ] Conversation auto-title (use first message or LLM-generated title)
- [ ] File size validation and limits
- [ ] End-to-end testing: upload → index → chat → verify citations
- [ ] README with setup instructions
