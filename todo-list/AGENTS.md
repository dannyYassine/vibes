<!-- todo-list repo -->
## Repo

Full-stack todo app: Rust Axum backend + React TypeScript frontend + PostgreSQL.

## Architecture

### Backend — Clean Architecture

```
delivery → usecases → services → repositories → models
```

- Axum handlers in `delivery/` parse JSON, call usecase, return DTO
- Usecases orchestrate single user intent
- Services = business logic / coordination
- Repository trait + SQL impl (sqlx, PostgreSQL)
- DI via `AppState` struct wired in `main.rs`
- Auto-runs `migrations/001_create_todos.sql` on startup
- Routes defined in `router.rs`

### Frontend — MVP with DI

```
API → DataSource → Repository → Service → Presenter → ViewModel → View
```

- Custom DI container (`infra/container/`)
- Provider pattern: `ContainerProvider` + `usePresenter(Token)` hook
- `usePresenter` uses `useSyncExternalStore` — subscribes to Presenter state
- Presenter lifecycle: `onCreated` → `onMounted` → `onDestroyed`
- `@/` path alias → `src/`
- Tailwind CSS v4 + `@tailwindcss/vite` plugin

## Commands

```bash
# Frontend
cd frontend && npm install && npm run dev     # dev server :5173
npm test                                       # Vitest — 20 tests
npm run build                                  # tsc -b && vite build

# Backend — requires PostgreSQL on :5432
cd backend && cargo run                        # :3000
cargo test -- --test-threads=1                 # sequential, avoid table conflicts

# Docker
docker compose up --build                      # all 3 services
```

## Key Details

- Backend env: `DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/todo`), `BIND_ADDRESS` (default `127.0.0.1:3000`)
- Frontend env: `VITE_API_URL` (default `http://localhost:3000`)
- Backend tests use `StubQuoteRepository` (always errors), stub in tests only
- Presenter registers as `transient` in DI; everything else `singleton`
- code-review-graph: always pass `repo_root="/Users/dannyyassine/dev/vibes/todo-list"`
- c-r-g indexes backend Rust + frontend domain/class entities, NOT TSX/JSX rendering. For "where does X render?" questions, use `grep` with `*.tsx` pattern
- After c-r-g search, **read the result files** before grepping. c-r-g already shows file paths + line numbers + signatures — grep is redundant unless you need TSX/JSX rendering info.