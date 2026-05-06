# React Component Tests

**Path:** `src/features/<feature-name>/__tests__/<Feature>View.test.tsx`

## Purpose

Component tests verify the View renders correctly for given Presenter state and that user actions invoke the correct Presenter methods with the correct arguments.

The Presenter is **mocked**. Real Services, Repositories, and DataSources are NOT involved. Behavior of those layers is covered by service integration tests.

## What's real, what's fake

| Layer | In component tests |
|-------|--------------------|
| Service / Repository / DataSource | Not involved |
| Presenter | **Mocked** (fake instance with controllable state) |
| ViewModel | **Real** (built from real Entities in the test, or a `FakeUserViewModel`) |
| View | **Real** |

## Strict rules

- **Mock the Presenter, never the Service.** Component tests verify rendering, not business logic.
- **Provide the mocked Presenter through a test container.** This is the only test where the container hosts a fake Presenter — service integration tests use real Presenters.
- **Assert on rendered output and on Presenter method calls** — that's it. Don't assert on internal Presenter state from the View test.
- **Each `state.status` value gets at least one test.** Loading, error, loaded, idle — every branch the View handles must be covered.
- **Use `vi.fn()` for Presenter methods.** This is the one place in the test suite where `vi.fn()` is the right tool.

## The fake Presenter helper

Create a small helper that builds a mocked Presenter satisfying the base class shape:

```typescript
// src/__tests__/shared/createFakePresenter.ts
import { Presenter } from "@/infra/presenter/Presenter";
import { vi, type MockedFunction } from "vitest";

/**
 * Builds a mocked Presenter for component tests. The returned object:
 *  - Extends Presenter<TState> with controllable state
 *  - Exposes setStateForTest(...) so the test can drive UI variants
 *  - Has every public method spied as vi.fn() for assertion
 *
 * The caller passes a `methods` object describing the Presenter's surface;
 * each key becomes a `vi.fn()` accessible for assertion.
 */
export class FakePresenter<TState> extends Presenter<TState> {
  constructor(initialState: TState) {
    super(initialState);
  }

  /** Drive the UI through different state variants in tests. */
  setStateForTest(patch: Partial<TState>): void {
    (this as unknown as { setState: (p: Partial<TState>) => void }).setState(patch);
  }

  replaceStateForTest(next: TState): void {
    (this as unknown as { replaceState: (n: TState) => void }).replaceState(next);
  }
}

/** Builds a fake Presenter and assigns vi.fn() spies for the given method names. */
export function createFakePresenter<TState, TMethods extends Record<string, unknown>>(
  initialState: TState,
  methodNames: (keyof TMethods)[],
): FakePresenter<TState> & {
  [K in keyof TMethods]: MockedFunction<TMethods[K] extends (...args: infer A) => infer R ? (...args: A) => R : never>;
} {
  const presenter = new FakePresenter(initialState);
  for (const name of methodNames) {
    (presenter as Record<string, unknown>)[name as string] = vi.fn();
  }
  return presenter as FakePresenter<TState> & {
    [K in keyof TMethods]: MockedFunction<TMethods[K] extends (...args: infer A) => infer R ? (...args: A) => R : never>;
  };
}
```

The helper isn't strictly required — a hand-rolled fake works too — but it removes ceremony from every component test file.

## Setting up the test environment

```typescript
// src/__tests__/shared/renderWithContainer.tsx
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { Container } from "@/infra/container/Container";
import { ContainerProvider } from "@/infra/presenter/react/ContainerProvider";

/** Renders a React element inside a ContainerProvider with the given test container. */
export function renderWithContainer(
  ui: ReactElement,
  container: Container,
): RenderResult {
  return render(<ContainerProvider container={container}>{ui}</ContainerProvider>);
}
```

## Canonical example

