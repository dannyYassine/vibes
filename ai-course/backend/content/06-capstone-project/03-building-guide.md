---
title: "Build with Techniques from the Course"
description: "Architecture patterns and implementation guidance for building your capstone"
duration_minutes: 20
order: 3
---

## Architecture First

Before writing code, sketch your architecture. A simple diagram prevents many hours of refactoring.

```
User Request
    ↓
[Frontend] ← HTML/JS or React
    ↓ HTTP/WebSocket
[FastAPI Backend]
    ├── Auth & Rate Limiting
    ├── Request Validation
    ├── [Core AI Pipeline]
    │   ├── Pre-processing
    │   ├── LLM Call(s)
    │   └── Post-processing
    └── Response Streaming
         ↓
[Storage]
    ├── SQLite/PostgreSQL (users, sessions)
    ├── Vector DB (embeddings)
    └── File Storage (uploads)
```

## Recommended Tech Stack

Based on what you've learned in this course:

```python
# requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.29.0
openai==1.20.0
anthropic==0.25.0
langchain==0.1.20        # Optional: orchestration
chromadb==0.4.24         # Vector store
sentence-transformers==2.6.0  # Embeddings
python-multipart==0.0.9  # File uploads
pydantic-settings==2.2.1
sqlalchemy==2.0.28
python-jose[cryptography]==3.3.0
bcrypt==4.1.3
```

## Implementing RAG (if using)

```python
# rag/pipeline.py
from pathlib import Path
import chromadb
from openai import AsyncOpenAI
from sentence_transformers import SentenceTransformer

class RAGPipeline:
    def __init__(self):
        self.client = AsyncOpenAI()
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        self.chroma = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.chroma.get_or_create_collection("documents")

    def ingest(self, documents: list[dict]):
        """Ingest documents into the vector store."""
        texts = [doc['content'] for doc in documents]
        embeddings = self.embedder.encode(texts).tolist()

        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=[doc.get('metadata', {}) for doc in documents],
            ids=[doc['id'] for doc in documents],
        )

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        """Retrieve relevant documents for a query."""
        query_embedding = self.embedder.encode([query]).tolist()
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=top_k,
        )
        return results['documents'][0]

    async def query(self, question: str, chat_history: list = None) -> str:
        """Full RAG pipeline: retrieve + generate."""
        # Retrieve relevant context
        context_docs = self.retrieve(question)
        context = "\n\n".join(context_docs)

        # Build messages
        messages = []
        if chat_history:
            messages.extend(chat_history[-6:])  # Last 3 turns

        messages.append({
            "role": "user",
            "content": f"""Answer based on the context below.

Context:
{context}

Question: {question}

If the answer is not in the context, say so clearly."""
        })

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Answer questions based on the provided context."},
                *messages
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content
```

## Implementing Agents (if using)

```python
# agents/base_agent.py
import json
from openai import AsyncOpenAI
from typing import Callable

class Agent:
    def __init__(self, system_prompt: str, tools: list[dict], tool_functions: dict[str, Callable]):
        self.client = AsyncOpenAI()
        self.system_prompt = system_prompt
        self.tools = tools
        self.tool_functions = tool_functions
        self.max_iterations = 10

    async def run(self, user_message: str) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]

        for iteration in range(self.max_iterations):
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
            )

            message = response.choices[0].message
            messages.append(message.model_dump())

            # No tool calls = final answer
            if not message.tool_calls:
                return message.content

            # Execute tool calls
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)

                if func_name in self.tool_functions:
                    try:
                        result = await self.tool_functions[func_name](**func_args)
                    except Exception as e:
                        result = f"Error: {str(e)}"
                else:
                    result = f"Unknown tool: {func_name}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result),
                })

        return "Max iterations reached without a final answer."
```

## FastAPI Streaming Endpoint

Almost all modern AI apps benefit from streaming:

```python
# api/routes.py
import asyncio
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None

@router.post("/query")
async def query_endpoint(req: QueryRequest):
    async def generate():
        try:
            # Stream from your AI pipeline
            stream = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=build_messages(req),
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {json.dumps({'text': delta.content})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

## Error Handling Patterns

Production systems need defensive error handling:

```python
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    reraise=True,
)
async def call_llm_with_retry(messages: list) -> str:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            timeout=30,
        )
        return response.choices[0].message.content
    except openai.RateLimitError:
        logger.warning("Rate limited, retrying...")
        raise
    except openai.APITimeoutError:
        logger.warning("API timeout, retrying...")
        raise
    except openai.APIError as e:
        logger.error(f"API error: {e}")
        raise
```

## Testing Your System

```python
# tests/test_pipeline.py
import pytest
from your_module import RAGPipeline

@pytest.mark.asyncio
async def test_basic_query():
    pipeline = RAGPipeline()

    # Ingest test document
    pipeline.ingest([{
        "id": "test-1",
        "content": "The capital of France is Paris.",
        "metadata": {"source": "test"},
    }])

    # Query
    result = await pipeline.query("What is the capital of France?")

    assert "Paris" in result
    assert len(result) > 10

@pytest.mark.asyncio
async def test_unknown_query():
    pipeline = RAGPipeline()

    result = await pipeline.query("What is the airspeed velocity of an unladen swallow?")

    # Should acknowledge uncertainty rather than hallucinate
    uncertainty_phrases = ["don't know", "not in the context", "no information", "cannot find"]
    assert any(phrase in result.lower() for phrase in uncertainty_phrases)
```

## Evaluation Checklist

Before your demo, verify:

```bash
# Functional testing
- [ ] Core happy path works end-to-end
- [ ] Error states are handled gracefully
- [ ] Empty/edge case inputs don't crash
- [ ] Response time is acceptable (<5s for most queries)

# Quality testing
- [ ] 10+ test queries give correct/useful answers
- [ ] System correctly declines or hedges when uncertain
- [ ] No obvious hallucinations in sample outputs

# Reliability
- [ ] Runs fresh after `git clone` + setup
- [ ] Docker container builds and runs
- [ ] Environment variables documented in .env.example
```

## Key Takeaways

- Sketch your architecture before writing code — it prevents expensive refactoring
- Use streaming for LLM responses — it makes the UX dramatically better
- Build defensively: retry logic, timeouts, and graceful error messages
- Test both happy paths and edge cases before your demo
- Streaming + async FastAPI is the production-ready pattern for LLM applications
