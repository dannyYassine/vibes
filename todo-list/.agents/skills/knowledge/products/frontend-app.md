---
type: Product
title: Frontend App
description: React TypeScript single-page application following MVP (Model-View-Presenter) architecture with dependency injection.
tags: [react, typescript, mvp, frontend, spa]
timestamp: 2026-07-08T01:00:00Z
---

# Frontend App

## Description

TypeScript SPA built with React. Follows Model-View-Presenter architecture with dependency injection. Data flow: DataSource → Repository → Service → Presenter → ViewModel → View.

## Tech Stack

- **Framework:** React 18+ (Vite)
- **Language:** TypeScript
- **Architecture:** MVP (Model-View-Presenter)
- **DI:** Manual container in `src/infra/`
- **Testing:** Vitest (integration + component)

## Layers

| Layer | Role |
|-------|------|
| Container | DI registration & resolution |
| DataSource | Raw HTTP transport, returns DTOs |
| DTO | API shape (snake_case) |
| Repository | DTO→Entity mapping, error normalization |
| Entity | Pure domain model |
| Service | Business logic, use cases |
| Presenter | UI state, calls services, produces ViewModels |
| ViewModel | UI-ready props from entities |
| View | React component, renders ViewModels |

## Testing

- **Service integration tests** — real Repository→Service→Entity→ViewModel pipeline, fake DataSource
- **Component tests** — View rendering with mocked Presenter via test container

## Related Features

- [List Todos](/features/list-todos.md)
- [Create Todo](/features/create-todo.md)
- [Get Todo](/features/get-todo.md)
- [Complete Todo](/features/complete-todo.md)
- [Delete Todo](/features/delete-todo.md)
- [Get Quote](/features/get-quote.md)

## Citations

[1] [OKF Specification v0.1](/references/okf-spec.md) — Bundle structure and cross-linking rules
