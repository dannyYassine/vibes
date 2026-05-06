---
name: frontend-architecture
description: Strict Model-View-Presenter architecture for TypeScript frontend code with dependency injection and a service-integration testing strategy. Use this skill whenever scaffolding a new feature, adding API integration, organizing frontend code into layers, wiring React/Vue components to data, or writing tests — even when the user does not explicitly say "MVP". Trigger this skill any time work involves creating components, services, API calls, presenters, view models, repositories, data sources, entities, DTOs, DI containers, or tests in a TypeScript frontend codebase. Also trigger when the user asks for a feature scaffold, a new screen, framework lifecycle integration, test setup, or wiring up data flow from API to UI.
---

# MVP Architecture (Framework-Agnostic TypeScript)

This skill enforces a strict 8-layer Model-View-Presenter architecture for TypeScript frontends, wired together by a dependency injection container. Every feature MUST follow this exact structure. AI-driven development makes the layering cheap; the consistency pays off forever.

## The 8 layers

Data flows in one direction: **API → DataSource → Repository → Service → Presenter → ViewModel → View**

The DI container (Layer 0) is the composition root that wires everything together.

Each layer has exactly one responsibility. No layer may skip another. No layer may import from a layer above it.

| #   | Layer          | Responsibility                                                          | Knows about                              |
| --- | -------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| 0   | **Container**  | DI registration & resolution. Composition root.                         | All concrete classes (registration only) |
| 1   | **DataSource** | Raw HTTP transport. Endpoints, headers, query params. Returns DTOs.     | HTTP, DTO                                |
| 2   | **DTO**        | Plain object matching API shape. snake_case OK, nullable everything.    | Nothing                                  |
| 3   | **Repository** | Maps DTOs → Entities. Caching, retries, error normalization.            | DataSource, DTO, Entity                  |
| 4   | **Entity**     | Domain model. Pure data + invariants. Framework-free.                   | Nothing                                  |
| 5   | **Service**    | Business logic. Orchestrates repositories. Use-case-centric.            | Repository, Entity                       |
| 6   | **Presenter**  | Holds UI state. Calls services. Produces ViewModels. Lifecycle-aware.   | Service, Entity, ViewModel               |
| 7   | **ViewModel**  | DTO-style class for the view. Accepts entities, exposes UI-ready props. | Entity                                   |
| 8   | **View**       | Framework component. Renders ViewModel. Calls presenter methods.        | Presenter (via hook), ViewModel          |

## File structure (strict — do not deviate)

For every feature, create exactly this structure:

```
src/
├── infra/
│   ├── container/
│   │   ├── Container.ts                  # Layer 0: DI container
│   │   └── bootstrap.ts                  # App composition root
│   └── presenter/
│       ├── Presenter.ts                  # Abstract base class for all presenters
│       ├── react/                        # React adapter (use only in React projects)
│       │   ├── ContainerProvider.tsx
│       │   └── usePresenter.ts
│       └── vue/                          # Vue adapter (use only in Vue projects)
│           ├── useContainer.ts
│           └── usePresenter.ts
└── features/<feature-name>/
    ├── data/
    │   ├── <Feature>DataSource.ts        # Layer 1
    │   └── <Feature>Dto.ts               # Layer 2
    ├── domain/
    │   ├── <Feature>Repository.ts        # Layer 3
    │   ├── <Feature>.ts                  # Layer 4 (Entity)
    │   └── <Feature>Service.ts           # Layer 5
    ├── presentation/
    │   ├── <Feature>Presenter.ts         # Layer 6 (extends Presenter base)
    │   ├── <Feature>ViewModel.ts         # Layer 7
    │   └── <Feature>View.tsx             # Layer 8 (framework component)
    ├── <feature>Module.ts                # Container registration for this feature
    └── __tests__/
        ├── <feature>.integration.test.ts # PRIMARY — service-level integration test
        ├── <Feature>View.test.tsx        # Component test with mocked Presenter
        ├── fakes/
        │   ├── Fake<Feature>DataSource.ts
        │   └── <feature>DtoFactory.ts
        └── unit/                         # Optional — bug fixes / tricky logic only
            └── <Layer>.test.ts
```

Naming is non-negotiable. A `User` feature has `UserDataSource`, `UserDto`, `UserRepository`, `User` (entity), `UserService`, `UserPresenter`, `UserViewModel`, `UserView`. Singular noun for the feature, never plural.

## Import rules (enforced)

A layer may ONLY import from layers below it in the table. Violations break the architecture:

- ❌ View imports DataSource → SKIP VIOLATION
- ❌ Service imports DataSource → SKIP VIOLATION (must go through Repository)
- ❌ Presenter imports DTO → LEAK VIOLATION (DTO must die at the Repository boundary)
- ❌ View imports Entity directly → LEAK VIOLATION (View only sees ViewModel)
- ❌ Entity imports anything → PURITY VIOLATION
- ❌ Component constructs Presenter with `new` → CONTAINER BYPASS (must use framework hook)

Set up `eslint-plugin-boundaries` to enforce these mechanically.

## How to use this skill

When the user asks for a new feature, a new screen, or any frontend work that touches data:

1. **Identify the feature name** (singular noun, e.g., `User`, `Invoice`, `Project`).
2. **Read every reference file in order** — they build on each other. Start with `00-container.md` (foundational), then `01` through `08`. Then read the framework adapter for whichever framework the project uses.
3. **Scaffold all 8 layer files** even if some are trivial. A ViewModel that only forwards a single entity prop is still required. The ceremony is the point.
4. **Add a `<feature>Module.ts`** that registers the feature's classes with the container.
5. **Implement the feature** using the canonical `User` example as the template.
6. **Verify the import graph** matches the rules above before declaring the feature done.

