---
title: "Project: Build Deep Research"
description: "Build a multi-step research agent that plans, searches, reasons, and synthesizes comprehensive reports"
duration_minutes: 30
order: 11
---

## What You'll Build

A **Deep Research agent** that takes a complex question, breaks it into sub-questions, searches the web for each, synthesizes findings, and produces a structured research report — similar to Perplexity's Deep Research or OpenAI's Deep Research feature.

## System Architecture

```
User Query
    ↓
[Planner] → sub-questions + search queries
    ↓
[Search Loop] → for each sub-question:
    → web search → extract relevant content → scrape pages
    ↓
[Reasoner] → synthesize findings, identify gaps
    ↓
[Report Generator] → structured markdown report
```

## Step 1: The Research Planner

```python
import asyncio
import json
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

PLANNER_PROMPT = """You are a research planner. Given a research question, break it into 4-6 focused sub-questions that together would answer the original question comprehensively.

For each sub-question, provide:
1. The sub-question itself
2. 2-3 search queries to find relevant information

Output as JSON with this structure:
{
  "sub_questions": [
    {
      "question": "...",
      "search_queries": ["...", "...", "..."]
    }
  ]
}"""


async def plan_research(question: str) -> dict:
    """Break a research question into sub-questions with search queries."""
    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": f"{PLANNER_PROMPT}\n\nResearch question: {question}"}
        ],
    )

    text = response.content[0].text
    # Extract JSON from response
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
```

## Step 2: Web Search Integration

```python
import httpx

async def search_web(query: str, num_results: int = 5) -> list[dict]:
    """Search using a search API (e.g., Brave, Serper, Tavily)."""
    async with httpx.AsyncClient() as http:
        response = await http.get(
            "https://api.search-provider.com/search",
            params={"q": query, "count": num_results},
            headers={"Authorization": f"Bearer {SEARCH_API_KEY}"},
        )
        results = response.json()

    return [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"]}
        for r in results.get("results", [])
    ]


async def fetch_page_content(url: str) -> str:
    """Fetch and extract text from a web page."""
    async with httpx.AsyncClient(timeout=10) as http:
        try:
            response = await http.get(url, follow_redirects=True)
            # In production: use readability or trafilatura to extract main content
            # Here we simplify:
            text = response.text
            # Basic HTML stripping (use proper HTML parser in production)
            import re
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:3000]  # Truncate to fit context
        except Exception:
            return ""
```

## Step 3: The Research Loop

```python
async def research_sub_question(
    sub_question: dict,
    max_sources: int = 3,
) -> dict:
    """Research a single sub-question by searching and reading sources."""
    findings = []

    for query in sub_question["search_queries"]:
        results = await search_web(query, num_results=3)

        for result in results[:2]:  # Top 2 per query
            content = await fetch_page_content(result["url"])
            if content:
                findings.append({
                    "source": result["url"],
                    "title": result["title"],
                    "content": content,
                })

        if len(findings) >= max_sources:
            break

    return {
        "question": sub_question["question"],
        "findings": findings,
    }


async def conduct_research(plan: dict) -> list[dict]:
    """Run all sub-questions in parallel."""
    tasks = [
        research_sub_question(sq)
        for sq in plan["sub_questions"]
    ]
    return await asyncio.gather(*tasks)
```

## Step 4: Synthesis with Chain-of-Thought

```python
SYNTHESIS_PROMPT = """You are a research analyst. Given the following research findings for a sub-question, synthesize a clear, accurate answer supported by the sources.

Sub-question: {question}

Sources:
{sources}

Think through what the sources tell us, note any conflicting information, and provide a well-reasoned synthesis with citations."""


async def synthesize_findings(research_result: dict) -> str:
    """Synthesize findings for one sub-question using CoT."""
    sources_text = "\n\n".join([
        f"Source [{i+1}]: {f['title']}\nURL: {f['source']}\n{f['content']}"
        for i, f in enumerate(research_result["findings"])
    ])

    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": SYNTHESIS_PROMPT.format(
                question=research_result["question"],
                sources=sources_text,
            ),
        }],
    )
    return response.content[0].text
```

## Step 5: Report Generation

```python
REPORT_PROMPT = """You are a research writer. Based on the following synthesized findings across multiple sub-questions, write a comprehensive research report.

Original question: {original_question}

Findings:
{findings}

Write a well-structured report with:
1. An executive summary (3-4 sentences)
2. Main sections covering each aspect of the research
3. A conclusion with key takeaways
4. Any caveats or limitations of the research

Use markdown formatting."""


async def generate_report(
    original_question: str,
    synthesized_findings: list[str],
    sub_questions: list[dict],
) -> str:
    """Generate the final research report."""
    findings_text = "\n\n".join([
        f"## {sq['question']}\n{finding}"
        for sq, finding in zip(sub_questions, synthesized_findings)
    ])

    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": REPORT_PROMPT.format(
                original_question=original_question,
                findings=findings_text,
            ),
        }],
    )
    return response.content[0].text
```

## Step 6: Streaming API Endpoint

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()


async def research_pipeline(question: str):
    """Full pipeline with streaming progress updates."""
    # Stage 1: Planning
    yield f"data: {json.dumps({'stage': 'planning', 'message': 'Breaking down research question...'})}\n\n"
    plan = await plan_research(question)
    yield f"data: {json.dumps({'stage': 'planned', 'sub_questions': len(plan['sub_questions'])})}\n\n"

    # Stage 2: Research
    yield f"data: {json.dumps({'stage': 'researching', 'message': 'Searching and reading sources...'})}\n\n"
    research_results = await conduct_research(plan)
    yield f"data: {json.dumps({'stage': 'researched', 'sources_found': sum(len(r['findings']) for r in research_results)})}\n\n"

    # Stage 3: Synthesis
    yield f"data: {json.dumps({'stage': 'synthesizing', 'message': 'Synthesizing findings...'})}\n\n"
    synthesis_tasks = [synthesize_findings(r) for r in research_results]
    syntheses = await asyncio.gather(*synthesis_tasks)

    # Stage 4: Report
    yield f"data: {json.dumps({'stage': 'writing', 'message': 'Writing final report...'})}\n\n"
    report = await generate_report(question, syntheses, plan["sub_questions"])

    yield f"data: {json.dumps({'stage': 'complete', 'report': report})}\n\n"


@app.post("/research")
async def deep_research(request: dict):
    return StreamingResponse(
        research_pipeline(request["question"]),
        media_type="text/event-stream",
    )
```

## What You've Applied

This project exercises every reasoning technique from the module:

| Technique | Where Used |
|-----------|-----------|
| CoT prompting | Synthesis step: think through sources |
| Sequential revision | Could add: refine report after initial draft |
| Tree of Thoughts | Planner: branches into parallel sub-questions |
| Search against verifier | Web search validates claims |
| STaR pattern | System could self-improve with feedback |

## Key Takeaways

- Deep research decomposes complex queries into searchable sub-questions
- Parallel execution of sub-question research speeds up the pipeline significantly
- Chain-of-thought synthesis produces more accurate and better-cited answers
- Streaming responses provide user feedback for long-running pipelines
- The pipeline can be extended: add re-ranking, gap analysis, follow-up loops
