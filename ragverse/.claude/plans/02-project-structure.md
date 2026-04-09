# RagVerse — Project Structure (Clean Architecture)

## Root

```
ragverse/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
└── frontend/
```

## Backend (Python / FastAPI / Clean Architecture)

```
backend/
├── Dockerfile
├── pyproject.toml
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│
└── app/
    ├── __init__.py
    ├── main.py                          # FastAPI app factory, CORS, lifespan, router mounts
    ├── config.py                        # pydantic-settings: reads .env
    ├── container.py                     # Dependency injection wiring (binds interfaces → impls)
    │
    ├── domain/                          # === DOMAIN LAYER (innermost) ===
    │   ├── __init__.py                  #     No framework dependencies. Pure Python.
    │   │
    │   ├── entities/                    # Domain entities (dataclasses)
    │   │   ├── __init__.py
    │   │   ├── user.py                  # User entity
    │   │   ├── document.py              # Document entity + DocumentStatus enum
    │   │   ├── document_chunk.py        # DocumentChunk entity
    │   │   ├── conversation.py          # Conversation entity
    │   │   ├── message.py               # Message entity + MessageRole enum
    │   │   └── message_source.py        # MessageSource entity
    │   │
    │   ├── repositories/                # Repository interfaces (ABCs)
    │   │   ├── __init__.py
    │   │   ├── user_repository.py       # abstract: find_by_username, save, etc.
    │   │   ├── document_repository.py   # abstract: save, find_by_user, delete, update_status
    │   │   ├── chunk_repository.py      # abstract: bulk_save, find_by_document, vector_search
    │   │   ├── conversation_repository.py
    │   │   └── message_repository.py    # abstract: save, find_by_conversation, save_sources
    │   │
    │   ├── services/                    # Domain service interfaces (ABCs)
    │   │   ├── __init__.py
    │   │   ├── embedding_service.py     # abstract: embed_text, embed_batch
    │   │   ├── llm_service.py           # abstract: stream_response
    │   │   ├── document_loader.py       # abstract: load(file_path, file_type) -> list[str]
    │   │   └── web_crawler.py           # abstract: crawl(url, depth) -> list[Page]
    │   │
    │   ├── value_objects/               # Immutable value types
    │   │   ├── __init__.py
    │   │   └── chunk_config.py          # ChunkConfig (mode, chunk_size, overlap, strategy)
    │   │
    │   └── exceptions.py               # Domain-specific exceptions
    │
    ├── application/                     # === APPLICATION LAYER (use cases) ===
    │   ├── __init__.py                  #     Depends only on domain layer.
    │   │
    │   ├── use_cases/
    │   │   ├── __init__.py
    │   │   ├── auth/
    │   │   │   ├── __init__.py
    │   │   │   ├── register_user.py     # RegisterUserUseCase
    │   │   │   ├── login_user.py        # LoginUserUseCase
    │   │   │   └── refresh_token.py     # RefreshTokenUseCase
    │   │   │
    │   │   ├── documents/
    │   │   │   ├── __init__.py
    │   │   │   ├── upload_document.py   # UploadDocumentUseCase
    │   │   │   ├── index_website.py     # IndexWebsiteUseCase
    │   │   │   ├── index_document.py    # IndexDocumentUseCase (background: load, chunk, embed, store)
    │   │   │   ├── list_documents.py    # ListDocumentsUseCase
    │   │   │   ├── get_document.py      # GetDocumentUseCase
    │   │   │   └── delete_document.py   # DeleteDocumentUseCase
    │   │   │
    │   │   ├── conversations/
    │   │   │   ├── __init__.py
    │   │   │   ├── create_conversation.py
    │   │   │   ├── list_conversations.py
    │   │   │   ├── update_conversation.py
    │   │   │   └── delete_conversation.py
    │   │   │
    │   │   └── messages/
    │   │       ├── __init__.py
    │   │       ├── send_message.py      # SendMessageUseCase (RAG pipeline + streaming)
    │   │       └── list_messages.py     # ListMessagesUseCase
    │   │
    │   └── dto/                         # Application-level DTOs (input/output of use cases)
    │       ├── __init__.py
    │       ├── auth_dto.py
    │       ├── document_dto.py
    │       └── message_dto.py
    │
    └── infrastructure/                  # === INFRASTRUCTURE LAYER (outermost) ===
        ├── __init__.py                  #     Implements domain interfaces. Depends on frameworks.
        │
        ├── api/                         # FastAPI routes (controllers / presenters)
        │   ├── __init__.py
        │   ├── router.py               # Aggregates all route modules
        │   ├── deps.py                  # Dependency providers: get_db, get_current_user, get_use_case
        │   ├── auth_routes.py           # /api/auth/*
        │   ├── document_routes.py       # /api/documents/*
        │   ├── conversation_routes.py   # /api/conversations/*
        │   ├── message_routes.py        # /api/conversations/{id}/messages
        │   └── chunking_routes.py       # /api/chunking/*
        │
        ├── persistence/                 # Database implementations
        │   ├── __init__.py
        │   ├── database.py              # SQLAlchemy engine, async session factory, Base
        │   ├── models/                  # SQLAlchemy ORM models (DB-layer only)
        │   │   ├── __init__.py
        │   │   ├── user_model.py
        │   │   ├── document_model.py
        │   │   ├── chunk_model.py
        │   │   ├── conversation_model.py
        │   │   ├── message_model.py
        │   │   └── message_source_model.py
        │   │
        │   ├── repositories/            # Concrete repository implementations
        │   │   ├── __init__.py
        │   │   ├── sqlalchemy_user_repository.py
        │   │   ├── sqlalchemy_document_repository.py
        │   │   ├── sqlalchemy_chunk_repository.py    # includes pgvector search
        │   │   ├── sqlalchemy_conversation_repository.py
        │   │   └── sqlalchemy_message_repository.py
        │   │
        │   └── mappers/                 # ORM model ↔ domain entity mappers
        │       ├── __init__.py
        │       └── entity_mappers.py
        │
        ├── external/                    # External service implementations
        │   ├── __init__.py
        │   ├── openai_embedding_service.py    # Implements domain EmbeddingService
        │   ├── anthropic_llm_service.py       # Implements domain LLMService
        │   ├── langchain_document_loader.py   # Implements domain DocumentLoader
        │   └── langchain_web_crawler.py       # Implements domain WebCrawler
        │
        └── security/                    # Auth infrastructure
            ├── __init__.py
            ├── jwt_handler.py           # JWT encode/decode
            └── password_hasher.py       # bcrypt hashing
```

