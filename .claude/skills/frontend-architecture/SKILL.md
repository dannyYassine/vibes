---
name: frontend-architecture
description: Strict Model-View-Presenter architecture for TypeScript frontends (Vue-first, React supported) with dependency injection and a two-tier testing strategy. Use this skill whenever scaffolding a new feature, adding API integration, organizing frontend code into layers, wiring Vue/React components to data, or writing tests — even when the user does not explicitly say "MVP". Trigger this skill any time work involves creating components, services, API calls, gateways, presenters, view models, entities, stores, event buses, DI wiring, or tests in a TypeScript frontend codebase.
---

# MVP Architecture (TypeScript, Vue-first)

This skill enforces a strict 7-layer Model-View-Presenter architecture for TypeScript frontends, wired together by a dependency injection container. Every feature MUST follow this exact structure. AI-driven development makes the layering cheap; the consistency pays off forever.

Data flows in one direction: **API → Gateway → Service → Entity → Presenter ⇄ ViewModel → View**

The DI container (Layer 0) is the composition root that wires everything together.

Each layer has exactly one responsibility. No layer may skip another. No layer may import from a layer above it.

| #   | Layer          | Responsibility                                                                                              | Knows about                              |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 0   | **Container**  | DI registration & resolution. Composition root.                                                               | All concrete classes (registration only) |
| 1   | **Gateway**    | All external I/O (HTTP, WS, localStorage). Owns API-shape types. Zero business logic.                        | HTTP, API model                          |
| 2   | **Entity**     | Pure domain model + invariants. Framework-free.                                                              | Nothing                                  |
| 3   | **Service**    | Business logic / use cases. Maps API model → Entity.                                                         | Gateway, Entity                          |
| 4   | **Presenter**  | UI behavior + lifecycle. Owns the ViewModel, mutates it. Calls Services. Updates Stores, listens to Bus.     | Service, Entity, ViewModel, Store, Bus   |
| 5   | **ViewModel**  | Passive draft: flat mutable primitives + pure getters.                                                       | Nothing                                  |
| 6   | **View**       | Framework component. v-model onto VM; actions to Presenter.                                                  | Presenter (via hook), ViewModel          |

## File structure (strict — do not deviate)

For every feature, create exactly this structure:

```
src/
├── infra/
│   ├── container/{Container.ts, bootstrap.ts}
│   ├── http/HttpClient.ts
│   ├── events/EventBus.ts
│   └── presenter/
│       ├── Presenter.ts
│       ├── react/{ContainerProvider.tsx, usePresenter.ts}
│       └── vue/{useContainer.ts, usePresenter.ts}
└── features/<feature-name>/
    ├── data/<Feature>Gateway.ts          # Layer 1 (API model + interface + impl)
    ├── domain/<Feature>.ts               # Layer 2 (Entity)
    ├── domain/<Feature>Service.ts        # Layer 3
    ├── state/<Feature>Store.ts           # optional — cross-view entities
    ├── presentation/<Feature>Presenter.ts        # Layer 4
    ├── presentation/<Feature>ViewModel.ts        # Layer 5
    ├── presentation/<Feature>View.vue | .tsx     # Layer 6
    ├── <feature>Module.ts
    └── __tests__/
        ├── <feature>.integration.test.ts
        ├── <Feature>View.test.ts(.tsx)
        ├── fakes/{Fake<Feature>Gateway.ts, <feature>ApiModelFactory.ts}
        └── unit/
```

Naming is non-negotiable: singular noun. A `User` feature has `UserGateway`, `User`, `UserService`, `UserFormPresenter`, `UserFormViewModel`, `UserFormView`. Never plural.

## Import rules (enforced)

A layer may ONLY import from layers below it in the table. Violations break the architecture:

