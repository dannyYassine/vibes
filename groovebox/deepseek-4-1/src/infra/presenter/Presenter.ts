export type PresenterListener<TState> = (state: TState) => void;

export abstract class Presenter<TState> {
  private readonly listeners = new Set<PresenterListener<TState>>();
  private mounted = false;

  constructor(private readonly state: TState) {}

  onCreated(): void | Promise<void> {}
  onMounted(): void | Promise<void> {}
  onDestroyed(): void | Promise<void> {}

  getState(): TState {
    return this.state;
  }

  subscribe(listener: PresenterListener<TState>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  _markMounted(): void {
    this.mounted = true;
  }

  _markUnmounted(): void {
    this.mounted = false;
  }

  protected notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}
