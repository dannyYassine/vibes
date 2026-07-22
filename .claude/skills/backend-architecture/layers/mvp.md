# MVP Pattern

## Rule

**View is passive.** The View has no logic, makes no decisions, knows nothing about the Model. The Presenter mediates everything between domain output and rendered output.

## Three Actors

| Actor | What it is | Responsibility |
|---|---|---|
| **Model** | Domain entities + Output DTO | The business outcome. What happened. |
| **Presenter** | Presenter class | Transforms model, picks view, builds view model. |
| **View** | Component + Template | Passive renderer. Receives view model, outputs HTML. |

## The Coordinator

The framework's View class (Django `View`, etc.) is **not** the MVP View. It's the coordinator that wires the three MVP actors together.

```
Framework View (coordinator)
    │
    ├── Use Case → Model (output DTO)
    ├── Presenter → picks View + builds ViewModel
    └── Component → renders (the real MVP View)
```

| Role | MVP Actor? | Our Implementation |
|---|---|---|
| Business outcome | Model | Domain entities + `CartOutput` |
| Transformation + selection | Presenter | `CartPresenter` |
| Passive rendering | View | Component + Template |
| Wiring (not MVP) | — | Framework View class |

## Server-Side MVP (Presenter-First)

The preferred variant for HTTP server-side rendering:

- Presenter is called first, constructs the View
- View renders once and dies
- No callbacks, no binding — a single pass
- Stateless HTTP collapses the lifecycle

```
CartOutput → Presenter.present() → Component(vm=ViewModel) → .render_to_response()
```

## Client-Side MVP (View-First)

The alternative, used in frontend SPAs:

- View is created first, presenter injected into it
- Presenter holds reference back to the live View
- Calls methods on View over time (bidirectional, ongoing binding)

## Server-Side vs Client-Side

| Aspect | Server-Side MVP | Client-Side MVP |
|---|---|---|
| Creation order | Presenter creates View | View created first, gets Presenter |
| Lifecycle | Render once, die | Persistent, bound |
| State | Stateless HTTP | In-memory, reactive |
| Binding | None (single pass) | Bidirectional, event-driven |
| Returns | HTTP response | Updates live DOM |

## May Call

- Presenter: calls Component constructors, ViewModel constructors
- View (Component): reads `vm.*` only, calls no actors

## DI Registration

- Presenter: typically not registered (stateless, `new` per use) or transient
- Component: not registered (instantiated by Presenter)

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Template making decisions (`{% if %}` on domain state) | Move decision to presenter as `show_*` boolean in ViewModel |
| Template computing/formatting values | Format in presenter, template reads string |
| View (Component) calling back to Presenter | Not needed — single pass, no binding |
| Controller making presenter decisions | Presenter owns all "what should appear" logic |
| Framwork View treated as MVP View | It's the coordinator; Component is the View |
