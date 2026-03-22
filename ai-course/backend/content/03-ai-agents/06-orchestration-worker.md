---
title: "Workflows: Orchestration-Worker"
description: "Breaking complex tasks into subtasks with an orchestrator LLM directing specialized worker LLMs"
duration_minutes: 13
order: 6
---

## The Pattern

The orchestration-worker pattern separates **planning** from **execution**:

- **Orchestrator**: breaks the task into subtasks, assigns them to workers, synthesizes results
- **Workers**: specialized agents that execute specific subtasks

This maps naturally to how engineering teams work: a tech lead designs the system, individual engineers implement components.

```
User Task
    ↓
[Orchestrator] → analyze task, create plan
    ├── [Worker A] → subtask 1
    ├── [Worker B] → subtask 2
    └── [Worker C] → subtask 3
    ↓
[Orchestrator] → synthesize results → Final Output
```

## Implementation

```python
import anthropic
import json
import asyncio

client = anthropic.Anthropic()

ORCHESTRATOR_SYSTEM = """You are a task orchestrator. Break complex tasks into clear subtasks.
Output a JSON array of subtasks with this format:
[{"id": 1, "task": "...", "worker_type": "researcher|writer|coder|analyst"}]
Keep subtasks focused and independent where possible."""

WORKER_SYSTEMS = {
    "researcher": "You are a research specialist. Find relevant information and summarize key facts.",
    "writer": "You are a technical writer. Write clear, well-structured content.",
    "coder": "You are a software engineer. Write clean, working code with brief explanations.",
    "analyst": "You are a data analyst. Analyze information and provide structured insights.",
}


def orchestrate(user_task: str) -> str:
    # Step 1: Orchestrator plans the work
    plan_response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=ORCHESTRATOR_SYSTEM,
        messages=[{"role": "user", "content": f"Break this task into subtasks:\n{user_task}"}],
    )

    plan_text = plan_response.content[0].text
    # Extract JSON from response
    start = plan_text.find("[")
    end = plan_text.rfind("]") + 1
    subtasks = json.loads(plan_text[start:end])

    # Step 2: Execute subtasks with appropriate workers
    results = []
    for subtask in subtasks:
        worker_system = WORKER_SYSTEMS.get(subtask["worker_type"], WORKER_SYSTEMS["analyst"])
        worker_response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=worker_system,
            messages=[{"role": "user", "content": subtask["task"]}],
        )
        results.append({
            "subtask": subtask["task"],
            "result": worker_response.content[0].text,
        })

    # Step 3: Orchestrator synthesizes
    results_text = "\n\n".join([
        f"Subtask: {r['subtask']}\nResult: {r['result']}"
        for r in results
    ])
    synthesis_response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": f"Original task: {user_task}\n\nSubtask results:\n{results_text}\n\nSynthesize these into a final, cohesive response:",
        }],
    )
    return synthesis_response.content[0].text
```

## Parallel Execution

Workers that don't depend on each other can run in parallel:

```python
async def orchestrate_parallel(user_task: str) -> str:
    subtasks = plan_subtasks(user_task)

    # Identify independent subtasks (no dependencies)
    independent = [s for s in subtasks if not s.get("depends_on")]
    dependent = [s for s in subtasks if s.get("depends_on")]

    # Run independent subtasks in parallel
    async def run_worker(subtask):
        return await execute_worker_async(subtask)

    parallel_results = await asyncio.gather(*[run_worker(s) for s in independent])

    # Run dependent subtasks sequentially, passing prior results
    all_results = dict(zip([s["id"] for s in independent], parallel_results))
    for subtask in dependent:
        context = "\n".join([all_results[dep] for dep in subtask["depends_on"]])
        all_results[subtask["id"]] = await run_worker_with_context(subtask, context)

    return synthesize(user_task, all_results)
```

## Dynamic vs. Static Orchestration

**Static**: orchestrator creates the full plan upfront, workers execute, orchestrator synthesizes.

**Dynamic**: orchestrator decides next steps based on previous results — more flexible but harder to debug.

```python
def dynamic_orchestration(task: str, max_steps: int = 10) -> str:
    """Orchestrator decides next action after each result."""
    history = []

    for step in range(max_steps):
        # Orchestrator sees task + all history, decides what to do next
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            system="""Decide the next action. Output JSON:
{"action": "delegate"|"synthesize", "worker": "...", "instruction": "..."}
Use "synthesize" when you have enough information to answer the original task.""",
            messages=[{
                "role": "user",
                "content": f"Task: {task}\n\nHistory:\n{json.dumps(history, indent=2)}\n\nWhat next?"
            }],
        )
        decision = json.loads(response.content[0].text)

        if decision["action"] == "synthesize":
            return synthesize_final(task, history)

        # Delegate to worker
        result = run_worker(decision["worker"], decision["instruction"])
        history.append({"instruction": decision["instruction"], "result": result})

    return synthesize_final(task, history)
```

## Orchestration vs. Parallelization

| Aspect | Parallelization | Orchestration-Worker |
|--------|----------------|---------------------|
| Task structure | Known upfront, independent | Planned dynamically |
| Subtask types | Identical | Specialized by role |
| Coordination | Fan-out/fan-in | Orchestrator decides |
| Best for | Map-reduce style | Complex multi-step tasks |

## Key Takeaways

- Orchestrator-worker separates planning (orchestrator) from execution (workers)
- Workers can be specialized with different system prompts or even different models
- Independent subtasks can run in parallel for significant speedups
- Dynamic orchestration lets the orchestrator adapt based on intermediate results
- Use a capable model (like claude-opus-4-6) for the orchestrator; smaller models for workers
