---
type: Feature
title: Get Todo
description: Retrieves a single todo by its ID — returns 404 if not found.
tags: [todo, get, backend, feature]
timestamp: 2026-07-07T12:00:00Z
---

# Get Todo

## Description

Fetch a single todo by UUID. Returns `TodoNotFound` error if the ID doesn't exist.

## Products

- [Backend API](/products/backend-api.md) — `GET /api/todos/:id`, `GetTodoByIdUseCase` → `TodoService.get_by_id()`

## Flow

1. `GET /api/todos/:id` handler extracts path param
2. `GetTodoByIdUseCase.execute(id)` called
3. `TodoService.get_by_id(&id)` queries `SqlTodoRepository`
4. Returns `Ok(TodoResponse)` if found, `Err("Todo not found")` if missing

## Error Handling

- Missing ID → `404` response with `"Todo not found"` message

## Tests

- `get_todo_by_id_returns_todo_when_found` — inserts todo, asserts `Ok` with matching fields
- `get_todo_by_id_returns_error_when_not_found` — queries nonexistent id, asserts `Err("Todo not found")`

## Related

- [List Todos](/features/list-todos.md)
- [Complete Todo](/features/complete-todo.md)
- [Delete Todo](/features/delete-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Frontmatter and cross-linking conventions
