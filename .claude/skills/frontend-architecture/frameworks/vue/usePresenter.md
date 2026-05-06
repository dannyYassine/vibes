# Vue Framework Adapter

**Path:** `src/infra/presenter/vue/`

This reference describes how Vue 3 Views bind to Presenters. It covers:

1. The `usePresenter` composable — resolves a Presenter from the DI container, manages its lifecycle via Vue's component lifecycle, and exposes reactive state
2. The container injection key and `provideContainer` helper
3. Why the Vue version is even simpler than React's

## Why Vue's composables are a natural fit

Vue's composables solve exactly the problem that Presenter lifecycle integration creates. When a composable calls `onMounted` or `onUnmounted` internally, those hooks automatically tie to the **calling component's lifecycle** — no manual `useEffect` plumbing required. This means `usePresenter` can be a drop-in composable that returns `{ presenter, state }`, and the Presenter's `onMounted`/`onDestroyed` fire automatically because the composable wires them into Vue's lifecycle for you.

Vue also doesn't have React's Strict Mode double-mount in dev, so the lifecycle hooks fire exactly once per mount/unmount — no idempotency concerns from the framework side.

## Strict rules

- **Never `new` a Presenter inside a component.** Always go through `usePresenter` so the container resolves it and lifecycle hooks fire correctly.
- **The composable accepts a Presenter token (the class), not an instance.** Passing the class lets the composable resolve a fresh instance from the container per mount.
- **The Presenter is built exactly once per component mount.** It survives re-renders.
- **Lifecycle hooks fire in this order:** `onCreated` (synchronously after construction, inside the composable call) → `onMounted` (Vue's `onMounted` hook) → `onDestroyed` (Vue's `onUnmounted` hook).
- **Views read state from the returned `shallowRef`.** Vue's reactivity handles re-renders automatically.

## The `usePresenter` composable

