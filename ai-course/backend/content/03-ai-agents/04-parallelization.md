---
title: "Workflows: Parallelization"
description: "Running multiple LLM tasks concurrently and aggregating results"
duration_minutes: 12
order: 4
---

## Why Parallelization Matters

LLM calls are inherently I/O-bound — your code spends most of its time waiting for the API to respond, not doing computation. This makes them ideal candidates for concurrency. If you have five independent LLM tasks that each take two seconds, running them sequentially takes ten seconds. Running them in parallel takes roughly two seconds.

Beyond latency, parallelization enables powerful patterns like voting (run the same prompt multiple times and take the majority answer) and MapReduce (process large documents by splitting them into chunks, processing each chunk independently, then aggregating).

```
Sequential:  --[LLM1]--[LLM2]--[LLM3]--  Total: 6s

Parallel:    --[LLM1]--
             --[LLM2]--  ->  [Aggregate]   Total: 2s
             --[LLM3]--
```

## asyncio Fundamentals for LLM Calls

Python's `asyncio` is the right tool for parallelizing LLM API calls. The OpenAI and Anthropic clients both provide async variants.

```python
import asyncio
from openai import AsyncOpenAI
from typing import List

client = AsyncOpenAI()

async def llm_call(prompt: str, system: str = "", model: str = "gpt-4o-mini") -> str:
    """Single async LLM call."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
    )
    return response.choices[0].message.content

async def parallel_llm_calls(prompts: List[str], system: str = "") -> List[str]:
    """Run multiple LLM calls in parallel and return all results."""
    tasks = [llm_call(prompt, system) for prompt in prompts]
    results = await asyncio.gather(*tasks)
    return list(results)

async def main():
    questions = [
        "What is gradient descent?",
        "What is backpropagation?",
        "What is an attention mechanism?",
    ]
    answers = await parallel_llm_calls(questions, system="Answer concisely in 2 sentences.")
    for q, a in zip(questions, answers):
        print(f"Q: {q}\nA: {a}\n")

asyncio.run(main())
```

## Sectioning: Split, Process, Aggregate

The sectioning pattern splits a large task into independent chunks, processes each in parallel, then aggregates the results. This is essential for handling documents that exceed context windows or for speeding up large-scale processing.

```python
import asyncio
from openai import AsyncOpenAI
from typing import List

client = AsyncOpenAI()

def chunk_text(text: str, chunk_size: int = 2000) -> List[str]:
    """Split text into chunks of approximately chunk_size words."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

async def summarize_chunk(chunk: str, chunk_index: int) -> dict:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content":
             "Summarize the following text concisely, preserving key facts."},
            {"role": "user", "content": chunk},
        ],
    )
    return {
        "index": chunk_index,
        "summary": response.choices[0].message.content,
    }

async def summarize_large_document(document: str) -> str:
    """Summarize a document too large for a single context window."""
    chunks = chunk_text(document, chunk_size=1500)
    print(f"Processing {len(chunks)} chunks in parallel...")

    # Process all chunks simultaneously
    tasks = [summarize_chunk(chunk, i) for i, chunk in enumerate(chunks)]
    chunk_results = await asyncio.gather(*tasks)

    # Sort by index to maintain document order
    chunk_results.sort(key=lambda x: x["index"])
    chunk_summaries = [r["summary"] for r in chunk_results]

    # Final aggregation step
    combined = "\n\n".join([f"Section {i+1}:\n{s}"
                               for i, s in enumerate(chunk_summaries)])

    final_response = await client.chat.completions.create(
        model="gpt-4o",  # Stronger model for final synthesis
        messages=[
            {"role": "system", "content":
             "Synthesize these section summaries into a single coherent summary."},
            {"role": "user", "content": combined},
        ],
    )
    return final_response.choices[0].message.content

summary = asyncio.run(summarize_large_document(very_long_document))
```

## Voting: Multiple Completions for Reliability

The voting pattern runs the same prompt multiple times with temperature > 0 and takes the most common answer. This reduces variance and improves reliability for tasks with well-defined correct answers.

