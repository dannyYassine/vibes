---
title: "Reward Modeling (ORM, PRM)"
description: "Training learned verifiers to score reasoning quality at the outcome and process level"
duration_minutes: 14
order: 9
---

## From Rule-Based to Learned Verifiers

Rule-based verifiers (unit tests, answer checkers) are ideal but only work for well-defined domains. For broader reasoning tasks, we need **learned reward models** that can evaluate solution quality.

Two paradigms:
- **ORM (Outcome Reward Model)**: scores the final answer
- **PRM (Process Reward Model)**: scores each intermediate reasoning step

## Training an ORM

An ORM is a classifier trained on (question, solution, label) tuples where the label is binary: correct or incorrect.

```python
import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer

class OutcomeRewardModel(nn.Module):
    def __init__(self, base_model_name: str):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(base_model_name)
        self.classifier = nn.Linear(self.encoder.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids, attention_mask=attention_mask)
        # Use [CLS] token representation
        cls_output = outputs.last_hidden_state[:, 0, :]
        return torch.sigmoid(self.classifier(cls_output)).squeeze(-1)


def train_orm(model, dataloader, optimizer, epochs=3):
    """Train ORM with binary cross-entropy."""
    criterion = nn.BCELoss()

    for epoch in range(epochs):
        for batch in dataloader:
            # batch: {"input_ids", "attention_mask", "labels"}
            scores = model(batch["input_ids"], batch["attention_mask"])
            loss = criterion(scores, batch["labels"].float())

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()


# Inference: re-rank N solutions
def orm_rerank(question: str, solutions: list[str], orm, tokenizer) -> str:
    scored = []
    for sol in solutions:
        text = f"Question: {question}\n\nSolution: {sol}"
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=2048)
        with torch.no_grad():
            score = orm(**inputs).item()
        scored.append((score, sol))

    return max(scored, key=lambda x: x[0])[1]
```

## Training a PRM

PRMs require step-level annotations — much more expensive to collect. The model must predict correctness at each step of the reasoning chain.

```python
class ProcessRewardModel(nn.Module):
    def __init__(self, base_model_name: str):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(base_model_name)
        # One output per token position
        self.step_scorer = nn.Linear(self.encoder.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask, step_positions):
        """
        step_positions: list of token indices where each step ends
        Returns: scores for each step
        """
        outputs = self.encoder(input_ids, attention_mask=attention_mask)
        hidden = outputs.last_hidden_state  # (batch, seq_len, hidden)

        step_scores = []
        for pos in step_positions:
            step_hidden = hidden[:, pos, :]
            score = torch.sigmoid(self.step_scorer(step_hidden))
            step_scores.append(score)

        return torch.stack(step_scores, dim=1).squeeze(-1)  # (batch, n_steps)
```

## PRM800K: OpenAI's Dataset

OpenAI's PRM800K contains 800K step-level labels on MATH competition problems:

```python
# Data collection methodology:
# 1. Generate solutions using GPT-4 with step-delimited format
# 2. Human labelers rate each step as: positive (✓), neutral (~), negative (✗)
# 3. Labeling interface shows previous steps for context

# PRM800K format
sample = {
    "problem": "Let $f(x) = x^2 + 1$. Find $f(f(2))$.",
    "solution": [
        {
            "step_text": "First compute f(2) = 2^2 + 1 = 5",
            "human_label": "positive",  # This step is correct
        },
        {
            "step_text": "Now compute f(f(2)) = f(5) = 5^2 + 1 = 26",
            "human_label": "positive",
        },
    ],
    "final_answer": "26",
}

# Training signal: predict human label at each step
# This requires ~$500K+ in annotation costs at scale
```

## Monte Carlo Estimation for PRM Labels

Collecting human step labels is expensive. An alternative: use **Monte Carlo rollouts** to estimate whether a step leads to a correct final answer.

```python
async def estimate_step_value(
    question: str,
    steps_so_far: list[str],
    candidate_step: str,
    model,
    n_rollouts: int = 16,
) -> float:
    """
    Estimate value of taking this step via Monte Carlo rollouts.
    Value = fraction of rollouts that reach the correct final answer.
    """
    correct_count = 0
    state = "\n".join(steps_so_far) + "\n" + candidate_step

    for _ in range(n_rollouts):
        # Complete the solution from this state
        completion = await model.complete(f"""
{question}

Steps so far:
{state}

Continue solving to completion:
""")
        final_answer = extract_answer(completion)
        if is_correct(final_answer, question):
            correct_count += 1

    return correct_count / n_rollouts


# Use MC estimates as PRM training labels
# Avoids expensive human annotation
# Trade-off: noisy estimates vs. exact human judgment
```

## ORM vs PRM: When to Use Each

| Scenario | Recommendation |
|----------|---------------|
| Re-ranking N complete solutions | ORM (simple, cheap) |
| Guiding beam search step by step | PRM (essential) |
| Have verified (q, a) pairs only | ORM |
| Have step-level annotations | PRM |
| Math competition problems | PRM (better accuracy) |
| Open-ended reasoning | ORM (PRM harder to apply) |

## Combined Approach: ORM × PRM

```python
def combined_score(
    question: str,
    steps: list[str],
    orm_score: float,
    prm_step_scores: list[float],
    alpha: float = 0.5,
) -> float:
    """Blend ORM and PRM signals."""
    prm_score = min(prm_step_scores)  # Minimum step score
    return alpha * orm_score + (1 - alpha) * prm_score
```

Research shows PRM outperforms ORM on MATH by ~8-10% when used for beam search guidance.

## Key Takeaways

- ORMs score complete solutions; PRMs score individual reasoning steps
- ORMs are easier to train (just need correct/incorrect labels)
- PRMs require expensive step-level annotations but provide richer guidance
- Monte Carlo rollouts can approximate PRM labels without human annotation
- PRM-guided beam search significantly outperforms ORM reranking on math tasks
