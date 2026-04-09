# RagVerse — Overview

**RagVerse** is a minimalist RAG (Retrieval-Augmented Generation) web application that lets users upload documents, index websites, and have AI-powered conversations grounded in their own content.

## Core Concept

Users upload documents or provide website URLs. The system chunks, embeds, and stores them in a vector database. When users ask questions in a conversation, the system retrieves relevant chunks and uses them as context for an LLM to generate grounded, cited answers — streamed in real-time.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Angular Material (minimalist), Standalone components |
| Backend | Python, FastAPI, Clean Architecture |
| RAG Framework | LangChain |
| LLM | Anthropic Claude API |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Database | PostgreSQL 16 + pgvector extension |
| Auth | Simple username/password with JWT |
| DevOps | Docker Compose (frontend, backend, db) |

## Key Features

1. **Document Indexing** — Upload PDF, DOCX, TXT, CSV, HTML, Markdown, and other LangChain-supported formats
2. **Website Indexing** — Crawl and index websites with configurable depth (1–3 levels)
3. **Configurable Chunking** — Auto mode (sensible defaults) or custom (chunk size, overlap, strategy)
4. **Multi-Conversation Chat** — Create, list, delete conversations
5. **Streaming Responses** — Real-time token streaming via SSE
6. **Citations** — Inline citations in responses + collapsible source panel sidebar
7. **Simple Auth** — Username/password login, per-user document and conversation isolation

## Architecture Principles

- **Clean Architecture** on both frontend and backend — separation of concerns via layers (domain, use cases, infrastructure, presentation)
- **Minimalist UI/UX** — Inspired by modern AI chat interfaces (see `.claude/plans/inspirations/`)
- **Single Database** — PostgreSQL + pgvector for both relational data and vector storage
- **Background Processing** — Document indexing runs as async background tasks
- **SSE over WebSocket** — Simpler unidirectional streaming for LLM responses
