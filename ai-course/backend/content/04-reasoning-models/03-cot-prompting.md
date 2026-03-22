---
title: "CoT Prompting and Self-Consistency"
description: "Chain-of-thought prompting techniques and self-consistency decoding"
duration_minutes: 15
order: 3
---

## Chain-of-Thought Prompting

Chain-of-thought (CoT) prompting, introduced by Wei et al. (2022), shows that simply asking the model to show its reasoning dramatically improves accuracy on complex tasks.

## Zero-Shot CoT

The simplest approach: append "Let's think step by step."

```python
# Without CoT
prompt = "Roger has 5 tennis balls. He buys 2 more cans of 3 balls each. How many does he have?"
# Model: "11" — might be correct, often wrong

# With zero-shot CoT
prompt = """Roger has 5 tennis balls. He buys 2 more cans of 3 balls each.
How many does he have?

Let's think step by step."""
# Model: "Roger starts with 5 balls.
#         He buys 2 cans × 3 balls = 6 new balls.
#         5 + 6 = 11 balls.
#         Answer: 11"
```

Zero-shot CoT reliably improves performance on arithmetic, symbolic reasoning, and planning — essentially for free.

## Few-Shot CoT

Provide worked examples to establish the reasoning format:

```python
few_shot_cot_prompt = """Solve the following math problems step by step.

Q: A store has 15 apples. 7 are sold. Then 4 more arrive. How many?
A: Start: 15 apples. After selling: 15 - 7 = 8. After restocking: 8 + 4 = 12. Answer: 12.

Q: Sarah has $20. She spends $7 on lunch and $5 on coffee. How much is left?
A: Start: $20. After lunch: 20 - 7 = $13. After coffee: 13 - 5 = $8. Answer: $8.

Q: A train travels 60 mph for 2 hours, then 80 mph for 1 hour. Total distance?
A: """
```

Few-shot CoT provides:
- Format guidance (how to structure the reasoning)
- Domain calibration (what level of detail to show)
- Implicit persona (systematic, step-by-step reasoner)

## Self-Consistency

A powerful extension of CoT: sample multiple reasoning paths and take the majority vote.

```python
import asyncio
from collections import Counter

async def self_consistency(
    question: str,
    n_samples: int = 10,
    temperature: float = 0.7,
) -> str:
    """Generate multiple CoT paths, take majority vote."""

    prompt = f"{question}\n\nLet's think step by step."

    # Generate n_samples in parallel
    tasks = [
        openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        for _ in range(n_samples)
    ]
    responses = await asyncio.gather(*tasks)

    # Extract final answers
    answers = [extract_final_answer(r.choices[0].message.content)
               for r in responses]

    # Majority vote
    vote_counts = Counter(answers)
    majority_answer = vote_counts.most_common(1)[0][0]
    confidence = vote_counts[majority_answer] / n_samples

    return majority_answer, confidence

def extract_final_answer(text: str) -> str:
    """Extract the final numeric/symbolic answer from CoT text."""
    # Look for "Answer: X" pattern
    import re
    match = re.search(r'[Aa]nswer:\s*(.+?)(?:\.|$)', text)
    if match:
        return match.group(1).strip()
    # Fallback: last number in text
    numbers = re.findall(r'\d+(?:\.\d+)?', text)
    return numbers[-1] if numbers else text.split()[-1]
```

Self-consistency improves accuracy by 5-20% on math benchmarks at the cost of N× inference.

## CoT for Code

CoT is equally powerful for code generation:

```python
code_cot_prompt = """Write a Python function to check if a string is a palindrome.

First, let me think about the approach:
1. We need to compare the string to its reverse
2. We should handle case-insensitivity
3. We should ignore non-alphanumeric characters (spaces, punctuation)

Now implement:"""

# Produces more thoughtful, correct code than direct prompting
```

## Prompt Chaining vs CoT

| Approach | Use Case |
|---------|---------|
| Zero-shot CoT | Quick improvement, no examples needed |
| Few-shot CoT | Complex tasks needing format guidance |
| Self-consistency | High-stakes answers, math, logic |
| Prompt chaining | Multi-step tasks with different prompts per step |

## Common CoT Failure Modes

1. **Overthinking**: Model reasons in circles and contradicts itself
2. **Wrong intermediate steps**: One bad step corrupts all following steps
3. **Confident errors**: Model states wrong reasoning with high confidence

Mitigation: Use self-consistency (5-10 samples) for high-stakes tasks.

## Key Takeaways

- "Let's think step by step" is free and reliably improves accuracy on reasoning tasks
- Few-shot CoT provides format and style guidance for specialized reasoning
- Self-consistency samples multiple paths and takes majority vote — best for math/logic
- CoT doesn't help (and can hurt) on simple factual lookup tasks
- Temperature 0.5-0.8 for self-consistency sampling; lower temperature for single CoT
