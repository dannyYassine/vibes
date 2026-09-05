# Vue Component Tests

**Path:** `src/features/<feature-name>/__tests__/<Feature>View.test.ts`

## Purpose

Same goal as the React component test reference: verify the View renders correctly for given Presenter/ViewModel state and that user actions invoke the correct Presenter methods. The Presenter is mocked; real Services and Gateways are not involved.

## What's real, what's fake

| Layer | In component tests |
|-------|--------------------|
| Service / Gateway | Not involved |
| Presenter | **Mocked** (fake instance with controllable VM) |
| ViewModel | **Real** — but simple: flat primitives + pure getters |
| View | **Real** Vue component |

## Strict rules

Same as React (mock Presenter, never Service; assert on render + Presenter calls). The mechanics differ slightly because Vue Test Utils mounts components differently and `provide`/`inject` is the wiring mechanism — and because Vue presenters expose `vm`, the fake drives the View through VM fields rather than a state object.

## The test mount helper

```typescript
// src/__tests__/shared/mountWithContainer.ts
import { mount, type MountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import type { Container } from "@/infra/container/Container";
import { ContainerKey } from "@/infra/presenter/vue/useContainer";

/** Mounts a Vue component with the given test container provided. */
export function mountWithContainer<TComponent extends Component>(
  component: TComponent,
  container: Container,
  options: MountingOptions<unknown> = {},
) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      provide: {
        ...(options.global?.provide ?? {}),
        [ContainerKey as symbol]: container,
      },
    },
  });
}
```

## The fake presenter

Since Vue presenters expose `vm`, the fake provides a **controllable VM**: a real ViewModel class instance (so the pure getters still work) exposed as `vm`, with action methods as `vi.fn()`.

The fake MUST extend the real `Presenter<TState>` base class — the `usePresenter` composable calls `onCreated`/`onMounted`/`onDestroyed`/`_markMounted`/`_markUnmounted` on whatever it resolves, and a plain object without those methods crashes at mount.

```typescript
// src/features/user/__tests__/fakes/FakeUserFormPresenter.ts
import { vi } from "vitest";
import { Presenter } from "@/infra/presenter/Presenter";
import { UserFormViewModel } from "../../presentation/UserFormViewModel";

/**
 * Real VM instance (getters live) + spied action methods.
 * Scenarios are driven by setting VM fields directly:
 *   fake.vm.isSaving = true;
 */
export class FakeUserFormPresenter extends Presenter<UserFormViewModel> {
  configure = vi.fn();
  handleSave = vi.fn();
  dismissError = vi.fn();

  readonly vm: UserFormViewModel;

  constructor() {
    // Local const BEFORE super() — same gotcha as real presenters.
    const vm = new UserFormViewModel();
    super(vm);
    this.vm = vm;
  }
}
```

Drive scenarios by setting VM fields directly — `presenter.vm.isSaving = true` — and the reactive presenter (the composable wraps the resolved instance in `reactive()`) propagates the change to the template after `await nextTick()`.

## Canonical example

