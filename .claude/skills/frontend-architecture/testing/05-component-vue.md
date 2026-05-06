# Vue Component Tests

**Path:** `src/features/<feature-name>/__tests__/<Feature>View.test.ts`

## Purpose

Same goal as the React component test reference: verify the View renders correctly for given Presenter state and that user actions invoke the correct Presenter methods. The Presenter is mocked; real Services and below are not involved.

## What's real, what's fake

| Layer | In component tests |
|-------|--------------------|
| Service / Repository / DataSource | Not involved |
| Presenter | **Mocked** (fake instance with controllable state) |
| ViewModel | **Real** (built from real Entities in the test) |
| View | **Real** Vue component |

## Strict rules

Same as React (mock Presenter, never Service; assert on render + Presenter calls; cover every `status` branch). The mechanics differ slightly because Vue Test Utils mounts components differently and `provide`/`inject` is the wiring mechanism.

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

The same `FakePresenter` and `createFakePresenter` helpers from the React reference work in Vue — they're framework-agnostic. Reuse them.

## Canonical example

```typescript
// src/features/user/__tests__/UserDetailView.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mountWithContainer } from "@/__tests__/shared/mountWithContainer";
import { Container } from "@/infra/container/Container";
import { createFakePresenter, type FakePresenter } from "@/__tests__/shared/createFakePresenter";
import { UserDetailPresenter, type UserDetailState } from "../presentation/UserDetailPresenter";
import UserDetailView from "../presentation/UserDetailView.vue";
import { User } from "../domain/User";
import { UserViewModel } from "../presentation/UserViewModel";

const currentUser = new User({
  id: "admin-1",
  email: "admin@example.com",
  fullName: "Admin User",
  avatarUrl: null,
  role: "admin",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  lastLoginAt: new Date("2026-05-04"),
});

const targetUser = new User({
  id: "user-1",
  email: "jane@example.com",
  fullName: "Jane Doe",
  avatarUrl: null,
  role: "member",
  isActive: true,
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
  lastLoginAt: new Date("2026-05-04"),
});

type PresenterMethods = {
  configure: UserDetailPresenter["configure"];
  changeRole: UserDetailPresenter["changeRole"];
  dismissError: UserDetailPresenter["dismissError"];
  loadUser: UserDetailPresenter["loadUser"];
};

describe("UserDetailView (Vue)", () => {
  let container: Container;
  let presenter: FakePresenter<UserDetailState> & {
    configure: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
    dismissError: ReturnType<typeof vi.fn>;
    loadUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = new Container();
    presenter = createFakePresenter<UserDetailState, PresenterMethods>(
      {
        status: "idle",
        user: null,
        errorMessage: null,
        isSaving: false,
      },
      ["configure", "changeRole", "dismissError", "loadUser"],
    );
    container.register(UserDetailPresenter, () => presenter, "transient");
  });

  it("shows a loading indicator while data is being fetched", () => {
    presenter.setStateForTest({ status: "loading" });

    const wrapper = mountWithContainer(UserDetailView, container, {
      props: { userId: "user-1", currentUser },
    });

    expect(wrapper.text()).toMatch(/loading/i);
  });

  it("shows the error message and dismiss button when the load fails", async () => {
    presenter.setStateForTest({
      status: "error",
      user: null,
      errorMessage: "Network error",
    });

    const wrapper = mountWithContainer(UserDetailView, container, {
      props: { userId: "user-1", currentUser },
    });

    expect(wrapper.text()).toContain("Network error");
    await wrapper.find("button").trigger("click");
    expect(presenter.dismissError).toHaveBeenCalledTimes(1);
  });

  it("renders the user detail when loaded", () => {
    presenter.setStateForTest({
      status: "loaded",
      user: new UserViewModel(targetUser, currentUser),
      errorMessage: null,
      isSaving: false,
    });

    const wrapper = mountWithContainer(UserDetailView, container, {
      props: { userId: "user-1", currentUser },
    });

    expect(wrapper.find("h1").text()).toBe("Jane Doe");
    expect(wrapper.text()).toContain("jane@example.com");
    expect(wrapper.text()).toContain("Team member"); // role label from VM
  });

  it("calls changeRole on the presenter when the role select changes", async () => {
    presenter.setStateForTest({
      status: "loaded",
      user: new UserViewModel(targetUser, currentUser),
      errorMessage: null,
      isSaving: false,
    });

    const wrapper = mountWithContainer(UserDetailView, container, {
      props: { userId: "user-1", currentUser },
    });

    await wrapper.find("select").setValue("admin");

    expect(presenter.changeRole).toHaveBeenCalledWith("admin");
  });

  it("calls configure with the userId and currentUser on setup", () => {
    mountWithContainer(UserDetailView, container, {
      props: { userId: "user-42", currentUser },
    });

    expect(presenter.configure).toHaveBeenCalledWith("user-42", currentUser);
  });

  it("re-renders when state changes (reactivity check)", async () => {
    const wrapper = mountWithContainer(UserDetailView, container, {
      props: { userId: "user-1", currentUser },
    });
    expect(wrapper.text()).toMatch(/^$|idle/i); // idle state — likely empty

    presenter.setStateForTest({ status: "loading" });
    await nextTick();
    expect(wrapper.text()).toMatch(/loading/i);

    presenter.setStateForTest({
      status: "loaded",
      user: new UserViewModel(targetUser, currentUser),
      errorMessage: null,
      isSaving: false,
    });
    await nextTick();
    expect(wrapper.find("h1").text()).toBe("Jane Doe");
  });
});
```

