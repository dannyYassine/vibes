---
type: Feature
title: Delete Todo
description: Remove a todo by ID — deletes from PostgreSQL and removes from UI.
tags: [todo, delete, backend, frontend, feature]
timestamp: 2026-07-07T12:00:00Z
---

# Delete Todo

## Description

Delete a todo permanently. Item is removed from database and disappears from the list.

## Products

- [Backend API](/products/backend-api.md) — `DELETE /api/todos/:id`, `DeleteTodoUseCase` → `TodoService.delete()`
- [Frontend App](/products/frontend-app.md) — `TodoItem.tsx` delete button → `TodoPresenter.deleteTodo()` → `TodoService.deleteTodo()` → `TodoRepository.delete()` → `TodoDataSource.deleteTodo()`

## Flow

1. User clicks X/trash button on `TodoItem`
2. `TodoPresenter.deleteTodo(todoId)` called
3. `TodoService.deleteTodo(id)` → `TodoRepository.delete(id)` → `TodoDataSource.deleteTodo(id)`
4. `DELETE /api/todos/:id` handler → `DeleteTodoUseCase` → `TodoService.delete()` → `SqlTodoRepository.delete()`
5. Item removed from presenter state, list re-renders

## Tests

- `TodoView.test.tsx` — click delete, verify delete callback
- `todo.integration.test.ts` — delete removes from list

## Related

- [List Todos](/features/list-todos.md)
- [Get Todo](/features/get-todo.md)
- [Create Todo](/features/create-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions
