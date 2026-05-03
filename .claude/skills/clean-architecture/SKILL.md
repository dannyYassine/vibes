---
name: clean-architecture
description: >
  Enforces clean architecture layer rules during code creation and review.
  All non-framework code — usecases, services (core/domain/service-helper), repositories, models,
  factories, handlers, helpers, DTOs, and events — must comply with this architecture.
  Framework-owned files (controllers, jobs, commands, listeners, subscribers, DI bindings) are
  delivery or wiring concerns and may use framework conventions, but must still respect the
  dependency direction rules (delivery → usecases → services → models).
  Use when the user says "create a usecase", "add a service", "write a repository",
  "create a controller", "create a command", "create a job", "create a handler", "create a factory",
  "add a model", "create a DTO", "register in DI", "wire up dependency injection",
  "follow clean architecture", "what layer does this belong to", "review architecture",
  "clean arch", "create a listener", "create a subscriber", "create an event", "dispatch an event",
  "service-helper", "is this violating clean architecture", "where does this code go",
  "can a controller call a repository", or when discussing layering or dependency rules.
  Also use when the user says "write a test", "how do I test", "test this usecase",
  "integration test", "functional test", "unit test", "test a helper", "test a controller",
  "test a listener", "what type of test", or asks about testing strategy for any layer.
---

# Clean Architecture

## Flow

```
delivery mechanisms → new VerbNounDto() → usecase.execute(dto) → services → models
```

## Layer Reference

| Layer               | DI Role             | Instantiation                           | May Call                                                  |
| ------------------- | ------------------- | --------------------------------------- | --------------------------------------------------------- |
| Delivery mechanisms | Receives injections | Framework-owned                         | Usecases (via DI only)                                    |
| DTOs                | Not registered      | `new` inline in delivery                | — (data only)                                             |
| Usecases            | Registered          | DI container                            | Services, repositories, factories, handlers               |
| Domain services     | Registered          | DI container                            | Other services, repositories, factories, handlers         |
| Core services       | Registered          | DI container                            | Other services, repositories, factories, handlers         |
| Service-helpers     | Registered          | DI container                            | Their paired Helper only; also repos, factories, handlers |
| Helpers             | Not registered      | Fn call (stateless)                     | **Only callable by their paired service-helper**          |
| Handlers            | **Never uses DI**   | `new(plainVar1, plainVar2)`             | Nothing injected — pure operation                         |
| Repositories        | Registered          | DI container                            | Models (hydration only)                                   |
| Models              | Not registered      | `new(...)` or `Model.fromDatabase(row)` | — (domain logic only)                                     |
| Factories           | Registered          | DI container                            | Models, other factories                                   |

## Core Rules

1. **Dependency direction**: delivery → usecases → services → models. Never reversed, never skipped.
2. **DTOs**: delivery mechanisms build a DTO from raw input and pass it to `usecase.execute(dto)`. Usecases never receive raw request objects.
3. **Helpers**: ONLY their paired service-helper may call them. No other class may call a helper directly.
4. **Handlers**: callable from any layer EXCEPT delivery mechanisms. Never DI-injected. Constructor takes plain variables only.
5. **Repositories**: callable only from usecases and services. Delivery mechanisms must not call repositories.
6. **DI-injected**: usecases, services (all sub-types), repositories, factories. Everything else is plain instantiation.
7. **Single usecase rule**: each usecase does exactly one thing. No usecase calls another usecase.
8. **Models**: created via `new Model(...)` for new entities, or `Model.fromDatabase(row)` when hydrated from storage.

## Service Sub-Types

| Sub-type       | Purpose                                                               | Notes                            |
| -------------- | --------------------------------------------------------------------- | -------------------------------- |
| Domain service | Shareable business logic between multiple services                    | e.g. `PricingDomainService`      |
| Core service   | Standard inner service used by usecases and/or other services         | e.g. `UserService`               |
| Service-helper | 1:1 pair with a Helper class; applies business logic to helper output | Only caller of its paired Helper |

