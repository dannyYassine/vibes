---
title: "Workflows: Reflection"
description: "Using self-critique and iterative improvement loops to enhance LLM output quality"
duration_minutes: 12
order: 5
---

## What Is Reflection?

Reflection is a workflow pattern where an LLM evaluates its own output and iterates to improve it. Instead of accepting the first response, the system loops: generate → critique → revise.

```
Generate draft
    ↓
Critique: what's wrong?
    ↓
Revise based on critique
    ↓
Repeat until satisfied or max iterations
```

This mirrors how a developer writes code, runs tests, fixes bugs, and repeats — the LLM acts as both author and reviewer.

## Basic Reflection Loop

```python
import anthropic

client = anthropic.Anthropic()


def reflection_loop(task: str, max_iterations: int = 3) -> str:
    """Generate, critique, and revise until good enough."""

    # Step 1: Initial generation
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": task}],
    )
    draft = response.content[0].text

    for i in range(max_iterations):
        # Step 2: Critique
        critique_response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            system="You are a critical reviewer. Identify specific flaws, gaps, or improvements needed. If the output is satisfactory, respond with exactly: LGTM",
            messages=[
                {"role": "user", "content": f"Task: {task}\n\nOutput to review:\n{draft}"},
            ],
        )
        critique = critique_response.content[0].text

        if "LGTM" in critique:
            break

        # Step 3: Revise
        revision_response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": task},
                {"role": "assistant", "content": draft},
                {"role": "user", "content": f"Critique of your response:\n{critique}\n\nRevise your response to address these issues:"},
            ],
        )
        draft = revision_response.content[0].text

    return draft
```

## Separating Generator and Critic

A stronger pattern uses different system prompts for generation vs. critique:

```python
GENERATOR_SYSTEM = """You are an expert software engineer. Write clean, efficient, well-documented code."""

CRITIC_SYSTEM = """You are a senior code reviewer. You find:
- Security vulnerabilities
- Performance issues
- Edge cases not handled
- Missing error handling
Be specific. Quote the problematic code. Suggest fixes."""

REVISOR_SYSTEM = """You are an expert software engineer. You receive code and a code review.
Revise the code to address ALL review comments. Explain each change you make."""


def generate_with_critique(task: str, client) -> str:
    def call(system, user):
        r = client.messages.create(
            model="claude-opus-4-6", max_tokens=1024,
            system=system, messages=[{"role": "user", "content": user}]
        )
        return r.content[0].text

    draft = call(GENERATOR_SYSTEM, task)

    for _ in range(3):
        critique = call(CRITIC_SYSTEM, f"Review this code:\n{draft}")

        if "no issues" in critique.lower() or "looks good" in critique.lower():
            break

        draft = call(REVISOR_SYSTEM, f"Code:\n{draft}\n\nReview:\n{critique}")

    return draft
```

## Reflection with External Validation

The most powerful reflection loops use **external signals** rather than self-critique:

```python
def code_reflection_with_tests(task: str, test_cases: list[dict], client) -> str:
    """Reflect based on actual test results, not self-critique."""
    import subprocess

    def generate_code(prompt):
        r = client.messages.create(
            model="claude-opus-4-6", max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        return r.content[0].text

    def run_tests(code, tests):
        results = []
        for test in tests:
            try:
                proc = subprocess.run(
                    ["python3", "-c", f"{code}\nprint({test['call']})"],
                    capture_output=True, text=True, timeout=5,
                )
                passed = proc.stdout.strip() == str(test["expected"])
                results.append({"name": test["call"], "passed": passed,
                                 "expected": test["expected"], "actual": proc.stdout.strip()})
            except Exception as e:
                results.append({"name": test["call"], "passed": False,
                                 "expected": test["expected"], "actual": str(e)})
        return results

    code = generate_code(task)

    for attempt in range(5):
        results = run_tests(code, test_cases)
        failures = [r for r in results if not r["passed"]]

        if not failures:
            return code  # All tests pass

        failure_summary = "\n".join([
            f"  {f['name']}: expected {f['expected']}, got {f['actual']}"
            for f in failures
        ])

        code = generate_code(
            f"Fix this code so all tests pass.\n\nCode:\n{code}\n\nFailing tests:\n{failure_summary}"
        )

    return code
```

External feedback makes reflection reliable — the model can't deny a failed test.

## When Reflection Helps

**Good fit:**
- Code generation (clear correctness criteria, testable)
- Writing tasks (structure, tone, clarity)
- Plans and strategies (completeness, consistency)

**Poor fit:**
- Factual questions (model can't self-correct wrong facts)
- Creative generation (critique undermines variety)
- Time-sensitive tasks (reflection adds latency)

## Key Takeaways

- Reflection loops generate, critique, then revise output iteratively
- Separating generator and critic roles via system prompts improves critique quality
- 2-3 iterations capture most improvement; diminishing returns beyond that
- External validation (test results, search, tools) is more reliable than pure self-critique
- Reflection adds latency — use only when output quality justifies the cost
