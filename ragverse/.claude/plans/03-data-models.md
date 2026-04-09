# RagVerse — Data Models

## PostgreSQL Schema

All tables use UUIDs as primary keys. pgvector extension is required.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### users

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| username | VARCHAR(100) | UNIQUE, NOT NULL | Login identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### documents

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(500) | NOT NULL | File name or page title |
| file_name | VARCHAR(500) | NULLABLE | NULL for website sources |
| file_type | VARCHAR(50) | NOT NULL | 'pdf', 'docx', 'txt', 'csv', 'html', 'md', 'website' |
| file_size_bytes | BIGINT | NULLABLE | NULL for website sources |
| source_url | TEXT | NULLABLE | Non-NULL for websites |
| crawl_depth | SMALLINT | NULLABLE | 1–3, only for websites |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending, processing, completed, failed |
| error_message | TEXT | NULLABLE | Set on failure |
| chunk_config | JSONB | NOT NULL, DEFAULT '{"mode":"auto"}' | See ChunkConfig below |
| chunk_count | INTEGER | NOT NULL, DEFAULT 0 | Updated after indexing |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_documents_user_id` on `user_id`
- `idx_documents_status` on `status`

---

### document_chunks

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| document_id | UUID | FK → documents(id) ON DELETE CASCADE, NOT NULL | |
| chunk_index | INTEGER | NOT NULL | Ordering within document |
| content | TEXT | NOT NULL | Raw chunk text |
| embedding | vector(1536) | NOT NULL | OpenAI text-embedding-3-small |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | page number, heading, source_url, etc. |
| token_count | INTEGER | NULLABLE | Approximate token count |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_chunks_document_id` on `document_id`
- `idx_chunks_embedding` USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)

---

### conversations

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(500) | NOT NULL, DEFAULT 'New Conversation' | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_conversations_user_id` on `user_id`

---

### messages

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| conversation_id | UUID | FK → conversations(id) ON DELETE CASCADE, NOT NULL | |
| role | VARCHAR(20) | NOT NULL | 'user' or 'assistant' |
| content | TEXT | NOT NULL | Full message text |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_messages_conversation_id` on `conversation_id`

---

### message_sources

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| message_id | UUID | FK → messages(id) ON DELETE CASCADE, NOT NULL | |
| chunk_id | UUID | FK → document_chunks(id) ON DELETE CASCADE, NOT NULL | |
| relevance_score | FLOAT | NULLABLE | Cosine similarity score |
| rank | SMALLINT | NOT NULL | 1 = most relevant |

**Indexes:**
- `idx_message_sources_message_id` on `message_id`

---

## ChunkConfig JSONB Structure

**Auto mode (default):**
```json
{
  "mode": "auto"
}
```
Internally uses: chunk_size=1000, chunk_overlap=200, strategy="recursive"

**Custom mode:**
```json
{
  "mode": "custom",
  "chunk_size": 1500,
  "chunk_overlap": 100,
  "strategy": "recursive"
}
```

Strategies: `recursive` (RecursiveCharacterTextSplitter), `character` (CharacterTextSplitter), `token` (TokenTextSplitter)

---

## Domain Entities (Python dataclasses)

These are framework-free representations used in the domain and application layers:

```python
@dataclass
class User:
    id: UUID
    username: str
    email: str
    password_hash: str
    created_at: datetime
    updated_at: datetime

@dataclass
class Document:
    id: UUID
    user_id: UUID
    title: str
    file_name: str | None
    file_type: str
    file_size_bytes: int | None
    source_url: str | None
    crawl_depth: int | None
    status: DocumentStatus  # enum: PENDING, PROCESSING, COMPLETED, FAILED
    error_message: str | None
    chunk_config: ChunkConfig
    chunk_count: int
    created_at: datetime
    updated_at: datetime

@dataclass
class DocumentChunk:
    id: UUID
    document_id: UUID
    chunk_index: int
    content: str
    embedding: list[float]
    metadata: dict
    token_count: int | None
    created_at: datetime

@dataclass
class Conversation:
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

@dataclass
class Message:
    id: UUID
    conversation_id: UUID
    role: MessageRole  # enum: USER, ASSISTANT
    content: str
    created_at: datetime

@dataclass
class MessageSource:
    id: UUID
    message_id: UUID
    chunk_id: UUID
    relevance_score: float | None
    rank: int
```

## TypeScript Domain Models (Frontend)

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

interface Document {
  id: string;
  title: string;
  fileName?: string;
  fileType: string;
  fileSizeBytes?: number;
  sourceUrl?: string;
  crawlDepth?: number;
  status: DocumentStatus;
  errorMessage?: string;
  chunkConfig: ChunkConfig;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ChunkConfig {
  mode: 'auto' | 'custom';
  chunkSize?: number;
  chunkOverlap?: number;
  strategy?: 'recursive' | 'character' | 'token';
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  createdAt: Date;
}

interface MessageSource {
  id: string;
  chunkId: string;
  documentTitle: string;
  contentPreview: string;
  relevanceScore: number;
  rank: number;
  metadata: Record<string, unknown>;
}
```