```typescript
// src/features/user/__tests__/UserFormView.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mountWithContainer } from "@/__tests__/shared/mountWithContainer";
import { Container } from "@/infra/container/Container";
import { FakeUserFormPresenter } from "./fakes/FakeUserFormPresenter";
import { UserFormPresenter } from "../presentation/UserFormPresenter";
import UserFormView from "../presentation/UserFormView.vue";

describe("UserFormView (Vue)", () => {
  let container: Container;
  let presenter: FakeUserFormPresenter;

  beforeEach(() => {
    container = new Container();
    presenter = new FakeUserFormPresenter();
    container.register(UserFormPresenter, () => presenter, "transient");
  });

  it("renders inputs bound to the VM", async () => {
    presenter.vm.fullName = "Jane Doe";
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });
    await nextTick();

    const input = wrapper.find('input[type="text"]');
    expect((input.element as HTMLInputElement).value).toBe("Jane Doe");
  });

  it("writes v-model input back into the VM", async () => {
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });

    await wrapper.find('input[type="text"]').setValue("Jane Doe");

    expect(presenter.vm.fullName).toBe("Jane Doe");
  });

  it("disables submit while fullName is empty", async () => {
    presenter.vm.fullName = "";
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });

    const submit = wrapper.find('button[type="submit"]');
    expect((submit.element as HTMLButtonElement).disabled).toBe(true);
    expect(submit.text()).toBe(presenter.vm.submitLabel);
  });

  it("shows the error message when the VM has one", async () => {
    presenter.vm.errorMessage = "Network error";
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });

    expect(wrapper.text()).toContain("Network error");
  });

  it("calls handleSave on submit", async () => {
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });

    await wrapper.find("form").trigger("submit");

    expect(presenter.handleSave).toHaveBeenCalledTimes(1);
  });

  it("calls configure with the userId on mount", () => {
    mountWithContainer(UserFormView, container, {
      props: { userId: "user-42" },
    });

    expect(presenter.configure).toHaveBeenCalledWith("user-42");
  });

  it("re-renders when VM fields change (reactivity check)", async () => {
    const wrapper = mountWithContainer(UserFormView, container, {
      props: { userId: "user-1" },
    });

    presenter.vm.errorMessage = "Network error";
    await nextTick();
    expect(wrapper.text()).toContain("Network error");

    presenter.vm.errorMessage = null;
    await nextTick();
    expect(wrapper.text()).not.toContain("Network error");
  });
});
```

## Vue-specific notes

**`await nextTick()` after VM mutations.** Vue's reactivity is async — DOM updates happen after a microtask. When you set `presenter.vm.someField = ...` (before or after mount) and then assert on the DOM, you typically need `await nextTick()` first. The reactivity check test above shows the pattern.

**Use `wrapper.text()` for content checks** — it reads the rendered text content, similar to RTL's `screen.getByText` semantics.

**Use `wrapper.find()` + `.trigger()` / `.setValue()` for interactions.** `setValue` exercises the real `v-model` path: the write goes through the reactive proxy into `presenter.vm`, which is exactly what production does.

**The `ContainerKey as symbol` cast** in `mountWithContainer` is required because Vue's `provide` option in mount config types the keys loosely. The cast is safe — `ContainerKey` is declared as `InjectionKey<Container>` which is just a typed Symbol.

## Patterns to use

**Drive the UI through the VM.** Set `presenter.vm.<field> = ...`, `await nextTick()`, assert on render. The write goes through the same reactive proxy the template reads from — same pipeline as production, just driven from the test instead of from a Service call.

**Use real ViewModels in tests.** A real VM instance keeps the pure getters (`isSubmitDisabled`, `submitLabel`) honest — a hand-rolled object with pre-baked getter values would hide getter bugs.

**Cover every conditional branch.** `v-if` chains over VM fields (`errorMessage`, disabled states) create render variants — each one needs a test, otherwise a typo in the template can ship undetected.

## Patterns to avoid

- **Don't use `wrapper.setData(...)`** — it bypasses the Presenter and the VM, defeating the test's purpose.
- **Don't inject the container directly in tests** to fish the presenter out — register the fake and let `usePresenter` resolve it. The `mountWithContainer` helper handles provision; tests should be agnostic to the injection mechanism.
- **Don't spread the fake's VM** to snapshot it — `{ ...vm }` loses the prototype getters.

## Cross-framework parity

The Vue and React component test references describe the same testing strategy:

| Concept | React | Vue |
|---------|-------|-----|
| Mount helper | `renderWithContainer(ui, container)` | `mountWithContainer(component, container, options)` |
| Container provider | `<ContainerProvider>` | `provide: { [ContainerKey]: container }` |
| Fake Presenter shape | `createFakePresenter` (controllable state) | fake with real VM + `vi.fn()` actions |
| Drive state | `presenter.setStateForTest({...})` | `presenter.vm.<field> = ...` then `await nextTick()` |
| Query rendered output | `screen.getByRole(...)` | `wrapper.find(...)` / `wrapper.text()` |
| Trigger event | `fireEvent.change(input, {...})` | `wrapper.find('input').setValue('...')` |
| Assert Presenter call | `expect(presenter.handleSave).toHaveBeenCalledWith(...)` | identical |

The test file structure and what's asserted are identical — only the state-driving mechanism and the framework's mounting/querying APIs differ.