```python
import asyncio
from collections import Counter
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def single_completion(prompt: str, temperature: float = 0.7) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()

async def majority_vote(prompt: str, n: int = 5, temperature: float = 0.7) -> str:
    """Run prompt n times and return the most common answer."""
    tasks = [single_completion(prompt, temperature) for _ in range(n)]
    responses = await asyncio.gather(*tasks)

    vote_counts = Counter(responses)
    winner, count = vote_counts.most_common(1)[0]

    print(f"Voting results ({n} completions):")
    for response, votes in vote_counts.most_common():
        print(f"  '{response}': {votes} vote(s)")

    return winner

async def main():
    question = "Is Python's GIL released during I/O operations? Answer only Yes or No."
    answer = await majority_vote(question, n=5)
    print(f"\nFinal answer: {answer}")

asyncio.run(main())
```

## MapReduce for LLMs

MapReduce is the generalized version of sectioning. The Map phase applies a function to each item independently in parallel. The Reduce phase aggregates the mapped results.

```python
import asyncio
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import List

client = AsyncOpenAI()

class SentimentResult(BaseModel):
    text_snippet: str
    sentiment: str   # positive, negative, neutral
    score: float     # -1.0 to 1.0
    key_phrases: list[str]

async def map_sentiment(review: str) -> SentimentResult:
    """MAP: Analyze sentiment of a single review."""
    response = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Analyze the sentiment of product reviews."},
            {"role": "user", "content": f"Review: {review}"},
        ],
        response_format=SentimentResult,
    )
    result = response.choices[0].message.parsed
    result.text_snippet = review[:100]
    return result

async def reduce_sentiments(results: List[SentimentResult]) -> str:
    """REDUCE: Aggregate individual analyses into an overall report."""
    summaries = "\n".join([
        f"- Sentiment: {r.sentiment} ({r.score:+.2f}), "
        f"Key phrases: {', '.join(r.key_phrases[:3])}"
        for r in results
    ])
    avg_score = sum(r.score for r in results) / len(results)
    pos = sum(1 for r in results if r.sentiment == "positive")
    neg = sum(1 for r in results if r.sentiment == "negative")
    neu = sum(1 for r in results if r.sentiment == "neutral")

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Write a concise product sentiment report."},
            {"role": "user", "content":
             f"Analyzed {len(results)} reviews.\n"
             f"Average score: {avg_score:+.2f}\n"
             f"Positive: {pos}, Negative: {neg}, Neutral: {neu}\n\n"
             f"Individual analyses:\n{summaries}"},
        ],
    )
    return response.choices[0].message.content

async def mapreduce_reviews(reviews: List[str]) -> str:
    print(f"Mapping {len(reviews)} reviews in parallel...")
    map_tasks = [map_sentiment(review) for review in reviews]
    mapped_results = await asyncio.gather(*map_tasks)
    print("Reducing results...")
    report = await reduce_sentiments(list(mapped_results))
    return report

reviews = ["Great product!", "Terrible quality.", "Average, nothing special."]
report = asyncio.run(mapreduce_reviews(reviews))
print(report)
```

## Handling Errors and Rate Limits in Parallel Calls

Parallel calls amplify rate limit pressure. Use semaphores to cap concurrency and implement exponential backoff.

```python
import asyncio
import random
from openai import AsyncOpenAI, RateLimitError

client = AsyncOpenAI()

async def llm_call_with_retry(
    prompt: str,
    semaphore: asyncio.Semaphore,
    max_retries: int = 3,
) -> str:
    async with semaphore:  # Limit concurrent API calls
        for attempt in range(max_retries):
            try:
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content
            except RateLimitError:
                if attempt == max_retries - 1:
                    raise
                wait = (2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limited. Waiting {wait:.1f}s (attempt {attempt + 1})")
                await asyncio.sleep(wait)
        return ""

async def safe_parallel_calls(prompts: list[str], max_concurrent: int = 10) -> list[str]:
    """Run parallel LLM calls with concurrency limit and retry."""
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [llm_call_with_retry(p, semaphore) for p in prompts]
    return list(await asyncio.gather(*tasks))
```

## Key Takeaways

- LLM calls are I/O-bound — parallelizing them with asyncio can reduce total latency from N*T to roughly T.
- The sectioning pattern splits large tasks into independent chunks, processes them in parallel, and aggregates.
- Voting runs the same prompt multiple times and takes the majority answer to improve reliability on classification and factual tasks.
- MapReduce generalizes sectioning: map applies a function to each item in parallel, reduce aggregates the results.
- Always use semaphores to cap concurrency and retry logic with exponential backoff to handle rate limits gracefully.
