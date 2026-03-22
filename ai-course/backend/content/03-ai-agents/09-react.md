---
title: "Multi-Step Agents: ReACT"
description: "The ReACT pattern — interleaving reasoning and acting for robust multi-step problem solving"
duration_minutes: 13
order: 9
---

## The Problem with Pure Action

Early tool-calling agents would call tools without explaining their reasoning:

```
User: "What's the population of the capital of France?"
Agent: → search("capital France") → search("population Paris") → "2.1 million"
```

This works for simple cases, but breaks down for complex ones — the agent has no plan, can't recover from bad results, and the developer can't debug intermediate steps.

## ReACT: Reason + Act

ReACT (Yao et al., 2022) interleaves reasoning and action. The agent explicitly thinks before each action and after each observation:

```
Thought: I need to find the capital of France, then its population.
Action: search("capital of France")
Observation: Paris is the capital of France.
Thought: Now I need the population of Paris.
Action: search("population of Paris")
Observation: Paris has a population of approximately 2.1 million in the city proper.
Thought: I have the answer.
Final Answer: The population of Paris, the capital of France, is approximately 2.1 million.
```

The thought steps make the agent's reasoning transparent and debuggable.

## Implementation with Claude

```python
import anthropic
import json
import re

client = anthropic.Anthropic()

REACT_SYSTEM = """You are a helpful assistant that solves problems step by step using tools.

For each step, follow this format:
Thought: [your reasoning about what to do next]
Action: [tool_name] with input [JSON input]

When you have the final answer:
Thought: I now have all the information needed.
Final Answer: [your complete answer]

Always think before acting. Be methodical."""

tools = [
    {
        "name": "search",
        "description": "Search the web for information",
        "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
    },
    {
        "name": "calculate",
        "description": "Evaluate a mathematical expression",
        "input_schema": {"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]},
    },
    {
        "name": "lookup",
        "description": "Look up a specific fact in a knowledge base",
        "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
    },
]


def execute_tool(name: str, input_data: dict) -> str:
    """Execute a tool and return a string result."""
    if name == "search":
        # In production: call a real search API
        return f"Search results for '{input_data['query']}': [relevant information found]"
    elif name == "calculate":
        import ast
        try:
            result = eval(compile(ast.parse(input_data["expression"], mode="eval"), "", "eval"),
                         {"__builtins__": {}}, {})
            return str(result)
        except Exception as e:
            return f"Calculation error: {e}"
    elif name == "lookup":
        return f"Lookup result for '{input_data['query']}': [fact retrieved from knowledge base]"
    return f"Unknown tool: {name}"


def react_agent(question: str, max_steps: int = 10) -> str:
    """Run the ReACT agent loop."""
    messages = [{"role": "user", "content": question}]

    for step in range(max_steps):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=REACT_SYSTEM,
            tools=tools,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        # Check for final answer (no tool call)
        if response.stop_reason == "end_turn":
            text = response.content[0].text if response.content else ""
            if "Final Answer:" in text:
                return text.split("Final Answer:")[-1].strip()
            return text

        # Process tool calls
        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    print(f"  Thought: [see model reasoning]")
                    print(f"  Action: {block.name}({block.input})")
                    result = execute_tool(block.name, block.input)
                    print(f"  Observation: {result}")
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})

    return "Max steps reached without a final answer."
```

## ReACT Trace Example

```
Question: "How many days until the next US presidential election from today?"

Step 1:
  Thought: I need today's date and the next election date.
  Action: search("next US presidential election date")
  Observation: The next US presidential election is November 4, 2028.

Step 2:
  Thought: Now I need to calculate days between today and November 4, 2028.
  Action: calculate("(date(2028,11,4) - date.today()).days")
  Observation: 1024

Final Answer: There are 1,024 days until the next US presidential election on November 4, 2028.
```

## Why Explicit Reasoning Helps

1. **Error recovery**: if an action returns bad results, the thought step can reconsider
2. **Debuggability**: you can see exactly where the agent went wrong
3. **Better tool selection**: explicit reasoning leads to more appropriate tool choices
4. **Trust**: users and developers can follow the agent's logic

```python
# Without ReACT: black box
result = agent.run("complex question")  # What happened? Who knows.

# With ReACT: transparent trace
for step in react_agent_trace("complex question"):
    print(f"Step {step.number}:")
    print(f"  Thought: {step.thought}")
    print(f"  Action: {step.action}")
    print(f"  Observation: {step.observation}")
```

## ReACT vs. Pure Tool Calling

| Aspect | Pure Tool Calling | ReACT |
|--------|-----------------|-------|
| Transparency | Low (no reasoning visible) | High (thought steps logged) |
| Error recovery | Hard | Easier (agent reconsiders) |
| Token usage | Lower | Higher (thought tokens) |
| Debugging | Difficult | Much easier |
| Best for | Simple, direct tasks | Multi-step, complex tasks |

## Key Takeaways

- ReACT interleaves Thought → Action → Observation steps for transparent reasoning
- Explicit thought steps make agent behavior debuggable and interpretable
- The pattern naturally supports error recovery — the agent can reason about bad observations
- Claude's tool-calling interface implements ReACT natively when given a reasoning-oriented system prompt
- ReACT costs more tokens than pure tool calling but is essential for complex multi-step tasks
