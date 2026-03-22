---
title: "Search Against a Verifier"
description: "Using verifiers to guide search and validate reasoning steps"
duration_minutes: 14
order: 6
---

## The Verifier Paradigm

Instead of having one model both generate and evaluate, use a separate **verifier** to score solutions. This decouples generation from evaluation — the generator can be creative while the verifier is rigorous.

## Outcome Reward Models (ORM)

An ORM verifies only the final answer:

```python
class OutcomeRewardModel:
    """Scores complete solutions from 0 to 1."""

    def score(self, question: str, solution: str) -> float:
        # For math: extract final answer and check against ground truth
        final_answer = extract_answer(solution)
        return 1.0 if is_correct(final_answer, question) else 0.0

# Best-of-N with ORM
async def best_of_n_with_orm(question: str, n: int = 16) -> str:
    solutions = await asyncio.gather(*[generate(question) for _ in range(n)])
    orm = OutcomeRewardModel()
    scores = [orm.score(question, s) for s in solutions]
    return solutions[scores.index(max(scores))]
```

ORM is simple but can't distinguish good wrong answers from bad wrong answers.

## Process Reward Models (PRM)

A PRM scores each intermediate reasoning step:

```python
class ProcessRewardModel:
    """Scores individual reasoning steps."""

    def __init__(self, model):
        self.model = model

    def score_step(self, question: str, steps_so_far: list[str], new_step: str) -> float:
        """Returns probability (0-1) that this step is correct."""
        context = "\n".join(steps_so_far)
        prompt = f"""Question: {question}
Steps so far:
{context}

New step: {new_step}

Is this step correct? Rate correctness from 0.0 to 1.0."""

        return float(self.model.complete(prompt))

    def score_solution(self, question: str, steps: list[str]) -> float:
        """Product of all step scores."""
        scores = [self.score_step(question, steps[:i], steps[i])
                  for i in range(len(steps))]
        # Minimum or product
        return min(scores)

# PRM-guided beam search
async def prm_beam_search(question: str, prm, beam_width=4, depth=8) -> str:
    beams = [{"steps": [], "score": 1.0}]

    for _ in range(depth):
        candidates = []
        for beam in beams:
            next_steps = await generate_next_steps(question, beam["steps"], n=3)
            for step in next_steps:
                step_score = prm.score_step(question, beam["steps"], step)
                candidates.append({
                    "steps": beam["steps"] + [step],
                    "score": beam["score"] * step_score,
                })

        beams = sorted(candidates, key=lambda x: x["score"], reverse=True)[:beam_width]

        if any(is_complete(b["steps"]) for b in beams):
            break

    best_beam = max(beams, key=lambda x: x["score"])
    return "\n".join(best_beam["steps"])
```

## PRM800K Dataset

OpenAI's PRM800K dataset contains 800K step-level labels on math reasoning problems, used to train effective PRMs:

```python
# Format of PRM800K data
example = {
    "problem": "Find all integers n such that n^2 + 4n + 5 is prime...",
    "steps": [
        {"text": "Complete the square: n^2 + 4n + 5 = (n+2)^2 + 1", "label": 1.0},
        {"text": "For this to be prime, (n+2)^2 must be 0", "label": 1.0},
        {"text": "So n = -2, giving (n+2)^2 + 1 = 1", "label": 0.5},  # Step has issue
    ]
}
```

## Rule-Based Verifiers (For Code)

The most reliable verifiers use deterministic checks:

```python
import subprocess
import ast

class CodeVerifier:
    def verify(self, problem: str, code: str, test_cases: list[dict]) -> float:
        """Run test cases against generated code."""
        # Safety: only allow pure functions
        try:
            ast.parse(code)  # Syntax check
        except SyntaxError:
            return 0.0

        passed = 0
        for test in test_cases:
            try:
                result = subprocess.run(
                    ["python3", "-c", f"{code}\nprint({test['call']})"],
                    capture_output=True, text=True, timeout=5,
                )
                if result.stdout.strip() == str(test["expected"]):
                    passed += 1
            except Exception:
                pass

        return passed / len(test_cases)
```

## ORM vs PRM

| Aspect | ORM | PRM |
|--------|-----|-----|
| Training data | (question, answer, correct?) | (question, steps, step labels) |
| Signal quality | Sparse (end only) | Dense (per step) |
| Data cost | Low | High |
| Guidance during search | None | Per-step |
| Best use | Reranking final answers | Guiding beam search |

## Key Takeaways

- Verifiers decouple generation from evaluation, enabling better search
- ORMs are simple and cheap but only score complete solutions
- PRMs score individual steps, enabling richer search guidance
- Rule-based verifiers (code tests, math checkers) are the most reliable
- PRM-guided beam search is the current best practice for math reasoning
