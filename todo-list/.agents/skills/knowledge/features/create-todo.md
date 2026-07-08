---
type: Feature
title: Create Todo
description: Create a new todo item with a title — validates non-empty, persists to PostgreSQL, surfaces in UI.
tags: [todo, create, backend, frontend, feature]
timestamp: 2026-07-07T12:00:00Z
---

# Create Todo

## Description

User enters a title in the form, submits, and a new todo appears in the list. Both frontend and backend validate non-empty titles.

## Products

- [Backend API](/products/backend-api.md) — `POST /api/todos`, `CreateTodoUseCase` → `TodoService.create()`
- [Frontend App](/products/frontend-app.md) — `TodoForm.tsx` → `TodoPresenter.createTodo()` → `TodoService.createTodo()` → `TodoRepository.create()` → `TodoDataSource.createTodo()`

## Flow

1. User types title in `TodoForm` input
2. `TodoForm` prevents empty submission client-side
3. `TodoPresenter.createTodo(title)` called
4. `TodoService.createTodo(title)` validates non-empty server-side
5. `TodoRepository.create()` maps entity to `CreateTodoDto`
6. `TodoDataSource.createTodo()` sends `POST /api/todos`
7. Backend `POST /api/todos` handler → `CreateTodoUseCase` → `TodoService.create()` → `SqlTodoRepository.create()`
8. Response returns created `TodoDto`
9. Frontend maps dto → entity → viewmodel, todo appears in list

## Validation

| Layer | Check |
|-------|-------|
| UI (`TodoForm`) | Prevents empty submission (button disabled) |
| Service (`TodoService.createTodo`) | Rejects empty/whitespace-only titles |
| Backend `TodoService.create()` | Rejects empty/whitespace-only titles |

## Tests

- `todo.integration.test.ts` — verifies creation, persistence, empty/whitespace rejection
- `TodoView.test.tsx` — verifies form behavior with mocked presenter

## Related

- [List Todos](/features/list-todos.md)
- [Complete Todo](/features/complete-todo.md)
- [Delete Todo](/features/delete-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions
