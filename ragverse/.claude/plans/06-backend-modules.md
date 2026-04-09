# RagVerse — Backend Modules

> This file repurposes the rust-modules slot for backend Python module documentation.

## Clean Architecture Module Breakdown

---

## Domain Layer Modules

Framework-free. Pure Python dataclasses, ABCs, and enums.

### domain/entities/
- `user.py` — User dataclass
- `document.py` — Document dataclass + DocumentStatus enum (PENDING, PROCESSING, COMPLETED, FAILED)
- `document_chunk.py` — DocumentChunk dataclass
- `conversation.py` — Conversation dataclass
- `message.py` — Message dataclass + MessageRole enum (USER, ASSISTANT)
- `message_source.py` — MessageSource dataclass

### domain/repositories/ (Abstract Interfaces)
- `user_repository.py` — find_by_username, find_by_email, save
- `document_repository.py` — save, find_by_id, find_by_user, delete, update_status, update_chunk_count
- `chunk_repository.py` — bulk_save, find_by_document, vector_search(query_embedding, user_id, limit)
- `conversation_repository.py` — save, find_by_id, find_by_user, update, delete
- `message_repository.py` — save, find_by_conversation, save_with_sources

### domain/services/ (Abstract Interfaces)
- `embedding_service.py` — embed_text(text) -> list[float], embed_batch(texts) -> list[list[float]]
- `llm_service.py` — stream_response(prompt, context) -> AsyncGenerator[str]
- `document_loader.py` — load(file_path, file_type) -> list[str]
- `web_crawler.py` — crawl(url, depth) -> list[CrawledPage]

### domain/value_objects/
- `chunk_config.py` — ChunkConfig (mode, chunk_size, chunk_overlap, strategy) with validation

---

## Application Layer Modules

Use cases orchestrate domain logic. Each use case is a single class with an `execute()` method.

### Auth Use Cases
- `RegisterUserUseCase` — validate uniqueness, hash password, save user, return user
- `LoginUserUseCase` — verify credentials, generate JWT pair
- `RefreshTokenUseCase` — validate refresh token, issue new access token

### Document Use Cases
- `UploadDocumentUseCase` — save file, create document record (pending), dispatch background indexing
- `IndexWebsiteUseCase` — create document record (website), dispatch background crawl + indexing
- `IndexDocumentUseCase` — load file → chunk → embed → store chunks (background task)
- `ListDocumentsUseCase` — paginated list for current user
- `GetDocumentUseCase` — single document with status
- `DeleteDocumentUseCase` — delete document + cascaded chunks

### Conversation Use Cases
- `CreateConversationUseCase` — create with optional title
- `ListConversationsUseCase` — paginated, sorted by updated_at
- `UpdateConversationUseCase` — rename
- `DeleteConversationUseCase` — delete with cascaded messages

### Message Use Cases
- `SendMessageUseCase` — the core RAG pipeline:
  1. Save user message
  2. Embed query (EmbeddingService)
  3. Vector search (ChunkRepository)
  4. Build prompt with retrieved context
  5. Stream LLM response (LLMService)
  6. Yield SSE events
  7. Save assistant message + sources
- `ListMessagesUseCase` — paginated messages with sources for a conversation

---

## Infrastructure Layer Modules

### Persistence
- `database.py` — async SQLAlchemy engine + session factory
- `models/` — SQLAlchemy ORM models (map to DB schema)
- `repositories/` — Concrete implementations of domain repository interfaces
- `mappers/entity_mappers.py` — Convert ORM models ↔ domain entities

### External Services
- `openai_embedding_service.py` — OpenAI API calls for text-embedding-3-small
- `anthropic_llm_service.py` — Anthropic API streaming for Claude
- `langchain_document_loader.py` — LangChain loaders by file type (PyPDFLoader, Docx2txtLoader, etc.)
- `langchain_web_crawler.py` — RecursiveUrlLoader with depth control

### API (Controllers)
- `auth_routes.py` — register, login, refresh, me
- `document_routes.py` — upload, index-website, list, get, delete, get-chunks
- `conversation_routes.py` — CRUD
- `message_routes.py` — list messages, send message (SSE)
- `chunking_routes.py` — get strategies/defaults
- `deps.py` — FastAPI dependency injection: get_db session, get_current_user, use case factories

### Security
- `jwt_handler.py` — encode/decode JWT with python-jose
- `password_hasher.py` — bcrypt via passlib