## Vue-specific notes

**`await nextTick()` after state changes.** Vue's reactivity is async — DOM updates happen after a microtask. When you call `setStateForTest()` and then assert on the DOM, you typically need `await nextTick()` (or `await wrapper.vm.$nextTick()`) first. The reactivity check test above shows the pattern.

**Use `wrapper.text()` for content checks** — it reads the rendered text content, similar to RTL's `screen.getByText` semantics.

**Use `wrapper.find()` + `.trigger()` / `.setValue()` for interactions.** These are Vue Test Utils' equivalents of React Testing Library's `fireEvent`.

**The `ContainerKey as symbol` cast** in `mountWithContainer` is required because Vue's `provide` option in mount config types the keys loosely. The cast is safe — `ContainerKey` is declared as `InjectionKey<Container>` which is just a typed Symbol.

## Patterns to use

**Cover every `status` branch.** Vue's `v-if` / `v-else-if` chains create render variants — each one needs a test, otherwise a typo in the template can ship undetected.

**Drive reactivity through `setStateForTest()`.** This calls the protected `setState` on the FakePresenter, which notifies subscribers, which updates the `shallowRef` in the composable, which triggers a re-render. Same pipeline as production, just driven from the test instead of from a Service call.

**Use real ViewModels in tests.** Build them from real Entities. The integration test already covers ViewModel correctness, but the View test depends on ViewModel output, so using the real thing keeps the View test honest.

## Patterns to avoid

- **Don't use `wrapper.setData(...)`** — it bypasses the composable and the Presenter, defeating the test's purpose.
- **Don't directly mutate `state.value`** in the test — go through `setStateForTest()` so the subscription pipeline fires.
- **Don't import Vue's `inject` directly in tests.** The `mountWithContainer` helper handles provision; tests should be agnostic to the injection mechanism.

## Cross-framework parity

The Vue and React component test references describe the same testing strategy:

| Concept | React | Vue |
|---------|-------|-----|
| Mount helper | `renderWithContainer(ui, container)` | `mountWithContainer(component, container, options)` |
| Container provider | `<ContainerProvider>` | `provide: { [ContainerKey]: container }` |
| Fake Presenter helper | `createFakePresenter` | `createFakePresenter` (same helper) |
| Drive state | `presenter.setStateForTest({...})` | `presenter.setStateForTest({...})` (then `await nextTick()`) |
| Query rendered output | `screen.getByRole(...)` | `wrapper.find(...)` / `wrapper.text()` |
| Trigger event | `fireEvent.change(input, {...})` | `wrapper.find('select').setValue('admin')` |
| Assert Presenter call | `expect(presenter.changeRole).toHaveBeenCalledWith("admin")` | identical |

The test file structure and what's asserted are identical — only the framework's mounting and querying APIs differ.