## Reference files (read all of them, in this order)

The references implement a single `User` feature across all 8 layers. Read them in order — each one builds on the previous and references types defined earlier.

1. `references/00-container.md` — Layer 0: DI container & composition root (foundational — read first)
2. `references/01-datasource.md` — Layer 1: `UserDataSource` (raw HTTP, returns DTOs)
3. `references/02-dto.md` — Layer 2: `UserDto` (API shape, snake_case)
4. `references/03-repository.md` — Layer 3: `UserRepository` (DTO→Entity mapping, caching)
5. `references/04-entity.md` — Layer 4: `User` entity (pure domain model)
6. `references/05-service.md` — Layer 5: `UserService` (business logic, use cases)
7. `references/06-presenter.md` — Layer 6: `UserPresenter` (extends `Presenter<TState>`, lifecycle hooks)
8. `references/07-viewmodel.md` — Layer 7: `UserViewModel` (UI-ready props from entity)
9. `references/08-view.md` — Layer 8: `UserView` (general View rules; framework-specific details in `frameworks/`)

## Framework adapters

Layer 8 (the View) is framework-specific. The `frameworks/` folder contains one adapter per supported framework. Each adapter provides a hook (or equivalent) that resolves a Presenter from the container, manages its lifecycle, and bridges its state to the framework's reactivity model.

- `frameworks/react/usePresenter.md` — React 18+ hook with `useSyncExternalStore`, `ContainerProvider`, Strict Mode handling
- `frameworks/vue/usePresenter.md` — Vue 3 composable using `shallowRef` and `provide`/`inject`, with optional plugin form

Both adapters expose the same `usePresenter(PresenterToken, { configure })` signature, so View code is structurally identical across frameworks. Read the adapter that matches the project's framework after the layer references.

## Testing

This skill prescribes a **two-tier testing strategy**:

1. **Service integration tests** are the primary form of testing. They exercise the real Repository → Service → Entity → ViewModel pipeline with only the DataSource faked. No HTTP, ever.
2. **Component tests with mocked Presenters** verify rendering and event wiring. The Presenter is replaced via the DI container; real Services are not involved.

Targeted unit tests on individual layers exist only for **bug fixes** or genuinely tricky pure logic — not as the default form of testing.

Read the testing references after the layer references:

- `testing/00-strategy.md` — Overall strategy, when to use which test type
- `testing/01-fakes.md` — In-memory `Fake<Feature>DataSource` classes
- `testing/02-test-container.md` — Test-time DI container with fakes wired in
- `testing/03-service-integration.md` — Primary test type, full canonical example
- `testing/04-component-react.md` — React component tests with mocked Presenter
- `testing/05-component-vue.md` — Vue component tests with mocked Presenter
- `testing/06-unit-tests.md` — When and how to write targeted unit tests (bug fixes only)
- `testing/07-vitest-setup.md` — Vitest configuration, helpers, conventions

**The non-negotiable rule:** no test ever makes a real HTTP call. The DataSource layer is always faked, in every test, at every layer.

## Why all the layers

The layered approach used to feel heavy because of the boilerplate cost. With AI-driven scaffolding, that cost is gone — but the architectural benefits remain:

- **Parallel work**: Two devs can build the same feature simultaneously. One owns DataSource + Repository (mocking the API contract), the other owns Service + Presenter + View. They meet at the Entity.
- **Testability**: Each layer mocks the one below it. Repository tests mock DataSource. Service tests mock Repository. Presenter tests mock Service. View tests mock Presenter via the container.
- **API change isolation**: When the backend renames `user_name` to `username`, exactly one file changes: the DTO mapping inside the Repository.
- **Framework portability**: Layers 0–7 are pure TypeScript. Adding a second framework only means adding a new adapter under `frameworks/`.
- **Code review clarity**: Reviewers know exactly which layer to check based on the file path.
- **Substitution at any boundary**: The DI container makes it trivial to swap a real Repository for a fake in tests, or wrap a Service with logging/metrics decorators in production.

## Common mistakes to avoid

- **Collapsing Repository and DataSource** "to save a file." Don't. The split lets you add caching, multi-source orchestration, and offline support without rewriting service code.
- **Leaking DTOs past the Repository.** If a Service ever imports a `Dto` type, the boundary is broken.
- **Putting business logic in the Presenter.** The Presenter only orchestrates UI state.
- **Skipping the ViewModel** because "the entity already has the right shape." The ViewModel insulates the View from entity changes.
- **Plural feature names.** It's `UserService`, not `UsersService`.
- **Constructing Presenters with `new` inside components.** Always go through the framework's `usePresenter`-equivalent hook so the container resolves dependencies and lifecycle hooks fire.
- **Putting route params in the container.** The container is for stable dependencies. Per-render context (route params, current user) goes through the Presenter's `configure(...)` method.
- **Forgetting to register a feature's module.** A feature only works once `register<Feature>Module(container)` is called from `bootstrap.ts`.
- **Mocking Repositories or Services in tests.** Always mock at the DataSource boundary (via `FakeUserDataSource`) or the Presenter boundary (in component tests). Mocking middle layers means testing mocks instead of real code paths.
- **Letting any test make a real HTTP call.** This is non-negotiable. If a test hits the network, the `FakeUserDataSource` substitution is broken — fix the test container before merging.