```typescript
// src/infra/presenter/vue/usePresenter.ts
import { shallowRef, onMounted, onUnmounted, type ShallowRef } from "vue";
import type { Presenter } from "../Presenter";
import type { Token } from "@/infra/container/Container";
import { useContainer } from "./useContainer";

export type UsePresenterOptions<TPresenter> = {
  /**
   * Synchronous configuration callback. Runs exactly once after the Presenter
   * is constructed and before `onMounted`. Use this to call `presenter.configure(...)`
   * with per-render context (route params, current user, etc.).
   */
  configure?: (presenter: TPresenter) => void;
};

export type UsePresenterResult<TPresenter extends Presenter<unknown>> = {
  presenter: TPresenter;
  state: ShallowRef<
    TPresenter extends Presenter<infer TState> ? TState : never
  >;
};

/**
 * Resolves a Presenter from the DI container, manages its lifecycle, and
 * exposes its state as a reactive `shallowRef`.
 *
 * Lifecycle:
 *   1. Composable call (setup): container.resolve(Token) → presenter.onCreated()
 *   2. Vue onMounted: presenter._markMounted() → presenter.onMounted()
 *   3. Vue onUnmounted: presenter._markUnmounted() → presenter.onDestroyed() → unsubscribe
 *
 * The same Presenter instance is reused across all re-renders of the component.
 * On unmount, the Presenter is discarded — a remount creates a fresh one.
 */
export function usePresenter<TPresenter extends Presenter<unknown>>(
  Token: Token<TPresenter>,
  options: UsePresenterOptions<TPresenter> = {},
): UsePresenterResult<TPresenter> {
  const container = useContainer();
  const presenter = container.resolve(Token);

  type TState = TPresenter extends Presenter<infer S> ? S : never;
  const state = shallowRef(presenter.getState() as TState);

  // Apply configuration before onCreated runs — this lets onCreated
  // observe the configured state if it needs to.
  options.configure?.(presenter);

  // onCreated fires synchronously during setup, before the first render.
  Promise.resolve(presenter.onCreated()).catch((err) => {
    console.error(`[usePresenter] ${Token.name}.onCreated threw:`, err);
  });

  // Subscribe to state changes. The subscription lives for the component's
  // lifetime — we tear it down in onUnmounted alongside onDestroyed.
  const unsubscribe = presenter.subscribe((next) => {
    state.value = next as TState;
  });

  onMounted(() => {
    presenter._markMounted();
    Promise.resolve(presenter.onMounted()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onMounted threw:`, err);
    });
  });

  onUnmounted(() => {
    presenter._markUnmounted();
    Promise.resolve(presenter.onDestroyed()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onDestroyed threw:`, err);
    });
    unsubscribe();
  });

  return { presenter, state };
}
```

## The container injection key and helpers

Vue's `provide`/`inject` is the idiomatic way to thread a singleton through the component tree. We use a typed `InjectionKey` so consumers get full TypeScript inference.

```typescript
// src/infra/presenter/vue/useContainer.ts
import { inject, provide, type InjectionKey, type App } from "vue";
import type { Container } from "@/infra/container/Container";

export const ContainerKey: InjectionKey<Container> = Symbol("Container");

/**
 * Provides the container to descendants. Call this from the app root or
 * from a layout component that wraps the routes needing access.
 */
export function provideContainer(container: Container): void {
  provide(ContainerKey, container);
}

/**
 * Resolves the container injected by an ancestor.
 * Throws a clear error if no provider is present — usually means the
 * app forgot to install the container at the root.
 */
export function useContainer(): Container {
  const container = inject(ContainerKey);
  if (!container) {
    throw new Error(
      "useContainer must be called inside a component tree that has " +
      "called provideContainer(container) — typically from the app root.",
    );
  }
  return container;
}

/**
 * Optional Vue plugin form, for projects that prefer `app.use(...)`
 * over an explicit provideContainer call in the root component.
 */
export function containerPlugin(container: Container) {
  return {
    install(app: App) {
      app.provide(ContainerKey, container);
    },
  };
}
```

## App bootstrap

Two equivalent ways to install the container:

**Plugin form (preferred for most apps):**

```typescript
// src/main.ts
import { createApp } from "vue";
import { bootstrapContainer } from "@/infra/container/bootstrap";
import { containerPlugin } from "@/infra/presenter/vue/useContainer";
import App from "./App.vue";

const container = bootstrapContainer();

createApp(App)
  .use(containerPlugin(container))
  .mount("#app");
```

**Composition root component form (if you need conditional provisioning):**

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { bootstrapContainer } from "@/infra/container/bootstrap";
import { provideContainer } from "@/infra/presenter/vue/useContainer";
import RouterView from "./RouterView.vue";

const container = bootstrapContainer();
provideContainer(container);
</script>

<template>
  <RouterView />
</template>
```

## Canonical View example

```vue
<!-- src/features/user/presentation/UserDetailView.vue -->
<script setup lang="ts">
import { usePresenter } from "@/infra/presenter/vue/usePresenter";
import { UserDetailPresenter } from "./UserDetailPresenter";
import type { User, UserRole } from "../domain/User";

const props = defineProps<{
  userId: string;
  currentUser: User;
}>();

const { presenter, state } = usePresenter(UserDetailPresenter, {
  configure: (p) => p.configure(props.userId, props.currentUser),
});

function onRoleChange(event: Event) {
  const newRole = (event.target as HTMLSelectElement).value as UserRole;
  presenter.changeRole(newRole);
}
</script>

<template>
  <p v-if="state.status === 'loading'">Loading…</p>

  <div v-else-if="state.status === 'error'" class="error">
    <p>{{ state.errorMessage }}</p>
    <button @click="presenter.dismissError()">Dismiss</button>
  </div>

  <div v-else-if="state.status === 'loaded' && state.user" class="user-detail">
    <div class="avatar">
      <img v-if="state.user.avatarUrl" :src="state.user.avatarUrl" alt="" />
      <span v-else>{{ state.user.avatarInitials }}</span>
    </div>

    <h1>{{ state.user.displayName }}</h1>
    <p class="email">{{ state.user.email }}</p>

    <span :class="['badge', `badge-${state.user.roleBadgeColor}`]">
      {{ state.user.roleLabel }}
    </span>
    <span v-if="state.user.canShowAdminBadge" class="admin-badge">Admin</span>

    <dl>
      <dt>Status</dt><dd>{{ state.user.statusLabel }}</dd>
      <dt>Last login</dt><dd>{{ state.user.formattedLastLogin }}</dd>
      <dt>Joined</dt><dd>{{ state.user.formattedJoinedAt }}</dd>
    </dl>

    <label v-if="state.user.canEditRole">
      Change role:
      <select :disabled="state.isSaving" @change="onRoleChange">
        <option value="admin">Administrator</option>
        <option value="member">Team member</option>
        <option value="guest">Guest</option>
      </select>
    </label>
  </div>
</template>
```

Note how clean the script section is — six lines plus an event handler. The composable hides all the lifecycle wiring.

## Why `shallowRef` and not `reactive` or `ref`

The Presenter's state model is **immutable**: every `setState` produces a new state object. Vue has three options for tracking external state, and `shallowRef` is the right one here:

| API | Behavior | Fit for Presenter state |
|-----|----------|-------------------------|
| `ref<T>(v)` | Deep proxy of `.value` | ❌ Wraps every property in a proxy. Wasted work — we replace the whole state object on every update. |
| `reactive<T>(v)` | Deep proxy of the object itself | ❌ Conflicts with immutable updates. Mutating a proxy of an already-replaced object is semantically wrong. |
| `shallowRef<T>(v)` | Tracks `.value` reference only | ✅ Triggers reactivity on full replacement. No proxy overhead. Matches immutable state model exactly. |

`shallowRef` is the canonical choice for "I have an external store that emits whole new state objects." It's what Pinia uses internally for the same reason.

In templates, you access state as `state.status` (Vue auto-unwraps refs in templates). In script code outside the template, use `state.value.status`.

## Why this is simpler than React

Three Vue features collapse complexity that React requires manual handling for:

1. **Composables auto-bind to component lifecycle.** No `useEffect` with empty deps + lint suppressions. `onMounted`/`onUnmounted` inside a composable just work.
2. **No Strict Mode double-mount.** The Presenter is constructed once per real mount. `onMounted`/`onDestroyed` don't need to be idempotent for framework reasons (though they should still be idempotent on principle).
3. **Reactivity is automatic.** No `useSyncExternalStore`. Update `shallowRef.value` and Vue handles re-rendering.

The trade-off: Vue's `<script setup>` syntax is a compile-time transform, which can feel less explicit than React's pure-function components. Both work fine for this architecture; the layer separation is the same.

## Common mistakes

- **Calling `presenter.getState()` inside the template** instead of using `state.value` (script) or `state` (template). The direct call works but doesn't trigger updates on state change.
- **Passing a presenter instance to the composable** instead of the class token. The composable can only manage lifecycle if it owns construction.
- **Constructing presenters in components** with `new UserDetailPresenter(...)`. Bypasses the container and breaks dependency substitution in tests.
- **Calling `usePresenter` outside `<script setup>` or a `setup()` function.** Composables must run during component setup so they can register `onMounted`/`onUnmounted`. Calling from an event handler or `watch` callback will fail.
- **Forgetting to install the container at the root.** `useContainer` throws a clear error in this case — but it's an easy mistake in test setups.
- **Using `ref` or `reactive` instead of `shallowRef`.** Works in many cases but adds proxy overhead and creates subtle bugs when the same state object reference is reused across updates.

## Testing Views with the composable

For component tests, build a test container with mocked Presenters and provide it before mounting:

```typescript
import { mount } from "@vue/test-utils";
import { Container } from "@/infra/container/Container";
import { ContainerKey } from "@/infra/presenter/vue/useContainer";
import { UserDetailPresenter } from "@/features/user/presentation/UserDetailPresenter";
import UserDetailView from "@/features/user/presentation/UserDetailView.vue";

test("UserDetailView renders user", () => {
  const container = new Container();
  const fakePresenter = createFakeUserDetailPresenter({
    initialState: { status: "loaded", user: fakeViewModel(), /* ... */ },
  });
  container.register(UserDetailPresenter, () => fakePresenter, "transient");

  const wrapper = mount(UserDetailView, {
    props: { userId: "user-1", currentUser: currentUser },
    global: {
      provide: { [ContainerKey as symbol]: container },
    },
  });

  expect(wrapper.text()).toContain("Jane Doe");
});
```

The fake presenter only needs to extend `Presenter<TState>` with the right initial state — no Service or Repository required.

## Cross-framework parity

The Vue and React adapters expose the same shape:

| Concept | React | Vue |
|---------|-------|-----|
| Hook/composable name | `usePresenter` | `usePresenter` |
| Container access | `useContainer()` | `useContainer()` |
| Container provider | `<ContainerProvider container={c}>` | `provideContainer(c)` or `app.use(containerPlugin(c))` |
| Reactivity primitive | `useSyncExternalStore` | `shallowRef` |
| Mount lifecycle | `useEffect(() => {...}, [])` | `onMounted` (composable) |
| Unmount lifecycle | cleanup in `useEffect` return | `onUnmounted` (composable) |
| Configure callback | `{ configure: (p) => ... }` option | `{ configure: (p) => ... }` option |
| Returns | `{ presenter, state }` | `{ presenter, state }` (state is `ShallowRef<TState>`) |

Code that doesn't touch the framework — Layers 0 through 7 — is identical between projects. Only the View files and the `frameworks/<framework>/` adapter differ.
