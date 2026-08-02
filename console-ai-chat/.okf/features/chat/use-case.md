---
type: Use Case
title: Chat Turn
description: Stream a user message through the agent, print tokens and tool activity inline, and append the reply to in-memory history.
tags: [usecase, chat, streaming]
timestamp: 2026-08-01T00:00:00Z
modules:
  - chat
---

# Chat Turn

## Input
- `input` (`str`): user line from REPL — plain message or slash command
- `agent`: built by `build_agent(api_key, model_name)` — `create_agent` with all 10 tools and `SYSTEM_PROMPT`
- `history`: `list[AIMessage | HumanMessage]` (in-memory)

## Flow
1. `main()` loads API key via `load_api_key()` (env `OPENROUTER_API_KEY` → fallback `OPENAI_API_KEY`; dotenv-backed) and model from env `MODEL` (default `openai/gpt-4o-mini`); builds agent.
2. REPL reads `you> ` input; `EOFError`/`KeyboardInterrupt` exits.
3. Slash commands: `/quit|/exit|/q` exit; `/clear` resets history; `/model <name>` rebuilds agent live.
4. Plain input appended to history as `HumanMessage`.
5. `stream_turn()` runs `agent.stream({"messages": history}, stream_mode=["messages", "updates"], version="v2")`.
6. `messages` stream: `AIMessageChunk` text printed inline (flushed); on `chunk_position == "last"`, pending tool calls printed as `[tool <name>] <args>`, accumulator reset.
7. `updates` stream: closed `AIMessage` captured as `last_ai`; `ToolMessage` results printed as `[tool <name> result] <text>` (truncated 200 chars).
8. Final `AIMessage` appended to history. On exception: print `[error] <err>`, pop the offending human message, continue loop.

## Output
- `AIMessage` (agent reply) appended to in-memory history; session continues.
- Exit modes: `/quit`, EOF, KeyboardInterrupt.

## Data Models
- [Conversation History](/shared/data-models/conversation-history.md)

## See Also
- [Agent Tools](/shared/references/tools.md)
- [Coding Tools](/shared/references/code-tools.md)
- [OpenRouter Chat](/shared/references/openrouter.md)