# CLAUDE.md

## Project overview

docker-tui is a Rust TUI application that monitors Docker containers defined in a Docker Compose file. It displays real-time CPU, memory, network, and disk metrics using charts and a table view.

## Architecture

```
src/
├── main.rs     — Terminal setup, event loop, tick timer
├── app.rs      — Application state, history buffers, compose file parsing
├── docker.rs   — Docker client, persistent streaming stats, socket discovery
└── ui.rs       — ratatui rendering (table, 2x2 chart grid, value badges)
```

### Key design decisions

- **Persistent streaming**: Instead of polling Docker stats per-tick, background tokio tasks maintain streaming connections (`stream: true`) per container. Stats are written to a shared `Arc<Mutex<HashMap>>` cache. The UI reads from the cache — no blocking API calls during rendering.
- **Socket auto-discovery**: Tries OrbStack (`~/.orbstack/run/docker.sock`), Docker Desktop (`~/.docker/run/docker.sock`), Linux default (`/var/run/docker.sock`), and `DOCKER_HOST` env var.
- **Rate computation**: Network and disk metrics are cumulative counters from Docker. The app computes delta/tick_secs to show bytes/s rates.
- **Auto-scaling y-axis**: Charts scale based on recent peak (last 10 points) to stay responsive after spikes pass.

## Build & run

```bash
cargo build
cargo run -- path/to/docker-compose.yml
```

## Dependencies

- `ratatui` + `crossterm` — TUI framework and terminal backend
- `bollard` — Async Docker API client (via Unix socket)
- `tokio` — Async runtime
- `serde` + `serde_yaml` — Compose file parsing
- `futures-util` — Stream utilities
- `anyhow` — Error handling
