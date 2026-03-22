---
title: "Tree of Thoughts (ToT)"
description: "Exploring multiple reasoning paths in a tree structure for better problem solving"
duration_minutes: 14
order: 5
---

## Beyond Linear Chains

Chain-of-thought reasons linearly: one step follows the next. But many problems benefit from **exploring multiple reasoning paths** and backtracking when you hit a dead end — exactly how humans solve hard puzzles.

Tree of Thoughts (Yao et al., 2023) implements this as a tree search over reasoning steps.

## The ToT Framework

```
Problem
├── Thought A
│   ├── Thought A1 → Dead end (pruned)
│   └── Thought A2
│       ├── Thought A21 → Promising
│       └── Thought A22 → Dead end
└── Thought B
    └── Thought B1
        └── Thought B11 → Solution!
```

Four key components:
1. **Thought decomposition**: How to break the problem into steps
2. **Thought generation**: Generate k candidates at each node
3. **State evaluation**: Score each node (value function)
4. **Search algorithm**: BFS, DFS, or MCTS

## Implementation

```python
from typing import Optional
import asyncio

class TreeOfThoughts:
    def __init__(self, llm, n_thoughts=3, n_evaluations=3):
        self.llm = llm
        self.n_thoughts = n_thoughts
        self.n_eval = n_evaluations

    async def generate_thoughts(self, problem: str, state: str) -> list[str]:
        """Generate k next thoughts from current state."""
        prompt = f"""Problem: {problem}
Current progress: {state}

Generate {self.n_thoughts} different next steps/approaches to consider.
Format as a numbered list."""

        response = await self.llm.complete(prompt)
        return self._parse_list(response)

    async def evaluate_state(self, problem: str, state: str) -> float:
        """Score a state from 0-10."""
        prompt = f"""Problem: {problem}
Current approach: {state}

Rate this approach from 0-10:
- 10: Definitely leads to a solution
- 5: Uncertain, might work
- 0: Clearly wrong or stuck

Return only a number."""

        scores = []
        for _ in range(self.n_eval):
            score = float(await self.llm.complete(prompt))
            scores.append(score)
        return sum(scores) / len(scores)

    async def solve_bfs(self, problem: str, depth: int = 3, beam_width: int = 3) -> str:
        """BFS with beam search."""
        # Initialize with empty state
        beams = [("", 10.0)]  # (state, score)

        for level in range(depth):
            candidates = []
            for state, _ in beams:
                thoughts = await self.generate_thoughts(problem, state)
                for thought in thoughts:
                    new_state = state + f"\nStep {level+1}: {thought}"
                    score = await self.evaluate_state(problem, new_state)
                    candidates.append((new_state, score))

            # Keep top beam_width candidates
            beams = sorted(candidates, key=lambda x: x[1], reverse=True)[:beam_width]

        # Return best final state
        return beams[0][0]
```

## Game of 24 Example

The classic ToT demo: use 4 numbers with arithmetic to reach 24.

```python
async def solve_game_of_24(numbers: list[int]) -> str:
    problem = f"Use the numbers {numbers} with +, -, *, / to make 24."

    tot = TreeOfThoughts(llm, n_thoughts=5, n_evaluations=3)

    # Generate all possible first operations
    thoughts = await tot.generate_thoughts(
        problem,
        f"Numbers available: {numbers}"
    )

    # BFS over combinations
    return await tot.solve_bfs(problem, depth=4, beam_width=5)

# Example: [4, 9, 10, 13]
# Correct: (10-4) * (13-9) = 24
```

## DFS with Backtracking

For problems where dead ends are clear:

```python
async def solve_dfs(
    problem: str,
    state: str = "",
    depth: int = 0,
    max_depth: int = 5,
    prune_threshold: float = 3.0,
) -> Optional[str]:
    """DFS with pruning."""
    score = await evaluate_state(problem, state)

    if score < prune_threshold:  # Prune bad paths
        return None

    if depth == max_depth:
        return state if is_solution(state) else None

    thoughts = await generate_thoughts(problem, state, n=3)

    for thought in thoughts:
        new_state = state + f"\n{thought}"
        result = await solve_dfs(problem, new_state, depth+1, max_depth)
        if result:
            return result

    return None
```

## ToT vs CoT Tradeoffs

| Aspect | CoT | ToT |
|--------|-----|-----|
| Inference cost | Low (1 path) | High (N paths × K branches) |
| Problem types | Sequential | Search/planning |
| Backtracking | No | Yes |
| Parallelism | No | Yes (BFS beams) |
| Implementation | Simple | Complex |

## Key Takeaways

- ToT explores multiple reasoning paths as a tree instead of a single chain
- BFS with beam search keeps the K most promising paths at each step
- DFS with pruning is more memory-efficient but may miss some solutions
- ToT excels at combinatorial problems, puzzles, and planning tasks
- The main cost is N×K more LLM calls per problem — use only when quality justifies it
