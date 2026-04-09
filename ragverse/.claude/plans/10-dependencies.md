# RagVerse — Dependencies

## Backend (Python)

### Core Framework
- `fastapi` — Web framework
- `uvicorn[standard]` — ASGI server
- `pydantic` — Data validation (bundled with FastAPI)
- `pydantic-settings` — Environment variable configuration

### Database
- `sqlalchemy[asyncio]` — ORM with async support
- `asyncpg` — Async PostgreSQL driver
- `alembic` — Database migrations
- `pgvector` — pgvector SQLAlchemy integration

### LangChain & AI
- `langchain` — RAG framework core
- `langchain-anthropic` — Claude LLM integration
- `langchain-openai` — OpenAI embeddings integration
- `langchain-community` — Community document loaders

### Document Processing
- `pypdf` — PDF loading
- `docx2txt` — DOCX loading
- `beautifulsoup4` — HTML parsing
- `lxml` — XML/HTML parser backend

### Auth & Security
- `python-jose[cryptography]` — JWT encoding/decoding
- `passlib[bcrypt]` — Password hashing
- `python-multipart` — File upload support

### HTTP
- `httpx` — Async HTTP client (for web crawling)

### Dev/Testing
- `pytest` — Test framework
- `pytest-asyncio` — Async test support
- `pytest-cov` — Coverage reporting
- `ruff` — Linter + formatter

---

## Frontend (Angular 19)

### Core
- `@angular/core` — Angular framework (v19)
- `@angular/router` — Routing
- `@angular/forms` — Reactive forms
- `@angular/common/http` — HTTP client

### UI
- `@angular/material` — Material Design components
- `@angular/cdk` — Component Dev Kit (required by Material)

### Markdown
- `ngx-markdown` or `marked` — Render assistant markdown responses

### Dev/Testing
- `@angular/cli` — Build & dev server
- `karma` / `jasmine` — Unit testing (Angular default)
- `typescript` — Language (v5.4+)

---

## Docker Images

| Service | Image |
|---------|-------|
| Database | `pgvector/pgvector:pg16` |
| Backend | Custom (Python 3.12 slim) |
| Frontend | Custom (Node 20 alpine) |

---

## External API Keys Required

| Service | Key | Purpose |
|---------|-----|---------|
| Anthropic | `ANTHROPIC_API_KEY` | Claude LLM for chat responses |
| OpenAI | `OPENAI_API_KEY` | text-embedding-3-small for document/query embeddings |

Both keys are provided via `.env` file and read by the backend only. The frontend never touches API keys.
