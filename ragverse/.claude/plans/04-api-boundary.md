# RagVerse — API Boundary

All endpoints prefixed with `/api`. All except auth endpoints require `Authorization: Bearer <token>`.

---

## Auth

| Method | Path | Request Body | Response | Status |
|--------|------|-------------|----------|--------|
| POST | `/api/auth/register` | `{username, email, password}` | `{id, username, email}` | 201 |
| POST | `/api/auth/login` | `{username, password}` | `{access_token, refresh_token, token_type}` | 200 |
| POST | `/api/auth/refresh` | `{refresh_token}` | `{access_token, token_type}` | 200 |
| GET | `/api/auth/me` | — | `{id, username, email, created_at}` | 200 |

**Token lifetimes:** access_token = 30 min, refresh_token = 7 days

---

## Documents

| Method | Path | Request | Response | Status | Notes |
|--------|------|---------|----------|--------|-------|
| POST | `/api/documents/upload` | multipart: `file`, `chunk_config?` (JSON string) | DocumentResponse | 201 | Starts background indexing |
| POST | `/api/documents/index-website` | `{url, crawl_depth, title?, chunk_config?}` | DocumentResponse | 201 | crawl_depth: 1–3 |
| GET | `/api/documents` | Query: `?status=&page=1&page_size=20` | `{items: DocumentResponse[], total, page, page_size}` | 200 | Paginated, current user only |
| GET | `/api/documents/{id}` | — | DocumentResponse (with chunk_count) | 200 | Use for polling status |
| DELETE | `/api/documents/{id}` | — | — | 204 | Cascades to chunks |
| GET | `/api/documents/{id}/chunks` | Query: `?page=1&page_size=20` | `{items: ChunkResponse[], total}` | 200 | Preview chunks |

### DocumentResponse
```json
{
  "id": "uuid",
  "title": "Report.pdf",
  "file_name": "Report.pdf",
  "file_type": "pdf",
  "file_size_bytes": 204800,
  "source_url": null,
  "crawl_depth": null,
  "status": "completed",
  "error_message": null,
  "chunk_config": {"mode": "auto"},
  "chunk_count": 42,
  "created_at": "2026-04-08T10:00:00Z",
  "updated_at": "2026-04-08T10:01:30Z"
}
```

### ChunkResponse
```json
{
  "id": "uuid",
  "chunk_index": 0,
  "content": "First 500 chars of chunk...",
  "token_count": 245,
  "metadata": {"page": 1}
}
```

---

## Chunking

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/api/chunking/strategies` | `{strategies: ["recursive","character","token"], defaults: {chunk_size:1000, chunk_overlap:200}}` | For populating the config UI |

---

## Conversations

| Method | Path | Request | Response | Status |
|--------|------|---------|----------|--------|
| POST | `/api/conversations` | `{title?}` | ConversationResponse | 201 |
| GET | `/api/conversations` | Query: `?page=1&page_size=20` | `{items: ConversationResponse[], total}` | 200 |
| GET | `/api/conversations/{id}` | — | ConversationResponse | 200 |
| PATCH | `/api/conversations/{id}` | `{title}` | ConversationResponse | 200 |
| DELETE | `/api/conversations/{id}` | — | — | 204 |

### ConversationResponse
```json
{
  "id": "uuid",
  "title": "New Conversation",
  "message_count": 12,
  "created_at": "2026-04-08T10:00:00Z",
  "updated_at": "2026-04-08T10:30:00Z"
}
```

---

## Messages

| Method | Path | Request | Response | Status | Notes |
|--------|------|---------|----------|--------|-------|
| GET | `/api/conversations/{id}/messages` | Query: `?page=1&page_size=50` | `{items: MessageResponse[], total}` | 200 | Oldest first. Includes sources. |
| POST | `/api/conversations/{id}/messages` | `{content}` | **SSE stream** | 200 | See SSE format below |

### MessageResponse
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "role": "assistant",
  "content": "Based on the documents [1], the answer is...",
  "sources": [
    {
      "id": "uuid",
      "chunk_id": "uuid",
      "document_title": "Report.pdf",
      "content_preview": "The quarterly results show...",
      "relevance_score": 0.87,
      "rank": 1,
      "metadata": {"page": 3}
    }
  ],
  "created_at": "2026-04-08T10:30:00Z"
}
```

---

## SSE Stream Format

`POST /api/conversations/{id}/messages` returns `Content-Type: text/event-stream`:

```
event: token
data: {"content": "Based"}

event: token
data: {"content": " on"}

event: token
data: {"content": " the documents [1],"}

...

event: sources
data: {"sources": [
  {
    "chunk_id": "uuid",
    "document_title": "Report.pdf",
    "content_preview": "The quarterly results show...",
    "relevance_score": 0.87,
    "rank": 1,
    "metadata": {"page": 3}
  }
]}

event: message_complete
data: {"message_id": "uuid", "conversation_id": "uuid"}

event: error
data: {"detail": "Something went wrong"}
```

### Frontend SSE Consumption

Standard `EventSource` only supports GET. Use `fetch()` with `ReadableStream` for POST-based SSE:

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: message })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
// Parse SSE lines manually in a read loop
```

Alternatively, use `@microsoft/fetch-event-source` library.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (accessing another user's resource) |
| 404 | Not found |
| 413 | File too large |
| 422 | Unprocessable entity (FastAPI validation) |
| 500 | Internal server error |
