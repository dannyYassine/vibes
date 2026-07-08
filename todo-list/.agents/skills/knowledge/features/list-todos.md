---
type: Feature
title: List Todos
description: Fetch and display all todos — handles loading state, empty state, and error state in the UI.
tags: [todo, list, backend, frontend, feature]
timestamp: 2026-07-07T12:00:00Z
---

# List Todos

## Description

On mount, the view fetches all todos and renders them as a list. Shows loading spinner, empty state message, or error banner depending on state.

## Products

- [Backend API](/products/backend-api.md) — `GET /api/todos`, `GetAllTodosUseCase` → `TodoService.get_all()`
- [Frontend App](/products/frontend-app.md) — `TodoView.tsx` → `TodoPresenter.loadTodos()` → `TodoService.getTodos()` → `TodoRepository.findAll()` → `TodoDataSource.fetchTodos()`

## States

| State | UI |
|-------|-----|
| `loading` | Spinner rendered by `TodoView` |
| `loaded` (empty) | "No todos yet" message in `TodoList` |
| `loaded` (items) | List of `TodoItem` components with toggle + delete |
| `error` | Dismissible `ErrorMessage` banner |

## UI Components

- **`TodoView`** — orchestrator, renders loading/form/list/footer
- **`TodoList`** — renders items or empty state, shows active count in footer
- **`TodoItem`** — single row: checkbox, title (strikethrough if done), delete button

## ViewModel

`TodoViewModel` projects entity fields:
- `title`
- `completed`
- `createdAt` with `formattedDate` getter
- `isDone` computed boolean

## Tests

- `todo.integration.test.ts` — empty list, multiple items
- `TodoView.test.tsx` — loading state, empty state, list rendering, active count

## Related

- [Create Todo](/features/create-todo.md)
- [Get Todo](/features/get-todo.md)
- [Complete Todo](/features/complete-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions
