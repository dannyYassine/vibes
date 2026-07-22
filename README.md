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