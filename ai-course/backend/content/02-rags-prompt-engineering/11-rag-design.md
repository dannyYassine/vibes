---
title: "RAGs' Overall Design"
description: "End-to-end production RAG system architecture and design decisions"
duration_minutes: 18
order: 11
---

## Production RAG Architecture

A production RAG system has two main pipelines: ingestion (offline) and query (online).

```
INGESTION PIPELINE (Offline):
Raw Docs → Parse → Chunk → Embed → Store in Vector DB
                               ↓
                        Metadata Index

QUERY PIPELINE (Online):
User Query → Rewrite → Retrieve → Rerank → Generate → Response
                ↑                               ↓
          Query Cache                    Response Cache
```

## Ingestion Pipeline Design

```python
class IngestionPipeline:
    def __init__(self, vector_store, embedder, chunker):
        self.vector_store = vector_store
        self.embedder = embedder
        self.chunker = chunker

    async def ingest_document(self, document: dict) -> int:
        """Returns number of chunks created."""
        # 1. Parse
        text = self.parse(document)

        # 2. Clean
        text = self.clean(text)

        # 3. Chunk
        chunks = self.chunker.split(text)

        # 4. Enrich with metadata
        chunks_with_meta = [
            {
                "content": chunk,
                "metadata": {
                    "source": document["source"],
                    "title": document.get("title", ""),
                    "date": document.get("date", ""),
                    "chunk_index": i,
                }
            }
            for i, chunk in enumerate(chunks)
        ]

        # 5. Embed in batches
        embeddings = await self.embedder.embed_batch(
            [c["content"] for c in chunks_with_meta]
        )

        # 6. Store
        self.vector_store.upsert(chunks_with_meta, embeddings)

        return len(chunks)
```

## Query Pipeline Design

```python
class QueryPipeline:
    def __init__(self, vector_store, embedder, reranker, llm, cache):
        self.retriever = HybridRetriever(vector_store, embedder)
        self.reranker = reranker
        self.llm = llm
        self.cache = cache

    async def query(
        self,
        question: str,
        filters: dict = None,
        top_k: int = 5,
    ) -> QueryResult:
        # 1. Check cache
        cached = await self.cache.get(question)
        if cached:
            return cached

        # 2. Classify and route
        query_type = self.classify_query(question)
        if query_type == "chitchat":
            return await self.handle_chitchat(question)

        # 3. Rewrite query for retrieval
        retrieval_query = await self.rewrite_query(question)

        # 4. Retrieve
        candidates = await self.retriever.search(
            retrieval_query, top_k=20, filters=filters
        )

        # 5. Rerank
        reranked = self.reranker.rerank(question, candidates, top_k=top_k)

        # 6. Generate
        answer = await self.generate(question, reranked)

        # 7. Cache and return
        result = QueryResult(answer=answer, sources=reranked)
        await self.cache.set(question, result, ttl=3600)
        return result
```

## Key Design Decisions

### Document Granularity
- **Fine chunks (256 tokens)**: Better precision for factual Q&A
- **Coarse chunks (1024 tokens)**: Better for complex questions needing context
- **Hybrid**: Store both, retrieve fine, expand to coarse for generation

### Parent-Child Chunking
```python
# Store small chunks for retrieval, large for generation
def hierarchical_chunking(text: str) -> tuple[list, list]:
    parent_chunks = chunk(text, size=1024)  # Generation context
    child_chunks = []
    for i, parent in enumerate(parent_chunks):
        children = chunk(parent, size=256)  # Retrieval units
        for child in children:
            child["parent_id"] = i  # Link to parent
        child_chunks.extend(children)
    return parent_chunks, child_chunks
```

### Guardrails

```python
async def safe_query(question: str) -> str:
    # Pre-retrieval: check if question is in scope
    if not is_in_scope(question):
        return "I can only answer questions about [your domain]."

    answer = await query_pipeline.query(question)

    # Post-generation: check for hallucination indicators
    if contains_uncertainty_markers(answer):
        answer += "\n\n*Note: Some information in this response may be incomplete.*"

    return answer
```

## Observability

```python
import time

async def traced_query(question: str) -> QueryResult:
    start = time.time()

    retrieval_start = time.time()
    docs = await retrieve(question)
    retrieval_ms = (time.time() - retrieval_start) * 1000

    generation_start = time.time()
    answer = await generate(question, docs)
    generation_ms = (time.time() - generation_start) * 1000

    total_ms = (time.time() - start) * 1000

    await log_trace({
        "question": question,
        "num_docs_retrieved": len(docs),
        "retrieval_ms": retrieval_ms,
        "generation_ms": generation_ms,
        "total_ms": total_ms,
        "answer_length": len(answer),
    })

    return answer
```

## Key Takeaways

- Separate ingestion (offline) and query (online) pipelines for maintainability
- Parent-child chunking gives the best of fine retrieval and rich generation context
- Caching (semantic or exact) can reduce costs by 30-70%
- Guardrails should check both input scope and output quality
- Trace every query with timing, retrieval count, and answer length for debugging
