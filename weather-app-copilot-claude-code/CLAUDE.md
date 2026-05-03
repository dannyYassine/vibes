# CLAUDE.md

## Project References

Load these on demand based on the area you're working in:

- Overview & goals: @.claude/references/overview.md
- Architecture: @.claude/references/architecture.md
- Frontend (Angular): @.claude/references/frontend.md
- Backend (Rust/Axum): @.claude/references/backend.md
- Tauri shell: @.claude/references/src-tauri.md
- Design system: @.claude/references/design-system.md
- Running in dev: @.claude/references/running-dev.md

# Code Review Graph

This project has **separate code-review-graph repos** for backend and frontend:
- `backend/.code-review-graph` — Rust services, routes, models
- `frontend/.code-review-graph` — Angular components, services, directives

When using code-review-graph MCP tools, **always pass `repo_root` parameter**:
- Backend: `repo_root: /Users/dannyyassine/dev/vibes/weather-app-copilot-claude-code/backend`
- Frontend: `repo_root: /Users/dannyyassine/dev/vibes/weather-app-copilot-claude-code/frontend`

Example: `get_architecture_overview_tool` with `repo_root: /path/to/backend` or `/path/to/frontend`