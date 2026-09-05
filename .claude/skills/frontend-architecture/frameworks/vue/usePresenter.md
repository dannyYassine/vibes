# Vue Framework Adapter

**Path:** `src/infra/presenter/vue/`

This reference describes how Vue 3 Views bind to Presenters. It covers:

1. The `usePresenter` composable — resolves a Presenter from the DI container, wraps it in Vue's `reactive()`, and manages its lifecycle
2. The container injection key and `provideContainer` helper
3. Why the Vue reactivity model makes the Presenter's `vm` directly bindable

## Why Vue's composables are a natural fit

Vue's composables solve exactly the problem that Presenter lifecycle integration creates. When a composable calls `onMounted` or `onUnmounted` internally, those hooks automatically tie to the **calling component's lifecycle** — no manual effect plumbing required. This means `usePresenter` can be a drop-in composable that returns the presenter itself, and the Presenter's `onMounted`/`onDestroyed` fire automatically because the composable wires them into Vue's lifecycle for you.

Vue also doesn't have React's Strict Mode double-mount, so lifecycle hooks fire exactly once per real mount — no idempotency concerns from the framework side.

## Strict rules

- **Never `new` a Presenter inside a component.** Always go through `usePresenter` so the container resolves it and lifecycle hooks fire correctly.
- **The composable accepts a Presenter token (the class), not an instance.** Passing the class lets the composable resolve a fresh instance from the container per mount.
- **The Presenter is built exactly once per component mount.** It survives re-renders.
- **Lifecycle hooks fire in this order:** `onCreated` (synchronously after construction, inside the composable call) → `onMounted` (Vue's `onMounted` hook) → `onDestroyed` (Vue's `onUnmounted` hook).
- **Views read and bind everything through `presenter.vm.*`.** Never call `presenter.getState()` in templates and never wrap the returned presenter in `ref`/`shallowRef` yourself.

## The `usePresenter` composable

```typescript
// src/infra/presenter/vue/usePresenter.ts
import { reactive, onMounted, onUnmounted } from "vue";
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

/**
 * Resolves a Presenter from the DI container, wraps it in `reactive()`,
 * manages lifecycle. Returns the SAME presenter instance — reactive proxy.
 * View binds: v-model="presenter.vm.fullName", @click="presenter.handleSave()".
 */
export function usePresenter<TPresenter extends Presenter<unknown>>(
  Token: Token<TPresenter>,
  options: UsePresenterOptions<TPresenter> = {},
): TPresenter {
  const container = useContainer();
  const presenter = container.resolve(Token);

  options.configure?.(presenter);

  Promise.resolve(presenter.onCreated()).catch((err) => {
    console.error(`[usePresenter] ${Token.name}.onCreated threw:`, err);
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
  });

  return reactive(presenter) as TPresenter;
}
```

## Why `reactive(presenter)`

The Presenter owns `vm` — a plain ViewModel class holding flat mutable primitives plus pure getters. Wrapping the **Presenter** (not the VM) means every access to `presenter.vm` goes through the reactive proxy, so reading `presenter.vm.fullName` returns a reactive view of the VM.

This gives you reactivity in **both directions**:

- **v-model writes from the template** — `v-model="presenter.vm.fullName"` writes through the proxy and triggers updates everywhere else the field is read (e.g., a `submitLabel` getter that depends on `fullName`).
- **Field mutations inside Presenter methods** — `this.vm.isSaving = true` followed by `notify()` updates the same proxied object, and the template re-renders.

One proxy at the top is enough. Vue's `reactive()` is a deep proxy: accessing `presenter.vm` through the presenter proxy cascades a reactive view of the VM automatically. You never need to wrap the VM separately.

## The getter caveat

The ViewModel exposes derived display values as **pure getters** (`isSubmitDisabled`, `submitLabel`, `errorMessage`). Getters live on the class **prototype**, and `reactive()` handles prototype getters correctly — `presenter.vm.submitLabel` through the proxy invokes the getter and tracks its dependencies.

But two operations destroy getters:

- **Spreading the VM** — `{ ...vm }` copies own enumerable properties only. Prototype getters are lost; you get `undefined` (or stale snapshot values) instead of live computed properties. Never do this.
- **`toRefs(vm)`** — designed for plain objects, it also drops prototype getters and produces refs for the wrong surface.

Bind through `presenter.vm.*` directly. That's the whole point of the proxy.

## Lifecycle wiring

