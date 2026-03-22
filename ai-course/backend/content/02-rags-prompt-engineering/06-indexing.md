---
title: "Retrieval: Indexing"
description: "Embedding models, vector databases, and indexing strategies for RAG"
duration_minutes: 16
order: 6
---

## Embedding Models

Embeddings convert text into dense vectors that capture semantic meaning. Similar text maps to nearby vectors.

### Choosing an Embedding Model

| Model | Dimensions | Speed | Quality | Cost |
|-------|-----------|-------|---------|------|
| text-embedding-3-small | 1536 | Fast | Good | $0.02/1M tokens |
| text-embedding-3-large | 3072 | Slow | Excellent | $0.13/1M tokens |
| all-MiniLM-L6-v2 | 384 | Very fast | Good | Free (local) |
| bge-large-en-v1.5 | 1024 | Fast | Excellent | Free (local) |
| e5-mistral-7b | 4096 | Slow | SOTA | Free (local) |

### OpenAI Embeddings

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def embed(texts: list[str]) -> list[list[float]]:
    response = await client.embeddings.create(
        input=texts,
        model="text-embedding-3-small",
        dimensions=512,  # Can reduce for memory savings
    )
    return [item.embedding for item in response.data]
```

### Local Embeddings with sentence-transformers

```python
from sentence_transformers import SentenceTransformer
import torch

model = SentenceTransformer('BAAI/bge-large-en-v1.5')

def embed_local(texts: list[str]) -> list[list[float]]:
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,  # For cosine similarity
    )
    return embeddings.tolist()
```

## Vector Databases

### ChromaDB (Development)

```python
import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},  # Similarity metric
)

# Add documents
collection.add(
    documents=texts,
    embeddings=embeddings,
    metadatas=metadatas,
    ids=ids,
)

# Query
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=10,
    where={"category": "technical"},      # Metadata filter
    where_document={"$contains": "API"},  # Full-text filter
)
```

### Pinecone (Production Managed)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

pc.create_index(
    name="documents",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

index = pc.Index("documents")

# Upsert
index.upsert(
    vectors=[
        {"id": "doc-1", "values": embedding, "metadata": {"source": "wiki"}},
    ]
)

# Query
results = index.query(
    vector=query_embedding,
    top_k=10,
    filter={"source": {"$eq": "wiki"}},
    include_metadata=True,
)
```

### pgvector (PostgreSQL)

Best for teams already using PostgreSQL:

```python
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Integer, Text, create_engine
from sqlalchemy.orm import declarative_base, Session

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    content = Column(Text)
    embedding = Column(Vector(1536))

engine = create_engine("postgresql://localhost/mydb")
Base.metadata.create_all(engine)

# Query with cosine similarity
with Session(engine) as session:
    results = session.query(Document).order_by(
        Document.embedding.cosine_distance(query_embedding)
    ).limit(5).all()
```

## HNSW Index

All production vector databases use Hierarchical Navigable Small World (HNSW) for approximate nearest neighbor search:

- **ef_construction**: Higher = better index quality, slower build
- **M**: Number of bi-directional links; higher = better recall, more memory
- **ef_search**: Higher = better recall, slower query

```python
# ChromaDB HNSW tuning
collection = client.create_collection(
    name="docs",
    metadata={
        "hnsw:space": "cosine",
        "hnsw:construction_ef": 200,   # default 100
        "hnsw:M": 32,                  # default 16
        "hnsw:search_ef": 150,         # default 100
    }
)
```

## Sparse Embeddings (BM25)

BM25 is a keyword-based retrieval method that excels at exact match:

```python
from rank_bm25 import BM25Okapi
import nltk

def build_bm25_index(documents: list[str]) -> BM25Okapi:
    tokenized = [nltk.word_tokenize(doc.lower()) for doc in documents]
    return BM25Okapi(tokenized)

def bm25_search(index: BM25Okapi, query: str, documents: list[str], top_k=5):
    tokens = nltk.word_tokenize(query.lower())
    scores = index.get_scores(tokens)
    top_indices = scores.argsort()[-top_k:][::-1]
    return [documents[i] for i in top_indices]
```

## Key Takeaways

- For development, ChromaDB (local) or OpenAI embeddings are the fastest to set up
- For production, Pinecone (managed) or pgvector (PostgreSQL) are most common
- HNSW enables sub-millisecond approximate nearest neighbor search at scale
- BM25 handles exact keyword matching that semantic search misses
- Combine dense + sparse embeddings (hybrid search) for best retrieval quality
