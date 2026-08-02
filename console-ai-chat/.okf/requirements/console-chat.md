---
type: Requirement
title: Console AI Chat
description: Interactive terminal chat with a tool-using LLM agent that can inspect and edit files in a sandboxed workspace and run shell commands.
tags: [requirement, chat, llm]
timestamp: 2026-08-01T00:00:00Z
---

# Console AI Chat

## Description
Terminal-based chat with a LangChain agent backed by any OpenRouter model. Agent answers questions and uses tools: general helpers (current time, random number, word count, safe arithmetic) plus coding tools scoped to a workspace directory (list/read/write/append/edit files, run commands).

## Acceptance Criteria
1. `uv run console-ai-chat` starts a REPL with prompt `you>`.
2. Replies stream token-by-token; tool calls and results print inline as `[tool ...]` lines.
3. `/quit`, `/exit`, `/q` exit; `/clear` resets conversation; `/model <name>` switches model live.
4. Missing `OPENROUTER_API_KEY`/`OPENAI_API_KEY` prints guidance and exits non-zero.
5. Coding tools reject any path escaping `WORKSPACE`.

## Priority
high

## Stakeholder
Developer (personal tooling)

## Features
- [Console Chat](/features/chat/index.md)