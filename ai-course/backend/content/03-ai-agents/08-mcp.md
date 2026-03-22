---
title: "Tools: MCP"
description: "Model Context Protocol — a standard for connecting LLMs to external tools and data sources"
duration_minutes: 12
order: 8
---

## What Is MCP?

The **Model Context Protocol** (MCP) is an open standard introduced by Anthropic for connecting LLMs to external tools, data sources, and services. It defines a uniform interface so any LLM host can use any MCP server without custom integration code.

Think of it like USB: any USB device works with any USB port. MCP aims to be the USB for LLM tools.

```
Without MCP:
  Claude ←→ custom integration ←→ GitHub
  Claude ←→ different custom code ←→ Postgres
  Claude ←→ yet another integration ←→ Slack

With MCP:
  Claude ←→ MCP protocol ←→ GitHub MCP Server
  Claude ←→ MCP protocol ←→ Postgres MCP Server
  Claude ←→ MCP protocol ←→ Slack MCP Server
```

## MCP Architecture

An MCP system has three components:

- **Host**: the LLM application (Claude Desktop, an IDE, your app)
- **Client**: manages the connection between host and server
- **Server**: exposes tools, resources, and prompts to the host

```
Host (Claude Desktop / your app)
    └── MCP Client
            ├── MCP Server A (filesystem)
            ├── MCP Server B (GitHub)
            └── MCP Server C (your database)
```

## MCP Primitives

MCP servers expose three types of capabilities:

### Tools
Functions the LLM can call (like regular tool calling):
```json
{
  "name": "read_file",
  "description": "Read the contents of a file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {"type": "string"}
    },
    "required": ["path"]
  }
}
```

### Resources
Data sources the LLM can read (files, DB rows, API responses):
```json
{
  "uri": "file:///home/user/project/README.md",
  "name": "README.md",
  "mimeType": "text/markdown"
}
```

### Prompts
Pre-written prompt templates the host can offer users:
```json
{
  "name": "code_review",
  "description": "Review code for bugs and improvements",
  "arguments": [{"name": "language", "required": true}]
}
```

## Building an MCP Server

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
import asyncio
import json

app = Server("my-tools-server")


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get_stock_price",
            description="Get the current stock price for a ticker symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker, e.g. AAPL"},
                },
                "required": ["ticker"],
            },
        ),
        types.Tool(
            name="calculate",
            description="Perform a mathematical calculation",
            inputSchema={
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Math expression to evaluate"},
                },
                "required": ["expression"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "get_stock_price":
        ticker = arguments["ticker"]
        # In production: call a real stock API
        price = 150.25  # stub
        return [types.TextContent(
            type="text",
            text=json.dumps({"ticker": ticker, "price": price, "currency": "USD"}),
        )]

    elif name == "calculate":
        try:
            # Safe eval for math only
            import ast
            result = eval(
                compile(ast.parse(arguments["expression"], mode="eval"), "", "eval"),
                {"__builtins__": {}},
                {},
            )
            return [types.TextContent(type="text", text=str(result))]
        except Exception as e:
            return [types.TextContent(type="text", text=f"Error: {e}")]

    raise ValueError(f"Unknown tool: {name}")


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

## Connecting to an MCP Server Programmatically

```python
from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run_with_mcp_server():
    server_params = StdioServerParameters(
        command="python3",
        args=["my_mcp_server.py"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Discover available tools from the MCP server
            tools_result = await session.list_tools()
            tools = [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.inputSchema,
                }
                for t in tools_result.tools
            ]

            # Use tools with Claude
            client = Anthropic()
            response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=1024,
                tools=tools,
                messages=[{"role": "user", "content": "What's the price of AAPL stock?"}],
            )

            # Handle tool calls from the MCP server
            for block in response.content:
                if block.type == "tool_use":
                    result = await session.call_tool(block.name, block.input)
                    # Continue the conversation with result...
```

## MCP vs. Custom Tool Calling

| Aspect | Custom Tool Calling | MCP |
|--------|--------------------|----|
| Setup | Write integration code per tool | Use existing MCP servers |
| Reusability | App-specific | Any MCP-compatible host |
| Discovery | Manual | Automatic via list_tools() |
| Ecosystem | Your tools only | Growing library of servers |

## Key Takeaways

- MCP standardizes how LLMs connect to external tools and data sources
- Servers expose tools (functions), resources (data), and prompts (templates)
- Any MCP-compatible host can use any MCP server without custom integration
- Building an MCP server is straightforward with the `mcp` Python SDK
- The MCP ecosystem is growing: servers exist for GitHub, Postgres, Slack, filesystem, and more
