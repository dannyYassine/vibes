# Console AI Chat

Simple console chat with an LLM, built on LangChain + [OpenRouter](https://openrouter.ai).

## Setup

```bash
cp .env.example .env   # fill in OPENAI_API_KEY
uv sync
```

## Run (host)

```bash
uv run console-ai-chat
```

## Run (Docker)

```bash
cp .env.example .env   # fill in OPENAI_API_KEY
docker compose build
docker compose run --rm app
```

## Commands

| Command         | Action                 |
|-----------------|------------------------|
| `/quit`         | exit                   |
| `/clear`        | reset conversation     |
| `/model <name>` | switch model live      |

## Config (env)

| Variable              | Default              | Description        |
|-----------------------|----------------------|--------------------|
| `OPENROUTER_API_KEY`  | —                    | required           |
| `MODEL`               | `openai/gpt-4o-mini` | OpenRouter model id|

Any OpenRouter model id works, e.g. `anthropic/claude-sonnet-4.6`, `meta-llama/llama-3.3-70b-instruct`.

## Tools (agent)

Built with `create_agent` (LangChain agents). Defined in `src/console_ai_chat/tools.py`:

| Tool               | Description                            |
|--------------------|----------------------------------------|
| `get_current_time` | current date/time (ISO)                |
| `get_random_number`| random int in range                    |
| `count_words`      | word count of text                     |
| `calculate`        | safe arithmetic expression evaluator (AST-whitelisted) |

## Coding tools (agent workspace)

File/command tools scoped to a sandbox (`WORKSPACE`, default `/workspace`). Paths are relative to the workspace root; traversal outside it is rejected. Defined in `src/console_ai_chat/code_tools.py`:

| Tool            | Description                                    |
|-----------------|------------------------------------------------|
| `list_files`    | list dir entries (non-recursive)               |
| `read_file`     | read text file (truncated to 100k chars)       |
| `write_file`    | create/overwrite text file, creates dirs       |
| `append_file`   | append text to file, creates if missing       |
| `edit_file`     | in-place replace of text in a file (mid-file) |
| `run_command`   | run shell command in workspace (60s timeout)   |

Container mounts `./workspace` → `/workspace`, so agent files land on the host under `workspace/`.

Tool calls + results print inline as `[tool ...]` lines during streaming.

## Layout

- `src/console_ai_chat/main.py` — REPL loop, agent streaming, message history (in memory), ChatOpenRouter (langchain-openrouter)
- `src/console_ai_chat/tools.py` — general tools
- `src/console_ai_chat/code_tools.py` — coding tools (workspace-scoped)
- `Dockerfile` — uv-managed python image
- `docker-compose.yml` — single `app` service (interactive TTY); add more services (db, worker, ...) as siblings later