---
title: "Inference-time Scaling"
description: "Trading compute at inference time for better outputs — scaling laws for thinking"
duration_minutes: 14
order: 2
---

## Two Ways to Scale LLMs

**Training-time scaling**: Bigger models, more data, more compute during training.
**Inference-time scaling**: More compute per query at runtime.

The key insight of reasoning models: **inference-time compute is highly efficient**. Spending 10× more tokens on reasoning often yields larger quality gains than training a 10× larger model.

## The Inference Scaling Curve

For hard problems (math, coding), accuracy improves predictably with thinking tokens:

```
Accuracy
  100% ─────────────────────────────────── ceiling
   90% ─────────────────────────────────
   80% ────────────────────────────
   70% ───────────────────────
   60% ──────────────────
   50% ──────────────
   40% ──────────
         1K    2K    4K    8K    16K   32K  tokens
```

The curve flattens at the model's ceiling — you need a better base model to break through.

## Sequential vs Parallel Scaling

### Sequential (Chain-of-Thought)
Think longer in a single chain:
```
Attempt → Revision → Revision → Revision → Final Answer
          (longer = better for complex reasoning)
```

### Parallel (Best-of-N)
Generate multiple independent solutions, pick the best:

```python
async def best_of_n(question: str, n: int = 8, judge=None) -> str:
    """Generate N solutions, return the best one."""
    # Generate N solutions in parallel
    tasks = [generate_solution(question) for _ in range(n)]
    solutions = await asyncio.gather(*tasks)

    if judge:
        # Use a verifier to pick the best
        scores = [judge.score(question, s) for s in solutions]
        return solutions[scores.index(max(scores))]
    else:
        # Majority voting (for problems with discrete answers)
        from collections import Counter
        answers = [extract_answer(s) for s in solutions]
        return Counter(answers).most_common(1)[0][0]
```

### Beam Search
Maintain K promising reasoning paths:
```
Start → [path1, path2, path3, path4]  (K=4 beams)
            ↓        ↓       ↓      ↓
       expand → prune to top K → expand → prune → ...
```

## Budget Forcing

Control the thinking budget to balance cost/quality:

```python
def budget_forced_generation(
    model, prompt: str,
    min_thinking_tokens: int = 1000,
    max_thinking_tokens: int = 10000,
) -> str:
    """Force model to think at least min_tokens before answering."""

    # System instruction to force extended thinking
    augmented_prompt = f"""{prompt}

Think carefully through this step by step. Use at least {min_thinking_tokens} tokens
of reasoning before giving your final answer. Show your work."""

    return model.generate(
        augmented_prompt,
        max_tokens=max_thinking_tokens + 500,  # +500 for final answer
    )
```

## Compute-Optimal Inference

For a fixed inference budget, choose between:
- Fewer tokens per sample, more samples (parallel)
- More tokens per sample, fewer samples (sequential)

```python
def optimal_inference_strategy(
    question: str,
    total_token_budget: int,
    problem_type: str,
) -> str:
    if problem_type == "math":
        # Math benefits from parallel + voting
        n_samples = 8
        tokens_per_sample = total_token_budget // n_samples
        return best_of_n_with_verification(question, n=n_samples)

    elif problem_type == "planning":
        # Planning benefits from long sequential reasoning
        return generate_with_cot(question, max_tokens=total_token_budget)

    else:
        # Default: moderate sequential
        return generate_with_cot(question, max_tokens=total_token_budget // 2)
```

## Cost vs Quality Tradeoffs

| Strategy | Cost | Quality | Best For |
|---------|------|---------|---------|
| Direct (no thinking) | Low | Baseline | Simple tasks |
| Short CoT (1K tokens) | Low+ | +10-20% | Most tasks |
| Long CoT (8K tokens) | Medium | +20-40% | Hard reasoning |
| Best-of-8 + verifier | High | +30-50% | Math, code |
| Beam search | Very high | +40-60% | Competition math |

## Key Takeaways

- Inference-time scaling trades token cost for accuracy on hard problems
- Sequential scaling (longer thinking chains) benefits planning and complex reasoning
- Parallel scaling (best-of-N) benefits problems with verifiable answers
- Budget forcing explicitly controls thinking token count
- For most applications, moderate CoT (1K-4K tokens) is cost-optimal
