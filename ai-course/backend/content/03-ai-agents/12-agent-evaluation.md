---
title: "Evaluation of Agents"
description: "How to measure agent performance: task success, trajectory quality, and systematic benchmarking"
duration_minutes: 12
order: 12
---

## Why Agent Evaluation Is Hard

Evaluating an LLM response is already hard (one output to judge). Evaluating an agent is harder:

- **Multiple steps**: the agent makes many decisions, each of which could be evaluated
- **Multiple valid paths**: there are often many correct ways to solve a task
- **Partial credit**: an agent that got 8/10 steps right is better than one that got 0/10
- **Latency and cost**: a correct but expensive agent may not be production-worthy

## What to Measure

### Task Success Rate
Did the agent complete the goal? This is the primary metric:

```python
def evaluate_task_completion(task: str, agent_output: str, expected: str) -> dict:
    """Evaluate whether the agent completed the task."""
    # Exact match (code tasks, factual questions)
    exact_match = agent_output.strip() == expected.strip()

    # Semantic match (use LLM as judge for open-ended tasks)
    llm_score = llm_judge(task, agent_output, expected)

    # Functional correctness (run tests for code)
    test_results = run_tests(agent_output) if is_code_task(task) else None

    return {
        "exact_match": exact_match,
        "llm_score": llm_score,  # 0.0-1.0
        "tests_passed": test_results,
    }
```

### Trajectory Quality
Was the path to the answer efficient and correct?

```python
def evaluate_trajectory(task: str, steps: list[dict]) -> dict:
    """
    Evaluate the quality of the agent's reasoning path.
    steps = [{"thought": ..., "action": ..., "observation": ...}, ...]
    """
    metrics = {
        "num_steps": len(steps),
        "unnecessary_steps": count_redundant_steps(steps),
        "hallucinated_observations": count_hallucinations(steps),
        "correct_tool_choices": count_correct_tools(task, steps),
    }

    # Efficiency: fewer steps is better for the same outcome
    metrics["efficiency_score"] = 1.0 / (1 + metrics["unnecessary_steps"])

    return metrics
```

### LLM-as-Judge

For tasks without ground truth, use a capable LLM to score:

```python
import anthropic

client = anthropic.Anthropic()

JUDGE_PROMPT = """You are evaluating an AI agent's response.

Task: {task}
Agent's output: {output}
Expected outcome: {expected}

Score the agent's performance on these dimensions (1-5 each):
1. Correctness: Is the answer factually correct?
2. Completeness: Does it fully address the task?
3. Efficiency: Did it take a reasonable number of steps?
4. Format: Is the output in the expected format?

Output JSON: {{"correctness": N, "completeness": N, "efficiency": N, "format": N, "reasoning": "..."}}"""


def llm_judge(task: str, output: str, expected: str) -> dict:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": JUDGE_PROMPT.format(task=task, output=output, expected=expected),
        }],
    )
    import json
    text = response.content[0].text
    start = text.find("{")
    return json.loads(text[start:text.rfind("}") + 1])
```

## Building an Evaluation Suite

```python
import asyncio
from dataclasses import dataclass

@dataclass
class EvalCase:
    task: str
    expected_output: str
    expected_tools: list[str]  # Which tools should have been called
    max_steps: int             # Maximum reasonable steps


EVAL_SUITE = [
    EvalCase(
        task="What is the population of the capital of Japan?",
        expected_output="Tokyo has a population of approximately 13.96 million",
        expected_tools=["search"],
        max_steps=4,
    ),
    EvalCase(
        task="Calculate the compound interest on $10,000 at 5% annual rate for 3 years",
        expected_output="$11,576.25",
        expected_tools=["calculate"],
        max_steps=3,
    ),
    EvalCase(
        task="Find and summarize recent news about AI regulation",
        expected_output=None,  # Open-ended, use LLM judge
        expected_tools=["search"],
        max_steps=6,
    ),
]


async def run_eval_suite(agent_fn, suite: list[EvalCase]) -> dict:
    """Run full evaluation suite and aggregate metrics."""
    results = []
    for case in suite:
        output, steps = await agent_fn(case.task)
        result = {
            "task": case.task,
            "success": evaluate_task_completion(case.task, output, case.expected_output),
            "trajectory": evaluate_trajectory(case.task, steps),
            "within_step_budget": len(steps) <= case.max_steps,
        }
        results.append(result)
        print(f"✓ {case.task[:50]}...")

    return {
        "total": len(results),
        "success_rate": sum(1 for r in results if r["success"].get("llm_score", 0) > 0.7) / len(results),
        "avg_steps": sum(r["trajectory"]["num_steps"] for r in results) / len(results),
        "within_budget_rate": sum(1 for r in results if r["within_step_budget"]) / len(results),
    }
```

## Regression Testing

When you update your agent (new model, changed prompt, new tools), run the eval suite to ensure no regression:

```python
def compare_agent_versions(agent_v1, agent_v2, suite: list[EvalCase]) -> dict:
    """A/B compare two agent versions."""
    results_v1 = run_eval_suite(agent_v1, suite)
    results_v2 = run_eval_suite(agent_v2, suite)

    return {
        "success_rate_delta": results_v2["success_rate"] - results_v1["success_rate"],
        "avg_steps_delta": results_v2["avg_steps"] - results_v1["avg_steps"],
        "recommendation": "upgrade" if results_v2["success_rate"] > results_v1["success_rate"] else "keep v1",
    }
```

## Standard Agent Benchmarks

| Benchmark | Domain | Key Metric |
|-----------|--------|-----------|
| SWE-bench | Software engineering | % issues resolved |
| WebArena | Web navigation | Task completion rate |
| HotpotQA | Multi-hop QA | Answer accuracy |
| GAIA | Real-world tasks | Overall success rate |
| AgentBench | Multiple domains | Weighted score |

## Key Takeaways

- Agent evaluation measures task success rate, trajectory quality, and efficiency
- LLM-as-judge works well for open-ended tasks without a single ground truth answer
- Build an eval suite of representative tasks and run it on every agent change
- Regression testing prevents new changes from degrading performance on previously solved tasks
- Track both quality (success rate) and cost (steps, tokens, latency) — both matter in production
