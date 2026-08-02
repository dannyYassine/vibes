---
type: Reference
title: OpenRouter Chat
description: ChatOpenRouter (langchain-openrouter) model integration — streaming config and env-driven model/API-key selection.
tags: [reference, openrouter, llm, external-api]
timestamp: 2026-08-01T00:00:00Z
modules:
  - chat
---

# OpenRouter Chat

## Source
`src/console_ai_chat/modules/chat/delivery/cli.py` — `build_model()`, `load_api_key()`

## Details
- Model client: `ChatOpenRouter(model=..., api_key=..., streaming=True, temperature=0.7, app_title="Console AI Chat")`.
- API key resolution: `load_dotenv()` → `OPENROUTER_API_KEY`, fallback `OPENAI_API_KEY`; missing → guidance print + `sys.exit(1)`.
- Model id: env `MODEL`, default `openai/gpt-4o-mini`; any OpenRouter id valid (e.g. `anthropic/claude-sonnet-4.6`). Live-switchable via `/model` command.
- Streaming: dual `stream_mode=["messages", "updates"]` — `messages` gives `AIMessageChunk` tokens for inline display; `updates` gives the closed `AIMessage` and `ToolMessage` results. Content handled as `str` or block-list via `chunk_text` / `message_text`.

## Used By
- [Console Chat](/features/chat/index.md)