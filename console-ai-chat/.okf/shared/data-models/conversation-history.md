---
type: Domain Entity
title: Conversation History
description: In-memory list of LangChain AI and human messages exchanged during a REPL session; not persisted.
tags: [domain, conversation, state]
timestamp: 2026-08-01T00:00:00Z
modules:
  - chat
---

# Conversation History

## Fields
| Field | Type | Notes |
|---|---|---|
| `history` | `list[AIMessage \| HumanMessage]` | Python list; live in `main()` stack; cleared by `/clear` |

## Domain File
`src/console_ai_chat/modules/chat/delivery/cli.py`

## ORM Schema
None — no persistence; process exit discards history.

## Used By
- [Console Chat](/features/chat/index.md)