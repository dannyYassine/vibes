# RagVerse — Technical Challenges

## 1. SSE Streaming with POST Requests

**Challenge:** Standard `EventSource` API only supports GET. We need POST to send message content.

**Solution:** Use `fetch()` with `ReadableStream` and manually parse SSE events. On the backend, FastAPI's `StreamingResponse` with `media_type="text/event-stream"` handles the server side natively.

**Frontend approach:**
```typescript
const response = await fetch(url, { method: 'POST', headers, body });
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // Parse SSE events from buffer
}
```

---

## 2. Citation Parsing in Streamed Text

**Challenge:** Citations like `[1]`, `[2]` arrive as individual tokens during streaming. We need to detect and render them as interactive components.

**Solution:**
- During streaming: accumulate raw text, use regex to detect `\[\d+\]` patterns
- After stream complete: parse full text, replace citation markers with Angular `CitationComponent` instances
- Use a custom pipe or directive that transforms markdown + citations into rendered HTML with interactive citation chips

---

## 3. Large File Processing

**Challenge:** Large PDFs/documents can take significant time to chunk and embed.

**Solution:**
- Background processing via FastAPI `BackgroundTasks`
- Status polling on the frontend (every 2–3 seconds while processing)
- Batch embedding calls (OpenAI supports batch in a single API call)
- Set reasonable file size limits (configurable, default 50MB)
- Chunking runs in async context to avoid blocking the event loop

---

## 4. pgvector Performance at Scale

**Challenge:** Vector similarity search can slow down with large datasets.

**Solution:**
- HNSW index (`vector_cosine_ops`) with tuned parameters (m=16, ef_construction=64)
- Filter by `user_id` via JOIN before vector search (reduces search space)
- Default top-k=5 (configurable later)
- Monitor query performance; can increase `ef_search` for better recall at cost of speed

---

## 5. Website Crawling Reliability

**Challenge:** Web pages vary wildly — JavaScript-rendered content, rate limiting, broken links, infinite loops.

**Solution:**
- Use LangChain's `RecursiveUrlLoader` with `max_depth` parameter
- Limit to same-domain links only
- Set request timeout (30s per page)
- Respect robots.txt
- Use BeautifulSoup for HTML parsing (no JS rendering — keep it simple)
- Cap maximum pages per crawl (e.g., 50 pages)
- Store per-page source URL in chunk metadata for traceability

---

## 6. Async Database Operations

**Challenge:** FastAPI is async, but SQLAlchemy needs async support for non-blocking DB access.

**Solution:**
- Use `sqlalchemy[asyncio]` with `asyncpg` driver
- `AsyncSession` for all database operations
- `async_sessionmaker` for session factory
- Alembic configured for async migrations

---

## 7. Token Management & Auth

**Challenge:** JWT tokens expire, and the frontend needs seamless token refresh.

**Solution:**
- Short-lived access tokens (30 min) + long-lived refresh tokens (7 days)
- Angular HTTP interceptor catches 401 responses, automatically refreshes the token, and retries the original request
- Queue concurrent requests during refresh to avoid multiple refresh calls
- Refresh token stored in localStorage (acceptable for a local dev tool; use httpOnly cookies for production)

---

## 8. Embedding Model Consistency

**Challenge:** If the embedding model changes, existing vectors become incompatible.

**Solution:**
- Store embedding model name/version in config
- If model changes, existing documents need re-indexing
- Document the model in use; add a setting/migration path for model changes
- For now, hardcode `text-embedding-3-small` and treat model change as a deliberate migration

---

## 9. Docker Networking for Dev

**Challenge:** Angular dev server inside Docker needs to proxy API calls to the backend container.

**Solution:**
- `proxy.conf.json` proxies `/api/**` to `http://backend:8000`
- Docker Compose networking: all services on the same default network
- Backend CORS configured to allow `http://localhost:4200` for cases where frontend runs outside Docker
- Health checks on the DB service so backend waits for PostgreSQL readiness
