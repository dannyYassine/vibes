# Layer 6: View

**Path:** `src/features/user/presentation/UserFormView.vue` (or `UserDetailView.tsx`)

## Responsibility

The View is the **framework component** that renders UI. It binds to a Presenter via the framework's adapter hook, reads the ViewModel, and forwards user actions back to the Presenter.

The View is the only layer that may import framework code (Vue, React). Everything beneath it (Layers 0–5) is plain TypeScript and survives a framework swap.

## Strict rules

- **Never construct a Presenter with `new`.** Always use the framework adapter hook (`usePresenter(UserFormPresenter)`). The adapter resolves the Presenter from the DI container, fires lifecycle hooks, and manages reactivity. The container is kept — the View just never touches it directly.
- **Pass the Presenter token (the class), not an instance.** The adapter handles construction.
- **Imports allowed: the Presenter token, the ViewModel type (for prop typing), and the framework adapter — nothing else.** NEVER imports a Service, Gateway, API model, or Entity.
- **Two binding rules — the core MVP rules:**
  - **Rule 1 — Inputs vs Actions.** Form inputs (`<input>`, `<select>`, `<textarea>`) bind **directly to VM properties** with `v-model` — the VM is the draft scratchpad. Buttons, submissions, and lifecycle hooks **delegate directly to Presenter methods** (`@click="presenter.handleSave()"`, `@submit.prevent="presenter.handleSave()"`).
  - **Rule 2 — UI logic placement.** Stateful UI logic (loading indicators, error trapping, modals, disabling) → the Presenter writes VM state and the View reads it. Derived/formatting logic → VM getters. The View only reads and wires.
- **No business logic, no formatting, no calculations.** If you find yourself writing `{ formatDate(user.lastLoginAt) }` in a template, that's a violation — that string is `vm.formattedLastLogin`.
- **One View per screen or major UI region.** Mirrors the Presenter granularity (`UserFormView` matches `UserFormPresenter`). Everything nested below the top-level View is governed by the component taxonomy (`07-view-components.md`).

## Two binding rules — in practice

A Vue View looks like this in spirit:

```vue
<!-- src/features/user/presentation/UserFormView.vue -->
<script setup lang="ts">
import { usePresenter } from "@/infra/presenter/vue/usePresenter";
import { UserFormPresenter } from "./UserFormPresenter";

const presenter = usePresenter(UserFormPresenter);
const vm = presenter.vm;
</script>

<template>
  <form @submit.prevent="presenter.handleSave()">
    <input v-model="vm.fullName" />
    <input v-model="vm.birthYear" />
    <button type="submit" :disabled="vm.isSubmitDisabled">{{ vm.submitLabel }}</button>
    <p v-if="vm.errorMessage">{{ vm.errorMessage }}</p>
  </form>
</template>
```

Note what the View does NOT do: it doesn't parse `birthYear`, doesn't decide when saving is disabled (getter), doesn't format the error (Presenter wrote it), doesn't call a Service. Inputs → VM, actions → Presenter, everything else → already computed.

## Framework-specific details

The adapter mechanics differ per framework. After reading this file, consult the framework adapter reference for the project's framework:

- Vue: `frameworks/vue/usePresenter.md` (primary)
- React: `frameworks/react/usePresenter.md`

The framework adapter explains:
- How to wire the DI container into the framework's component tree
- The hook/composable signature and lifecycle mapping
- How to pass per-render config (route params, current user) to the Presenter
- Framework-specific gotchas (Strict Mode, hydration, `reactive()` wrapping, etc.)

## Universal View pattern (illustrative pseudocode)

Regardless of framework, every View follows this shape:

```
function UserFormView(props):
    presenter = useFrameworkAdapter(UserFormPresenter, {
        configure: (p) => p.configure(props.userId),
    })

    vm = presenter.vm          // Vue: read state off presenter.vm
    // (React adapters return a snapshot as `state` instead)

    render vm.fullName, vm.birthYear as inputs bound with v-model / value+onChange
    wire submit button to presenter.handleSave()
    if vm.errorMessage: render error UI, wire dismiss to presenter.dismissError()
    disable submit via vm.isSubmitDisabled
```

The View is purely a projection of the VM into UI plus event wiring back to `presenter`.

## What does NOT belong in a View

- **`new SomeClass(...)` calls** — go through the container via the framework hook. (Sole exception: a leaf input emitting a bus event — see the taxonomy in `07-view-components.md`.)
- **Imports from the data layer** (`IUserGateway`, `UserApiModel`) — these are below the Service boundary.
- **Imports from the domain** (`Entity`, `Service`) — go through the Presenter and ViewModel.
- **Date formatting, string concatenation, conditional class building** — push to VM getters (Presenter copies the data).
- **API calls** — Presenter calls Service, never the View directly.
- **Authorization checks** — Service enforces, Presenter copies `canEditRole` into the VM, View just reads it.
- **Direct container access** (`container.resolve(...)`) — always go through the adapter hook so lifecycle is managed correctly.

## Composition root, revisited

The DI container reference (`00-container.md`) covers full composition. The relevant takeaway for Views: by the time the View renders, the container has been bootstrapped at the app root and made available via the framework's context mechanism. The View just calls the adapter hook and gets a wired Presenter back.

```
main.ts:
    container = bootstrapContainer()
    app.provide(CONTAINER_KEY, container)
    app.mount("#app")

UserFormView.vue:
    const presenter = usePresenter(UserFormPresenter)
    // presenter is fully wired with Service → Gateway → HttpClient
```

The View never sees any of those underlying classes. It asks for a `UserFormPresenter` and gets one.

## Testing

View tests render the component inside a test container with mocked Presenters. The framework adapter reference covers testing patterns specific to each framework (e.g., providing a test container via the Vue plugin).

The key principle: tests substitute at the Presenter boundary, not the Service or Gateway boundary. A fake Presenter with a controlled VM is enough to drive any View test scenario — no need for real Services, Gateways, or HTTP.
