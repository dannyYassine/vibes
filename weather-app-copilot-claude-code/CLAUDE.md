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
- Before searching files with Glob/Grep, read graphify-out/GRAPH_REPORT.md god nodes + communities first to identify high-impact files
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
- For precise, hop-by-hop traversals, use the explicit "Graphify CLI Command Reference": `/graphify query`, `/graphify path` and `/graphify explain`. They read graph.json directly and return edge-level detail with relation type, confidence score and source location.

# Graphify CLI Command Reference

Every Graphify command, grouped by intent. All commands are callable from your AI coding assistant as a slash command (/graphify …) and directly from the terminal (graphify …), so you can query the graph without an assistant in the loop at all.

## Query the graph

/graphify query "what connects attention to the optimizer?"
/graphify query "..." --dfs                # trace a specific path
/graphify query "..." --budget 1500        # cap tokens returned
/graphify path "DigestAuth" "Response"     # exact path between two nodes
/graphify explain "SwinTransformer"        # everything Graphify knows about a node

## Same commands work from the terminal, no assistant needed

graphify query "what connects attention to the optimizer?"
graphify query "show the auth flow" --dfs
graphify query "..." --graph path/to/graph.json