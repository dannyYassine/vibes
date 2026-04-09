# RagVerse — Architecture

## System Topology

```
┌─────────────────────┐       ┌──────────────────────────────────────┐       ┌────────────────────────┐
│   Angular 19 SPA    │       │         FastAPI Backend              │       │  PostgreSQL + pgvector  │
│   (port 4200)       │──────▶│         (port 8000)                  │──────▶│  (port 5432)           │
│                     │  HTTP │                                      │  SQL  │                        │
│  - Angular Material │  SSE  │  ┌──────────┐  ┌─────────────────┐  │       │  - users               │
│  - Clean Arch       │◀──────│  │ Auth     │  │ RAG Pipeline    │  │       │  - documents           │
│                     │       │  │ (JWT)    │  │ (LangChain)     │  │       │  - document_chunks     │
│                     │       │  └──────────┘  │  ┌───────────┐  │  │       │    (vector column)     │
└─────────────────────┘       │                │  │ Embeddings│──┼──┼──▶    │  - conversations       │
                              │                │  │ (OpenAI)  │  │  │       │  - messages            │
                              │                │  ├───────────┤  │  │       │  - message_sources     │
                              │                │  │ LLM       │  │  │       └────────────────────────┘
                              │                │  │ (Claude)  │  │  │
                              │                │  └───────────┘  │  │
                              │                └─────────────────┘  │
                              └──────────────────────────────────────┘
```

## Clean Architecture — Backend (Python/FastAPI)

The backend follows Clean Architecture with four layers, each with strict dependency rules (inner layers never depend on outer layers):

```
┌─────────────────────────────────────────────────────┐
│  Infrastructure (outermost)                         │
│  - FastAPI routes (controllers)                     │
│  - SQLAlchemy ORM models & repositories             │
│  - LangChain integrations                           │
│  - External API clients (Anthropic, OpenAI)         │
│  ┌─────────────────────────────────────────────────┐│
│  │  Application (Use Cases)                        ││
│  │  - Orchestrate domain logic                     ││
│  │  - One class per use case                       ││
│  │  - Depend on repository interfaces, not impls   ││
│  │  ┌─────────────────────────────────────────────┐││
│  │  │  Domain (innermost)                         │││
│  │  │  - Entities (pure Python dataclasses)       │││
│  │  │  - Repository interfaces (abstract classes) │││
│  │  │  - Value objects                            │││
│  │  │  - Domain exceptions                        │││
│  │  │  - No framework dependencies                │││
│  │  └─────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Layer Rules

| Layer | Can Depend On | Cannot Depend On |
|-------|--------------|------------------|
| Domain | Nothing | Application, Infrastructure |
| Application (Use Cases) | Domain | Infrastructure |
| Infrastructure | Application, Domain | — |

### Dependency Injection

FastAPI's `Depends()` wires concrete implementations to abstract interfaces:

```python
# Domain layer defines the interface
class DocumentRepository(ABC):
    @abstractmethod
    async def save(self, document: Document) -> Document: ...

# Infrastructure layer implements it
class SqlAlchemyDocumentRepository(DocumentRepository):
    async def save(self, document: Document) -> Document: ...

# Use case depends on the interface
class UploadDocumentUseCase:
    def __init__(self, repo: DocumentRepository, indexer: DocumentIndexer): ...

# FastAPI route wires them together
@router.post("/documents/upload")
async def upload(use_case: UploadDocumentUseCase = Depends(get_upload_document_use_case)):
    ...
