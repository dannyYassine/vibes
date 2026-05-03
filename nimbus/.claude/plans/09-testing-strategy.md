# Nimbus — Testing Strategy

## Rust Backend Testing

### Unit Tests

**Location:** Inline `#[cfg(test)]` modules within each source file.

#### `nimbus-core` (highest priority — pure logic)

| Area | What to test |
|------|-------------|
| Models | Serialization/deserialization round-trips for all structs. NodeType enum variants serialize to expected JSON format |
| Validation | `validate_diagram()` catches: orphan edges (reference nonexistent nodes), invalid containment (EC2 not in a subnet group), duplicate node IDs, self-referencing edges |
| Auto-layout | Simple graphs produce expected layer assignments. Containment is preserved. No overlapping nodes |
| Cloud catalog | Cloud provider mappings are complete. Translation service maps all generic components correctly per provider |

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn node_type_serializes_as_tagged_enum() {
        let nt = NodeType::Compute(ComputeService::EC2);
        let json = serde_json::to_value(&nt).unwrap();
        assert_eq!(json["category"], "Compute");
        assert_eq!(json["service"], "EC2");
    }

    #[test]
    fn validate_catches_orphan_edge() {
        let diagram = Diagram {
            edges: vec![Edge { source_id: Uuid::new_v4(), target_id: Uuid::new_v4(), .. }],
            nodes: vec![], // no nodes
            ..
        };
        let warnings = validate_diagram(&diagram);
        assert!(warnings.iter().any(|w| w.severity == Severity::Error));
    }
}
```

#### `nimbus-ai`

| Area | What to test |
|------|-------------|
| Parser | Valid JSON → correct Vec<Node> and Vec<Edge>. Partial/malformed JSON → graceful error. Missing fields use defaults |
| Prompts | System prompt includes JSON schema. Template interpolation produces valid prompts |

- Mock the HTTP client (use `mockito` or `wiremock`) to test AI client behavior without hitting the real API
- Test retry logic: simulate 429/500 responses and verify backoff behavior

#### `nimbus-api`

| Area | What to test |
|------|-------------|
| Error handling | AppError variants map to correct HTTP status codes |
| Extractors | Custom extractors validate and reject invalid input |

### Integration Tests

**Location:** `backend/tests/` directory.

**Setup:** Use `testcontainers` crate to spin up a PostgreSQL container per test suite. Alternatively, use a dedicated test database with migrations applied before each run.

| Test | Description |
|------|-------------|
| Diagram CRUD | Create diagram → Get → Update → List → Delete. Verify responses match expected shapes |
| Generate endpoint | Mock Claude API, send a prompt, verify SSE events are well-formed |
| Concurrent updates | Two PATCH requests to the same diagram — verify last-write-wins without data corruption |
| Large diagram | Create a diagram with 100 nodes and 150 edges. Verify GET returns all data within acceptable time |

```rust
#[tokio::test]
async fn test_create_and_get_diagram() {
    let app = test_app().await; // Builds Axum router + test DB
    let server = axum_test::TestServer::new(app).unwrap();

    let resp = server.post("/api/diagrams")
        .json(&json!({"name": "Test"}))
        .await;
    resp.assert_status(StatusCode::CREATED);

    let diagram: DiagramResponse = resp.json();
    let resp = server.get(&format!("/api/diagrams/{}", diagram.id)).await;
    resp.assert_status_ok();
}
```

---

## Angular Frontend Testing

### Unit Tests

**Framework:** Jest (or Karma + Jasmine — Angular default). Prefer Jest for speed.

#### Services

| Service | What to test |
|---------|-------------|
| `DiagramStateService` | addNode → nodes$ emits updated list. moveNode → position updates. undo/redo stack works correctly. selectNodes → selectedNodes$ updates. isDirty$ emits true after changes |
| `AiService` | Parses SSE events correctly. Handles connection errors. Feeds events into DiagramStateService |
| `ExportService` | JSON export produces valid structure. PNG export calls canvas.toDataURL |
| `ApiService` | HTTP calls use correct URLs and methods (mock HttpClient) |

```typescript
describe('DiagramStateService', () => {
  test('should add a node and emit updated diagram', () => {
    const service = new DiagramStateService();
    service.loadDiagram(mockDiagram);

    const node = createMockNode();
    service.addNode(node);

    service.diagram$.subscribe(d => {
      expect(d.nodes).toContain(node);
    });
  });

  test('should undo the last action', () => {
    const service = new DiagramStateService();
    service.loadDiagram(mockDiagram);
    const initialNodeCount = mockDiagram.nodes.length;

    service.addNode(createMockNode());
    service.undo();

    service.diagram$.subscribe(d => {
      expect(d.nodes.length).toBe(initialNodeCount);
    });
  });
});
```

#### Components

| Component | What to test |
|-----------|-------------|
| `ToolbarComponent` | Button clicks emit correct events. Zoom display updates from state |
| `ChatComponent` | Submitting input triggers AiService. Messages render in list |
| `PropertiesPanelComponent` | Shows correct fields for selected node type. Edits propagate to DiagramStateService |
| `ServiceLibraryComponent` | Lists generic components by category. Shows provider-specific names when translated. Search filters correctly |

#### Canvas (limited unit testing)

Canvas interactions are difficult to unit test. Focus on:
- Handler classes (DragHandler, ZoomHandler, SelectionHandler) can be tested with mock canvas contexts
- Renderer classes: test hit-detection logic with known coordinates

### E2E Tests

**Framework:** Cypress or Playwright.

#### Critical User Flows

| Flow | Steps |
|------|-------|
| Generate diagram | Open app → Type prompt → Click generate → Wait for diagram to appear → Verify nodes visible on canvas |
| Edit diagram | Load diagram → Click node → Change label in properties panel → Verify label updates on canvas |
| Drag node | Load diagram → Mouse down on node → Drag to new position → Mouse up → Verify node position updated |
| Save and reload | Generate diagram → Wait for auto-save → Refresh page → Verify diagram loads with same nodes |
| Export PNG | Load diagram → Click export → Verify download triggered |
| Delete diagram | Load diagram → Click delete → Confirm → Verify redirected to diagram list |

```typescript
describe('Diagram Generation', () => {
  test('should generate a diagram from natural language', () => {
    cy.visit('/diagrams/new');
    cy.get('[data-testid="chat-input"]').type('A VPC with an EC2 instance');
    cy.get('[data-testid="generate-button"]').click();
    cy.get('[data-testid="canvas"]', { timeout: 15000 }).should('exist');
    // Verify nodes appeared (check DiagramStateService via Angular testing utilities)
  });
});
```

---

## Testing Pyramid

```
        ╱ E2E Tests ╲           (~10 tests)
       ╱  (Cypress)   ╲         Critical user flows only
      ╱─────────────────╲
     ╱ Integration Tests  ╲     (~20 tests)
    ╱  (Rust: axum-test)    ╲   API endpoints, DB operations
   ╱─────────────────────────╲
  ╱     Unit Tests             ╲ (~100+ tests)
 ╱  (Rust: #[test], TS: Jest)   ╲ Models, services, handlers, parsers
╱─────────────────────────────────╲
```

## CI Pipeline

```yaml
# Run on every PR
steps:
  - cargo fmt --check        # Rust formatting
  - cargo clippy              # Rust linting
  - cargo test                # Rust unit + integration tests
  - ng lint                   # Angular linting
  - ng test --watch=false     # Angular unit tests
  - ng build --configuration=production  # Verify build succeeds
  # E2E tests run on merge to main (slower, require full stack)
```
