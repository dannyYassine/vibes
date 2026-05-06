# Layer 8: View

**Path:** `src/features/user/presentation/UserView.{tsx,vue,svelte}`

## Responsibility

The View is the **framework component** that renders UI. It binds to a Presenter via the framework's adapter hook, renders ViewModels, and forwards user actions back to the Presenter.

The View is the only layer that may import framework code (React, Vue, Svelte). Everything beneath it (Layers 0–7) is plain TypeScript and survives a framework swap.

## Strict rules

- **Never construct a Presenter with `new`.** Always use the framework adapter (e.g., `usePresenter(UserDetailPresenter)` in React). The adapter resolves the Presenter from the DI container, fires lifecycle hooks, and manages reactivity.
- **Pass the Presenter token (the class), not an instance.** The adapter handles construction.
- **Imports the Presenter token, the ViewModel type (if needed for prop types), and the framework adapter — nothing else.** Never imports a Service, Repository, DataSource, DTO, or Entity directly.
- **No business logic, no formatting, no calculations.** If you find yourself writing `{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}`, that string belongs on the ViewModel as `formattedLastLogin`.
- **Calls Presenter methods for actions.** `presenter.changeRole(role)`, never `service.changeRole(...)`.
- **Reads from Presenter state via the adapter's return value.** The adapter handles subscription and re-render triggering.
- **One View per screen or major UI region.** Mirrors the Presenter granularity (`UserDetailView` matches `UserDetailPresenter`).

## Framework-specific details

The adapter mechanics differ per framework. After reading this file, consult the framework adapter reference for the project's framework:

- React: `frameworks/react/usePresenter.md`
- Vue: `frameworks/vue/usePresenter.md`
- Svelte: `frameworks/svelte/usePresenter.md` (when added)

The framework adapter explains:
- How to wire the DI container into the framework's component tree
- The hook/composable signature and lifecycle mapping
- How to pass per-render config (route params, current user) to the Presenter
- Framework-specific gotchas (Strict Mode, hydration, etc.)

## Universal View pattern (illustrative pseudocode)

Regardless of framework, every View follows this shape:

```
function UserDetailView(props):
    { presenter, state } = useFrameworkAdapter(UserDetailPresenter, {
        configure: (p) => p.configure(props.userId, props.currentUser),
    })

    if state.status == "loading":
        render "Loading…"

    if state.status == "error":
        render error UI with state.errorMessage
        wire dismiss button to presenter.dismissError()

    if state.status == "loaded":
        vm = state.user
        render vm.displayName, vm.email, vm.formattedLastLogin, ...
        if vm.canEditRole:
            render role selector → onChange calls presenter.changeRole(newRole)
```

The View is purely a projection of `state` into UI plus event wiring back to `presenter`.

## What does NOT belong in a View

- **`new SomeClass(...)` calls** — go through the container via the framework hook.
- **Imports from the data layer** (`DataSource`, `Dto`, `Repository`) — these are below the Service boundary.
- **Imports from the domain** (`Entity`, `Service`) — go through the Presenter and ViewModel.
- **Date formatting, string concatenation, conditional class building** — push to ViewModel.
- **API calls** — Presenter calls Service, never the View directly.
- **Authorization checks** — Service enforces, ViewModel exposes `canX` booleans, View just reads them.
- **Direct container access** (`container.resolve(...)`) — always go through the adapter hook so lifecycle is managed correctly.

## Composition root, revisited

The DI container reference (`00-container.md`) covers full composition. The relevant takeaway for Views: by the time the View renders, the container has been bootstrapped at the app root and made available via the framework's context mechanism. The View just calls the adapter hook and gets a wired Presenter back.

```
main.tsx (or main.ts):
    container = bootstrapContainer()
    render <ContainerProvider container={container}><App /></ContainerProvider>

UserDetailView.tsx:
    { presenter, state } = usePresenter(UserDetailPresenter, { configure: ... })
    // presenter is fully wired with Service → Repository → DataSource → HttpClient
```

The View never sees any of those underlying classes. It asks for a `UserDetailPresenter` and gets one.

## Testing

View tests render the component inside a test container with mocked Presenters. The framework adapter reference covers testing patterns specific to each framework (e.g., wrapping with `<ContainerProvider>` in React tests).

The key principle: tests substitute at the Presenter boundary, not the Service or Repository boundary. A fake Presenter with controlled state is enough to drive any View test scenario — no need for real Services, Repositories, or HTTP.
