---
name: knowledge
description: >
  Keep `.agents/skills/knowledge/` OKF files in sync with source code. Run after every
  feature change, new endpoint, architecture refactor, or dependency update.
---

# Maintain Knowledge Base

## When to run

After any code change that touches:

- New/removed API endpoint
- New/removed usecase or service method
- New/removed frontend feature or component
- Layer structure change (new module, renamed directory)
- Dependency or framework change
- Test suite change (new test file, new coverage area)

## How to update

### Products

`products/backend-api.md` — reflect reality of `backend/src/`:

- **API Endpoints table** — match `backend/src/router.rs` routes exactly
- **Layers table** — match directory structure under `backend/src/`
- **Related Features** — cross-link every feature that uses this endpoint

`products/frontend-app.md` — reflect reality of `frontend/src/`:

- **Layers table** — match directory structure under `frontend/src/features/todo/`
- **Related Features** — cross-link every feature

### Features

`features/*.md` — one file per distinct user-facing capability:

- **Flow** — trace the full path: UI component → presenter → service → repository → datasource → HTTP → backend handler → usecase → service → repository → DB
- **Validation** — document every validation rule at every layer (UI, service, backend)
- **Tests** — list test names and what they cover
- **Related** — cross-link to other features and products

### Entry point

`index.md` — keep the product and feature tables in sync. Add/remove rows when items are added/removed.

## Format conventions (OKF v0.1)

See full spec at [references/okf-spec.md](/references/okf-spec.md).

Key rules:

- Every file has YAML frontmatter: `type`, `title`, `description`, `tags`, `timestamp`
- `type` is `Product`, `Feature`, or `Skill`
- Cross-links use bundle-relative paths: `[Create Todo](/features/create-todo.md)` (preferred) or relative paths
- `timestamp` updated on every edit
- `tags` list grows as new concepts attach
- Reserved filenames: `index.md`, `log.md` — not used for concept documents
- Conformance: every `.md` file (except `index.md`, `log.md`) must have parseable frontmatter with non-empty `type`
- Broken cross-links are tolerated (not-yet-written knowledge)

## Automation

After updating source code:

1. Re-read changed files to capture new routes, methods, components
2. Diff old knowledge files against new reality
3. Edit knowledge files that are stale
4. Update `index.md` if products or features were added/removed
