---
title: "Project: Build an LLM Playground"
description: "Build a web interface for experimenting with LLM parameters in real-time"
duration_minutes: 45
order: 11
---

## Project Overview

In this project, you'll build an interactive LLM playground — a web interface that lets you experiment with different models, sampling parameters, and system prompts while seeing results in real time.

**What you'll build:**
- FastAPI backend with streaming SSE support
- Simple HTML/JS frontend with real-time parameter controls
- Support for temperature, top-p, max tokens, and system prompts
- Token counting and cost estimation

## Prerequisites

```bash
pip install fastapi uvicorn openai python-dotenv tiktoken
```

```
OPENAI_API_KEY=sk-...
```

## Backend: FastAPI with SSE Streaming

```python
# main.py
import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import AsyncOpenAI
import tiktoken

app = FastAPI()
client = AsyncOpenAI()
enc = tiktoken.encoding_for_model("gpt-4o-mini")

class CompletionRequest(BaseModel):
    messages: list[dict]
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 500
    system_prompt: str = "You are a helpful assistant."

@app.post("/api/complete")
async def complete(req: CompletionRequest):
    full_messages = [
        {"role": "system", "content": req.system_prompt},
        *req.messages,
    ]

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model=req.model,
                messages=full_messages,
                temperature=req.temperature,
                top_p=req.top_p,
                max_tokens=req.max_tokens,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    data = json.dumps({"text": delta.content, "done": False})
                    yield f"data: {data}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/api/count-tokens")
async def count_tokens(req: CompletionRequest):
    total = sum(len(enc.encode(m["content"])) for m in req.messages)
    return {"tokens": total, "estimated_cost": total * 0.00000015}

app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

## Frontend: Interactive Parameter Controls

```html
<!-- static/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>LLM Playground</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; background: #0d1117; color: #e6edf3; }
    .container { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
    .controls { background: #1c2128; padding: 20px; border-radius: 8px; }
    .chat { background: #1c2128; padding: 20px; border-radius: 8px; }
    label { display: block; margin-bottom: 4px; font-size: 13px; color: #8b949e; }
    input[type=range] { width: 100%; }
    textarea { width: 100%; background: #161b22; color: #e6edf3; border: 1px solid #30363d; padding: 8px; border-radius: 4px; resize: vertical; }
    button { background: #1f6feb; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 10px; }
    .messages { min-height: 400px; max-height: 600px; overflow-y: auto; }
    .message { padding: 12px; margin: 8px 0; border-radius: 8px; }
    .message.user { background: #1f6feb22; border: 1px solid #1f6feb44; }
    .message.assistant { background: #23863622; border: 1px solid #23863644; }
    pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; }
    .input-area { display: flex; gap: 8px; margin-top: 12px; }
    .input-area textarea { flex: 1; }
    .input-area button { width: auto; }
  </style>
</head>
<body>
  <h1>LLM Playground</h1>
  <div class="container">
    <div class="controls">
      <h3>Parameters</h3>

      <label>Model</label>
      <select id="model" style="width:100%;background:#161b22;color:#e6edf3;border:1px solid #30363d;padding:8px;border-radius:4px">
        <option value="gpt-4o-mini">gpt-4o-mini</option>
        <option value="gpt-4o">gpt-4o</option>
      </select>

      <br><br>
      <label>Temperature: <span id="temp-val">0.7</span></label>
      <input type="range" id="temperature" min="0" max="2" step="0.05" value="0.7"
             oninput="document.getElementById('temp-val').textContent=this.value">

      <br>
      <label>Top-P: <span id="topp-val">0.9</span></label>
      <input type="range" id="top_p" min="0" max="1" step="0.05" value="0.9"
             oninput="document.getElementById('topp-val').textContent=this.value">

      <br>
      <label>Max Tokens: <span id="maxtok-val">500</span></label>
      <input type="range" id="max_tokens" min="50" max="2000" step="50" value="500"
             oninput="document.getElementById('maxtok-val').textContent=this.value">

      <br><br>
      <label>System Prompt</label>
      <textarea id="system_prompt" rows="6">You are a helpful assistant.</textarea>

      <button onclick="clearChat()">Clear Chat</button>
    </div>

    <div class="chat">
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <textarea id="user-input" rows="3" placeholder="Type your message..."></textarea>
        <button onclick="sendMessage()" id="send-btn">Send</button>
      </div>
      <div style="font-size:12px;color:#6e7681;margin-top:8px" id="token-info"></div>
    </div>
  </div>

  <script>
    let messages = [];

    function renderMessages() {
      const container = document.getElementById('messages');
      container.innerHTML = messages.map(m => `
        <div class="message ${m.role}">
          <strong>${m.role}</strong><br>
          ${marked ? marked.parse(m.content) : m.content}
        </div>
      `).join('');
      container.scrollTop = container.scrollHeight;
    }

    async function sendMessage() {
      const input = document.getElementById('user-input');
      const text = input.value.trim();
      if (!text) return;

      messages.push({ role: 'user', content: text });
      input.value = '';
      renderMessages();

      const btn = document.getElementById('send-btn');
      btn.disabled = true;
      btn.textContent = 'Generating...';

      // Add placeholder for assistant response
      const assistantMsg = { role: 'assistant', content: '' };
      messages.push(assistantMsg);
      renderMessages();

      try {
        const response = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.slice(0, -1),  // Exclude empty assistant msg
            model: document.getElementById('model').value,
            temperature: parseFloat(document.getElementById('temperature').value),
            top_p: parseFloat(document.getElementById('top_p').value),
            max_tokens: parseInt(document.getElementById('max_tokens').value),
            system_prompt: document.getElementById('system_prompt').value,
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantMsg.content += data.text;
                renderMessages();
              }
            }
          }
        }
      } catch (err) {
        assistantMsg.content = `Error: ${err.message}`;
        renderMessages();
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send';
      }
    }

    function clearChat() {
      messages = [];
      renderMessages();
    }

    document.getElementById('user-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  </script>
</body>
</html>
```

## Running the Project

```bash
# Install dependencies
pip install fastapi uvicorn openai tiktoken python-dotenv

# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Start server
uvicorn main:app --reload --port 8000

# Open browser
open http://localhost:8000
```

## Experiments to Try

1. **Temperature exploration**: Ask the same creative writing prompt with temperature 0.1 vs 1.5. Notice how output changes.

2. **Sampling comparison**: With `temperature=1.0`, compare `top_p=0.1` vs `top_p=0.99`.

3. **System prompt engineering**: Start with a vague system prompt, then iteratively improve it for a specific task.

4. **Token efficiency**: Write the same query in different ways. Notice how token count correlates with response quality.

5. **Model comparison**: Run the same prompt on `gpt-4o-mini` vs `gpt-4o`. When does the larger model shine?

## Extensions

- Add response time and cost tracking per message
- Implement conversation export (JSON, Markdown)
- Add parameter presets for common use cases (factual, creative, code)
- Compare two models side-by-side with the same parameters

## Key Takeaways

- Streaming responses with SSE provides a much better UX than waiting for full responses
- Temperature and top-p interact — experiment to find the right combination for each task
- System prompts have an outsized effect on response quality and style
- Token counting is essential for cost estimation and context management