```typescript
// src/features/user/__tests__/UserDetailView.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithContainer } from "@/__tests__/shared/renderWithContainer";
import { Container } from "@/infra/container/Container";
import { createFakePresenter, type FakePresenter } from "@/__tests__/shared/createFakePresenter";
import { UserDetailPresenter, type UserDetailState } from "../presentation/UserDetailPresenter";
import { UserDetailView } from "../presentation/UserDetailView";
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

describe("UserDetailView", () => {
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
    renderWithContainer(
      <UserDetailView userId="user-1" currentUser={currentUser} />,
      container,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows the error message and dismiss button when the load fails", () => {
    presenter.setStateForTest({
      status: "error",
      user: null,
      errorMessage: "Network error",
    });
    renderWithContainer(
      <UserDetailView userId="user-1" currentUser={currentUser} />,
      container,
    );

    expect(screen.getByText("Network error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(presenter.dismissError).toHaveBeenCalledTimes(1);
  });

  it("renders the user detail when loaded", () => {
    presenter.setStateForTest({
      status: "loaded",
      user: new UserViewModel(targetUser, currentUser),
      errorMessage: null,
      isSaving: false,
    });
    renderWithContainer(
      <UserDetailView userId="user-1" currentUser={currentUser} />,
      container,
    );

    expect(screen.getByRole("heading", { name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Team member")).toBeInTheDocument(); // role label from VM
  });

  it("calls changeRole on the presenter when the role select changes", () => {
    presenter.setStateForTest({
      status: "loaded",
      user: new UserViewModel(targetUser, currentUser),
      errorMessage: null,
      isSaving: false,
    });
    renderWithContainer(
      <UserDetailView userId="user-1" currentUser={currentUser} />,
      container,
    );

    fireEvent.change(screen.getByLabelText(/change role/i), {
      target: { value: "admin" },
    });

    expect(presenter.changeRole).toHaveBeenCalledWith("admin");
  });

  it("calls configure with the userId and currentUser before mount", () => {
    renderWithContainer(
      <UserDetailView userId="user-42" currentUser={currentUser} />,
      container,
    );

    expect(presenter.configure).toHaveBeenCalledWith("user-42", currentUser);
  });
});
```

## Patterns to use

**Each `state.status` gets a test.** Skipping a status branch in tests means the View's behavior for that branch is unverified. Even a one-line "renders nothing for idle status" assertion is worth having.

**Asserting on Presenter calls — not Service or Repository.** The View's contract is the Presenter. Tests verify the View talks to the Presenter correctly; service integration tests verify the Presenter talks to the Service correctly.

**Use `getByRole` / `getByLabelText` from React Testing Library.** They reflect what users actually interact with. Avoid `getByTestId` except as a last resort — querying by role/text catches accessibility issues for free.

## Patterns to avoid

- **Spying on the real Presenter.** If the test imports `UserDetailPresenter` and only spies on its methods without replacing it, real Service calls will fire. Always substitute via the container.
- **Asserting on Presenter internal state.** Tests should assert on rendered output and on which methods were called. Internal state transitions belong in Presenter unit tests (which only exist for bug fixes).
- **Driving state through the real Presenter's methods.** Calling `presenter.loadUser()` in a component test triggers real subscriptions and async work. Use `setStateForTest(...)` to put the View into the variant you want to assert on.
- **Asserting on call counts of Service methods.** That's the integration test's job. Component tests assert on Presenter calls only.

## Why this works

Together, service integration tests + component tests with mocked Presenters cover:

- All business logic (integration)
- All authorization rules (integration)
- All entity invariants (integration)
- All ViewModel formatting (integration; or a focused unit test for tricky formatting)
- All View rendering branches (component)
- All View → Presenter event wiring (component)

Notably uncovered: **Presenter logic itself** (state transitions in response to method calls). That's intentional. Presenter logic is mostly "set loading, await service, set loaded or error" — mechanically uniform across features. Bugs in this code path show up as failing component tests (wrong state shape rendered) or failing integration tests (wrong service call). When a bug *does* require a focused Presenter test, write one — see `06-unit-tests.md`.
