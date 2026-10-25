type Factory<T> = (container: Container) => T;

/**
 * Layer 0 — the composition root. Tiny on purpose: string tokens, lazy
 * singletons and explicit transients, no framework knowledge.
 */
export class Container {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly singletons = new Map<string, unknown>();
  private readonly transients = new Set<string>();

  register<T>(token: string, factory: Factory<T>, singleton = true): void {
    this.factories.set(token, factory);
    this.singletons.delete(token);
    if (singleton) {
      this.transients.delete(token);
    } else {
      this.transients.add(token);
    }
  }

  registerValue<T>(token: string, value: T): void {
    this.singletons.set(token, value);
    this.transients.delete(token);
  }

  resolve<T>(token: string): T {
    if (!this.transients.has(token) && this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const factory = this.factories.get(token);
    if (!factory) throw new Error(`Container: no registration for "${token}"`);

    const instance = factory(this);
    if (!this.transients.has(token)) this.singletons.set(token, instance);
    return instance as T;
  }
}
