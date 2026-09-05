# Test Container

**Path:** `src/__tests__/shared/createTestContainer.ts`

## Purpose

Tests need a DI container with **fakes substituted at the Gateway layer** but everything else (Services, Presenters) wired up exactly as production. The `createTestContainer` helper builds this.

This is what makes service integration tests possible: real Service → Entity flow, fake Gateway at the boundary, no HTTP.

## Strict rules

- **Substitute only at the Gateway boundary.** Never substitute a Service — that's how you end up testing mocks instead of code.
- **Each test gets a fresh container.** Test isolation is non-negotiable. Singletons in the container survive across resolves within a test, but the container itself is rebuilt per test.
- **Return the fakes alongside the container.** Tests need to seed fakes and assert on call counts; returning `{ container, fakes }` makes both available without extra resolution.
- **Compose with feature `register*Module` functions.** The test container reuses the same registration code as production for everything except the Gateway.

## Canonical example

```typescript
// src/__tests__/shared/createTestContainer.ts
import { Container } from "@/infra/container/Container";
import { HttpClient } from "@/infra/http/HttpClient";

import { IUserGateway } from "@/features/user/data/UserGateway";
import { UserService } from "@/features/user/domain/UserService";
import { UserDetailPresenter } from "@/features/user/presentation/UserDetailPresenter";
import { UserListPresenter } from "@/features/user/presentation/UserListPresenter";
import { FakeUserGateway } from "@/features/user/__tests__/fakes/FakeUserGateway";

// Add other features here as the app grows.
import { IInvoiceGateway } from "@/features/invoice/data/InvoiceGateway";
import { FakeInvoiceGateway } from "@/features/invoice/__tests__/fakes/FakeInvoiceGateway";
// ... import the rest of each feature's real Service/Presenter

export type TestFakes = {
  user: FakeUserGateway;
  invoice: FakeInvoiceGateway;
};

export type TestContainerSetup = {
  container: Container;
  fakes: TestFakes;
};

/**
 * Builds a DI container for tests:
 *  - Gateways are replaced with in-memory fakes
 *  - Everything else (Service, Presenter) is the real production class
 *  - HttpClient is registered but should never be called — fakes intercept all data access
 *
 * Use this for integration tests. Component tests usually don't need it
 * (they substitute at the Presenter layer instead — see component test references).
 */
export function createTestContainer(): TestContainerSetup {
  const container = new Container();

  const fakes: TestFakes = {
    user: new FakeUserGateway(),
    invoice: new FakeInvoiceGateway(),
  };

  // HttpClient is registered to satisfy any accidental production wiring,
  // but it should never actually be invoked — the fakes intercept above.
  container.register(HttpClient, () => {
    throw new Error(
      "HttpClient was resolved during a test. " +
      "Gateways should be substituted with fakes — check createTestContainer.",
    );
  });

  // --- User feature ---
  container.register(IUserGateway, () => fakes.user);
  container.register(
    UserService,
    (c) => new UserService(c.resolve(IUserGateway)),
  );
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

  // --- Invoice feature ---
  container.register(IInvoiceGateway, () => fakes.invoice);
  // ... rest of invoice registrations

  return { container, fakes };
}
```

## The fake-as-real-Gateway cast

With the Gateway you rarely need the double cast: every Gateway ships with an `IUserGateway` interface (that's the substitution seam — the Service depends on the interface, tests bind the fake to it), so TypeScript can usually prove the fake is compatible:

```typescript
// src/features/user/data/UserGateway.ts
export interface IUserGateway {
  fetchUser(id: string): Promise<UserApiModel>;
  fetchUsers(page: number, perPage: number): Promise<UserApiModel[]>;
  updateUser(id: string, payload: UpdateUserApiModel): Promise<UserApiModel>;
  deleteUser(id: string): Promise<void>;
}

export class UserApiGateway implements IUserGateway { /* ... */ }
```

Register the fake under the `IUserGateway` token and no cast is needed. If TypeScript still can't prove structural compatibility (private fields on the production class the fake doesn't have), use the double cast `fakes.user as unknown as IUserGateway` — the explicit "I know what I'm doing" escape hatch.

## Per-test usage pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContainer, type TestContainerSetup } from "@/__tests__/shared/createTestContainer";
import { UserService } from "@/features/user/domain/UserService";
import { makeAdminApiModel, makeUserApiModel } from "../fakes/userApiModelFactory";

describe("UserService.changeRole", () => {
  let setup: TestContainerSetup;
  let service: UserService;

  beforeEach(() => {
    setup = createTestContainer();
    service = setup.container.resolve(UserService);
  });

  it("changes role when actor is admin", async () => {
    setup.fakes.user.seed([
      makeAdminApiModel({ usr_id: "admin-1" }),
      makeUserApiModel({ usr_id: "user-1", role: "member" }),
    ]);
    const actor = await setup.container.resolve(UserService).getUser("admin-1");

    const updated = await service.changeRole("user-1", "admin", actor);

    expect(updated.role).toBe("admin");
    expect(setup.fakes.user.getCallCount("updateUser")).toBe(1);
  });
});
```

The pattern is consistent across all integration tests: build container → seed fakes → resolve service → exercise → assert.

## Test container vs. production container

Both go through the same `register<Feature>Module` shape, but the test container:

- Substitutes Gateways with fakes
- Registers a sentinel HttpClient that throws if resolved
- (Optionally) replaces side-effecting infrastructure like loggers, analytics, telemetry

Everything else is identical. This keeps the tests honest — when production registration changes (e.g., swapping the real Gateway for a decorated one), the tests pick it up automatically.

## What about feature modules?

In production, each feature has a `register<Feature>Module(container)` function called from `bootstrap.ts`. You might be tempted to reuse those functions in the test container. Don't — the production functions register the real Gateway, and you'd have to override it after the fact. Cleaner to have the test container register everything explicitly so the substitution is visible.

For very large apps, an alternative is a `register<Feature>ModuleForTest(container, fakes)` companion function in each feature module. Use this only when the test container file gets unwieldy (>200 lines).

## Resetting between tests

Vitest's `beforeEach` rebuilds the entire container per test. This is the right granularity:

- ✅ Each test gets a fresh fake with no seeded data
- ✅ Each test gets fresh singleton instances (no stale state leaking across tests)
- ✅ No coordination needed between tests — they can run in any order

Don't try to share a container across tests with `clear()` calls on fakes. The performance cost of rebuilding is negligible (microseconds), and the isolation is worth it.
