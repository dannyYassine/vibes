# Layer 4: Presenter

**Path:** `src/features/user/presentation/UserFormPresenter.ts`

## Responsibility

The Presenter holds **UI behavior and lifecycle** for a screen. It owns a mutable ViewModel, mutates it in response to user actions, calls Services, and keeps the VM in sync with Stores and the Bus.

The Presenter is the only layer that knows about both the domain (Entities, Services) and the UI (ViewModel, loading/error state). It's the seam between business and presentation.

## Strict rules

- **Extends `Presenter<TState>`.** For form/screen presenters, `TState` *is* the ViewModel: the Presenter holds `public readonly vm` and its state is that same instance.
- **Vue projects: mutate the VM directly, then call `this.notify()`.** The Vue adapter wraps the Presenter in `reactive()`, so field mutations trigger re-renders on their own; `notify()` just makes the subscription contract uniform across frameworks.
- **React projects: never mutate the VM — use `setState({ ... })` with a new object.** `useSyncExternalStore` compares snapshots by reference; an in-place mutation is invisible to React.
- **No business logic.** If a method is more than "call service, update VM, handle errors," move it to the Service.
- **Calls Services, never Gateways.** Going around the Service breaks the use-case abstraction and re-exposes API models.
- **All data the View reads lives on the VM** — including loading flags (`isSaving`) and error state (`errorMessage`). The Presenter writes these into the VM; it does NOT keep a parallel state object.
- **Parsing is the Presenter's job.** Form inputs arrive as strings (the VM holds primitives); converting `"1990"` → `1990` happens in the Presenter before calling the Service.
- **Registered transient in the container.** One Presenter per screen or major UI region.
- **Bus subscriptions in `onCreated`, cleanup in `onDestroyed`.**

## The abstract base class

Every Presenter extends `Presenter<TState>`. The base class provides:

- A typed state container. `setState`/`replaceState` do immutable updates (React); `notify()` re-fires listeners without changing state (Vue after VM mutation).
- A subscription mechanism for framework adapters.
- Three lifecycle hooks: `onCreated`, `onMounted`, `onDestroyed`.

```typescript
// src/infra/presenter/Presenter.ts

export type PresenterListener<TState> = (state: TState) => void;

export abstract class Presenter<TState> {
  private _state: TState;
  private listeners = new Set<PresenterListener<TState>>();
  private _isMounted = false;

  constructor(initialState: TState) {
    this._state = initialState;
  }

  /**
   * Called once, immediately after the Presenter is constructed by the DI container.
   * Use for one-time setup that does not depend on the View being rendered:
   * registering bus subscriptions, kicking off background polling, etc.
   *
   * Override in subclasses. Default implementation is a no-op.
   */
  onCreated(): void | Promise<void> {}

  /**
   * Called when the View mounts and binds to this Presenter.
   * Use for fetching initial data, opening WebSocket connections,
   * starting timers — anything tied to the View being on screen.
   *
   * Override in subclasses. Default implementation is a no-op.
   */
  onMounted(): void | Promise<void> {}

  /**
   * Called when the View unmounts. Use for cleanup: cancelling requests,
   * closing connections, clearing timers.
   *
   * Override in subclasses. Default implementation is a no-op.
   */
  onDestroyed(): void | Promise<void> {}

  /**
   * Read-only access to current state.
   * When TState is a ViewModel, this returns the VM instance itself.
   */
  getState(): TState {
    return this._state;
  }

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   * Framework adapters use this to bridge Presenter state to reactivity.
   */
  subscribe(listener: PresenterListener<TState>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isMounted(): boolean {
    return this._isMounted;
  }

  /** @internal Called by framework adapters — do not call from subclasses. */
  _markMounted(): void {
    this._isMounted = true;
  }

  /** @internal Called by framework adapters — do not call from subclasses. */
  _markUnmounted(): void {
    this._isMounted = false;
  }

  /**
   * Immutable state update. Pass a partial state object;
   * it is merged into a new state object and listeners are notified.
   * React-style presenters use this — useSyncExternalStore requires
   * a new snapshot reference to re-render.
   */
  protected setState(patch: Partial<TState>): void {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((l) => l(this._state));
  }

  /**
   * Replace state entirely. Use when transitioning between
   * variants of a discriminated union state, or when a React-style
   * presenter needs to hand out a fresh snapshot object.
   */
  protected replaceState(next: TState): void {
    this._state = next;
    this.listeners.forEach((l) => l(this._state));
  }

  /**
   * Re-fire all listeners WITHOUT changing state.
   * Vue-style presenters call this after mutating their VM in place —
   * the adapter's subscribers re-read the same object and see new field values.
   */
  protected notify(): void {
    this.listeners.forEach((l) => l(this._state));
  }
}
```

Note on React + class VMs: `setState` spreads into a plain object, which would drop the VM's prototype (and its getters). A React presenter using a class VM should rebuild it: `this.replaceState(Object.assign(new UserFormViewModel(), this.vm, patch))` — new reference for `useSyncExternalStore`, getters intact. Vue never needs this; `reactive()` proxies the live instance.

## Canonical example

