---
type: Architecture
title: Layering Rules
description: The 10 hard rules governing dependency direction in the codebase.
tags: [architecture, layering, clean-architecture]
timestamp: 2026-07-23T21:00:00Z
---

# Layering Rules

Dependencies flow one direction only:

```
delivery mechanisms (views, jobs, commands)
        ↓ build DTO, call one usecase
application (use cases)
        ↓ call
services (core/domain)
        ↓ call
repositories, factories, handlers
        ↓ hydrate / create
models (domain entities)
```

## Hard Rules

1. **One use case per request.** A view or job builds exactly one DTO and calls exactly one `usecase.execute(dto)`. Never two.
2. **Views never touch repositories.** Views call use cases only.
3. **Use cases never import Django.** They take ports (ABCs) as constructor args. Django lives only in `infrastructure/`.
4. **Repositories return domain entities**, never ORM models. Hydrate via `Entity.fromDatabase(row)`.
5. **Handlers are pure functions**, constructed with plain vars, never DI-registered. Called by CategorizationService.
6. **DTOs are data only.** No methods. Built by the delivery mechanism, passed to `usecase.execute(dto)`.
7. **Presenters never call services/repositories.** They take use-case output, build a ViewModel, pick a Component.
8. **Templates read `vm.*` only.** No computation, no formatting in templates.
9. **`AUTO_APPROVE_THRESHOLD` is a class attribute on `AutoCategorizeUseCase`**, not a Django setting.
10. **Credentials never committed, never logged.** `.env` only, gitignored.

## Dependency Direction Cheat Sheet

| Layer | May import |
|---|---|
| `domain/` | stdlib only |
| `application/` | `domain/`, stdlib |
| `services/` | `application/`, `domain/`, stdlib |
| `infrastructure/` | `application/`, `domain/`, Django, Playwright |
| `interfaces/views/` | `application/container`, `application/use_cases`, `interfaces/presenters`, `dependency_injector.wiring`, Django |
| `interfaces/presenters/` | `domain/`, `interfaces/view_models` |
| `interfaces/components/` | django-components, templates |
| `tests/` | everything |