export type Token<T> = new (...args: never[]) => T;
export type Factory<T> = (container: Container) => T;
export type Scope = "singleton" | "transient";

type Registration<T> = {
  factory: Factory<T>;
  scope: Scope;
  instance?: T;
};

export class Container {
  private registrations = new Map<Token<unknown>, Registration<unknown>>();

  register<T>(token: Token<T>, factory: Factory<T>, scope: Scope = "singleton"): void {
    this.registrations.set(token as Token<unknown>, {
      factory: factory as Factory<unknown>,
      scope,
    });
  }

  resolve<T>(token: Token<T>): T {
    const registration = this.registrations.get(token as Token<unknown>) as
      | Registration<T>
      | undefined;
    if (!registration) {
      throw new Error(`No registration found for ${token.name}`);
    }

    if (registration.scope === "singleton") {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance;
    }

    return registration.factory(this);
  }

  has<T>(token: Token<T>): boolean {
    return this.registrations.has(token as Token<unknown>);
  }
}