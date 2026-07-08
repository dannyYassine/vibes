---
type: Feature
title: Complete Todo
description: Toggle a todo's completion status — all-or-nothing (DTO accepted but `completed` field unused).
tags: [todo, complete, toggle, backend, frontend, feature]
timestamp: 2026-07-07T12:00:00Z
---

# Complete Todo

## Description

Toggle a todo between completed and not completed. Accepts `CompleteTodoDto` but ignores the body — always toggles.

## Products

- [Backend API](/products/backend-api.md) — `PATCH /api/todos/:id/complete`, `CompleteTodoUseCase` → `TodoService.complete()`
- [Frontend App](/products/frontend-app.md) — `TodoItem.tsx` checkbox → `TodoPresenter.completeTodo()` → `TodoService.completeTodo()` → `TodoRepository.complete()` → `TodoDataSource.completeTodo()`

## Flow

1. User clicks checkbox on `TodoItem`
2. `TodoPresenter.completeTodo(todoId)` called
3. `TodoService.completeTodo(id)` → `TodoRepository.complete(id)` → `TodoDataSource.completeTodo(id)`
4. `PATCH /api/todos/:id/complete` handler → `CompleteTodoUseCase` → `TodoService.complete()` → `SqlTodoRepository.complete()`
5. Response returns updated `TodoDto` with toggled `completed` field
6. UI re-renders item with strikethrough/styling

## Note

`CompleteTodoDto` is accepted on the backend but its `completed` field is **unused**. The server always toggles the current state — not a set-value.

## UI Behavior

- Completed items show strikethrough title (via CSS in `TodoItem.tsx`)
- Toggle is immediate with optimistic feel (through presenter state)

## Tests

- `todo.integration.test.ts` — complete flip from false→true, then true→false
- `TodoView.test.tsx` — click checkbox, verify toggle callback

## Related

- [List Todos](/features/list-todos.md)
- [Get Todo](/features/get-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions
