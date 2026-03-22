---
title: "RAFT: Training Technique for RAGs"
description: "Retrieval Augmented Fine-Tuning — training models to reason over retrieved documents"
duration_minutes: 12
order: 9
---

## What is RAFT?

RAFT (Retrieval Augmented Fine-Tuning) is a training technique that teaches models to use retrieved documents effectively by training them on examples that include both oracle (relevant) and distractor (irrelevant) documents.

## The Core Problem

Standard RAG assumes the model already knows how to:
1. Identify which retrieved documents are relevant
2. Ignore noise from irrelevant documents
3. Synthesize information across multiple documents

In practice, LLMs often fail at all three when operating in specialized domains.

## RAFT Training Data

The key innovation is including distractor documents during training:

```python
def generate_raft_example(
    question: str,
    oracle_docs: list[str],   # Documents with the answer
    distractor_docs: list[str],  # Irrelevant documents
    answer: str,
    chain_of_thought: str,
) -> dict:
    """Create one RAFT training example."""

    # Mix oracle and distractor documents
    # The model must identify and use only oracle docs
    all_docs = oracle_docs + distractor_docs
    random.shuffle(all_docs)

    context = "\n\n".join([
        f"Document {i+1}: {doc}"
        for i, doc in enumerate(all_docs)
    ])

    # Training target includes chain-of-thought reasoning
    target = f"""<thinking>
{chain_of_thought}
</thinking>

Based on Document [N], the answer is: {answer}"""

    return {
        "input": f"Context:\n{context}\n\nQuestion: {question}",
        "output": target,
    }
```

## RAFT Training Process

```python
# Step 1: Generate training data from your corpus
def create_raft_dataset(
    documents: list[str],
    llm,
    n_examples: int = 10000,
) -> list[dict]:
    dataset = []

    for _ in range(n_examples):
        # Sample one oracle document
        oracle = random.choice(documents)

        # Generate question from oracle document
        question = llm.generate_question(oracle)
        answer = llm.extract_answer(oracle, question)
        cot = llm.generate_chain_of_thought(oracle, question, answer)

        # Sample distractor documents (don't contain the answer)
        distractors = random.sample(
            [d for d in documents if d != oracle],
            k=random.randint(2, 4),
        )

        example = generate_raft_example(
            question=question,
            oracle_docs=[oracle],
            distractor_docs=distractors,
            answer=answer,
            chain_of_thought=cot,
        )
        dataset.append(example)

    return dataset

# Step 2: Fine-tune on RAFT data
trainer = SFTTrainer(
    model=base_model,
    train_dataset=raft_dataset,
    peft_config=lora_config,
    max_seq_length=4096,
)
trainer.train()
```

## RAFT vs Standard RAG

| Aspect | Standard RAG | RAFT |
|--------|-------------|------|
| Setup | No training | Requires finetuning |
| Distractor handling | Poor | Excellent |
| Domain adaptation | None | Strong |
| Chain-of-thought | Not guaranteed | Trained behavior |
| Generalization | Good | Domain-specific |

## When to Use RAFT

RAFT is worth the training investment when:
- Your documents have a very specific domain (legal, medical, technical)
- Distractor noise is high (many semantically similar but non-answer documents)
- Chain-of-thought reasoning over documents is required
- You have 5,000+ labeled question-answer-context examples

## Key Takeaways

- RAFT trains models to identify oracle documents among distractors
- Training data includes both relevant and irrelevant documents in context
- Chain-of-thought targets teach the model to reason before answering
- RAFT significantly improves performance in narrow, specialized domains
- The investment is only worthwhile when you have sufficient labeled data and domain-specific needs
