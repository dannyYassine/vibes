---
type: Reference
title: Dev Environment
description: Docker Compose setup with 3 services (db, web, qcluster) sharing a Dockerfile.
tags: [dev-environment, docker, uv, playwright]
timestamp: 2026-07-23T21:00:00Z
---

# Dev Environment

## Docker Compose Services

| Service | Image / Base | Command | Depends on |
|---|---|---|---|
| `db` | postgres:16-alpine | (default) | — |
| `web` | Dockerfile (python:3.12-slim) | `uv run python budget/manage.py runserver` | db |
| `qcluster` | Dockerfile (shared) | `uv run python budget/manage.py qcluster` | db, web |

## Key Decisions

- **`uv`** for Python packaging (sync creates `.venv`). All `manage.py` commands run via `uv run`.
- **Playwright chromium** installed in Dockerfile with `--with-deps` (ARM64 compatible).
- **`.env`** excluded from Docker image (`.dockerignore`), injected via compose `env_file`.
- **pg_trgm** extension created via `compose/db/init.sql`.

## Command Cheat Sheet

| Task | Command |
|---|---|
| Start all services | `docker compose up -d` |
| Stop all services | `docker compose down` |
| Run Django command (running) | `docker compose exec web uv run python budget/manage.py <cmd>` |
| Run Django command (one-off) | `docker compose run --rm web uv run python budget/manage.py <cmd>` |
| Run tests | `docker compose exec web uv run pytest -q` |
| Rebuild after dep change | `docker compose build web && docker compose up -d` |
| View logs | `docker compose logs -f web` |
| DB shell | `docker compose exec db psql -U budget -d budget` |