---
title: "Overview of Adaptation Techniques"
description: "Survey of methods to specialize LLMs: finetuning, RAG, and prompt engineering"
duration_minutes: 12
order: 1
---

## Why Adaptation Matters

General-purpose LLMs are powerful but lack domain-specific knowledge and behavioral constraints your application needs. Adaptation closes this gap through three primary approaches.

## The Three Approaches

### Prompt Engineering
Shape model behavior through input alone — no training, no infrastructure changes.
- **Cost**: Near zero (only token costs)
- **When to use**: Always try first; solves 70-80% of problems

### Retrieval-Augmented Generation (RAG)
Connect the model to an external knowledge base at query time.
- **Cost**: Medium — vector DB, embedding pipeline
- **When to use**: Private/frequently-updated knowledge, citations needed

### Finetuning
Update model weights on task-specific data.
- **Cost**: High — labeled data, compute, deployment
- **When to use**: Style/format consistency, domain jargon, reduce prompt length

## Decision Framework

```
Need knowledge not in training data?
├── YES → Is knowledge dynamic?
│         ├── YES → RAG
│         └── NO  → Finetuning or RAG
└── NO  → Try prompt engineering first
```

| Signal | Approach |
|--------|---------|
| Private/proprietary knowledge | RAG |
| Frequently updated knowledge | RAG |
| Need source citations | RAG |
| Strict output format | Finetuning |
| High token costs from long prompts | Finetuning |
| Specialized reasoning pattern | Finetuning |

## Combining Approaches

Production systems often layer all three:

```python
def answer_query(user_query: str) -> str:
    # Layer 1: Prompt engineering — instructions baked in
    system_prompt = build_system_prompt()

    # Layer 2: RAG — retrieve relevant context
    documents = retrieve_relevant_docs(user_query, top_k=5)
    context = format_context(documents)

    # Layer 3: Finetuned model — specialized behavior
    return finetuned_model.chat(
        system=system_prompt,
        user=f"Context:\n{context}\n\nQuestion: {user_query}"
    )
```

## Key Takeaways

- Always start with prompt engineering — zero cost, fastest iteration
- RAG is the default for knowledge-grounding problems
- Finetuning is for behavioral changes, not knowledge injection
- Evaluate first, adapt second — measure before building
