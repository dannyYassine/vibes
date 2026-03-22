---
title: "Project: Build an Ask-the-Web Agent"
description: "Build a ReACT-style agent that searches the web, reads pages, and synthesizes answers to complex questions"
duration_minutes: 30
order: 13
---

## What You'll Build

An **Ask-the-Web agent** that answers complex, current-events questions by:
1. Searching the web for relevant results
2. Fetching and reading page content
3. Reasoning across multiple sources
4. Synthesizing a cited, accurate answer

This applies ReACT (lesson 09), tool calling (lesson 07), and reflection (lesson 05) in one cohesive project.

## Tools the Agent Will Use

```python
import anthropic
import httpx
import json
import re
from urllib.parse import urlparse

client = anthropic.Anthropic()

TOOLS = [
    {
        "name": "search",
        "description": "Search the web for current information. Returns a list of results with titles, URLs, and snippets.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "num_results": {"type": "integer", "description": "Number of results (1-10)", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "fetch_page",
        "description": "Fetch and extract the text content of a web page. Use this to read the full content of a search result.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL of the page to fetch"},
            },
            "required": ["url"],
        },
    },
    {
        "name": "extract_facts",
        "description": "Extract key facts from a piece of text relevant to a specific question.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to extract facts from"},
                "question": {"type": "string", "description": "What question are we trying to answer?"},
            },
            "required": ["text", "question"],
        },
    },
]
```

## Tool Implementations

```python
async def search(query: str, num_results: int = 5) -> str:
    """
    Search using a real search API.
    Options: Brave Search API, Serper, Tavily, SerpAPI
    """
    async with httpx.AsyncClient() as http:
        # Using Brave Search as example
        response = await http.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY},
            params={"q": query, "count": num_results},
            timeout=10,
        )
        data = response.json()

    results = []
    for item in data.get("web", {}).get("results", []):
        results.append({
            "title": item.get("title"),
            "url": item.get("url"),
            "snippet": item.get("description"),
        })

    return json.dumps(results)


async def fetch_page(url: str) -> str:
    """Fetch page content and extract readable text."""
    # Validate URL
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return json.dumps({"error": "Invalid URL scheme"})

    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http:
        try:
            response = await http.get(url, headers={"User-Agent": "Mozilla/5.0"})
            html = response.text
        except Exception as e:
            return json.dumps({"error": f"Failed to fetch: {e}"})

    # Strip HTML tags (use trafilatura in production for better extraction)
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Truncate to fit in context
    return json.dumps({"url": url, "content": text[:4000]})


def extract_facts(text: str, question: str) -> str:
    """Use Claude to extract relevant facts from text."""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # Use faster/cheaper model for this subtask
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": f"Question: {question}\n\nText:\n{text}\n\nExtract only the facts directly relevant to answering the question. Be concise.",
        }],
    )
    return response.content[0].text


async def execute_tool(name: str, tool_input: dict) -> str:
    """Route tool calls to implementations."""
    if name == "search":
        return await search(tool_input["query"], tool_input.get("num_results", 5))
    elif name == "fetch_page":
        return await fetch_page(tool_input["url"])
    elif name == "extract_facts":
        return extract_facts(tool_input["text"], tool_input["question"])
    return json.dumps({"error": f"Unknown tool: {name}"})
```

## The Agent System Prompt

```python
AGENT_SYSTEM = """You are a research assistant that answers questions by searching the web.

Follow this process:
1. Search for relevant information using the search tool
2. Fetch full page content for the most promising results
3. Extract key facts relevant to the question
4. Synthesize a comprehensive, cited answer

Guidelines:
- Always verify information from at least 2 sources
- Cite sources with [Source: URL] in your final answer
- If you find conflicting information, note the discrepancy
- Be honest about uncertainty
- Keep intermediate steps focused and efficient"""
```

## The Main Agent Loop

```python
import asyncio

async def ask_the_web(question: str, max_steps: int = 12) -> str:
    """Run the Ask-the-Web agent."""
    messages = [{"role": "user", "content": question}]

    for step in range(max_steps):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=AGENT_SYSTEM,
            tools=TOOLS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            # Agent is done
            return next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )

        if response.stop_reason == "tool_use":
            # Execute all tool calls (potentially in parallel)
            tool_blocks = [b for b in response.content if b.type == "tool_use"]

            results = await asyncio.gather(*[
                execute_tool(b.name, b.input) for b in tool_blocks
            ])

            tool_results = [
                {"type": "tool_result", "tool_use_id": b.id, "content": r}
                for b, r in zip(tool_blocks, results)
            ]
            messages.append({"role": "user", "content": tool_results})

    return "Reached maximum steps. Here's what I found so far: " + \
           next((b.text for b in messages[-1]["content"] if isinstance(b, dict) and b.get("text")), "")
```

## Adding a FastAPI Endpoint

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

class QuestionRequest(BaseModel):
    question: str

@app.post("/ask")
async def ask_endpoint(request: QuestionRequest):
    """Streaming endpoint for the ask-the-web agent."""
    async def stream():
        yield f"data: {json.dumps({'status': 'searching', 'message': 'Searching the web...'})}\n\n"

        answer = await ask_the_web(request.question)

        yield f"data: {json.dumps({'status': 'complete', 'answer': answer})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
```

## Example Session

```
Question: "What are the latest developments in quantum computing in 2025?"

Step 1 — search("quantum computing breakthroughs 2025")
  → 5 results: IBM, Google, Nature paper, MIT News, TechCrunch

Step 2 — fetch_page("https://research.ibm.com/blog/quantum-2025")
  → Full article about IBM's 1000+ qubit processor

Step 3 — fetch_page("https://ai.googleblog.com/quantum-supremacy-2025")
  → Google's announcement of error-corrected logical qubits

Step 4 — extract_facts(ibm_content, "quantum computing 2025")
  → "IBM released Eagle processor with 1,121 qubits in Q1 2025..."

Step 5 — extract_facts(google_content, "quantum computing 2025")
  → "Google demonstrated 100 logical qubits with error rates below 0.1%..."

Final Answer: "In 2025, quantum computing saw two major milestones:
IBM released the Eagle processor with 1,121 physical qubits [Source: research.ibm.com].
Google demonstrated 100 error-corrected logical qubits [Source: ai.googleblog.com]..."
```

## What You've Applied

| Concept | Where Used |
|---------|-----------|
| Tool calling | search, fetch_page, extract_facts |
| ReACT pattern | Thought → Action → Observation loop |
| Parallel execution | Multiple tool calls per step |
| Orchestration-worker | extract_facts uses a cheaper sub-model |
| Reflection | System prompt instructs verification from 2+ sources |

## Key Takeaways

- The ask-the-web agent combines search + fetch + extract in a ReACT loop
- Parallel tool execution significantly reduces wall-clock time
- Using a smaller model for extract_facts reduces cost on the high-volume subtask
- Streaming SSE lets the frontend show progress during the multi-second agent run
- Always cite sources — verifiability is what distinguishes a research agent from hallucination
