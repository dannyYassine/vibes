# Layer 0: Dependency Injection Container

**Path:** `src/infra/container/` (shared infrastructure, not feature-specific)

## Responsibility

The DI container is the **composition root** for the entire app. It registers every concrete class — DataSources, Repositories, Services, Presenters — and resolves them on demand with their dependencies wired in.

The container is foundational: every other layer relies on it for instantiation. Without it, the View would need to know how to construct a Presenter, which would force it to know about Services, Repositories, and DataSources. With it, the View asks "give me a `UserDetailPresenter`" and gets a fully-wired instance back.

## Strict rules

- **Single source of truth for wiring.** All `new SomeClass(...)` calls happen in registration code. No layer constructs another layer directly.
- **Token-based registration.** Each registration uses a token (typically the class itself, used as a TypeScript-safe key). Tokens are how you ask for a dependency.
- **Two scopes: singleton and transient.** Singletons (DataSources, Repositories, Services) are created once and reused. Transients (Presenters) get a fresh instance per resolution — important because Presenters hold UI state.
- **Lazy resolution.** Dependencies are constructed on first `resolve()`, not at registration time. This keeps app startup fast and avoids constructing things you never use.
- **Framework-agnostic.** The container is plain TypeScript. React, Vue, and Svelte adapters consume it but the container itself doesn't know about any framework.

## Canonical example — minimal hand-rolled container

You don't need a heavyweight library (InversifyJS, tsyringe). A 60-line container is enough for most apps:

```typescript
// src/infra/container/Container.ts

export type Token<T> = abstract new (...args: never[]) => T;
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
```

## Canonical example — registering the User feature

Each feature exposes a `register` function. The composition root calls them all:

```typescript
// src/features/user/userModule.ts
import type { Container } from "@/infra/container/Container";
import { HttpClient } from "@/infra/http/HttpClient";
import { UserDataSource } from "./data/UserDataSource";
import { UserRepository } from "./domain/UserRepository";
import { UserService } from "./domain/UserService";
import { UserDetailPresenter } from "./presentation/UserDetailPresenter";
import { UserListPresenter } from "./presentation/UserListPresenter";

export function registerUserModule(container: Container): void {
  container.register(
    UserDataSource,
    (c) => new UserDataSource(c.resolve(HttpClient), "/api"),
    "singleton",
  );

  container.register(
    UserRepository,
    (c) => new UserRepository(c.resolve(UserDataSource)),
    "singleton",
  );

  container.register(
    UserService,
    (c) => new UserService(c.resolve(UserRepository)),
    "singleton",
  );

  // Presenters are TRANSIENT — fresh state per screen mount.
  container.register(
    UserDetailPresenter,
    (c) => new UserDetailPresenter(c.resolve(UserService)),
    "transient",
  );

  container.register(
    UserListPresenter,
    (c) => new UserListPresenter(c.resolve(UserService)),
    "transient",
  );
}
```

## Composition root

One file bootstraps the whole app:

```typescript
// src/infra/container/bootstrap.ts
import { Container } from "./Container";
import { HttpClient } from "@/infra/http/HttpClient";
import { registerUserModule } from "@/features/user/userModule";
import { registerInvoiceModule } from "@/features/invoice/invoiceModule";

export function bootstrapContainer(): Container {
  const container = new Container();

  // Infrastructure singletons
  container.register(HttpClient, () => new HttpClient(import.meta.env.VITE_API_URL));

  // Feature modules
  registerUserModule(container);
  registerInvoiceModule(container);

  return container;
}
```

## Scope guidance

| Layer | Scope | Why |
|-------|-------|-----|
| HttpClient, AuthClient | singleton | Shared connection state, auth tokens |
| DataSource | singleton | Stateless transport — no reason to recreate |
| Repository | singleton | Holds caches that benefit from being shared |
| Service | singleton | Stateless orchestration |
| Presenter | **transient** | Holds per-screen UI state — must be fresh on mount |
| ViewModel | n/a | Constructed by Presenter, not registered |
| Entity | n/a | Constructed by Repository mapping, not registered |

The key insight: **anything that holds UI state is transient**. Anything that holds shared infrastructure or domain logic is singleton.

## Why not just use `new` everywhere?

Without a container, the View ends up with code like:

```typescript
const presenter = new UserDetailPresenter(
  new UserService(
    new UserRepository(
      new UserDataSource(httpClient, "/api"),
    ),
  ),
);
```

That's three problems:
1. The View now imports DataSource, Repository, and Service — violating layer boundaries.
2. Swapping any layer (e.g., adding a caching Repository decorator) requires editing every call site.
3. Tests can't substitute mocks without monkey-patching.

With a container, the View imports only the Presenter token. Substitution is one line in the registration code.

## Testing with the container

For tests, build a separate container with mocks:

```typescript
function createTestContainer(): Container {
  const container = new Container();
  container.register(UserRepository, () => mockUserRepository);
  container.register(UserService, (c) => new UserService(c.resolve(UserRepository)));
  container.register(UserDetailPresenter, (c) => new UserDetailPresenter(c.resolve(UserService)), "transient");
  return container;
}
```

You substitute at any layer — typically Repository for service tests, Service for presenter tests, Presenter for view tests.

## Alternative: use a library

For larger apps, a real DI library is worth the dependency:

- **tsyringe** (Microsoft) — decorator-based, lightweight, good TypeScript support
- **InversifyJS** — full-featured, more ceremony, well-established
- **Awilix** — function-based, no decorators, popular in Node.js ecosystems

The hand-rolled container above is enough until your registration count exceeds ~50 or you need advanced features like circular dependency detection, hierarchical scopes, or async resolution. For most teams, plain code wins.
