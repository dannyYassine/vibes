---
type: Architecture
title: Deployment
description: uv-based packaging, Docker image build, compose runtime wiring, and environment configuration.
tags: [architecture, deployment, docker, config]
timestamp: 2026-08-01T00:00:00Z
---

# Deployment Layer

## Location
Project root: `pyproject.toml`, `Dockerfile`, `docker-compose.yml`, `.env.example`

## Dependency Rule
- Packaging: hatchling wheel packages `src/console_ai_chat`; script `console-ai-chat = console_ai_chat.modules.chat.delivery.cli:main`.
- Dependencies: `langchain>=1.3.14`, `langchain-openrouter>=0.2.7`, `python-dotenv>=1.2.2`; Python `>=3.12`.
- Image: `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`; two-phase `uv sync --frozen` (lock deps, then project); `PYTHONUNBUFFERED=1`; CMD `uv run console-ai-chat`.
- Compose: single `app` service with `stdin_open: true` + `tty: true` for the interactive REPL; env passthrough; volume `./workspace:/workspace`.

## Sub-packages / Files
- `pyproject.toml` — metadata, deps, script entry
- `Dockerfile` — image build
- `docker-compose.yml` — runtime wiring
- `.env.example` — documented env surface

## Key Design Decisions
- Env surface: `OPENROUTER_API_KEY` (required), `MODEL` (default `openai/gpt-4o-mini`), `WORKSPACE` (default `/workspace`).
- Workspace volume shared host↔container — agent files persist on the host.
- README notes future services (db, worker) added as compose siblings.