```typescript
// src/features/user/presentation/UserFormPresenter.ts
import { Presenter } from "@/infra/presenter/Presenter";
import { UserFormViewModel } from "./UserFormViewModel";
import type { UserService } from "../domain/UserService";
import type { User } from "../domain/User";

export class UserFormPresenter extends Presenter<UserFormViewModel> {
  public readonly vm: UserFormViewModel;

  constructor(private readonly userService: UserService) {
    // TState = the ViewModel instance. Construct it in a local const BEFORE
    // super() — see "The super() field-initialization gotcha" below.
    const vm = new UserFormViewModel();
    super(vm);
    this.vm = vm;
  }

  /** Populate the draft VM from an Entity (e.g. after fetching, or on mount). */
  load(user: User): void {
    this.vm.id = user.id;
    this.vm.fullName = user.fullName;
    this.vm.birthYear = user.birthYear ? String(user.birthYear) : "";
    this.vm.isSaving = false;
    this.vm.errorMessage = null;
    this.notify();
  }

  async handleSave(): Promise<void> {
    if (this.vm.isSubmitDisabled) return;

    this.vm.isSaving = true;
    this.vm.errorMessage = null;
    this.notify();

    try {
      const birthYear = parseInt(this.vm.birthYear, 10); // parsing is Presenter work
      await this.userService.updateProfile(this.vm.id, this.vm.fullName.trim(), birthYear);
    } catch (error) {
      this.vm.errorMessage = error instanceof Error ? error.message : "Failed to update user.";
    } finally {
      this.vm.isSaving = false;
      this.notify();
    }
  }

  dismissError(): void {
    this.vm.errorMessage = null;
    this.notify();
  }
}
```

### The super() field-initialization gotcha

The base class stores `initialState` — passing the VM instance as `TState` means `getState()` returns the VM, and the adapter's `state` *is* the VM. But TypeScript field initializers run **after** `super()`. The naive form is broken twice over:

```typescript
// BROKEN — do not do this
export class UserFormPresenter extends Presenter<UserFormViewModel> {
  public readonly vm = new UserFormViewModel(); // runs AFTER super()

  constructor(private readonly userService: UserService) {
    super(this.vm);         // TS error: 'this' before super()
    super(new UserFormViewModel()); // worse: state and this.vm are TWO different objects
  }
}
```

The valid workaround is a local `const` (no `this` involved) constructed before `super()`, then assigned to the field after: `const vm = new UserFormViewModel(); super(vm); this.vm = vm;`. State and `vm` are the same object; the View can read either.

## Lifecycle semantics

The three hooks model two distinct phases of a Presenter's life:

| Hook | Fires when | Typical work |
|------|-----------|--------------|
| `onCreated` | DI container constructs the Presenter | Subscribe to event bus, register cross-cutting listeners |
| `onMounted` | View binds to the Presenter (first render) | Fetch initial data, open subscriptions tied to the screen |
| `onDestroyed` | View unbinds (unmount) | Cancel requests, close connections, clear timers |

`onCreated` runs **once** per Presenter instance. Because Presenters are transient, a new screen mount means a new Presenter and a new `onCreated`.

`onMounted` and `onDestroyed` are paired — every mount has a destroy. If you start something in `onMounted`, clean it up in `onDestroyed`.

## Configuration vs. construction

Presenters are constructed by the DI container, which doesn't know about route params, current user, or other per-render context. Two patterns handle this cleanly:

**`configure(...)` method (preferred for simple cases):**
The View calls `presenter.configure(userId, currentUser)` before mount. The Presenter stores the params and uses them in `onMounted`.

**Method-level params:**
Skip configuration entirely; pass params directly to action methods: `presenter.load(user)`. Better for screens where multiple distinct entities can be loaded.

Don't try to inject route params via the container — the container is for stable dependencies, not per-render context.

## What does NOT belong in a Presenter

- **API calls** — go through a Service.
- **Authorization checks** — the Service enforces these.
- **Formatting for display** — VM getters handle derivation; the Presenter's job is copying entity data into the VM, nothing more.
- **Routing** — the View handles navigation; the Presenter exposes state and intent.

## Testing

Presenter tests construct the Presenter with a mocked Service and verify VM mutations:

```typescript
const service = mockUserService();
const presenter = new UserFormPresenter(service);

presenter.vm.fullName = "";
presenter.vm.birthYear = "";
expect(presenter.vm.isSubmitDisabled).toBe(true);

presenter.vm.fullName = "Ada Lovelace";
presenter.vm.birthYear = "1990";
expect(presenter.vm.isSubmitDisabled).toBe(false);

// notify() is observable via subscribe — assert the View would re-render
let notifications = 0;
presenter.subscribe(() => notifications++);

presenter.vm.id = "u-1";
presenter.vm.fullName = "Ada Lovelace";
presenter.vm.birthYear = "1990";
await presenter.handleSave();
expect(service.updateProfile).toHaveBeenCalledWith("u-1", "Ada Lovelace", 1990);
expect(presenter.vm.isSaving).toBe(false);
expect(notifications).toBeGreaterThan(0);
```

Tests are framework-free — no rendering, no DOM. Run in milliseconds.
