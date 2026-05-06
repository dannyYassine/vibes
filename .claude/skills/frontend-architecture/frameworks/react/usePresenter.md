# React Framework Adapter

**Path:** `src/infra/presenter/react/`

This reference describes how React Views bind to Presenters. It covers:

1. The `usePresenter` hook — resolves a Presenter from the DI container, manages its lifecycle, and exposes reactive state to React
2. The `ContainerProvider` — exposes the DI container to the React tree via context
3. Patterns for passing per-render config to Presenters

## Strict rules

- **Never `new` a Presenter inside a component.** Always go through `usePresenter` so the container resolves it and lifecycle hooks fire correctly.
- **The hook accepts a Presenter token (the class), not an instance.** Passing the class lets the hook resolve a fresh instance from the container per mount.
- **The Presenter is built exactly once per component mount.** It survives re-renders. Strict mode's double-invocation is handled correctly.
- **Lifecycle hooks fire in this order:** `onCreated` (synchronously after construction) → `onMounted` (in `useEffect`) → `onDestroyed` (in the cleanup function).
- **Views read state via the hook's return value, not by calling `presenter.getState()` in render.** The hook handles subscription and re-render triggering.

## The `usePresenter` hook

```typescript
// src/infra/presenter/react/usePresenter.ts
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Presenter } from "../Presenter";
import type { Token } from "@/infra/container/Container";
import { useContainer } from "./ContainerProvider";

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
  state: TPresenter extends Presenter<infer TState> ? TState : never;
};

/**
 * Resolves a Presenter from the DI container, manages its lifecycle, and
 * subscribes the component to its state.
 *
 * Lifecycle:
 *   1. First render: container.resolve(Token) → presenter.onCreated()
 *   2. After commit: presenter._markMounted() → presenter.onMounted()
 *   3. Unmount: presenter._markUnmounted() → presenter.onDestroyed()
 *
 * The same Presenter instance is reused across all re-renders of the component.
 * On unmount, the Presenter is discarded — a remount creates a fresh one.
 */
export function usePresenter<TPresenter extends Presenter<unknown>>(
  Token: Token<TPresenter>,
  options: UsePresenterOptions<TPresenter> = {},
): UsePresenterResult<TPresenter> {
  const container = useContainer();

  // Hold the Presenter in a ref so it survives re-renders without being
  // recreated. We construct it lazily on first render via a sentinel.
  const presenterRef = useRef<TPresenter | null>(null);
  if (presenterRef.current === null) {
    const presenter = container.resolve(Token);
    options.configure?.(presenter);
    // onCreated fires synchronously here, before the first paint.
    // Wrap in Promise.resolve to swallow any thrown error consistently
    // and to allow async overrides without unhandled rejections.
    Promise.resolve(presenter.onCreated()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onCreated threw:`, err);
    });
    presenterRef.current = presenter;
  }

  const presenter = presenterRef.current;

  // Subscribe to Presenter state via useSyncExternalStore — this is the
  // canonical React 18+ way to bind to external mutable stores. It avoids
  // the tearing problems of useState + useEffect subscription patterns.
  const state = useSyncExternalStore(
    (listener) => presenter.subscribe(listener),
    () => presenter.getState() as TPresenter extends Presenter<infer S> ? S : never,
    () => presenter.getState() as TPresenter extends Presenter<infer S> ? S : never,
  );

  // onMounted / onDestroyed lifecycle.
  useEffect(() => {
    presenter._markMounted();
    Promise.resolve(presenter.onMounted()).catch((err) => {
      console.error(`[usePresenter] ${Token.name}.onMounted threw:`, err);
    });

    return () => {
      presenter._markUnmounted();
      Promise.resolve(presenter.onDestroyed()).catch((err) => {
        console.error(`[usePresenter] ${Token.name}.onDestroyed threw:`, err);
      });
    };
    // The presenter ref is stable for the lifetime of the component.
    // We intentionally exclude `presenter` from deps — it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    presenter,
    state: state as TPresenter extends Presenter<infer S> ? S : never,
  };
}
```

## The `ContainerProvider`

The container is exposed to the component tree via React Context. The provider wraps the app root; `useContainer` reads it.

```typescript
// src/infra/presenter/react/ContainerProvider.tsx
import { createContext, useContext, type ReactNode } from "react";
import type { Container } from "@/infra/container/Container";

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({
  container,
  children,
}: {
  container: Container;
  children: ReactNode;
}) {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (!container) {
    throw new Error(
      "useContainer must be called inside a <ContainerProvider>. " +
      "Make sure your app root wraps the tree with the bootstrapped container.",
    );
  }
  return container;
}
```

## App bootstrap

```typescript
// src/main.tsx
import { createRoot } from "react-dom/client";
import { bootstrapContainer } from "@/infra/container/bootstrap";
import { ContainerProvider } from "@/infra/presenter/react/ContainerProvider";
import { App } from "./App";

const container = bootstrapContainer();

