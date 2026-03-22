---
title: "Self-Refinement and Meta-CoT"
description: "Teaching models to improve their own reasoning through self-evaluation and meta-level chain-of-thought"
duration_minutes: 12
order: 10
---

## Beyond Single-Pass Reasoning

Standard chain-of-thought generates one reasoning trace. Self-refinement adds a loop: the model evaluates its own output and improves it, potentially multiple times.

This differs from sequential revision (lesson 04) in two ways:
1. The refinement is guided by the *reasoning trace itself*, not just the final answer
2. Meta-CoT teaches the model to reason *about its reasoning*

## Self-Refinement Architecture

```python
async def self_refine_reasoning(
    question: str,
    model,
    max_iterations: int = 3,
) -> dict:
    """
    Self-refinement loop for reasoning tasks.
    Returns the final solution and refinement history.
    """
    history = []

    # Initial solution
    solution = await model.complete(f"""
{question}

Think step by step and provide your solution:
""")
    history.append({"type": "initial", "content": solution})

    for i in range(max_iterations):
        # Self-evaluation
        critique = await model.complete(f"""
Question: {question}

Previous solution:
{solution}

Carefully review this solution:
1. Is each step logically valid?
2. Are there any calculation errors?
3. Are any cases missed?
4. Is the conclusion correctly drawn from the steps?

If the solution is correct, output "SOLUTION IS CORRECT".
Otherwise, identify the specific errors:
""")
        history.append({"type": "critique", "content": critique})

        if "SOLUTION IS CORRECT" in critique:
            break

        # Refinement
        solution = await model.complete(f"""
Question: {question}

Previous solution:
{solution}

Identified issues:
{critique}

Provide a corrected solution that addresses these issues:
""")
        history.append({"type": "refinement", "iteration": i+1, "content": solution})

    return {"solution": solution, "history": history}
```

## Meta-CoT: Reasoning About Reasoning

Meta-CoT teaches the model to explicitly plan its reasoning strategy before diving in:

```python
METACOT_PROMPT = """
Before solving, think about:
1. What type of problem is this? (algebraic, combinatorial, geometric...)
2. What approach is most promising?
3. What common mistakes should I avoid?
4. How will I verify my answer?

Then solve step by step.
"""

async def meta_cot(question: str, model) -> str:
    full_prompt = f"{question}\n\n{METACOT_PROMPT}"
    return await model.complete(full_prompt)


# Example output structure:
example_meta_cot = """
**Problem type**: Combinatorics (counting with constraints)
**Approach**: Use complementary counting — total arrangements minus invalid ones
**Common mistakes**: Forgetting to divide by repeated elements, off-by-one on constraints
**Verification**: Check with small cases first

**Solution**:
Total arrangements of 5 letters: 5! = 120
Subtract invalid (vowels adjacent): treat "ae" as unit → 4! × 2 = 48
Valid arrangements: 120 - 48 = 72
"""
```

## Reflection Prompting

A practical technique: ask the model to explicitly check its work before finalizing:

```python
REFLECTION_TEMPLATE = """
{question}

Think through this carefully:

<thinking>
{initial_reasoning}
</thinking>

Wait — let me double-check my reasoning.

<reflection>
- Step 1 check: [verify first step]
- Step 2 check: [verify second step]
- Does the conclusion follow? [yes/no + explanation]
- Edge cases considered? [list any]
</reflection>

Final answer: {conclusion}
"""

async def reflect_and_answer(question: str, model) -> str:
    # Two-pass approach
    initial = await model.complete(
        f"{question}\n\nThink through this carefully:"
    )

    reflected = await model.complete(f"""
{question}

My initial reasoning was:
{initial}

Now let me critically review each step and correct any errors:
""")

    return reflected
```

## Limitations of Self-Refinement

Research (Huang et al., 2023) shows critical limitations:

```python
# The self-correction problem:
# LLMs cannot reliably identify their own errors without external feedback

# Scenario 1: Correct → Refinement → WORSE (6% of cases)
# The model "corrects" something that was right

# Scenario 2: Wrong → Refinement → Still Wrong (40% of cases)
# The model confidently reaffirms wrong answers

# Scenario 3: Wrong → Refinement → Correct (54% of cases, with good prompting)

# Self-refinement works best when:
# 1. The error is a formatting/structural issue (not factual)
# 2. There's external feedback (test results, search results)
# 3. The problem has clear, verifiable structure (math > open-ended)

class RobustSelfRefine:
    """Self-refinement with external verification."""

    def __init__(self, verifier):
        self.verifier = verifier

    async def refine(self, question: str, model, max_iter=3) -> str:
        solution = await model.complete(question)

        for _ in range(max_iter):
            # External verification (not self-evaluation)
            verdict = await self.verifier.check(question, solution)

            if verdict.is_correct:
                break

            # Use external feedback, not just self-critique
            solution = await model.complete(f"""
{question}

Previous attempt: {solution}
External feedback: {verdict.feedback}

Revise your solution:
""")

        return solution
```

## When to Use Self-Refinement

| Task Type | Self-Refinement Effective? |
|-----------|---------------------------|
| Math with verifiable answer | ✅ Yes (check each step) |
| Code with test cases | ✅ Yes (run tests as feedback) |
| Open factual questions | ❌ No (model can't self-verify facts) |
| Creative writing | Marginal (taste is subjective) |
| Formal proofs | ✅ Yes (logical structure verifiable) |

## Key Takeaways

- Self-refinement adds evaluation and correction loops to single-pass reasoning
- Meta-CoT makes the model plan its reasoning strategy before solving
- Reflection prompting embeds a verification step within the same prompt
- Pure self-correction (without external feedback) is unreliable — models often confirm their own errors
- External verification (unit tests, search, symbolic checkers) makes self-refinement reliable
