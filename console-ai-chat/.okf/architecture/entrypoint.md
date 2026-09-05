---
type: Architecture
title: Entry Point
description: Composition root in main.py — wires model, agent, tools, REPL loop, slash commands, and streaming orchestration.
tags: [architecture, entrypoint, repl]
timestamp: 2026-08-02T00:00:00Z
modules:
  - chat
---

# Entry Point Layer

## Location

`src/console_ai_chat/modules/chat/` — entrypoint file `delivery/cli.py`

## Dependency Rule

- Imports: `langchain.agents.create_agent`, `langchain.messages`, `langchain_openrouter.ChatOpenRouter`, `python-dotenv`, sibling modules `console_ai_chat.modules.chat.services.tools` + `console_ai_chat.modules.chat.repositories.workspace`.
- Nothing imports `main`; consumed only by the console script `console-ai-chat = console_ai_chat.modules.chat.delivery.cli:main` (pyproject.toml).

## Sub-packages

- `delivery/cli.py` — REPL entry, streaming orchestration: `main`, `stream_turn`, `build_agent`, `build_model`, `load_api_key`, `chunk_text`, `message_text`; constants `SYSTEM_PROMPT`, `TOOLS` (10 tools)
- `services/confirm.py` — `ConfirmToolMiddleware` (agent middleware): prompts `y`/`e`/`c` before every tool call, returns an in-memory `ToolCallRequest` with edited args on `e`, or an error `ToolMessage` on `c`; togglable via `CONFIRM_TOOL_CALLS`
- `services/tools.py` — general agent tools (4)
- `repositories/workspace.py` — workspace coding tools (6)
- `dtos/`, `models/`, `usecases/` — reserved layers (empty)

## Key Design Decisions

- Single agent via `create_agent(model, tools=TOOLS, system_prompt=SYSTEM_PROMPT, middleware=[ConfirmToolMiddleware()])` — all 10 tools always available; every call gated by a user confirmation prompt.
- Confirmation gate uses LangChain `AgentMiddleware.wrap_tool_call`: intercepts each tool call before execution — `y` confirms, `e` replaces args with user-supplied JSON, `c` short-circuits to an error `ToolMessage` (agent sees `[cancelled]`, no side effects).
- Dual-mode streaming (`messages` + `updates`): tokens inline from chunks; final message + tool results from node updates.
- Tool activity printed inline `[tool name] args` / `[tool name result] ...` for transparency.
- History in memory only; `/clear` resets; no persistence layer.
- `/model <name>` rebuilds agent live while keeping history.
- Failed turns: offending human message popped from history, loop continues.
