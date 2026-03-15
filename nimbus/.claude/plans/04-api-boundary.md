# Nimbus — API Boundary

## Base URL

```
Development: http://localhost:8080/api
Production:  https://api.nimbus.app/api
```

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

**Response:** `200 OK`
```json
{ "status": "ok", "version": "0.1.0" }
```

---

### Diagrams — CRUD

#### List diagrams

```
GET /api/diagrams
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "My Architecture",
    "description": "Microservices e-commerce platform",
    "nodeCount": 12,
    "activeProvider": null,
    "updatedAt": "2026-03-14T10:00:00Z"
  }
]
```

#### Get diagram

```
GET /api/diagrams/:id
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "My Architecture",
  "description": "Microservices e-commerce platform",
  "nodes": [ ... ],
  "edges": [ ... ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "activeProvider": null,
  "createdAt": "2026-03-14T10:00:00Z",
  "updatedAt": "2026-03-14T10:00:00Z"
}
```

**Error:** `404 Not Found`
```json
{ "error": "Diagram not found", "code": "DIAGRAM_NOT_FOUND" }
```

#### Create diagram

```
POST /api/diagrams
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "My Architecture",
  "description": "Optional description"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "My Architecture",
  "description": "Optional description",
  "nodes": [],
  "edges": [],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "activeProvider": null,
  "createdAt": "2026-03-14T10:00:00Z",
  "updatedAt": "2026-03-14T10:00:00Z"
}
```

#### Update diagram

```
PATCH /api/diagrams/:id
Content-Type: application/json
```

**Request body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "nodes": [ ... ],
  "edges": [ ... ],
  "viewport": { "x": 100, "y": 50, "zoom": 1.5 }
}
```

**Response:** `200 OK` — Returns the full updated diagram.

#### Delete diagram

```
DELETE /api/diagrams/:id
```

**Response:** `204 No Content`

---

### Validation

#### Validate diagram

```
POST /api/diagrams/:id/validate
```

Runs deterministic validation rules against the diagram. No AI involved.

**Response:** `200 OK`
```json
{
  "valid": false,
  "warnings": [
    {
      "id": "warn-uuid",
      "severity": "Warning",
      "message": "Load Balancer has only one target — consider adding redundancy",
      "nodeIds": ["lb-uuid"],
      "edgeIds": [],
      "rule": "SINGLE_TARGET_LB"
    },
    {
      "id": "warn-uuid-2",
      "severity": "Info",
      "message": "No observability components detected (logging, monitoring, tracing)",
      "nodeIds": [],
      "edgeIds": [],
      "rule": "MISSING_OBSERVABILITY"
    }
  ]
}
```

#### Fix validation issue with AI

```
POST /api/diagrams/:id/fix
Content-Type: application/json
Accept: text/event-stream
```

**Request body:**
```json
{
  "warningId": "warn-uuid",
  "rule": "SINGLE_TARGET_LB",
  "message": "Load Balancer has only one target — consider adding redundancy"
}
```

**Response:** `200 OK` (SSE stream) — same event format as generate/modify. Returns a minimal, targeted fix for the specific issue.

---

### AI Generation

#### Generate diagram from prompt

```
POST /api/diagrams/generate
Content-Type: application/json
Accept: text/event-stream
```

**Request body:**
```json
{
  "prompt": "A microservices architecture for an e-commerce platform with separate services for orders, inventory, and payments, communicating via message queues",
  "existingDiagramId": null
}
```

**Response:** `200 OK` (Server-Sent Events stream)

All generated nodes use **generic, cloud-agnostic components**:

```
event: node_added
data: {"id":"uuid","nodeType":{"category":"Networking","component":"ApiGateway"},"label":"API Gateway","position":{"x":300,"y":100},"size":{"width":120,"height":80},"properties":{"config":{}},"parentId":null}

event: node_added
data: {"id":"uuid","nodeType":{"category":"Compute","component":"ApplicationServer"},"label":"Order Service","position":{"x":150,"y":250},"size":{"width":120,"height":80},"properties":{"config":{}},"parentId":null}

event: node_added
data: {"id":"uuid","nodeType":{"category":"Messaging","component":"MessageQueue"},"label":"Order Events","position":{"x":300,"y":400},"size":{"width":120,"height":80},"properties":{"config":{}},"parentId":null}

event: edge_added
data: {"id":"uuid","sourceId":"gateway-uuid","targetId":"order-uuid","edgeType":"Synchronous","label":"REST","properties":{"protocol":"HTTP","port":443,"bidirectional":false,"communicationPattern":"RequestResponse"}}

event: layout_updated
data: {"nodes":[{"id":"uuid","position":{"x":150,"y":200}}]}

event: complete
data: {"diagramId":"uuid","nodeCount":8,"edgeCount":7}
```

**Error event:**
```
event: error
data: {"error":"AI generation failed","code":"AI_GENERATION_ERROR","details":"Rate limit exceeded"}
```

#### Modify diagram with AI

```
POST /api/diagrams/:id/modify
Content-Type: application/json
Accept: text/event-stream
```

**Request body:**
```json
{
  "prompt": "Add a cache layer between the API gateway and the order service",
  "selectedNodeIds": ["gateway-uuid", "order-uuid"]
}
```

**Response:** Same SSE format as generate, with additional event types:

```
event: node_removed
data: {"id":"uuid"}

event: node_updated
data: {"id":"uuid","label":"Updated Label","position":{"x":200,"y":300}}

