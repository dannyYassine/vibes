---
title: "Tools: Tool Calling"
description: "Giving LLMs the ability to invoke functions, APIs, and external services"
duration_minutes: 14
order: 7
---

## What Is Tool Calling?

Tool calling (also called function calling) allows an LLM to request execution of external functions. The model outputs a structured call describing which tool to invoke and with what arguments — your code executes it and returns the result.

The model doesn't execute code directly. It describes *what it wants to run*, and your application does the actual execution.

```
User: "What's the weather in Tokyo?"
    ↓
LLM: I'll call get_weather(city="Tokyo")  ← structured output
    ↓
Your code executes get_weather("Tokyo")
    ↓
LLM receives result: "18°C, partly cloudy"
    ↓
LLM: "The weather in Tokyo is 18°C and partly cloudy."
```

## Defining Tools

```python
import anthropic
import json

client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a city. Returns temperature in Celsius and conditions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "City name, e.g. 'Tokyo' or 'New York'",
                },
                "units": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature units. Defaults to celsius.",
                },
            },
            "required": ["city"],
        },
    },
    {
        "name": "search_web",
        "description": "Search the web for up-to-date information on a topic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "num_results": {"type": "integer", "description": "Number of results (1-10)", "default": 5},
            },
            "required": ["query"],
        },
    },
]
```

## The Tool Calling Loop

```python
def get_weather(city: str, units: str = "celsius") -> dict:
    """Actual implementation (stub for demo)."""
    # In production: call a real weather API
    return {"city": city, "temp": 18, "units": units, "conditions": "partly cloudy"}


def search_web(query: str, num_results: int = 5) -> list[dict]:
    """Actual implementation (stub for demo)."""
    return [{"title": f"Result for {query}", "url": "https://example.com", "snippet": "..."}]


def process_tool_call(tool_name: str, tool_input: dict) -> str:
    """Execute a tool and return result as string."""
    if tool_name == "get_weather":
        result = get_weather(**tool_input)
    elif tool_name == "search_web":
        result = search_web(**tool_input)
    else:
        return f"Unknown tool: {tool_name}"
    return json.dumps(result)


def agent_with_tools(user_message: str) -> str:
    """Run an agent loop with tool calling."""
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        # If model is done, return its final text
        if response.stop_reason == "end_turn":
            return response.content[0].text

        # Model wants to call tools
        if response.stop_reason == "tool_use":
            # Add model's response to history
            messages.append({"role": "assistant", "content": response.content})

            # Execute each tool call
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = process_tool_call(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            # Add tool results to history
            messages.append({"role": "user", "content": tool_results})
```

## Parallel Tool Calls

Models can request multiple tools in a single turn:

```python
# The model may output multiple tool_use blocks in one response:
# response.content = [
#   ToolUseBlock(name="get_weather", input={"city": "Tokyo"}),
#   ToolUseBlock(name="get_weather", input={"city": "London"}),
#   ToolUseBlock(name="search_web",  input={"query": "Tokyo vs London"}),
# ]

import asyncio

async def execute_tools_parallel(tool_blocks):
    """Execute all tool calls concurrently."""
    async def run_one(block):
        result = await asyncio.to_thread(process_tool_call, block.name, block.input)
        return {"type": "tool_result", "tool_use_id": block.id, "content": result}

    return await asyncio.gather(*[run_one(b) for b in tool_blocks])
```

## Tool Design Best Practices

**Clear descriptions are critical** — the model decides which tool to call based on your description:

```python
# Bad: vague description
{"name": "db_query", "description": "Query the database"}

# Good: specific, includes when to use it
{"name": "db_query", "description": "Query the product database for inventory levels, prices, and SKUs. Use this when the user asks about product availability or pricing."}

# Bad: single giant tool that does everything
{"name": "do_task", "description": "Does the task the user wants"}

# Good: focused tools with clear responsibilities
{"name": "create_order"}
{"name": "cancel_order"}
{"name": "get_order_status"}
```

## Error Handling in Tools

```python
def safe_tool_call(tool_name: str, tool_input: dict) -> str:
    """Wrap tool execution with error handling."""
    try:
        result = process_tool_call(tool_name, tool_input)
        return result
    except ValueError as e:
        return json.dumps({"error": f"Invalid input: {e}"})
    except TimeoutError:
        return json.dumps({"error": "Tool timed out. Try a simpler query."})
    except Exception as e:
        return json.dumps({"error": f"Tool failed: {type(e).__name__}: {e}"})

# Always return results — even errors — so the model can adapt its approach
```

## Key Takeaways

- Tool calling lets LLMs request external function execution via structured output
- Your code executes tools and returns results; the model never runs code directly
- The loop: model requests tool → you execute → return result → model continues
- Parallel tool calls let the model request multiple tools in a single response
- Tool descriptions are critical — be specific about what each tool does and when to use it