Identical to the framework-agnostic contract: `onCreated` fires synchronously during setup (wrapped in `Promise.resolve` so async overrides don't produce unhandled rejections) → `_markMounted()` + `onMounted` in Vue's `onMounted` → `_markUnmounted()` + `onDestroyed` in Vue's `onUnmounted`.

Vue has no Strict Mode double-mount. Hooks fire once per real mount/unmount cycle.

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
<!-- src/features/user/presentation/UserFormView.vue -->
<script setup lang="ts">
import { usePresenter } from "@/infra/presenter/vue/usePresenter";
import { UserFormPresenter } from "./UserFormPresenter";

const props = defineProps<{ userId: string }>();

const presenter = usePresenter(UserFormPresenter, {
  configure: (p) => p.configure(props.userId),
});
</script>

<template>
  <form @submit.prevent="presenter.handleSave()">
    <label>
      Full Name:
      <!-- Direct v-model binding to ViewModel primitives -->
      <input v-model="presenter.vm.fullName" type="text" />
    </label>

    <label>
      Birth Year:
      <input v-model="presenter.vm.birthYear" type="number" />
    </label>

    <p v-if="presenter.vm.errorMessage" class="error">
      {{ presenter.vm.errorMessage }}
    </p>

    <button type="submit" :disabled="presenter.vm.isSubmitDisabled">
      {{ presenter.vm.submitLabel }}
    </button>
  </form>
</template>
```

Note how clean the script section is. Inputs bind straight to VM primitives; buttons bind to VM getters; actions call Presenter methods. The View never parses, formats, or branches on anything but VM state.

## Common mistakes

- **Calling `presenter.getState()` in templates** instead of `presenter.vm.*`. The direct call works but returns a raw, unproxied reference — no reactivity.
- **Passing a presenter instance to the composable** instead of the class token. The composable can only manage lifecycle if it owns construction.
- **Constructing presenters in components** with `new UserFormPresenter(...)`. Bypasses the container and breaks dependency substitution in tests.
- **Spreading the VM** (`{ ...presenter.vm }`) — loses prototype getters. Same for `toRefs(presenter.vm)`.
- **Wrapping the presenter in `ref`/`shallowRef` yourself** instead of using the reactive proxy `usePresenter` already returns. Double-wrapping creates two sources of truth.
- **Forgetting to install the container at the root.** `useContainer` throws a clear error in this case — but it's an easy mistake in test setups.

## Testing Views with the composable

For component tests, build a test container with a fake presenter and provide it before mounting. The fake is a real class instance (or the real presenter type with `vi.fn()` methods) whose VM you set directly — see `testing/05-component-vue.md`:

```typescript
import { mount } from "@vue/test-utils";
import { Container } from "@/infra/container/Container";
import { ContainerKey } from "@/infra/presenter/vue/useContainer";
import { UserFormPresenter } from "@/features/user/presentation/UserFormPresenter";
import { FakeUserFormPresenter } from "@/features/user/__tests__/fakes/FakeUserFormPresenter";
import UserFormView from "@/features/user/presentation/UserFormView.vue";

test("UserFormView renders from the VM", () => {
  const container = new Container();
  const fakePresenter = new FakeUserFormPresenter(); // real VM, vi.fn() actions
  fakePresenter.vm.fullName = "Jane Doe";
  container.register(UserFormPresenter, () => fakePresenter, "transient");

  const wrapper = mount(UserFormView, {
    props: { userId: "user-1" },
    global: {
      provide: { [ContainerKey as symbol]: container },
    },
  });

  expect(wrapper.find("input").element.value).toBe("Jane Doe");
});
```

The fake presenter exposes a controllable `vm` — no Service or Gateway involved.

## Cross-framework parity

Both adapters expose the same `usePresenter(Token, { configure })` signature. The state model deliberately diverges:

| Concept | React | Vue |
|---------|-------|-----|
| Hook | `usePresenter(Token, { configure })` | `usePresenter(Token, { configure })` |
| Returns | `{ presenter, state }` — state via `useSyncExternalStore` | presenter wrapped in `reactive()` — read `presenter.vm.*` |
| State updates | Presenter calls `setState(patch)` (immutable) | Presenter mutates `this.vm` then `notify()` |
| Container access | `useContainer()` | `useContainer()` |
| Provider | `<ContainerProvider container={c}>` | `provideContainer(c)` / `app.use(containerPlugin(c))` |
| Configure | `{ configure: (p) => ... }` | `{ configure: (p) => ... }` |

**Why the divergence:** React's `useSyncExternalStore` requires the snapshot reference to change for re-renders, so React presenters must use immutable `setState`. Vue's reactive proxy makes direct VM mutation idiomatic — a mutation through the proxy triggers updates without any reference change. The base `Presenter` class supports both styles (`setState` + `notify`), so the layer above the adapters is identical.

Code that doesn't touch the framework — Layers 0 through 5 — is identical between projects. Only the View files and the `frameworks/<framework>/` adapter differ.
