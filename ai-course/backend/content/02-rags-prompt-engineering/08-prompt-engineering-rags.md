---
title: "Prompt Engineering for RAGs"
description: "Crafting effective prompts that use retrieved context efficiently"
duration_minutes: 14
order: 8
---

## The RAG Prompt Challenge

Injecting retrieved documents into a prompt isn't just concatenation — poorly structured prompts lead to context-ignoring, hallucination, or incomplete answers.

## Context Injection Patterns

### Basic Context Injection

```python
def build_rag_prompt(query: str, documents: list[str]) -> list[dict]:
    context = "\n\n---\n\n".join([
        f"[Document {i+1}]\n{doc}"
        for i, doc in enumerate(documents)
    ])

    return [
        {
            "role": "system",
            "content": """You are a helpful assistant. Answer questions based on the provided context.
If the answer isn't in the context, say "I don't have enough information to answer that."
Do not make up information."""
        },
        {
            "role": "user",
            "content": f"""Context:
{context}

Question: {query}

Answer:"""
        }
    ]
```

### Citation Prompting

Force the model to cite its sources:

```python
def build_citation_prompt(query: str, documents: list[dict]) -> list[dict]:
    context = "\n\n".join([
        f"[SOURCE {i+1}: {doc['metadata']['source']}]\n{doc['content']}"
        for i, doc in enumerate(documents)
    ])

    return [
        {
            "role": "system",
            "content": """Answer based on the sources provided.
Always cite sources using [SOURCE N] notation.
Only cite sources that directly support your claims."""
        },
        {
            "role": "user",
            "content": f"{context}\n\nQuestion: {query}"
        }
    ]
```

## The Lost-in-the-Middle Problem

Research shows LLMs perform worst on information in the middle of long contexts — they attend better to the beginning and end.

```python
def order_documents_for_attention(documents: list[str]) -> list[str]:
    """Place most relevant documents at start and end, less relevant in middle."""
    if len(documents) <= 2:
        return documents

    # Most relevant first and last, others in middle
    # Assumes documents are already sorted by relevance
    ordered = []
    ordered.append(documents[0])       # Most relevant: start
    ordered.extend(documents[2:])      # Less relevant: middle
    ordered.append(documents[1])       # Second most relevant: end

    return ordered
```

## Grounded Generation Prompt

Explicitly constrain the model to the context:

```python
GROUNDED_SYSTEM = """You are a precise assistant that only answers based on provided context.

Rules:
1. Only use information from the provided context
2. If the context doesn't contain the answer, say exactly: "The provided documents don't contain information about this."
3. Quote relevant passages when they directly answer the question
4. Do not extrapolate beyond what the context states"""
```

## Handling Conflicting Sources

When retrieved documents contradict each other:

```python
CONFLICT_AWARE_SYSTEM = """You are analyzing multiple documents that may contain conflicting information.

When sources conflict:
1. Present both perspectives with their sources
2. Note the conflict explicitly: "Sources disagree on this point..."
3. Do not arbitrarily pick one over the other
4. Suggest how the user might resolve the conflict"""
```

## Structured RAG Output

For applications that need structured responses:

```python
from pydantic import BaseModel

class RAGResponse(BaseModel):
    answer: str
    confidence: float  # 0-1
    sources_used: list[int]  # Document indices cited
    knowledge_gaps: list[str]  # Questions the context couldn't answer

STRUCTURED_SYSTEM = """Answer the question based on the context.
Return a JSON with fields: answer, confidence (0-1), sources_used (list of doc indices),
knowledge_gaps (list of aspects the context couldn't address)."""
```

## Context Length Management

Dynamically manage context within token limits:

```python
def fit_context_to_window(
    documents: list[str],
    query: str,
    system_prompt: str,
    max_tokens: int = 16000,
    model: str = "gpt-4o-mini",
) -> list[str]:
    """Trim documents to fit within context window."""
    import tiktoken
    enc = tiktoken.encoding_for_model(model)

    # Reserve tokens for query, system, and response
    overhead = len(enc.encode(system_prompt + query)) + 2000
    available = max_tokens - overhead

    selected = []
    used = 0
    for doc in documents:
        doc_tokens = len(enc.encode(doc))
        if used + doc_tokens > available:
            break
        selected.append(doc)
        used += doc_tokens

    return selected
```

## Key Takeaways

- Structure context with clear document separators and source labels
- Place most relevant documents at start and end (lost-in-the-middle mitigation)
- Always include an explicit "I don't know" instruction to prevent hallucination
- Citation prompting enables source attribution for trust and verification
- Manage context length explicitly — don't just concatenate all retrieved docs
