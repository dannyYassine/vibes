# RagVerse — Testing Strategy

## Backend Testing

### Unit Tests (domain + application layers)

- **Domain entities & value objects**: Validate ChunkConfig, entity creation, enum values
- **Use cases**: Mock repository and service interfaces, test business logic in isolation
- **Framework**: `pytest` + `pytest-asyncio`
- **No framework dependencies in tests for domain/application layers**

```python
# Example: test upload document use case
async def test_upload_document():
    mock_repo = AsyncMock(spec=DocumentRepository)
    mock_repo.save.return_value = Document(id=uuid4(), status=DocumentStatus.PENDING, ...)
    use_case = UploadDocumentUseCase(document_repo=mock_repo, ...)
    result = await use_case.execute(file=..., user_id=..., chunk_config=...)
    assert result.status == DocumentStatus.PENDING
    mock_repo.save.assert_called_once()
```

### Integration Tests (infrastructure layer)

- **Repository tests**: Test against real PostgreSQL (use testcontainers or docker-compose test profile)
- **API route tests**: Use FastAPI `TestClient` / `httpx.AsyncClient` with test DB
- **Embedding/LLM tests**: Mock external APIs (OpenAI, Anthropic) — don't call real APIs in CI

### Key Test Scenarios

1. Register → Login → Access protected endpoint
2. Upload document → Status transitions (pending → processing → completed)
3. Upload invalid file type → Proper error response
4. Vector search returns correct chunks for a query
5. SSE stream delivers tokens + sources + message_complete events
6. User can only access their own documents/conversations
7. Cascading deletes work correctly

---

## Frontend Testing

### Unit Tests (Jasmine + Karma or Jest)

- **Components**: Test rendering, user interactions, event emissions
- **Facades**: Test orchestration logic with mocked API services
- **Stores**: Test signal state transitions
- **Pipes**: Test transformation logic

### Key Frontend Test Scenarios

1. AuthGuard redirects unauthenticated users to login
2. AuthInterceptor attaches token and handles refresh
3. DocumentUploadComponent emits correct file + config on upload
4. ChatStore correctly manages streaming state
5. CitationComponent renders and expands correctly
6. SSE parser correctly handles token/sources/complete events

---

## E2E Testing (Optional — Phase 8)

- **Tool**: Playwright or Cypress
- **Key flows**:
  1. Register → Login → Upload document → Wait for indexing → Chat → Verify response references document
  2. Create multiple conversations → Switch between them → Verify message isolation

---

## Test Commands

```bash
# Backend
cd backend
pytest                           # Run all tests
pytest tests/unit/               # Domain + application tests only
pytest tests/integration/        # Infrastructure tests (needs DB)
pytest --cov=app                 # With coverage

# Frontend
cd frontend
ng test                          # Unit tests
ng e2e                           # E2E tests (if configured)
```
