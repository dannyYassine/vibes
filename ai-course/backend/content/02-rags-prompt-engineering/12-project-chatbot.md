---
title: "Project: Build a Customer Support Chatbot"
description: "Build a RAG-powered support chatbot that answers questions from a knowledge base"
duration_minutes: 60
order: 12
---

## Project Overview

Build a customer support chatbot that answers questions from a company knowledge base. Uses RAG to ground responses in documentation, supports conversation history, and streams responses.

**Stack**: FastAPI + ChromaDB + OpenAI + vanilla JS frontend

## Project Structure

```
support-bot/
├── backend/
│   ├── main.py
│   ├── ingest.py
│   └── knowledge_base/
│       ├── faq.md
│       └── policies.md
└── frontend/
    └── index.html
```

## Knowledge Base (Sample)

```markdown
# FAQ

## Shipping Policy
We offer free shipping on orders over $50. Standard shipping takes 3-5 business days.
Express shipping (1-2 days) costs $12.99.

## Return Policy
Items can be returned within 30 days of purchase. Items must be unused and in original packaging.
Refunds are processed within 5-7 business days.

## Payment Methods
We accept Visa, Mastercard, American Express, PayPal, and Apple Pay.
```

## Ingestion Script

```python
# ingest.py
import chromadb
from openai import OpenAI
from pathlib import Path

client = OpenAI()
chroma = chromadb.PersistentClient(path="./chroma")
collection = chroma.get_or_create_collection("support_docs")

def chunk_text(text: str, size=400, overlap=50) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start+size])
        start += size - overlap
    return chunks

def embed(texts: list[str]) -> list[list[float]]:
    resp = client.embeddings.create(
        input=texts, model="text-embedding-3-small"
    )
    return [r.embedding for r in resp.data]

def ingest_file(path: str):
    text = Path(path).read_text()
    chunks = chunk_text(text)
    embeddings = embed(chunks)

    ids = [f"{path}-{i}" for i in range(len(chunks))]
    collection.upsert(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=[{"source": path}] * len(chunks),
    )
    print(f"Ingested {len(chunks)} chunks from {path}")

# Run: python ingest.py
if __name__ == "__main__":
    for f in Path("knowledge_base").glob("*.md"):
        ingest_file(str(f))
```

## Backend API

```python
# main.py
import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import chromadb
from openai import OpenAI, AsyncOpenAI

app = FastAPI()
sync_openai = OpenAI()
async_openai = AsyncOpenAI()
chroma = chromadb.PersistentClient(path="./chroma")
collection = chroma.get_or_create_collection("support_docs")

SYSTEM_PROMPT = """You are a helpful customer support agent for Acme Store.
Answer questions based only on the provided context from our documentation.
If you can't find the answer in the context, say:
"I don't have information about that. Please contact support@acme.com"

Be concise, friendly, and helpful."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []

def retrieve(query: str, top_k=4) -> list[str]:
    embedding = sync_openai.embeddings.create(
        input=[query], model="text-embedding-3-small"
    ).data[0].embedding

    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
    )
    return results["documents"][0]

@app.post("/api/chat")
async def chat(req: ChatRequest):
    docs = retrieve(req.message)
    context = "\n\n---\n\n".join(docs)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (last 6 messages)
    for msg in req.history[-6:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current query with context
    messages.append({
        "role": "user",
        "content": f"Context from documentation:\n{context}\n\nCustomer question: {req.message}"
    })

    async def stream():
        stream = await async_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'text': chunk.choices[0].delta.content})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")
```

## Frontend

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Support Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; background: #f5f5f5; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .chat-window { width: 480px; height: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
    .chat-header { padding: 16px 20px; background: #1f6feb; color: white; border-radius: 12px 12px 0 0; font-weight: 600; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; line-height: 1.5; font-size: 14px; }
    .msg.user { align-self: flex-end; background: #1f6feb; color: white; border-radius: 12px 12px 0 12px; }
    .msg.assistant { align-self: flex-start; background: #f0f0f0; color: #333; border-radius: 12px 12px 12px 0; }
    .input-area { padding: 12px 16px; border-top: 1px solid #eee; display: flex; gap: 8px; }
    input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-size: 14px; }
    button { padding: 10px 16px; background: #1f6feb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
    button:disabled { opacity: 0.5; }
  </style>
</head>
<body>
<div class="chat-window">
  <div class="chat-header">Acme Support</div>
  <div class="messages" id="messages">
    <div class="msg assistant">Hi! How can I help you today?</div>
  </div>
  <div class="input-area">
    <input id="input" placeholder="Ask a question..." />
    <button id="send">Send</button>
  </div>
</div>
<script>
  const history = [];

  async function send() {
    const input = document.getElementById('input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    appendMessage('user', msg);
    document.getElementById('send').disabled = true;

    const assistantDiv = appendMessage('assistant', '');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: msg, history }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = JSON.parse(line.slice(6));
            if (d.text) {
              fullResponse += d.text;
              assistantDiv.textContent = fullResponse;
              document.getElementById('messages').scrollTop = 999999;
            }
          }
        }
      }

      history.push({role: 'user', content: msg});
      history.push({role: 'assistant', content: fullResponse});
    } catch(e) {
      assistantDiv.textContent = 'Error: ' + e.message;
    }
    document.getElementById('send').disabled = false;
  }

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    const msgs = document.getElementById('messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  document.getElementById('send').addEventListener('click', send);
  document.getElementById('input').addEventListener('keydown', e => {
    if (e.key === 'Enter') send();
  });
</script>
</body>
</html>
```

## Running the Project

```bash
pip install fastapi uvicorn openai chromadb
echo "OPENAI_API_KEY=sk-..." > .env
python ingest.py          # Ingest knowledge base
uvicorn main:app --reload # Start server
open http://localhost:8000
```

## Key Takeaways

- RAG chatbots ground responses in your specific documentation, reducing hallucination
- Streaming responses provide dramatically better UX than waiting for full responses
- Conversation history (last 3-6 turns) enables multi-turn coherence without overloading context
- The system prompt's "I don't have information about that" fallback is critical for trust
