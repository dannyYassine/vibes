---
title: "RAG Evaluation"
description: "Metrics and frameworks for evaluating retrieval and generation quality in RAG systems"
duration_minutes: 15
order: 10
---

## Why RAG Evaluation is Hard

A RAG system can fail at two distinct stages: retrieval (finding the wrong documents) or generation (misusing correct documents). Evaluating both independently is critical for debugging.

## The Four Core RAG Metrics

### 1. Context Precision
Are the retrieved documents actually relevant?

```python
def context_precision(retrieved_docs: list[str], ground_truth: str, llm) -> float:
    """Fraction of retrieved docs that are relevant to the question."""
    relevant = 0
    for doc in retrieved_docs:
        prompt = f"""Is this document relevant to answering: "{ground_truth}"?
Document: {doc}
Answer YES or NO."""
        result = llm.complete(prompt)
        if "YES" in result:
            relevant += 1
    return relevant / len(retrieved_docs)
```

### 2. Context Recall
Were all the documents needed to answer the question retrieved?

```python
def context_recall(retrieved_docs: list[str], ground_truth_answer: str, llm) -> float:
    """What fraction of the answer can be attributed to retrieved docs?"""
    context = "\n".join(retrieved_docs)
    prompt = f"""Given this context, what fraction (0.0-1.0) of the following answer
is supported by the context? Return only a number.

Context: {context}
Answer: {ground_truth_answer}"""
    return float(llm.complete(prompt))
```

### 3. Faithfulness
Does the generated answer stick to what was in the retrieved documents?

```python
def faithfulness(answer: str, retrieved_docs: list[str], llm) -> float:
    """Fraction of answer claims supported by context."""
    context = "\n".join(retrieved_docs)
    prompt = f"""Break this answer into individual claims, then check each against
the context. Return the fraction (0-1) of claims supported.

Context: {context}
Answer: {answer}"""
    return float(llm.complete(prompt))
```

### 4. Answer Relevance
Does the answer actually address the question?

```python
def answer_relevance(question: str, answer: str, llm) -> float:
    """Score from 0-1: how well does the answer address the question?"""
    prompt = f"""Rate from 0.0 to 1.0 how well this answer addresses the question.
1.0 = perfectly addresses all aspects
0.0 = completely off-topic

Question: {question}
Answer: {answer}

Return only a number."""
    return float(llm.complete(prompt))
```

## RAGAS Framework

RAGAS automates all four metrics:

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Prepare evaluation dataset
data = {
    "question": ["What is RAG?", "How does HNSW work?"],
    "answer": ["RAG is...", "HNSW is..."],
    "contexts": [["retrieved doc 1", "retrieved doc 2"], ["doc a", "doc b"]],
    "ground_truth": ["RAG stands for...", "HNSW stands for..."],
}
dataset = Dataset.from_dict(data)

result = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)
print(result)
# {'faithfulness': 0.85, 'answer_relevancy': 0.92, ...}
```

## End-to-End Evaluation

For production systems, measure the full pipeline:

```python
def evaluate_rag_pipeline(test_cases: list[dict], pipeline) -> dict:
    results = []
    for case in test_cases:
        retrieved = pipeline.retrieve(case["question"])
        answer = pipeline.generate(case["question"], retrieved)
        results.append({
            "question": case["question"],
            "expected": case["answer"],
            "actual": answer,
            "retrieved_count": len(retrieved),
            "correct": judge_correctness(answer, case["answer"]),
        })

    return {
        "accuracy": sum(r["correct"] for r in results) / len(results),
        "avg_retrieval": sum(r["retrieved_count"] for r in results) / len(results),
    }
```

## Key Takeaways

- RAG has two failure modes: bad retrieval and bad generation — evaluate both
- RAGAS provides automated metrics for the four core dimensions
- Context precision and recall diagnose retrieval quality
- Faithfulness and answer relevance diagnose generation quality
- Create a golden evaluation dataset of 50-200 Q&A pairs for your domain
