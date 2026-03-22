---
title: "Reflexion, ReWOO, Tree Search"
description: "Advanced agent architectures that improve on ReACT through memory, decoupled planning, and tree-based search"
duration_minutes: 14
order: 10
---

## Beyond ReACT

ReACT works well for straightforward multi-step tasks. Three extensions push further:

- **Reflexion**: learn from failures using verbal memory
- **ReWOO**: separate planning from execution to reduce token usage
- **Tree Search**: explore multiple reasoning paths and backtrack

## Reflexion: Learning from Failures

Reflexion (Shinn et al., 2023) adds a memory layer: after each failed attempt, the agent writes a reflection summarizing what went wrong, then retries with that context.

```python
import anthropic
import json

client = anthropic.Anthropic()

REFLECTION_PROMPT = """You attempted the following task and failed.

Task: {task}
Your attempt: {attempt}
Outcome: {outcome}

Write a concise reflection (2-3 sentences) identifying:
1. What went wrong
2. What you should do differently next time"""

AGENT_WITH_MEMORY_PROMPT = """Solve the task. You have prior experience to learn from:

Prior reflections:
{reflections}

Task: {task}"""


def reflexion_agent(task: str, max_attempts: int = 3) -> str:
    reflections = []

    for attempt_num in range(max_attempts):
        # Build prompt with accumulated reflections
        if reflections:
            prompt = AGENT_WITH_MEMORY_PROMPT.format(
                reflections="\n".join(f"- {r}" for r in reflections),
                task=task,
            )
        else:
            prompt = task

        # Run agent attempt
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        attempt_output = response.content[0].text

        # Evaluate attempt (in production: run tests, check output format, etc.)
        success, outcome = evaluate_attempt(attempt_output, task)

        if success:
            return attempt_output

        # Generate reflection on failure
        reflection_response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=256,
            messages=[{
                "role": "user",
                "content": REFLECTION_PROMPT.format(
                    task=task, attempt=attempt_output, outcome=outcome
                ),
            }],
        )
        reflections.append(reflection_response.content[0].text)
        print(f"Attempt {attempt_num + 1} failed. Reflection: {reflections[-1]}")

    return attempt_output  # Return best attempt after max retries


def evaluate_attempt(output: str, task: str) -> tuple[bool, str]:
    """Stub: replace with real evaluation logic."""
    # e.g., run unit tests, check output format, verify correctness
    return False, "Output did not meet the acceptance criteria."
```

## ReWOO: Decoupled Planning and Execution

ReACT interleaves thinking and tool calls, which wastes tokens (reasoning tokens must be re-read each step). **ReWOO** (Xu et al., 2023) plans all steps upfront, then executes them:

```python
PLANNER_PROMPT = """Create a step-by-step plan to answer the question.
For each step that needs a tool, specify the tool and its input.
Reference previous step results with #E1, #E2, etc.

Output format (JSON):
[
  {"step": 1, "thought": "...", "tool": "search", "input": "..."},
  {"step": 2, "thought": "...", "tool": "calculate", "input": "... #E1 ..."},
  {"step": 3, "thought": "...", "tool": null, "input": null, "final": true}
]"""

SOLVER_PROMPT = """Given the original question and all gathered evidence, provide the final answer.

Question: {question}
Evidence: {evidence}"""


def rewoo_agent(question: str) -> str:
    # Phase 1: Plan all steps upfront (no tool calls yet)
    plan_response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=PLANNER_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    plan_text = plan_response.content[0].text
    start = plan_text.find("[")
    plan = json.loads(plan_text[start:plan_text.rfind("]") + 1])

    # Phase 2: Execute steps, substituting prior results
    evidence = {}
    for step in plan:
        if step.get("final"):
            break

        # Substitute previous results into input
        tool_input = step["input"]
        for key, val in evidence.items():
            tool_input = tool_input.replace(key, val)

        # Execute tool
        result = execute_tool(step["tool"], tool_input)
        evidence[f"#E{step['step']}"] = result

    # Phase 3: Solve with all evidence
    evidence_text = "\n".join(f"{k}: {v}" for k, v in evidence.items())
    solver_response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": SOLVER_PROMPT.format(question=question, evidence=evidence_text),
        }],
    )
    return solver_response.content[0].text
```

**ReWOO advantage**: 3-5× fewer tokens than ReACT because planning happens once, and LLM calls don't include tool observation history.

## Tree Search for Agents

For tasks with many possible paths (debugging, exploration, planning), tree search explores multiple trajectories:

```python
import asyncio

async def tree_search_agent(task: str, branching_factor: int = 3, depth: int = 4) -> str:
    """
    Explore multiple solution paths as a tree.
    At each node: generate branching_factor next actions, score them, keep best.
    """
    # Root node
    root = {"state": task, "actions": [], "score": 1.0}
    beam = [root]

    for level in range(depth):
        candidates = []
        for node in beam:
            # Generate possible next actions
            next_actions = await generate_next_actions(node["state"], branching_factor)
            for action in next_actions:
                new_state = await execute_and_observe(node["state"], action)
                score = await evaluate_state(task, new_state)
                candidates.append({
                    "state": new_state,
                    "actions": node["actions"] + [action],
                    "score": score,
                })

        # Keep top candidates (beam search)
        beam = sorted(candidates, key=lambda x: x["score"], reverse=True)[:branching_factor]

        # Check for solved state
        for node in beam:
            if await is_solved(task, node["state"]):
                return node["state"]

    # Return best node found
    return max(beam, key=lambda x: x["score"])["state"]


async def evaluate_state(task: str, state: str) -> float:
    """Score how promising this state is (0-1)."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=64,
        messages=[{
            "role": "user",
            "content": f"Task: {task}\n\nCurrent state: {state}\n\nRate progress toward solving (0.0-1.0), output only the number:",
        }],
    )
    try:
        return float(response.content[0].text.strip())
    except ValueError:
        return 0.5
```

## Comparison

| Architecture | Strength | Weakness |
|-------------|----------|---------|
| ReACT | Simple, transparent | High token usage, no memory |
| Reflexion | Learns from mistakes | Requires multiple attempts |
| ReWOO | Token-efficient | Can't adapt mid-execution |
| Tree Search | Explores alternatives | Very high compute cost |

## Key Takeaways

- Reflexion adds verbal memory: reflect on failures, retry with accumulated knowledge
- ReWOO decouples planning from execution, reducing token usage by 3-5×
- Tree search explores multiple solution paths and backtracks from dead ends
- Choose based on task: Reflexion for correctness, ReWOO for efficiency, tree search for exploration
- These patterns combine: e.g., tree search with Reflexion memory at each node
