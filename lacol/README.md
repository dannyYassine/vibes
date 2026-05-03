# local-supervisor-agent

LangGraph supervisor agent that delegates to four specialist subagents (glob, grep, read, write) over an LM Studio server.

## Architecture

```
User → Supervisor Agent
         ├── delegate_to_glob  → glob_agent  (glob_files)
         ├── delegate_to_grep  → grep_agent  (ripgrep)
         ├── delegate_to_read  → read_agent  (read_file)
         └── delegate_to_write → write_agent (write_file, str_replace)
```

Each subagent is a `create_react_agent` with a narrow toolset and focused system prompt. The supervisor's "tools" are four `delegate_to_*` functions that invoke subagents with a self-contained task description as a fresh `HumanMessage`. Subagents never see the supervisor's message history or each other's work.

All filesystem tools are sandboxed to `AGENT_WORKSPACE` via `_safe()` path resolution.

## Setup

```bash
uv sync --extra dev
```

Requires [ripgrep](https://github.com/BurntSushi/ripgrep) installed and on `PATH`.

## Configuration

| Variable | Required | Default |
|---|---|---|
| `AGENT_WORKSPACE` | Yes | — |
| `LM_STUDIO_URL` | No | `http://localhost:1234/v1` |
| `MODEL_NAME` | No | `qwen3.5-4b-instruct` |

`AGENT_WORKSPACE` must be an absolute path. Copy `.env.example` to `.env` and fill in your values.

## Usage

```bash
AGENT_WORKSPACE=/path/to/workspace uv run agent "Find all TODO comments under src/ and summarize"
```

## Tests

```bash
uv run pytest -v
```
