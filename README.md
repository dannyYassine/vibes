# vibes

A collection of projects built entirely through "vibe coding" — an experimental approach where every project is created using only AI-assisted development. The goal is to explore how far you can take vibes coding to plan, build, and maintain full projects while still following the same best practices you'd expect from traditional development.

## Skills

Use third-party AI skills (like [Anthropic's skill library](https://github.com/anthropics/skills) or [Matt Pocock's skills](https://github.com/mattpocock/skills/tree/main/skills)) to give agents domain-specific instructions — e.g. the [frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design):

```bash
# Clone skills repo
git clone https://github.com/anthropics/skills ~/anthropic-skills

# Symlink a skill into opencode's auto-load path
ln -s ~/anthropic-skills/skills/frontend-design ~/.claude/skills/frontend-design

# Or register via opencode.json
# "skills": { "paths": ["~/anthropic-skills/skills"] }
```

After restarting opencode, it finds `**/SKILL.md` files in auto-load paths (`~/.claude/skills/`, `~/.agents/skills/`) or configured `skills.paths`. The model triggers on matching keywords from the skill's description.

## AI Assistant Setup

This repo requires several MCP servers and plugins for AI-assisted development.
Configure in `opencode.json` (project-level) or `~/.config/opencode/opencode.json` (global).

| Tool | Purpose | Where Configured |
|------|---------|-----------------|
| [code-review-graph](https://code-review-graph.com) | Code knowledge graph — change detection, impact analysis, semantic search | `opencode.json` → `mcp.code-review-graph` |
| [codegraph](https://colbymchenry.github.io/codegraph/) | Lightweight codebase graph — alternative to code-review-graph | Not configured (optional alternative) |
| [Context7](https://context7.com) | Live library/framework documentation via MCP | `~/.config/opencode/opencode.json` → `mcp.context7` |
| [Caveman](https://caveman.so) | Ultra-compressed AI communication mode (~65% token reduction) | `~/.config/opencode/opencode.json` → `plugin` |
| [OKF (Open Knowledge Format)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) | Structured knowledge files for AI-consumable feature/product docs | `.agents/skills/knowledge/` — YAML frontmatter, bundle-relative cross-links |

### code-review-graph

[code-review-graph.com](https://code-review-graph.com) — Persistent knowledge graph
that indexes functions, classes, files, and cross-references. Auto-updates on file
changes. Key tools:

- `detect_changes` — risk-scored review of uncommitted changes
- `query_graph` — trace callers, callees, imports, tests
- `get_impact_radius` — blast radius of a change
- `semantic_search_nodes` — find code by name or keyword

### codegraph

[colbymchenry.github.io/codegraph/](https://colbymchenry.github.io/codegraph/) —
Alternative MCP-based code graph tool. Lighter weight than code-review-graph.
Use as a drop-in replacement or complement.

### Context7

[context7.com](https://context7.com) — MCP server that fetches current docs for
libraries, frameworks, SDKs, and APIs. Uses `resolve-library-id` + `query-docs`.
Prevents stale answers by always referencing latest API surface.

### Caveman

[caveman.so](https://caveman.so) — Communication plugin that compresses AI output
~65% by dropping articles, filler, pleasantries, and hedging while preserving
technical accuracy. Levels: `lite`, `full` (default), `ultra`. Companion skills:

- `caveman-help` — quick-reference card
- `caveman-commit` — compressed commit messages
- `caveman-review` — compressed code review
- `caveman-stats` — token savings metrics
- `caveman-compress` — compress memory files

### OKF (Open Knowledge Format)

[Spec & Google Cloud blog](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) —
Structured markdown with YAML frontmatter (`type`, `title`, `tags`, `timestamp`)
for AI-consumable knowledge. Used in `.agents/skills/knowledge/` to document
features, products, and architecture. Bundle root: `index.md` with cross-links
via bundle-relative paths. Conformance: every `.md` (except `index.md`/`log.md`)
must have parseable frontmatter with non-empty `type`.

## Design Tools

- [DaisyUI Blueprint](https://daisyui.com/blueprint/) — UI component blueprints for rapid prototyping
- [Mobbin](https://mobbin.com) — Real-world mobile & web design inspiration library
- [Open Design AI](https://open-design.ai) — AI-powered design engineering assistant

## Projects

### [Weather App](weather-app-copilot-claude-code/)

A modern, cross-platform desktop weather application built with Tauri, Angular, and Rust. Features real-time weather information with hourly and daily forecasts, location search, weather-themed UI, and smooth animations.

<table>
  <tr>
    <td><img src="weather-app-copilot-claude-code/hero_1.png" alt="Weather App Hero 1" width="280"></td>
    <td><img src="weather-app-copilot-claude-code/hero_2.png" alt="Weather App Hero 2" width="280"></td>
  </tr>
</table>

### [ByteByteGo AI Course](ai-course/)

A self-hosted AI course platform covering fundamentals to expert-level techniques. Built with a FastAPI backend serving markdown-based lessons and a vanilla JavaScript frontend with progress tracking. Covers LLM foundations, RAG, prompt engineering, AI agents, reasoning models, and multi-modal generation across 6 modules.

![Dashboard](ai-course/assets/dashboard.png)

### [Python Course](python-course-catalogue/)

A full-stack Python learning platform with 32 lessons across 7 sections, covering fundamentals through advanced topics like design patterns and REST APIs. Built with FastAPI, SQLite, and a vanilla JS frontend styled with a dark VS Code-inspired theme. Features JWT auth, progress tracking, and client-side markdown rendering.

![Dashboard](python-course-catalogue/assets/dashboard.png)

### [Nimbus](nimbus/)

A cloud architecture design tool for building and visualizing infrastructure diagrams. Features an interactive canvas with drag-and-drop AWS components, visual connections, an AI assistant for natural language diagram modifications, and export to PNG/JSON/Terraform/Docker Compose. Built with Angular 19 and Rust/Axum.

![Architecture Diagram](nimbus/docs/architecture.png)

### [Docker TUI](docker-tui/)

A terminal UI for monitoring Docker Compose containers in real time. Displays live CPU, memory, network I/O, and block I/O metrics with real-time charts. Built with Rust, ratatui, and bollard. Supports Docker Desktop, OrbStack, and standard Linux sockets.

![docker-tui screenshot](docker-tui/tui.png)
