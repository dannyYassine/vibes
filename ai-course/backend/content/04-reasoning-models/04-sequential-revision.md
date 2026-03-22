---
title: "Sequential Revision"
description: "Iterative self-correction and refinement loops for reasoning tasks"
duration_minutes: 12
order: 4
---

## The Revision Pattern

Instead of generating one answer, generate a draft, critique it, then revise:

```
Draft → Critique → Revision → Critique → Revision → Final Answer
```

This mirrors how humans approach hard problems: write a solution, find its flaws, improve it.

## Basic Critique-Revision Loop

```python
async def critique_and_revise(
    question: str,
    max_iterations: int = 3,
) -> str:
    # Step 1: Initial draft
    draft = await llm.complete(f"{question}\n\nProvide an initial answer:")

    for i in range(max_iterations):
        # Step 2: Critique
        critique = await llm.complete(f"""Question: {question}
Current answer: {draft}

Critique this answer. Identify:
1. Any logical errors
2. Missing cases or edge cases
3. Areas that could be more precise

If the answer is correct and complete, say "ANSWER IS CORRECT".""")

        if "ANSWER IS CORRECT" in critique:
            break

        # Step 3: Revision
        draft = await llm.complete(f"""Question: {question}
Previous answer: {draft}
Critique: {critique}

Provide an improved answer addressing the critique:""")

    return draft
```

## Self-Refine

The Self-Refine paper (Madaan et al., 2023) formalizes this pattern with task-specific feedback:

```python
async def self_refine(
    task: str,
    output_generator,
    feedback_generator,
    refinement_generator,
    max_steps: int = 3,
    stop_condition=None,
) -> str:
    output = await output_generator(task)

    for _ in range(max_steps):
        feedback = await feedback_generator(task, output)

        if stop_condition and stop_condition(feedback):
            break

        output = await refinement_generator(task, output, feedback)

    return output

# Code quality example
code_task = "Write a Python function to find all prime numbers up to N"
output = await self_refine(
    task=code_task,
    output_generator=lambda t: generate_code(t),
    feedback_generator=lambda t, o: critique_code(t, o),
    refinement_generator=lambda t, o, f: refine_code(t, o, f),
)
```

## When Sequential Revision Helps

**Works well for:**
- Code generation (can test intermediate outputs)
- Essay/document writing (structure and clarity)
- Mathematical proofs (logical validity)
- Plans and strategies (completeness and coherence)

**Doesn't help much for:**
- Factual recall (model can't correct what it doesn't know)
- Creative generation (critique undermines variety)
- Simple Q&A (overhead not worth it)

## The Self-Correction Problem

A critical finding: **LLMs often can't reliably self-correct without external feedback**. When given a wrong answer and asked to "check it," they frequently reaffirm the error.

```python
# This often DOESN'T work as expected:
response = "The capital of Australia is Sydney."  # Wrong!

check = await llm.complete(f"""Is this correct? "{response}"
If wrong, provide the correct answer.""")
# Model often says: "Yes, that's correct." (wrong!)

# External verification helps:
verified = search_web("capital of Australia")  # → Canberra
correction = await llm.complete(f"""The web says: {verified}
Original claim: {response}
Is the original correct? If not, what's the correct answer?""")
# Now the model can properly correct using external ground truth
```

## Key Takeaways

- Sequential revision improves quality for complex tasks by catching errors iteratively
- Works best when an external verifier (tests, search, human feedback) can validate steps
- Pure self-correction (without external feedback) is unreliable — models affirm their own errors
- 2-3 revision cycles typically provide most of the benefit; more cycles have diminishing returns
