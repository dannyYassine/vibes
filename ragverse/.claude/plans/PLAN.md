# RagVerse — Master Plan

## Summary

Build a minimalist RAG web application with Angular 19 frontend and Python FastAPI backend, using LangChain for document processing, OpenAI for embeddings, Anthropic Claude for LLM responses, and PostgreSQL + pgvector for storage. Clean Architecture on both frontend and backend.

## Plan Documents Index

| Document | Contents |
|----------|----------|
| [00-overview.md](00-overview.md) | Project overview, tech stack, key features |
| [01-architecture.md](01-architecture.md) | System topology, clean architecture layers, data flows |
| [01-features.md](01-features.md) | Feature specifications for both pages |
| [01-designs.md](01-designs.md) | Design system: colors, typography, layout wireframes |
| [02-project-structure.md](02-project-structure.md) | Full directory structure (clean arch), docker-compose |
| [03-data-models.md](03-data-models.md) | PostgreSQL schema, domain entities, TypeScript models |
| [04-api-boundary.md](04-api-boundary.md) | REST API endpoints, SSE format, error responses |
| [05-frontend-modules.md](05-frontend-modules.md) | Frontend Angular modules, routes, state management |
| [06-backend-modules.md](06-backend-modules.md) | Backend Python modules, use cases, services |
| [07-technical-challenges.md](07-technical-challenges.md) | SSE streaming, citation parsing, pgvector perf, etc. |
| [08-implementation-phases.md](08-implementation-phases.md) | 8 phases from scaffolding to polish |
| [09-testing-strategy.md](09-testing-strategy.md) | Unit, integration, and E2E testing approach |
| [10-dependencies.md](10-dependencies.md) | Python & Angular packages, Docker images, API keys |
| [design.md](design.md) | Detailed UI component specifications |

## Key Decisions

| Decision | Choice |
|----------|--------|
| LLM | Anthropic Claude |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Backend Framework | FastAPI (async) |
| Frontend Framework | Angular 19 + Angular Material (minimalist) |
| Database | PostgreSQL 16 + pgvector (single DB) |
| Auth | Simple username/password + JWT |
| Streaming | SSE via StreamingResponse |
| Architecture | Clean Architecture (both FE & BE) |
| State Management | Angular Signals |
| Chunking | Auto (defaults) + Custom (user-configurable) |
| Web Crawling | Configurable depth 1–3 |
| Citations | Inline [n] chips + collapsible source panel |

## Implementation Order

1. **Scaffolding** — Docker Compose, project setup, Angular Material theme
2. **Auth** — Register, login, JWT, guards, interceptor
3. **Document Indexing (BE)** — Upload, chunk, embed, store
4. **Document Indexing (FE)** — Upload UI, status, document list
5. **Website Indexing** — Crawl + index pipeline
6. **RAG Chat (BE)** — Query → retrieve → stream Claude response
7. **RAG Chat (FE)** — Chat UI, streaming, citations, source panel
8. **Polish** — Error handling, responsive, testing