event: edge_removed
data: {"id":"uuid"}
```

---

### Cloud Translation

#### Translate diagram to cloud provider

```
POST /api/diagrams/:id/translate
Content-Type: application/json
```

**Request body:**
```json
{
  "provider": "Aws"
}
```

**Response:** `200 OK` — Returns the full diagram with `providerMappings` populated on each node and `activeProvider` set.

```json
{
  "id": "uuid",
  "name": "My Architecture",
  "activeProvider": "Aws",
  "nodes": [
    {
      "id": "uuid",
      "nodeType": { "category": "Networking", "component": "LoadBalancer" },
      "label": "Load Balancer",
      "providerMappings": {
        "aws": {
          "serviceName": "Application Load Balancer",
          "iconKey": "aws-alb",
          "config": { "type": "application", "scheme": "internet-facing" },
          "terraformResourceType": "aws_lb"
        }
      }
    }
  ]
}
```

#### Clear provider translation (back to generic)

```
DELETE /api/diagrams/:id/translate
```

**Response:** `200 OK` — Returns diagram with `activeProvider: null`.

---

### Terraform Export

#### Export diagram as Terraform

```
GET /api/diagrams/:id/export/terraform
```

**Prerequisite:** Diagram must have an `activeProvider` set (i.e., translated to a cloud provider).

**Response:** `200 OK`
```json
{
  "files": [
    {
      "filename": "main.tf",
      "content": "terraform {\n  required_providers {\n    aws = {\n      source = \"hashicorp/aws\"\n      version = \"~> 5.0\"\n    }\n  }\n}\n\nprovider \"aws\" {\n  region = \"us-east-1\"\n}\n\nresource \"aws_lb\" \"load_balancer\" {\n  name               = \"load-balancer\"\n  internal           = false\n  load_balancer_type = \"application\"\n  ...\n}\n"
    },
    {
      "filename": "variables.tf",
      "content": "variable \"region\" {\n  default = \"us-east-1\"\n}\n"
    },
    {
      "filename": "outputs.tf",
      "content": "output \"lb_dns_name\" {\n  value = aws_lb.load_balancer.dns_name\n}\n"
    }
  ]
}
```

**Error:** `400 Bad Request` if no provider is active:
```json
{ "error": "Diagram must be translated to a cloud provider before Terraform export", "code": "NO_PROVIDER_SELECTED" }
```

---

### Docker Compose Export

#### Export diagram as Docker Compose

```
GET /api/diagrams/:id/export/docker-compose
```

**Prerequisite:** None — works on the generic diagram (no cloud translation needed).

**Response:** `200 OK`
```json
{
  "filename": "docker-compose.yml",
  "content": "version: '3.8'\n\nservices:\n  api-gateway:\n    image: nginx:alpine\n    ports:\n      - \"80:80\"\n    depends_on:\n      - order-service\n      - payment-service\n    networks:\n      - app-network\n\n  order-service:\n    image: <your-order-service-image>  # TODO: replace with your image\n    ports:\n      - \"8001:8080\"\n    environment:\n      DATABASE_URL: postgres://nimbus:nimbus@order-db:5432/orders\n    depends_on:\n      - order-db\n      - order-events\n    networks:\n      - app-network\n\n  order-db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: orders\n      POSTGRES_USER: nimbus\n      POSTGRES_PASSWORD: nimbus  # TODO: use secrets in production\n    volumes:\n      - order-db-data:/var/lib/postgresql/data\n    networks:\n      - app-network\n\n  order-events:\n    image: rabbitmq:3-management\n    ports:\n      - \"5672:5672\"\n      - \"15672:15672\"\n    networks:\n      - app-network\n\nnetworks:\n  app-network:\n    driver: bridge\n\nvolumes:\n  order-db-data:\n"
}
```

---

### Export (Generic)

#### Export diagram as PNG

```
GET /api/diagrams/:id/export/png
```

**Response:** `200 OK`
```
Content-Type: image/png
Content-Disposition: attachment; filename="diagram-name.png"
```

Note: PNG rendering may be done client-side instead, using Canvas `toDataURL()`. This endpoint is optional.

#### Export diagram as JSON

```
GET /api/diagrams/:id/export/json
```

**Response:** `200 OK`
```json
{
  "version": "1.0",
  "exportedAt": "2026-03-14T10:00:00Z",
  "diagram": { ... }
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `DIAGRAM_NOT_FOUND` | 404 | Diagram ID does not exist |
| `NO_PROVIDER_SELECTED` | 400 | Terraform export requires an active provider |
| `UNSUPPORTED_PROVIDER` | 400 | Invalid cloud provider value |
| `AI_GENERATION_ERROR` | 502 | AI service failed |
| `AI_RATE_LIMIT` | 429 | Too many AI requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Request/Response Conventions

- **IDs**: UUID v4, serialized as strings
- **Dates**: ISO 8601 with timezone (`2026-03-14T10:00:00Z`)
- **Case**: Backend uses `snake_case` in Rust, API uses `camelCase` in JSON (via `#[serde(rename_all = "camelCase")]`)
- **CloudProvider values**: `"Aws"`, `"Gcp"`, `"Azure"` (PascalCase enum variants)
- **Pagination**: Not needed for MVP (diagrams per user will be small). Add `?page=1&limit=20` later.
- **Content-Type**: All JSON endpoints use `application/json`; SSE endpoints use `text/event-stream`