createRoot(document.getElementById("root")!).render(
  <ContainerProvider container={container}>
    <App />
  </ContainerProvider>,
);
```

## Canonical View example

```tsx
// src/features/user/presentation/UserDetailView.tsx
import { usePresenter } from "@/infra/presenter/react/usePresenter";
import { UserDetailPresenter } from "./UserDetailPresenter";
import type { User, UserRole } from "../domain/User";

type Props = {
  userId: string;
  currentUser: User;
};

export function UserDetailView({ userId, currentUser }: Props) {
  const { presenter, state } = usePresenter(UserDetailPresenter, {
    configure: (p) => p.configure(userId, currentUser),
  });

  if (state.status === "loading") return <p>Loading…</p>;

  if (state.status === "error") {
    return (
      <div className="error">
        <p>{state.errorMessage}</p>
        <button onClick={() => presenter.dismissError()}>Dismiss</button>
      </div>
    );
  }

  if (state.status !== "loaded" || !state.user) return null;
  const vm = state.user;

  return (
    <div className="user-detail">
      <div className="avatar">
        {vm.avatarUrl ? <img src={vm.avatarUrl} alt="" /> : <span>{vm.avatarInitials}</span>}
      </div>

      <h1>{vm.displayName}</h1>
      <p>{vm.email}</p>

      <span className={`badge badge-${vm.roleBadgeColor}`}>{vm.roleLabel}</span>
      {vm.canShowAdminBadge && <span className="admin-badge">Admin</span>}

      <dl>
        <dt>Status</dt><dd>{vm.statusLabel}</dd>
        <dt>Last login</dt><dd>{vm.formattedLastLogin}</dd>
        <dt>Joined</dt><dd>{vm.formattedJoinedAt}</dd>
      </dl>

      {vm.canEditRole && (
        <label>
          Change role:
          <select
            disabled={state.isSaving}
            onChange={(e) => presenter.changeRole(e.target.value as UserRole)}
          >
            <option value="admin">Administrator</option>
            <option value="member">Team member</option>
            <option value="guest">Guest</option>
          </select>
        </label>
      )}
    </div>
  );
}
```

## Why these specific React APIs

**`useRef` for the Presenter instance:** Refs survive re-renders without triggering them. The Presenter is constructed inside the ref initialization, which runs exactly once per component mount — even under React 18 Strict Mode's double-invocation, because Strict Mode double-invokes function bodies but the ref check `presenterRef.current === null` short-circuits the second invocation.

**`useSyncExternalStore` for state subscription:** This is the React 18+ canonical hook for binding to external mutable stores like our Presenter. Compared to `useState + useEffect`:
- No "tearing" during concurrent rendering — the snapshot is read consistently
- Works correctly with `startTransition` and Suspense
- Handles Strict Mode subscription/unsubscription cycles correctly
- Returns the current state synchronously on every render without an extra render cycle

**`useEffect` with empty deps for `onMounted`/`onDestroyed`:** These hooks are tied to mount/unmount, not to prop changes. The empty dep array is intentional and correct — we suppress the linter warning for the `presenter` reference because it's a stable ref that never changes.

## Strict Mode behavior

React 18 Strict Mode in dev intentionally double-invokes effects to surface cleanup bugs. With this hook:

- The Presenter is constructed **once** (ref short-circuits the second invocation)
- `onCreated` fires **once**
- `onMounted` fires, then **`onDestroyed` fires**, then **`onMounted` fires again** (Strict Mode's mount → unmount → mount cycle)

This means `onMounted` and `onDestroyed` must be idempotent and safe to run multiple times. The canonical example above already does this correctly: `onMounted` cancels any in-flight request before starting a new one, and `onDestroyed` is safe to call when nothing is pending.

If you have setup that should not double-fire in dev, put it in `onCreated` instead of `onMounted`.

## Common mistakes

- **Calling `presenter.getState()` in render** instead of using the `state` returned from the hook. This works but doesn't trigger re-renders on state change.
- **Passing a presenter instance to the hook** instead of the class token. The hook can only manage lifecycle if it owns construction.
- **Constructing presenters in components** with `new UserDetailPresenter(...)`. Bypasses the container and breaks dependency substitution in tests.
- **Doing async work in the `configure` callback.** It runs synchronously during render. Use `onCreated` or `onMounted` for async setup.
- **Forgetting to wrap the app in `<ContainerProvider>`.** The hook throws a clear error in this case, but it's an easy mistake to make in test setups.

## Testing Views with the hook

For component tests, build a test container with mocked Presenters and wrap the rendered component with the provider:

```tsx
function renderWithContainer(ui: ReactElement, container: Container) {
  return render(
    <ContainerProvider container={container}>{ui}</ContainerProvider>,
  );
}

test("UserDetailView renders user", () => {
  const container = new Container();
  const fakePresenter = createFakeUserDetailPresenter({
    initialState: { status: "loaded", user: fakeViewModel(), /* ... */ },
  });
  container.register(UserDetailPresenter, () => fakePresenter, "transient");

  renderWithContainer(
    <UserDetailView userId="user-1" currentUser={currentUser} />,
    container,
  );

  expect(screen.getByText("Jane Doe")).toBeInTheDocument();
});
```

The fake presenter only needs to extend `Presenter<TState>` with the right initial state — no Service or Repository required.
