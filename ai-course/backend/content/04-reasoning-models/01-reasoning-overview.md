---
title: "Reasoning and Thinking LLMs"
description: "Overview of reasoning models: o1, DeepSeek-R1, and the thinking paradigm"
duration_minutes: 14
order: 1
---

## The Problem with Direct Answering

Standard LLMs answer questions in a single forward pass. For simple questions this works well. For complex problems — multi-step math, planning, logical deduction — this is like asking a human to solve a hard puzzle without allowing any scratchpad work.

**Reasoning models** solve this by generating a long internal "thinking" process before producing the final answer.

## System 1 vs System 2 Thinking

Psychologist Daniel Kahneman's framework maps directly onto LLMs:

| | System 1 | System 2 |
|--|---------|---------|
| Speed | Fast | Slow |
| Effort | Automatic | Deliberate |
| Accuracy | Good for easy tasks | Good for hard tasks |
| LLM analog | Direct generation | Chain-of-thought |

Standard LLMs are System 1. Reasoning models are System 2 — they trade speed for accuracy on hard problems.

## OpenAI o1 and o3

OpenAI's o1 (2024) was the first widely-deployed reasoning model:

- Generates thousands of "thinking tokens" internally before answering
- Thinking tokens are hidden from users (only the final answer is shown)
- Trained with RL to develop reasoning strategies
- Dramatically outperforms GPT-4o on math and coding competitions

```python
# Using o1 via API
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="o1",  # or "o3-mini" for faster/cheaper
    messages=[{"role": "user", "content": "Solve: If x² + 5x + 6 = 0, find x"}],
    # No temperature, no system prompt for o1
)
# o1 thinks internally, returns the reasoned answer
```

## DeepSeek-R1

DeepSeek-R1 (2025) demonstrated that pure RL on verifiable tasks produces powerful reasoning:

- Trained starting from a base model using GRPO (Group Relative Policy Optimization)
- No supervised reasoning data needed — emerges from RL
- "Aha moment": the model spontaneously develops reflection and error correction
- Open-weights model that approaches o1 performance

Key insight: **reasoning ability emerges from RL with verifiable rewards** (math, code) — you don't need human-labeled reasoning traces.

## Thinking Tokens

Reasoning models generate a hidden chain-of-thought before their final response:

```
User: What is 17 × 23?

[Internal thinking, not shown to user]:
Let me compute this step by step.
17 × 23 = 17 × 20 + 17 × 3
= 340 + 51
= 391
Wait, let me verify: 20 × 23 = 460, minus 3 × 23 = 69, so 391. ✓

[Final response shown to user]:
17 × 23 = 391
```

The thinking budget (number of internal tokens) can often be controlled:
```python
response = client.chat.completions.create(
    model="o3-mini",
    messages=[...],
    reasoning_effort="high",  # low, medium, high
)
```

## When to Use Reasoning Models

| Task | Standard LLM | Reasoning Model |
|------|-------------|----------------|
| Simple Q&A | ✓ Faster, cheaper | Overkill |
| Code generation | ✓ Good enough | Better for complex algorithms |
| Math problems | Poor | ✓ Much better |
| Multi-step planning | Poor | ✓ Much better |
| Creative writing | ✓ | Not beneficial |

## Key Takeaways

- Reasoning models spend more tokens thinking before answering, trading speed for accuracy
- OpenAI o1/o3 and DeepSeek-R1 are the leading reasoning models as of 2025
- DeepSeek-R1 shows reasoning can emerge from pure RL on verifiable tasks
- Use reasoning models for math, logic, planning — not for simple generation tasks
- The thinking budget (number of tokens to reason) can often be adjusted
