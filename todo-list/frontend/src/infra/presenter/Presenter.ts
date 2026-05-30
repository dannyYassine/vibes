export type PresenterListener<TState> = (state: TState) => void;

export abstract class Presenter<TState> {
  private _state: TState;
  private listeners = new Set<PresenterListener<TState>>();
  private _isMounted = false;

  constructor(initialState: TState) {
    this._state = initialState;
  }

  onCreated(): void | Promise<void> {}

  onMounted(): void | Promise<void> {}

  onDestroyed(): void | Promise<void> {}

  getState(): TState {
    return this._state;
  }

  subscribe(listener: PresenterListener<TState>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isMounted(): boolean {
    return this._isMounted;
  }

  /** @internal */
  _markMounted(): void {
    this._isMounted = true;
  }

  /** @internal */
  _markUnmounted(): void {
    this._isMounted = false;
  }

  protected setState(patch: Partial<TState>): void {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((l) => l(this._state));
  }

  protected replaceState(next: TState): void {
    this._state = next;
    this.listeners.forEach((l) => l(this._state));
  }
}