- ❌ View imports Service/Gateway/Entity/API model → LEAK VIOLATION (View sees Presenter + VM only)
- ❌ Presenter imports Gateway → SKIP VIOLATION (must go through Service)
- ❌ Service imports Presenter/VM → UPWARD VIOLATION
- ❌ API model imported above the Service → LEAK VIOLATION (wire shape dies at the Service's mapping method)
- ❌ Entity imports anything → PURITY VIOLATION
- ❌ ViewModel imports anything (even entities) → PURITY VIOLATION
- ❌ Component constructs Presenter with `new` → CONTAINER BYPASS (use the framework hook)

Set up `eslint-plugin-boundaries` to enforce these mechanically.

## The ViewModel is a draft (the defining rule)

The VM is flat mutable primitives + pure getters (`isSubmitDisabled`, `submitLabel`). Inputs bind `v-model` straight onto `presenter.vm.*`; the Presenter mutates the same VM (`isSaving`, `errorMessage`) and calls `notify()`. No entity wrapping, no imports, no async.

Raw input strings stay raw in the VM; the Presenter parses before calling Services. The View never parses or formats anything.

## Component taxonomy (3 categories)

Details in `references/07-view-components.md`. Every component is one of:

- **Smart Container** — the only place `usePresenter` is called.
- **Pass-Through Layout** — forwards VM down, inspects nothing.
- **Leaf Input** — v-models onto a VM primitive, or emits a bus event with an item ID.

## Event Bus

Typed pub-sub (`infra/events/EventBus.ts`, feature-scoped channels) letting nested leaves reach the root Presenter without prop-drilling. Events carry item IDs. The Presenter subscribes in `onCreated` and unsubscribes in `onDestroyed`. Details: `references/07-view-components.md`.

## Global Stores

`state/<Feature>Store.ts` — optional singleton holding entities shared across views (e.g., session user). Updated by Services/Presenters after success. Not a VM replacement.

## Reference files (read all of them, in this order)

The references implement a single `User` feature across all 7 layers. Read them in order — each one builds on the previous and references types defined earlier.

1. `references/00-container.md` — Layer 0: DI container & composition root (foundational — read first)
2. `references/01-gateway.md` — Layer 1: `UserGateway` (API model + interface + HTTP impl)
3. `references/02-entity.md` — Layer 2: `User` entity (pure domain model)
4. `references/03-service.md` — Layer 3: `UserService` (business logic, API-model→Entity mapping)
5. `references/04-presenter.md` — Layer 4: `UserFormPresenter` (owns the VM, lifecycle hooks)
6. `references/05-viewmodel.md` — Layer 5: `UserFormViewModel` (draft: primitives + getters)
7. `references/06-view.md` — Layer 6: `UserFormView` (general View rules; framework-specific details in `frameworks/`)
8. `references/07-view-components.md` — Component taxonomy, event bus, nested leaf → root Presenter communication

## Framework adapters

Layer 6 (the View) is framework-specific. The `frameworks/` folder contains one adapter per supported framework. Both expose the same `usePresenter(Token, { configure })` signature; the state model deliberately diverges.

- `frameworks/react/usePresenter.md` — React 18+ hook with `useSyncExternalStore`, immutable `setState`, `ContainerProvider`, Strict Mode handling. Unchanged from the previous revision.
- `frameworks/vue/usePresenter.md` — Vue 3 composable returning the Presenter wrapped in `reactive()`; Views bind `presenter.vm.*` directly; Presenters mutate the VM + `notify()`.

The divergence is documented: React's `useSyncExternalStore` needs new snapshot references (immutable setState); Vue's reactive proxy makes direct VM mutation idiomatic.

## How to use this skill

When the user asks for a new feature, a new screen, or any frontend work that touches data:

1. **Identify the feature name** (singular noun, e.g., `User`, `Invoice`, `Project`).
2. **Read every reference file in order** — they build on each other: `references/00-container.md` through `07-view-components.md`.
3. **Read the framework adapter** for whichever framework the project uses.
4. **Scaffold all layer files** even if some are trivial. A ViewModel that only holds a couple of primitives is still required. The ceremony is the point.
5. **Register in `<feature>Module.ts`** and call it from `bootstrap.ts`.
6. **Verify the import graph** matches the rules above before declaring the feature done.

## Testing

This skill prescribes a **two-tier testing strategy**:

1. **PRIMARY — Service integration tests**: real Service → real Entity with only a `Fake<Feature>Gateway`. No HTTP, ever.
2. **Component tests with mocked Presenters** verify rendering and event wiring. The Presenter is replaced via the DI container; real Services are not involved.

Unit tests on individual layers exist only for **bug fixes** or genuinely tricky pure logic — not as the default form of testing.

Read the testing references after the layer references, starting with `testing/00-strategy.md`, then `01` through `07`:

- `testing/00-strategy.md` — Overall strategy, when to use which test type
- `testing/01-fakes.md` — In-memory `Fake<Feature>Gateway` classes + API model factories
- `testing/02-test-container.md` — Test-time DI container with fakes wired in
- `testing/03-service-integration.md` — Primary test type, full canonical example
- `testing/04-component-react.md` — React component tests with mocked Presenter
- `testing/05-component-vue.md` — Vue component tests with mocked Presenter (draft-VM style)
- `testing/06-unit-tests.md` — When and how to write targeted unit tests (bug fixes only)
- `testing/07-vitest-setup.md` — Vitest configuration, helpers, conventions

**The non-negotiable rule:** no test ever makes a real HTTP call. The Gateway layer is always faked, in every test, at every layer.

## Why fewer layers than before

DataSource/DTO/Repository collapsed into the Gateway: the Service now owns the API-model→Entity mapping (one private method per entity — backend renames touch exactly that method). Kept: DI container, downward-only imports, entity purity, no-HTTP-in-tests. Traded away: a named DTO artifact and repository-level caching hooks (add a gateway decorator later if caching is needed — one file).

## Common mistakes to avoid

- **Collapsing the Gateway interface and impl** "to save lines" — the interface is the test seam.
- **Letting API models pass above the Service** — snake_case leaking into domain or UI code.
- **Putting business logic in the Presenter.** Call service → update VM → handle errors; anything more → Service.
- **Wrapping entities in the ViewModel.** VM holds copied primitives; the Presenter does the copying.
- **Putting parse/format logic in the View.** Inputs stay raw strings in the VM; display strings are VM getters.
- **Mutating the VM in React presenters.** Use `setState` — `useSyncExternalStore` needs new references.
- **Plural feature names.** It's `UserService`, not `UsersService`.
- **Constructing Presenters with `new` inside components** — always `usePresenter(Token)`.
- **Putting route params in the container.** Use `configure(...)` or method args.
- **Forgetting to register the feature module** in `bootstrap.ts`.
- **Mocking Services in integration tests** — fake the Gateway only.
- **Letting any test make a real HTTP call** — non-negotiable.
