---
title: "Multi-Agent Systems"
description: "Architectures for coordinating multiple specialized agents: networks, pipelines, and shared memory"
duration_minutes: 13
order: 11
---

## Why Multiple Agents?

A single large-context agent eventually hits limits:
- **Context window**: complex tasks accumulate too much history
- **Specialization**: one model can't be expert at everything
- **Parallelism**: independent subtasks should run simultaneously
- **Fault isolation**: one agent failing shouldn't crash the whole task

Multi-agent systems address these by distributing work across specialized, coordinated agents.

## Common Multi-Agent Topologies

### Pipeline (Sequential)
Each agent's output feeds the next:
```
Input → [Agent A: Research] → [Agent B: Draft] → [Agent C: Review] → Output
```

### Hub-and-Spoke (Centralized)
One orchestrator delegates to specialized workers:
```
         [Orchestrator]
        /       |       \
[Researcher] [Coder] [Writer]
```

### Peer-to-Peer (Decentralized)
Agents communicate directly:
```
[Agent A] ←→ [Agent B]
    ↕              ↕
[Agent C] ←→ [Agent D]
```

## Building a Pipeline

```python
import anthropic

client = anthropic.Anthropic()


class Agent:
    def __init__(self, name: str, system_prompt: str, model: str = "claude-opus-4-6"):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model

    def run(self, input_text: str) -> str:
        response = client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=self.system_prompt,
            messages=[{"role": "user", "content": input_text}],
        )
        return response.content[0].text


# Specialized agents
researcher = Agent(
    name="Researcher",
    system_prompt="You research topics thoroughly. Identify key facts, statistics, and perspectives. Be comprehensive.",
)

writer = Agent(
    name="Writer",
    system_prompt="You write clear, engaging articles. Transform research notes into well-structured prose.",
)

editor = Agent(
    name="Editor",
    system_prompt="You edit for clarity, conciseness, and correctness. Fix grammar, improve flow, cut fluff.",
)


def article_pipeline(topic: str) -> str:
    """Three-stage pipeline: research → write → edit."""
    print(f"[Researcher] Researching: {topic}")
    research = researcher.run(f"Research this topic thoroughly: {topic}")

    print(f"[Writer] Writing article from research")
    draft = writer.run(f"Write an article based on this research:\n{research}")

    print(f"[Editor] Editing draft")
    final = editor.run(f"Edit this article:\n{draft}")

    return final
```

## Shared Memory and State

Agents in a system need to share context without each holding the full history:

```python
class SharedMemory:
    """Thread-safe shared state for multi-agent systems."""

    def __init__(self):
        self._store: dict = {}
        self._messages: list = []  # Shared message log

    def write(self, key: str, value) -> None:
        self._store[key] = value

    def read(self, key: str, default=None):
        return self._store.get(key, default)

    def log_message(self, agent_name: str, message: str) -> None:
        self._store.setdefault("log", []).append(
            {"agent": agent_name, "message": message}
        )

    def get_context_for_agent(self, agent_name: str) -> str:
        """Return relevant context for a specific agent."""
        log = self._store.get("log", [])
        recent = log[-10:]  # Last 10 messages
        return "\n".join(f"[{m['agent']}]: {m['message']}" for m in recent)


# Usage
memory = SharedMemory()
memory.write("task", "Build a REST API for user management")
memory.write("tech_stack", "Python, FastAPI, PostgreSQL")

class MemoryAwareAgent(Agent):
    def run_with_memory(self, input_text: str, memory: SharedMemory) -> str:
        context = memory.get_context_for_agent(self.name)
        full_input = f"Context from team:\n{context}\n\nYour task: {input_text}"
        result = self.run(full_input)
        memory.log_message(self.name, result[:200])  # Log summary
        return result
```

## Agent Communication Patterns

### Direct Message
One agent sends a task to another:
```python
result = worker_agent.run(f"Subtask from orchestrator: {subtask}")
```

### Broadcast
One agent publishes to all:
```python
for agent in all_agents:
    agent.notify(new_information)
```

### Voting / Consensus
Multiple agents evaluate and vote:
```python
async def consensus_decision(question: str, agents: list[Agent]) -> str:
    votes = await asyncio.gather(*[a.evaluate(question) for a in agents])
    # Majority vote or synthesize
    return synthesize_votes(votes)
```

## Fault Tolerance

```python
async def resilient_pipeline(task: str, agents: list[Agent]) -> str:
    result = task
    for agent in agents:
        try:
            result = await agent.run_async(result)
        except Exception as e:
            print(f"Agent {agent.name} failed: {e}. Using previous result.")
            # Continue with previous result or fallback
            result = await fallback_agent.run_async(result)
    return result
```

## Key Takeaways

- Multi-agent systems distribute work across specialized, coordinated agents
- Pipeline topology is simplest: each agent's output becomes the next agent's input
- Hub-and-spoke gives a central orchestrator control over specialized workers
- Shared memory lets agents coordinate without passing full conversation history
- Fault isolation is a key benefit: one failing agent doesn't crash the whole system
