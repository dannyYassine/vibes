---
title: "Agents Overview"
description: "What AI agents are, how they differ from simple LLM calls, and the agent landscape"
duration_minutes: 14
order: 1
---

## What Is an AI Agent?

An AI agent is a system in which a language model acts as a reasoning engine that dynamically decides what actions to take, observes the results of those actions, and continues reasoning until a goal is achieved. This is fundamentally different from a single LLM call where you send a prompt and receive a response.

The key distinction: in a simple LLM call, you as the developer decide the control flow. In an agent, the LLM decides the control flow.

```python
# Simple LLM call — you control the flow
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarize this document: ..."}]
)
summary = response.choices[0].message.content

# Agent — the LLM controls the flow
# The model decides whether to search the web, read a file,
# call an API, or respond directly based on the query
agent.run("Research the latest papers on RAG and write a summary report")
```

## Agents vs Workflows vs Simple Completions

Understanding the spectrum of LLM application architectures helps you choose the right tool for each job.

**Simple Completions** are single-turn requests. You send input, you get output. No iteration, no tool use, no memory across steps. Best for classification, summarization, extraction, and generation tasks with well-defined inputs and outputs.

**Workflows** are multi-step pipelines where the developer hard-codes the sequence of LLM calls and logic. The LLM is invoked at defined points, but the routing, branching, and sequencing are controlled by your code. Workflows are deterministic and predictable.

**Agents** are systems where the LLM itself determines what to do next. The model chooses which tools to call, in what order, and when to stop. Agents are dynamic and can handle tasks that require open-ended problem-solving.

## The Perception-Reasoning-Action Loop

Every agent operates on a fundamental loop:

1. **Perception** — The agent observes its environment. This includes the user input, results from previous tool calls, memory retrieved from a vector store, conversation history, and system context.

2. **Reasoning** — The agent processes what it perceives and decides what to do next. Modern LLMs use chain-of-thought reasoning here, producing thoughts before committing to an action.

3. **Action** — The agent executes a tool call, writes to memory, responds to the user, or terminates. The result of the action feeds back into the next perception step.

```python
def run_agent(user_input: str, tools: list, max_iterations: int = 10):
    messages = [{"role": "user", "content": user_input}]

    for iteration in range(max_iterations):
        # Reasoning step
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
        )
        message = response.choices[0].message

        # Check if the agent is done
        if message.tool_calls is None:
            return message.content  # Final answer

        # Action step — execute tool calls
        messages.append(message)
        for tool_call in message.tool_calls:
            result = execute_tool(tool_call)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(result),
            })
        # Loop back — new perception

    return "Max iterations reached"
```

## When to Use Agents

Agents are powerful but come with real costs. Use them when:

- The task requires **open-ended problem solving** where you cannot anticipate all decision branches upfront.
- The task involves **multi-step tool use** where the next action depends on the result of the previous one.
- The task benefits from **self-correction** — the agent can observe that something went wrong and try a different approach.
- **Exploratory research** tasks where the agent needs to gather information from multiple sources before synthesizing an answer.

Avoid agents when a simple prompt or workflow will do. Agents are slower and more expensive. If you need high reliability and predictability, prefer deterministic workflows. If the task is latency-sensitive, each tool call round-trip adds hundreds of milliseconds to seconds of overhead.

## Risks and Challenges

**Prompt injection** is one of the most serious threats. If your agent browses the web or reads user-uploaded documents, an attacker can embed instructions in that content that hijack the agent behavior.

**Runaway loops** occur when an agent gets stuck in an action cycle that never terminates. Always implement a maximum iteration limit and a circuit breaker pattern.

**Cost explosion** is real. An agent that makes 50 tool calls per request with a 128k context window can cost orders of magnitude more than a simple completion.

**Irreversible actions** are a major concern. If your agent can send emails, delete records, or make purchases, a mistaken action can have real-world consequences. Implement human-in-the-loop checkpoints for destructive operations.

**Evaluation difficulty** — testing agents is much harder than testing deterministic functions. The same query can produce different tool call sequences across runs.

## Overview of Agent Frameworks

**LangGraph** (by LangChain) models agents as stateful graphs. Nodes are functions or LLM calls, edges define transitions. It provides first-class support for cycles, human-in-the-loop, and persistence. Best for production systems that need fine-grained control.

**AutoGen** (by Microsoft) is conversation-centric. Agents are conversational participants that send messages to each other. Excellent for multi-agent systems where agents debate, critique, or specialize.

**CrewAI** provides a high-level abstraction with roles, goals, and backstories. Agents are crew members assigned to tasks. Excellent for rapid prototyping of role-based multi-agent systems.

**smolagents** (by Hugging Face) is a lightweight framework focused on code-writing agents. The agent writes and executes Python code rather than calling predefined tools, giving it flexible problem-solving capability.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]

def agent_node(state: AgentState):
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def tool_node(state: AgentState):
    results = execute_tools(state["messages"][-1])
    return {"messages": results}

def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")
app = graph.compile()
```

## Key Takeaways

- Agents differ from workflows because the LLM controls the control flow, not the developer.
- The perception-reasoning-action loop is the foundation of all agent architectures.
- Use agents only when the task genuinely requires dynamic decision-making — prefer simpler workflows for predictable tasks.
- The main risks are prompt injection, runaway loops, cost explosion, and irreversible actions.
- LangGraph, AutoGen, CrewAI, and smolagents are the dominant frameworks, each with different tradeoffs in control, abstraction level, and use case.
