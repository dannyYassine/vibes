---
title: "SFT on Reasoning Data (STaR)"
description: "Bootstrapping reasoning capabilities using Self-Taught Reasoner and synthetic chain-of-thought data"
duration_minutes: 13
order: 7
---

## The Data Problem for Reasoning

Training a model to reason requires labeled reasoning traces — step-by-step solutions showing *how* to arrive at an answer, not just the final answer. But human-labeled chains of thought are expensive to produce at scale.

**STaR (Self-Taught Reasoner)** (Zeiler et al., 2022) solves this with a bootstrap loop: use the model itself to generate training data.

## The STaR Algorithm

```
1. Start with a base model M and a dataset of (question, answer) pairs
2. For each question:
   a. Try to generate a chain-of-thought → final answer
   b. If the final answer is correct: keep this (question, CoT, answer) as training data
   c. If wrong: provide the correct answer as a hint, ask model to rationalize backwards
3. Fine-tune M on the collected (question, CoT, answer) examples
4. Repeat from step 1 with the improved model
```

This is essentially **EM (Expectation-Maximization)** for reasoning data.

```python
async def star_iteration(
    model,
    dataset: list[dict],  # [{"question": ..., "answer": ...}]
    max_hint_attempts: int = 3,
) -> list[dict]:
    """One iteration of STaR: generate reasoning traces for training."""
    training_data = []

    for example in dataset:
        question = example["question"]
        correct_answer = example["answer"]

        # Step 1: Try without hints
        response = await model.complete(
            f"{question}\n\nLet's think step by step:"
        )
        predicted = extract_answer(response)

        if is_correct(predicted, correct_answer):
            training_data.append({
                "question": question,
                "reasoning": response,
                "answer": correct_answer,
            })
            continue

        # Step 2: Rationalization with hint
        rationalization = await model.complete(f"""
{question}

The correct answer is: {correct_answer}

Now provide a step-by-step reasoning that arrives at this answer:
""")
        # Only keep if the rationalization is coherent
        if is_coherent(rationalization, correct_answer):
            training_data.append({
                "question": question,
                "reasoning": rationalization,
                "answer": correct_answer,
                "was_rationalized": True,
            })

    return training_data


async def star_training_loop(
    base_model,
    dataset: list[dict],
    n_iterations: int = 5,
) -> list[dict]:
    """Full STaR: iteratively generate data and fine-tune."""
    model = base_model
    all_training_data = []

    for iteration in range(n_iterations):
        # Generate reasoning traces
        new_data = await star_iteration(model, dataset)
        all_training_data.extend(new_data)

        print(f"Iteration {iteration+1}: {len(new_data)} training examples")

        # Fine-tune model on collected data
        model = fine_tune(model, all_training_data)

    return all_training_data
```

## Why Rationalization Works

The key insight: even when the model can't *discover* the right reasoning path, it can often *reconstruct* a valid reasoning path given the answer. These reconstructed traces still teach the model useful reasoning patterns.

This is analogous to **worked examples** in education: seeing solved problems helps students learn problem-solving strategies even if they couldn't solve them independently.

## Rejection Sampling Fine-Tuning (RFT)

A simpler variant: generate many solutions per problem, keep only correct ones, fine-tune on those.

```python
async def rejection_sampling_finetune(
    model,
    dataset: list[dict],
    n_samples: int = 10,
) -> list[dict]:
    """Generate N solutions per problem, keep correct ones."""
    training_data = []

    for example in dataset:
        question = example["question"]
        correct = example["answer"]

        # Sample N solutions
        solutions = await asyncio.gather(*[
            model.complete(f"{question}\n\nSolve step by step:")
            for _ in range(n_samples)
        ])

        # Keep correct solutions
        correct_solutions = [
            s for s in solutions
            if is_correct(extract_answer(s), correct)
        ]

        for sol in correct_solutions:
            training_data.append({
                "question": question,
                "solution": sol,
            })

    return training_data
```

RFT is simpler than STaR but requires problems where you can automatically verify correctness.

## Distillation from Stronger Models

Another approach: generate reasoning traces using a stronger teacher model (e.g., GPT-4 or Claude Opus), then fine-tune a smaller student on those traces.

```python
async def distill_reasoning(
    teacher_model,
    student_model,
    dataset: list[dict],
) -> None:
    """Distill reasoning from teacher to student."""
    training_data = []

    for example in dataset:
        # Teacher generates high-quality reasoning trace
        trace = await teacher_model.complete(f"""
{example["question"]}

Provide a detailed, step-by-step solution:
""")
        training_data.append({
            "question": example["question"],
            "reasoning": trace,
        })

    # Fine-tune student on teacher's traces
    fine_tune(student_model, training_data)
```

This is how many open-source reasoning models are built — DeepSeek-R1-Distill uses traces from DeepSeek-R1 to train smaller Qwen and Llama models.

## SFT vs RL for Reasoning

| Aspect | SFT on Reasoning Data | RL with Verifier |
|--------|----------------------|------------------|
| Training signal | Correct traces | Reward signal |
| Data requirements | Labeled (q, trace, a) | Just (q, a) |
| Training stability | Stable | Can be unstable |
| Exploration | None (imitates data) | Discovers new strategies |
| Ceiling | Teacher's quality | Can exceed teacher |

SFT is the easier starting point; RL can push further.

## Key Takeaways

- STaR bootstraps reasoning data using the model itself: keep correct traces, rationalize incorrect ones
- Rationalization (hint → trace) works surprisingly well for generating training data
- Rejection sampling fine-tuning is simpler: generate many, keep correct
- Distillation from stronger models is the fastest path for smaller models
- SFT establishes a reasoning baseline; RL can exceed it