## Decision Guide

| Situation                                        | Layer                 | Reference                       |
| ------------------------------------------------ | --------------------- | ------------------------------- |
| Handles HTTP request                             | Controller            | `layers/delivery-mechanisms.md` |
| Handles CLI command                              | Command               | `layers/delivery-mechanisms.md` |
| Dispatched to queue, picked up by worker         | Job                   | `layers/delivery-mechanisms.md` |
| Something happened, notify other parts of system | Event                 | `layers/events.md`              |
| Reacts to event (sync)                           | Listener              | `layers/delivery-mechanisms.md` |
| Reacts to event (sync or async via queue)        | Subscriber            | `layers/delivery-mechanisms.md` |
| Carries input from delivery to usecase           | DTO                   | `layers/dtos.md`                |
| Orchestrates a single user intent                | Usecase               | `layers/usecases.md`            |
| Reusable business logic, no direct user intent   | Service (core/domain) | `layers/services.md`            |
| Wraps a Helper with business logic               | Service-helper        | `layers/services.md`            |
| Thin 3rd-party tech wrapper, no business logic   | Helper                | `layers/helpers.md`             |
| Single focused operation, plain-var constructor  | Handler               | `layers/handlers.md`            |
| Persists or fetches from storage                 | Repository            | `layers/repositories.md`        |
| Represents a domain entity                       | Model                 | `layers/models.md`              |
| Creates complex model instances                  | Factory               | `layers/factories.md`           |
| Wires everything together                        | DI container          | `layers/di-container.md`        |

## Behavior Modes

**Mode A — Creating new code**

1. Identify the layer using the Decision Guide above.
2. Load the corresponding reference file.
3. Apply naming conventions, constructor rules, and call constraints from that file.
4. After generating code, state which DI bindings are needed (or "no DI binding" for handlers/helpers/models/DTOs).
5. Flag any violations in the user's own description before writing code.

**Mode B — Reviewing existing code**

1. Load the reference file for the layer the code claims to belong to.
2. Check each Core Rule systematically.
3. Report violations: layer violated → rule number → specific location → corrective action.
4. Offer to fix specific violations only — do not rewrite the whole file.

**Mode C — Architecture question**

1. Answer directly from Core Rules above.
2. Cite the rule number: "Rule 3 — only a service-helper may call its paired helper."
3. Load a reference file only when the question needs deeper detail.

## Testing

| Layer               | Test type                         | Reference                        |
| ------------------- | --------------------------------- | -------------------------------- |
| Usecases            | Integration                       | `testing/usecases.md`            |
| Services            | Integration (via usecase)         | `testing/services.md`            |
| Helpers             | **Unit** (always)                 | `testing/helpers.md`             |
| Handlers            | Integration (via usecase)         | `testing/handlers.md`            |
| Repositories        | Integration                       | `testing/repositories.md`        |
| Models              | Integration (via usecase)         | `testing/models.md`              |
| Factories           | Integration (via usecase)         | `testing/factories.md`           |
| Delivery mechanisms | Functional                        | `testing/delivery-mechanisms.md` |
| Events              | Integration (spy in usecase test) | `testing/events.md`              |

Test type philosophy: `testing/types/`

## Reference Files

Load on demand:

- `layers/dtos.md`
- `layers/usecases.md`
- `layers/services.md` — covers all three service sub-types
- `layers/helpers.md`
- `layers/handlers.md`
- `layers/repositories.md`
- `layers/models.md`
- `layers/factories.md`
- `layers/events.md`
- `layers/delivery-mechanisms.md`
- `layers/di-container.md`
- `testing/types/integration.md`
- `testing/types/functional.md`
- `testing/types/unit.md`
- `testing/{layer}.md` — layer-specific test guidance
- `frameworks/laravel.md`, `frameworks/fastapi.md`, `frameworks/django.md` — framework-specific wiring examples
- `diagrams/` — architecture diagrams
