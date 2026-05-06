# Layer 6: Presenter

**Path:** `src/features/user/presentation/UserPresenter.ts`

## Responsibility

The Presenter holds **UI state** for a feature and orchestrates calls to Services in response to user actions. It produces ViewModels for the View to render.

The Presenter is the only layer that knows about both the domain (Entities, Services) and the UI (ViewModels, loading/error states). It's the seam between business and presentation.

## Strict rules

- **Extends the abstract `Presenter<TState>` base class.** This gives every Presenter a consistent state container, subscription mechanism, and lifecycle hooks.
- **Holds UI state.** Loading flags, current selection, pagination, validation errors. State that exists *because* there is a UI.
- **No business logic.** If a method has more than "call service, update state, build ViewModel," the logic probably belongs in the Service.
- **Calls Services, not Repositories.** Going around the Service breaks the use-case abstraction.
- **Produces ViewModels.** The Presenter's output to the View is always a ViewModel, never a raw Entity.
- **Framework-agnostic.** The Presenter is plain TypeScript — no Vue refs, no React hooks. Framework adapters bridge to reactivity.
- **One Presenter per screen or major UI region**, not per feature.
- **Registered as transient in the DI container.** Every screen mount gets a fresh Presenter with fresh state.

## The abstract base class

Every Presenter extends `Presenter<TState>`. The base class provides:

- A typed state container with immutable updates
- A subscription mechanism for framework adapters to listen to state changes
- Three lifecycle hooks: `onCreated`, `onMounted`, `onDestroyed`

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
   * it is merged into current state and listeners are notified.
   */
  protected setState(patch: Partial<TState>): void {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((l) => l(this._state));
  }

  /**
   * Replace state entirely. Use when transitioning between
   * variants of a discriminated union state.
   */
  protected replaceState(next: TState): void {
    this._state = next;
    this.listeners.forEach((l) => l(this._state));
  }
}
```

## Lifecycle semantics

The three hooks model two distinct phases of a Presenter's life:

| Hook | Fires when | Typical work |
|------|-----------|--------------|
| `onCreated` | DI container constructs the Presenter | Subscribe to event bus, register cross-cutting listeners |
| `onMounted` | View binds to the Presenter (first render) | Fetch initial data, open subscriptions tied to the screen |
| `onDestroyed` | View unbinds (unmount) | Cancel requests, close connections, clear timers |

`onCreated` runs **once** per Presenter instance. Because Presenters are transient, a new screen mount means a new Presenter and a new `onCreated`.

`onMounted` and `onDestroyed` are paired — every mount has a destroy. If you start something in `onMounted`, clean it up in `onDestroyed`.

## Canonical example

```typescript
// src/features/user/presentation/UserDetailPresenter.ts
import { Presenter } from "@/infra/presenter/Presenter";
import type { User, UserRole } from "../domain/User";
import type { UserService } from "../domain/UserService";
import { UserViewModel } from "./UserViewModel";

export type UserDetailState = {
  status: "idle" | "loading" | "loaded" | "error";
  user: UserViewModel | null;
  errorMessage: string | null;
  isSaving: boolean;
};

export class UserDetailPresenter extends Presenter<UserDetailState> {
  private userId: string | null = null;
  private currentUser: User | null = null;
  private abortController: AbortController | null = null;

  constructor(private readonly userService: UserService) {
    super({
      status: "idle",
      user: null,
      errorMessage: null,
      isSaving: false,
    });
  }

  /** Called by the View before mount to inject route/context params. */
  configure(userId: string, currentUser: User): void {
    this.userId = userId;
    this.currentUser = currentUser;
  }

  override async onMounted(): Promise<void> {
    if (!this.userId) {
      this.setState({ status: "error", errorMessage: "User ID not configured" });
      return;
    }
    await this.loadUser();
  }

  override onDestroyed(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async loadUser(): Promise<void> {
    if (!this.userId || !this.currentUser) return;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.setState({ status: "loading", errorMessage: null });
    try {
      const user = await this.userService.getUser(this.userId);
      this.setState({
        status: "loaded",
        user: new UserViewModel(user, this.currentUser),
        errorMessage: null,
      });
    } catch (error) {
      this.setState({
        status: "error",
        user: null,
        errorMessage: this.formatError(error),
      });
    }
  }

  async changeRole(newRole: UserRole): Promise<void> {
    const vm = this.getState().user;
    if (!vm || !this.currentUser) return;

    this.setState({ isSaving: true });
    try {
      const updated = await this.userService.changeRole(vm.id, newRole, this.currentUser);
      this.setState({
        user: new UserViewModel(updated, this.currentUser),
        isSaving: false,
      });
    } catch (error) {
      this.setState({
        isSaving: false,
        errorMessage: this.formatError(error),
      });
    }
  }

  dismissError(): void {
    this.setState({ errorMessage: null });
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred";
  }
}
```

## Configuration vs. construction

Presenters are constructed by the DI container, which doesn't know about route params, current user, or other per-render context. Two patterns handle this cleanly:

**`configure(...)` method (preferred for simple cases):**
The View calls `presenter.configure(userId, currentUser)` before mount. The Presenter stores the params and uses them in `onMounted`.

**Method-level params:**
Skip configuration entirely; pass params directly to action methods: `presenter.loadUser(userId, currentUser)`. Better for screens where multiple distinct entities can be loaded.

Don't try to inject route params via the container — the container is for stable dependencies, not per-render context.

## State design

Presenter state should be a single object describing the entire UI for the screen — not a bag of independent fields.

For complex state, use a discriminated union and `replaceState`:

```typescript
type UserDetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; user: UserViewModel }
  | { status: "error"; message: string };

this.replaceState({ status: "loaded", user: vm });
```

This forces the View to handle every status explicitly and prevents impossible states.

## What does NOT belong in a Presenter

- **API calls** — go through a Service.
- **Authorization checks** — the Service enforces these.
- **Mapping entities to display strings** — that's the ViewModel.
- **Routing** — the View handles navigation; the Presenter exposes state and intent.
- **Formatting dates** — the ViewModel.

## Testing

Presenter tests construct the Presenter with a mocked Service and verify:
- Initial state is correct
- `onMounted` triggers initial load
- `onDestroyed` cancels in-flight work
- State transitions happen on each user action
- Service is called with the right arguments
- Subscribers are notified on state change

Tests are framework-free — no rendering, no DOM. Run in milliseconds.

```typescript
const service = mockUserService();
const presenter = new UserDetailPresenter(service);
presenter.configure("user-123", currentUser);

const states: UserDetailState[] = [];
presenter.subscribe((s) => states.push(s));

await presenter.onMounted();

expect(service.getUser).toHaveBeenCalledWith("user-123");
expect(states.map((s) => s.status)).toEqual(["loading", "loaded"]);
```
