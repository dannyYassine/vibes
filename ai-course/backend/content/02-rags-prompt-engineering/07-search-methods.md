---
title: "Generation: Search Methods"
description: "Semantic search, hybrid search, reranking, and query optimization techniques"
duration_minutes: 15
order: 7
---

## Semantic Search

Semantic search finds documents based on meaning rather than keywords. It uses the cosine similarity between query and document embeddings:

```python
import numpy as np

def cosine_similarity(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def semantic_search(query: str, collection, top_k=5) -> list[str]:
    query_embedding = embed(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )
    return results['documents'][0]
```

**Strengths**: Finds semantically related content even without keyword overlap
**Weaknesses**: May miss exact technical terms, acronyms, product names

## Hybrid Search with Reciprocal Rank Fusion

Combine dense and sparse retrieval, then merge rankings:

```python
def reciprocal_rank_fusion(
    dense_results: list[str],
    sparse_results: list[str],
    k: int = 60,
) -> list[str]:
    """Merge two ranked lists using RRF."""
    scores = {}

    for rank, doc in enumerate(dense_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)

    for rank, doc in enumerate(sparse_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)

    return sorted(scores, key=scores.get, reverse=True)

async def hybrid_search(query: str, top_k=5) -> list[str]:
    dense_docs = semantic_search(query, top_k=10)
    sparse_docs = bm25_search(query, top_k=10)
    merged = reciprocal_rank_fusion(dense_docs, sparse_docs)
    return merged[:top_k]
```

## Cross-Encoder Reranking

A two-stage approach: retrieve broadly, then rerank with a more accurate cross-encoder:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank(query: str, documents: list[str], top_k=5) -> list[str]:
    # Create (query, document) pairs
    pairs = [[query, doc] for doc in documents]

    # Score each pair
    scores = reranker.predict(pairs)

    # Sort by score, return top_k
    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:top_k]]

# Full pipeline: retrieve 20, rerank to 5
async def search_and_rerank(query: str) -> list[str]:
    candidates = await hybrid_search(query, top_k=20)
    return rerank(query, candidates, top_k=5)
```

## HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer first, embed that, then search:

```python
async def hyde_search(query: str) -> list[str]:
    # Step 1: Generate a hypothetical answer
    hyp_answer = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"Write a short paragraph that would answer: {query}"
        }],
        max_tokens=200,
    )
    hypothetical_doc = hyp_answer.choices[0].message.content

    # Step 2: Embed the hypothetical document
    hyp_embedding = embed(hypothetical_doc)

    # Step 3: Search with hypothetical embedding
    return collection.query(query_embeddings=[hyp_embedding], n_results=5)
```

**When to use**: Complex questions where the query is short but the relevant document is long.

## Query Rewriting

Improve retrieval by rewriting the query for better search:

```python
async def rewrite_query(query: str) -> list[str]:
    """Generate multiple query variants for better coverage."""
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Generate 3 different search queries to find documents
relevant to: "{query}"

Return as JSON array of strings."""
        }],
    )
    variants = json.loads(response.choices[0].message.content)

    # Retrieve for each variant, merge results
    all_results = []
    for variant in variants:
        results = semantic_search(variant, top_k=5)
        all_results.extend(results)

    return deduplicate(all_results)[:5]
```

## Retrieval Pipeline Comparison

| Strategy | Recall | Precision | Speed | Complexity |
|---------|--------|-----------|-------|-----------|
| Dense only | Good | Medium | Fast | Low |
| Sparse only | Good (keywords) | High (exact) | Fast | Low |
| Hybrid (RRF) | Excellent | Good | Medium | Medium |
| Hybrid + Rerank | Excellent | Excellent | Slower | High |
| HyDE | Good | Variable | Slower | Medium |

## Key Takeaways

- Semantic search captures meaning but misses exact terms — use hybrid search in production
- RRF is the standard method for merging dense and sparse results
- Cross-encoder reranking significantly improves precision with ~50ms added latency
- HyDE helps when queries are very short or lack keywords from relevant documents
- Start with hybrid search; add reranking when precision matters more than latency
