---
type: Product
title: Backend API
description: Rust Axum REST API serving todo management endpoints with PostgreSQL persistence and Clean Architecture layering.
tags: [rust, axum, postgresql, rest-api, backend]
timestamp: 2026-07-07T12:00:00Z
---

# Backend API

## Description

RESTful HTTP API built with Rust's Axum framework. Follows Clean Architecture with dependency direction: handlers → usecases → services → repository → model.

## Tech Stack

- **Framework:** Axum
- **Language:** Rust
- **Database:** PostgreSQL 16
- **Migration:** SQL files in `backend/migrations/`
- **Pattern:** Clean Architecture (Delivery → DTO → Usecase → Service → Repository → Model)

## Layers

| Layer | Role |
|-------|------|
| Delivery | Axum handlers — parse JSON, build DTO, call usecase |
| DTO | `CreateTodoDto`, `CompleteTodoDto`, `TodoResponse` |
| Usecase | `CreateTodoUseCase`, `GetAllTodosUseCase`, etc. |
| Service | `TodoService` — validation, coordination |
| Repository | `TodoRepository` trait + `SqlTodoRepository` (PostgreSQL) |
| Model | `Todo` struct with `from_row()` hydration |

## API Endpoints

| Method | Path | Feature |
|--------|------|---------|
| `GET` | `/api/todos` | [List Todos](/features/list-todos.md) |
| `POST` | `/api/todos` | [Create Todo](/features/create-todo.md) |
| `GET` | `/api/todos/:id` | [Get Todo](/features/get-todo.md) |
| `PATCH` | `/api/todos/:id/complete` | [Complete Todo](/features/complete-todo.md) |
| `DELETE` | `/api/todos/:id` | [Delete Todo](/features/delete-todo.md) |

## Related Features

- [List Todos](/features/list-todos.md)
- [Create Todo](/features/create-todo.md)
- [Get Todo](/features/get-todo.md)
- [Complete Todo](/features/complete-todo.md)
- [Delete Todo](/features/delete-todo.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Bundle structure and cross-linking rules
