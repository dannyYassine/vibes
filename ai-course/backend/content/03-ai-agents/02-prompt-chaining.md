---
title: "Workflows: Prompt Chaining"
description: "Building multi-step workflows by chaining LLM calls with structured handoffs"
duration_minutes: 14
order: 2
---

## What Is Prompt Chaining?

Prompt chaining is the practice of connecting multiple LLM calls together where the output of one call becomes the input to the next. Instead of asking a single model to do everything in one shot, you decompose the task into smaller, more focused steps and feed results through a pipeline.

This is one of the most practical and reliable workflow patterns. Each step in the chain can be optimized independently — you can use a cheaper model for simple steps and a more powerful model for complex reasoning. You can also validate and transform outputs between steps.

```python
# Single shot — harder for the model, less reliable
response = llm.invoke(
    "Read this code, find all bugs, explain each one, "
    "then rewrite the fixed version with comments"
)

# Prompt chain — each step is focused and verifiable
code_analysis = llm.invoke(f"Identify all bugs in this code:\n{code}")
explanations = llm.invoke(f"Explain each bug in plain English:\n{code_analysis}")
fixed_code = llm.invoke(f"Rewrite the code fixing these bugs:\n{code_analysis}")
commented_code = llm.invoke(f"Add inline comments explaining the fixes:\n{fixed_code}")
```

## Sequential Chains

The most common pattern: Step A produces output, Step B consumes it, Step C consumes Step B's output, and so on. Each step can add structure, refine, translate, or transform the data.

```python
from openai import OpenAI

client = OpenAI()

def llm_call(system: str, user: str, model: str = "gpt-4o-mini") -> str:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content

def write_article(topic: str) -> str:
    # Step 1: Generate outline
    outline = llm_call(
        system="You are an expert technical writer.",
        user=f"Create a detailed outline for an article about: {topic}. "
             "Return a JSON array of section titles and bullet points.",
    )

    # Step 2: Write draft from outline
    draft = llm_call(
        system="You are a technical writer. Write clearly and concisely.",
        user=f"Write a full article based on this outline:\n{outline}",
        model="gpt-4o",  # Use stronger model for actual writing
    )

    # Step 3: Polish and format
    polished = llm_call(
        system="You are a copy editor. Fix grammar, improve flow, ensure consistency.",
        user=f"Polish this article draft:\n{draft}",
    )

    return polished

result = write_article("Vector databases and similarity search")
```

## Parallel Chains

Some steps are independent and can run concurrently, dramatically reducing total latency. Use `asyncio` to run independent LLM calls in parallel.

```python
import asyncio
from openai import AsyncOpenAI

async_client = AsyncOpenAI()

async def llm_call_async(system: str, user: str, model: str = "gpt-4o-mini") -> str:
    response = await async_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content

async def analyze_document_parallel(document: str) -> dict:
    """Run multiple analyses on a document simultaneously."""

    # All three tasks are independent — run them in parallel
    summary_task = llm_call_async(
        "Summarize documents concisely.",
        f"Summarize:\n{document}",
    )
    sentiment_task = llm_call_async(
        "You classify sentiment as positive, negative, or neutral.",
        f"Classify sentiment:\n{document}",
    )
    keywords_task = llm_call_async(
        "Extract key topics and entities as a JSON array.",
        f"Extract keywords:\n{document}",
    )

    # Wait for all three simultaneously
    summary, sentiment, keywords = await asyncio.gather(
        summary_task, sentiment_task, keywords_task
    )

    # Combine results in a final synthesis step
    synthesis = await llm_call_async(
        "Combine analysis results into a structured report.",
        f"Summary: {summary}\nSentiment: {sentiment}\nKeywords: {keywords}",
    )

    return {
        "summary": summary,
        "sentiment": sentiment,
        "keywords": keywords,
        "report": synthesis,
    }

results = asyncio.run(analyze_document_parallel(document_text))
```

## Conditional Branching

Chains can branch based on the content of intermediate outputs. This is where prompt chaining starts to look like a workflow with decision logic.