## Frontend (Angular 19 / Clean Architecture)

```
frontend/
├── Dockerfile
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── proxy.conf.json                      # Dev proxy: /api/** → http://backend:8000
│
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.scss                       # Global styles, Angular Material custom theme
    │
    └── app/
        ├── app.component.ts
        ├── app.config.ts                 # provideRouter, provideHttpClient, provideAnimationsAsync
        ├── app.routes.ts                 # Lazy-loaded feature routes
        │
        ├── domain/                       # === DOMAIN LAYER ===
        │   ├── models/                   #     Pure TypeScript — no Angular imports
        │   │   ├── user.model.ts
        │   │   ├── document.model.ts     # Document, DocumentStatus, ChunkConfig
        │   │   ├── conversation.model.ts
        │   │   └── message.model.ts      # Message, MessageSource
        │   └── interfaces/
        │       ├── document.repository.ts   # abstract interface for data access
        │       ├── conversation.repository.ts
        │       └── message.repository.ts
        │
        ├── application/                  # === APPLICATION LAYER ===
        │   ├── facades/                  #     Orchestrate state + data access
        │   │   ├── auth.facade.ts
        │   │   ├── document.facade.ts
        │   │   └── chat.facade.ts
        │   ├── stores/                   #     Signal-based reactive state
        │   │   ├── auth.store.ts
        │   │   ├── document.store.ts
        │   │   └── chat.store.ts
        │   └── mappers/
        │       ├── document.mapper.ts    # API DTO ↔ domain model
        │       └── message.mapper.ts
        │
        ├── data/                         # === DATA / INFRASTRUCTURE LAYER ===
        │   ├── api/                      #     HttpClient services
        │   │   ├── auth-api.service.ts
        │   │   ├── document-api.service.ts
        │   │   ├── conversation-api.service.ts
        │   │   └── message-api.service.ts
        │   ├── dto/                      #     API response types (match backend schemas)
        │   │   ├── auth.dto.ts
        │   │   ├── document.dto.ts
        │   │   ├── conversation.dto.ts
        │   │   └── message.dto.ts
        │   ├── interceptors/
        │   │   └── auth.interceptor.ts   # Attach JWT, handle 401 refresh
        │   └── guards/
        │       └── auth.guard.ts
        │
        └── presentation/                # === PRESENTATION LAYER ===
            ├── layouts/
            │   └── main-layout/
            │       └── main-layout.component.ts   # Navbar + router outlet
            │
            ├── pages/
            │   ├── auth/
            │   │   ├── login/
            │   │   │   └── login.component.ts
            │   │   └── register/
            │   │       └── register.component.ts
            │   │
            │   ├── documents/
            │   │   └── documents-page/
            │   │       └── documents-page.component.ts   # Container for upload + list
            │   │
            │   └── chat/
            │       └── chat-page/
            │           └── chat-page.component.ts        # Container: sidebar + chat + sources
            │
            ├── components/               # Reusable presentation components
            │   ├── documents/
            │   │   ├── document-upload/
            │   │   │   └── document-upload.component.ts
            │   │   ├── website-index-form/
            │   │   │   └── website-index-form.component.ts
            │   │   ├── chunk-config/
            │   │   │   └── chunk-config.component.ts
            │   │   ├── document-list/
            │   │   │   └── document-list.component.ts
            │   │   └── document-status/
            │   │       └── document-status.component.ts
            │   │
            │   ├── chat/
            │   │   ├── conversation-list/
            │   │   │   └── conversation-list.component.ts
            │   │   ├── chat-view/
            │   │   │   └── chat-view.component.ts
            │   │   ├── message-bubble/
            │   │   │   └── message-bubble.component.ts
            │   │   ├── chat-input/
            │   │   │   └── chat-input.component.ts
            │   │   ├── source-panel/
            │   │   │   └── source-panel.component.ts
            │   │   ├── citation/
            │   │   │   └── citation.component.ts
            │   │   └── empty-state/
            │   │       └── empty-state.component.ts
            │   │
            │   └── shared/
            │       ├── loading-spinner/
            │       │   └── loading-spinner.component.ts
            │       └── confirm-dialog/
            │           └── confirm-dialog.component.ts
            │
            └── pipes/
                └── relative-time.pipe.ts
```

## Docker Compose

```yaml
# docker-compose.yml (root)
services:
  db:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: ragverse
      POSTGRES_USER: ragverse
      POSTGRES_PASSWORD: ragverse_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ragverse"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://ragverse:ragverse_dev@db:5432/ragverse
    volumes:
      - ./backend:/app
      - uploads:/app/uploads
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports: ["4200:4200"]
    depends_on: [backend]
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npx ng serve --host 0.0.0.0 --proxy-config proxy.conf.json

volumes:
  pgdata:
  uploads:
```

## .env.example

```env
# LLM & Embeddings
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Auth
JWT_SECRET=change-me-to-a-random-secret
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Database (overridden in docker-compose, but useful for local dev)
DATABASE_URL=postgresql+asyncpg://ragverse:ragverse_dev@localhost:5432/ragverse
```
