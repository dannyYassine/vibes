---
type: Reference
title: Coding Tools
description: Workspace-scoped agent tools to list, read, write, append, edit files and run shell commands inside a sandbox.
tags: [reference, tools, sandbox, security]
timestamp: 2026-08-01T00:00:00Z
modules:
  - chat
---

# Coding Tools

## Source
`src/console_ai_chat/modules/chat/repositories/workspace.py`

## Details
Six `@tool` functions. Root `BASE` = env `WORKSPACE` (default `/workspace`), created on import; falls back to CWD if mkdir fails.

Security model:
- `_safe(path)` resolves `BASE / path` and rejects anything escaping `BASE` → `ValueError("path escapes workspace: ...")`.
- `read_file` truncates at 100k chars; `run_command` output truncated at 4k chars.
- `run_command` timeout 60s, `shell=True`, `cwd=BASE`, merges stdout+stderr.

| Tool | Behavior |
|---|---|
| `list_files` | non-recursive; `/` suffix on dirs; single-file path returns its relative path |
| `read_file` | utf-8, errors replaced, `...[truncated]` marker |
| `write_file` | create/overwrite, mkdir parents; returns byte count |
| `append_file` | append or create; returns appended size and prior size |
| `edit_file` | first-occurrence replace (or all with `replace_all=True`); rejects empty/missing `old` |
| `run_command` | status line `[ok]` / `[exit N]` / timeout error |

Host mount: `docker-compose.yml` binds `./workspace:/workspace`, so agent-written files persist on the host under `workspace/` (sample `workspace/hello.py`).

## Used By
- [Console Chat](/features/chat/index.md)