```python
from enum import Enum

class ContentType(str, Enum):
    TECHNICAL = "technical"
    BUSINESS = "business"
    GENERAL = "general"

def classify_content(text: str) -> ContentType:
    response = llm_call(
        system="Classify the following text. Return only one word: "
               "'technical', 'business', or 'general'.",
        user=text,
    )
    return ContentType(response.strip().lower())

def process_with_branching(user_query: str) -> str:
    # Step 1: Classify the query
    content_type = classify_content(user_query)

    # Step 2: Branch based on classification
    if content_type == ContentType.TECHNICAL:
        system_prompt = (
            "You are a senior software engineer. "
            "Provide precise technical details with code examples."
        )
    elif content_type == ContentType.BUSINESS:
        system_prompt = (
            "You are a business analyst. "
            "Focus on ROI, strategy, and business impact."
        )
    else:
        system_prompt = "You are a helpful assistant. Keep answers clear and accessible."

    # Step 3: Generate specialized response
    response = llm_call(
        system=system_prompt,
        user=user_query,
        model="gpt-4o",
    )

    return response

answer = process_with_branching("How does transformer attention complexity scale?")
```

## Output Parsing Between Steps

Structured output parsing between steps is crucial for reliable chaining. Use Pydantic models and structured outputs to ensure data flows cleanly between steps.

```python
from pydantic import BaseModel
from typing import List
from openai import OpenAI

client = OpenAI()

class ResearchPlan(BaseModel):
    topic: str
    search_queries: List[str]
    key_questions: List[str]
    expected_sources: List[str]

def generate_research_plan(topic: str) -> ResearchPlan:
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Create detailed research plans."},
            {"role": "user", "content": f"Create a research plan for: {topic}"},
        ],
        response_format=ResearchPlan,
    )
    return response.choices[0].message.parsed

class ResearchReport(BaseModel):
    executive_summary: str
    findings: List[str]
    conclusions: str
    confidence_score: float

def generate_report(plan: ResearchPlan, gathered_data: str) -> ResearchReport:
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Write structured research reports."},
            {"role": "user", "content":
             f"Plan: {plan.model_dump_json()}\n\nData: {gathered_data}"},
        ],
        response_format=ResearchReport,
    )
    return response.choices[0].message.parsed

# Clean pipeline with typed handoffs
plan = generate_research_plan("Impact of AI on software engineering jobs")
data = gather_data(plan.search_queries)  # Your data gathering logic
report = generate_report(plan, data)
print(f"Confidence: {report.confidence_score}")
print(report.executive_summary)
```

## Gate Checks Between Steps

A powerful refinement: add a validation gate between steps that can reject bad outputs and retry before passing data to the next step.

```python
from pydantic import BaseModel
from typing import Optional

class QualityCheck(BaseModel):
    passes: bool
    issues: Optional[str] = None
    suggestions: Optional[str] = None

def quality_gate(content: str, criteria: str) -> QualityCheck:
    """Validate step output before proceeding."""
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content":
             f"Evaluate if this content meets these criteria: {criteria}. "
             "Be strict but fair."},
            {"role": "user", "content": content},
        ],
        response_format=QualityCheck,
    )
    return response.choices[0].message.parsed

def chained_pipeline_with_gates(topic: str) -> str:
    max_retries = 3

    for attempt in range(max_retries):
        outline = llm_call(
            "Create a detailed technical article outline.",
            f"Topic: {topic}",
        )

        # Gate: validate outline quality before drafting
        check = quality_gate(
            outline,
            "Must have at least 5 sections, each with 3+ bullet points, "
            "and cover both theory and practical examples."
        )

        if check.passes:
            break
        print(f"Outline failed quality gate (attempt {attempt+1}): {check.issues}")
    else:
        raise ValueError("Failed to generate quality outline after retries")

    draft = llm_call("Write a comprehensive technical article.", f"Outline:\n{outline}")
    return draft
```

## When to Use Prompt Chaining vs Agents

Use **prompt chaining** when:
- The task decomposition is known in advance and does not change based on intermediate results.
- You need predictable, testable, auditable behavior.
- You want to use different models optimized for each step.
- Latency and cost need to be tightly controlled.

Use **agents** when:
- The number of steps required is not known ahead of time.
- The next action depends on the result of the previous action in unpredictable ways.
- The task requires open-ended exploration such as debugging an unknown system.

## Key Takeaways

- Prompt chaining decomposes complex tasks into focused, sequential LLM calls with clean handoffs between steps.
- Sequential chains improve reliability; parallel chains reduce latency for independent subtasks.
- Conditional branching lets you route to specialized prompts or models based on intermediate outputs.
- Always use structured output with Pydantic between steps to avoid parsing failures.
- Add quality gates between steps to catch bad outputs before they propagate through the pipeline.
- Prefer chaining over agents when the task structure is known in advance — it is cheaper, faster, and easier to test.
