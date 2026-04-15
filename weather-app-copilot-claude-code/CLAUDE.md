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

# Gotchas and preferences

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