```

## Clean Architecture — Frontend (Angular)

The frontend mirrors clean architecture with three layers:

```
┌─────────────────────────────────────────────────────┐
│  Presentation (outermost)                           │
│  - Angular Components (UI only)                     │
│  - Templates, styles                                │
│  - Delegates all logic to Application layer         │
│  ┌─────────────────────────────────────────────────┐│
│  │  Application                                    ││
│  │  - Facades (coordinate state + data access)     ││
│  │  - State management (signals-based stores)      ││
│  │  - Mappers (API DTOs ↔ domain models)           ││
│  │  ┌─────────────────────────────────────────────┐││
│  │  │  Domain                                     │││
│  │  │  - Interfaces / models (TypeScript types)   │││
│  │  │  - No Angular dependencies                  │││
│  │  └─────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────┘│
│  Data (Infrastructure)                              │
│  - API services (HttpClient calls)                  │
│  - Interceptors, guards                             │
│  - LocalStorage adapters                            │
└─────────────────────────────────────────────────────┘
```

### Frontend Layer Rules

| Layer | Responsibility | Angular Constructs |
|-------|---------------|-------------------|
| Domain | Pure types, interfaces | TypeScript interfaces, enums |
| Application | Business logic, state, orchestration | Injectable services (facades), signal-based stores |
| Data | External communication | HttpClient services, interceptors, guards |
| Presentation | UI rendering, user interaction | Components, templates, pipes |

Components inject **facades** (not API services directly). Facades coordinate between API services and state stores.

## Data Flows

### Document Upload → Indexing

```
1. User uploads file via Angular UI
2. Component calls DocumentFacade.upload(file, config)
3. Facade calls DocumentApiService.upload() → POST /api/documents/upload
4. FastAPI route delegates to UploadDocumentUseCase
5. Use case:
   a. Validates file type
   b. Saves file to disk
   c. Creates Document entity (status=pending) via DocumentRepository
   d. Dispatches background task → IndexDocumentUseCase
6. IndexDocumentUseCase (background):
   a. Updates status → processing
   b. LangChain loader parses file by type (PDF→PyPDFLoader, etc.)
   c. Chunks text via configured strategy (auto or custom)
   d. Embeds chunks via OpenAI text-embedding-3-small
   e. Bulk inserts chunks + embeddings via ChunkRepository
   f. Updates status → completed (or failed + error message)
7. Frontend polls GET /api/documents/{id} for status
```

### Query → Streaming Response

```
1. User sends message in conversation
2. Component calls ChatFacade.sendMessage(conversationId, content)
3. Facade opens SSE stream → POST /api/conversations/{id}/messages
4. FastAPI route delegates to SendMessageUseCase
5. Use case:
   a. Saves user message via MessageRepository
   b. Embeds query via EmbeddingService (OpenAI)
   c. Retrieves top-k chunks via VectorSearchRepository (pgvector cosine similarity)
   d. Builds prompt with context via PromptBuilder
   e. Streams Claude response via LLMService
   f. Yields SSE events: token → token → ... → sources → message_complete
   g. Saves assistant message + sources to DB
6. Frontend:
   a. Reads SSE stream, appends tokens in real-time
   b. Parses [n] citation markers → renders inline Citation components
   c. On "sources" event → populates source panel sidebar
```

### Website Indexing

```
1. User submits URL + crawl depth (1–3)
2. POST /api/documents/index-website
3. IndexWebsiteUseCase:
   a. Creates Document entity (type=website, status=pending)
   b. Background: crawls URL to configured depth
   c. Each page → same chunking + embedding pipeline
   d. Chunk metadata includes per-page source URL
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Single PostgreSQL + pgvector | Simplifies deployment, enables SQL joins between relational and vector data, HNSW index provides fast ANN search |
| FastAPI BackgroundTasks (not Celery) | Sufficient for single-instance local dev; service layer is isolated and can move to Celery later |
| SSE over WebSocket | Simpler unidirectional streaming, works over standard HTTP, sufficient for LLM token streaming |
| text-embedding-3-small (1536 dims) | Good balance of quality, cost, and speed; dimension configured in one place for easy switching |
| Clean Architecture | Testability, framework independence, clear boundaries; domain logic is pure Python / pure TypeScript |
| Angular Signals for state | Angular 19 native reactivity, no external state management library needed |
