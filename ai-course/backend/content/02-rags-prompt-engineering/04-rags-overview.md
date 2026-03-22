---
title: "RAGs Overview"
description: "Introduction to Retrieval-Augmented Generation — architecture, benefits, and use cases"
duration_minutes: 14
order: 4
---

## What is RAG?

Retrieval-Augmented Generation (RAG) addresses LLMs' fundamental limitation: they only know what they saw during training. RAG gives models access to external knowledge at inference time by retrieving relevant documents and injecting them into the prompt.

```
User Query → Retrieve Relevant Docs → Augment Prompt → Generate Answer
```

## Why RAG?

| Problem | RAG Solution |
|---------|-------------|
| Model knowledge cutoff | Retrieve fresh documents |
| Hallucination on obscure facts | Ground answers in retrieved sources |
| Private/proprietary knowledge | Index your own documents |
| Citation requirements | Point to source documents |
| No retraining required | Update the knowledge base |

## Naive RAG Architecture

The simplest RAG system has three stages:

### 1. Indexing (Offline)
```python
from sentence_transformers import SentenceTransformer
import chromadb

embedder = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path="./chroma")
collection = client.create_collection("docs")

# Chunk and embed documents
for i, chunk in enumerate(document_chunks):
    embedding = embedder.encode(chunk).tolist()
    collection.add(
        documents=[chunk],
        embeddings=[embedding],
        ids=[f"chunk-{i}"]
    )
```

### 2. Retrieval (Online)
```python
def retrieve(query: str, top_k: int = 5) -> list[str]:
    query_embedding = embedder.encode(query).tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )
    return results['documents'][0]
```

### 3. Generation (Online)
```python
async def rag_generate(query: str) -> str:
    docs = retrieve(query)
    context = "\n\n".join(docs)

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Answer based only on the context provided."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
        ],
    )
    return response.choices[0].message.content
```

## Advanced RAG

Naive RAG suffers from poor retrieval quality. Advanced RAG adds:

- **Query rewriting**: Rephrase the query for better retrieval
- **Hybrid search**: Combine dense (semantic) + sparse (BM25) retrieval
- **Reranking**: Re-score retrieved documents with a cross-encoder
- **Contextual compression**: Extract only relevant portions of retrieved documents

```python
# Advanced RAG pipeline
async def advanced_rag(query: str) -> str:
    # Step 1: Rewrite query for better retrieval
    rewritten = await rewrite_query(query)

    # Step 2: Hybrid retrieval
    dense_docs = retrieve_dense(rewritten, top_k=10)
    sparse_docs = retrieve_bm25(rewritten, top_k=10)
    combined = deduplicate(dense_docs + sparse_docs)

    # Step 3: Rerank
    reranked = cross_encoder_rerank(rewritten, combined, top_k=5)

    # Step 4: Generate
    return await generate_with_context(query, reranked)
```

## Modular RAG

The latest paradigm treats each RAG component as pluggable modules:

```
[Query Transform] → [Retrieval] → [Rerank] → [Fusion] → [Generate]
     ↑ swappable        ↑ swappable    ↑ optional  ↑ optional
```

This enables mixing and matching components for specific use cases.

## RAG vs Finetuning

| Dimension | RAG | Finetuning |
|-----------|-----|-----------|
| Knowledge freshness | Dynamic | Static (until retrained) |
| Cost to update | Low | High |
| Latency | +50-300ms retrieval | Same as base model |
| Citations | Natural | Requires explicit training |
| Hallucination | Reduced | Not eliminated |
| Style/behavior | Unchanged | Can be changed |

## Limitations

- Retrieval quality is the bottleneck — garbage in, garbage out
- Context window limits how many documents can be injected
- Retrieved documents may conflict or be outdated
- Adds latency and infrastructure complexity
- Doesn't help with tasks that require reasoning not in documents

## Key Takeaways

- RAG grounds LLMs in external knowledge without retraining
- Three stages: indexing (offline), retrieval (online), generation (online)
- Advanced RAG adds query rewriting, hybrid search, and reranking
- RAG reduces (but doesn't eliminate) hallucination
- Use RAG for knowledge problems; use finetuning for behavioral problems
