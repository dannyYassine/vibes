# Test Container

**Path:** `src/__tests__/shared/createTestContainer.ts`

## Purpose

Tests need a DI container with **fakes substituted at the DataSource layer** but everything else (Repositories, Services, Presenters) wired up exactly as production. The `createTestContainer` helper builds this.

This is what makes service integration tests possible: real Repository → Service → Entity flow, fake DataSource at the boundary, no HTTP.

## Strict rules

- **Substitute only at the DataSource boundary.** Never substitute a Repository or Service — that's how you end up testing mocks instead of code.
- **Each test gets a fresh container.** Test isolation is non-negotiable. Singletons in the container survive across resolves within a test, but the container itself is rebuilt per test.
- **Return the fakes alongside the container.** Tests need to seed fakes and assert on call counts; returning `{ container, fakes }` makes both available without extra resolution.
- **Compose with feature `register*Module` functions.** The test container reuses the same registration code as production for everything except the DataSource.

## Canonical example

```typescript
// src/__tests__/shared/createTestContainer.ts
import { Container } from "@/infra/container/Container";
import { HttpClient } from "@/infra/http/HttpClient";

import { UserDataSource } from "@/features/user/data/UserDataSource";
import { UserRepository } from "@/features/user/domain/UserRepository";
import { UserService } from "@/features/user/domain/UserService";
import { UserDetailPresenter } from "@/features/user/presentation/UserDetailPresenter";
import { UserListPresenter } from "@/features/user/presentation/UserListPresenter";
import { FakeUserDataSource } from "@/features/user/__tests__/fakes/FakeUserDataSource";

// Add other features here as the app grows.
import { InvoiceDataSource } from "@/features/invoice/data/InvoiceDataSource";
import { FakeInvoiceDataSource } from "@/features/invoice/__tests__/fakes/FakeInvoiceDataSource";
// ... import the rest of each feature's real Repository/Service/Presenter

export type TestFakes = {
  user: FakeUserDataSource;
  invoice: FakeInvoiceDataSource;
};

export type TestContainerSetup = {
  container: Container;
  fakes: TestFakes;
};

/**
 * Builds a DI container for tests:
 *  - DataSources are replaced with in-memory fakes
 *  - Everything else (Repository, Service, Presenter) is the real production class
 *  - HttpClient is registered but should never be called — fakes intercept all data access
 *
 * Use this for integration tests. Component tests usually don't need it
 * (they substitute at the Presenter layer instead — see component test references).
 */
export function createTestContainer(): TestContainerSetup {
  const container = new Container();

  const fakes: TestFakes = {
    user: new FakeUserDataSource(),
    invoice: new FakeInvoiceDataSource(),
  };

  // HttpClient is registered to satisfy any accidental production wiring,
  // but it should never actually be invoked — the fakes intercept above.
  container.register(HttpClient, () => {
    throw new Error(
      "HttpClient was resolved during a test. " +
      "DataSources should be substituted with fakes — check createTestContainer.",
    );
  });

  // --- User feature ---
  container.register(UserDataSource, () => fakes.user as unknown as UserDataSource);
  container.register(
    UserRepository,
    (c) => new UserRepository(c.resolve(UserDataSource)),
  );
  container.register(
    UserService,
    (c) => new UserService(c.resolve(UserRepository)),
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
  container.register(InvoiceDataSource, () => fakes.invoice as unknown as InvoiceDataSource);
  // ... rest of invoice registrations

  return { container, fakes };
}
```

## The fake-as-real-DataSource cast

The line `fakes.user as unknown as UserDataSource` deserves explanation. The fake is structurally compatible with the production interface (same methods, same return types) but TypeScript can't always prove that — especially when the production class has private fields the fake doesn't. The double cast is the explicit "I know what I'm doing" escape hatch.

If you want to enforce structural compatibility at compile time, extract an interface:

```typescript
// src/features/user/data/UserDataSource.ts
export interface IUserDataSource {
  fetchUser(id: string): Promise<UserDto>;
  fetchUsers(params: { page: number; perPage: number }): Promise<UserDto[]>;
  patchUser(id: string, payload: UpdateUserDto): Promise<UserDto>;
  deleteUser(id: string): Promise<void>;
}

export class UserDataSource implements IUserDataSource { /* ... */ }
```

Then change Repository to depend on `IUserDataSource` and register the fake as the same token. The double cast goes away. Whether to use interfaces is a team-wide call — both work, the cast version is less ceremony.

## Per-test usage pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContainer, type TestContainerSetup } from "@/__tests__/shared/createTestContainer";
import { UserService } from "@/features/user/domain/UserService";
import { makeUserDto, makeAdminDto } from "../fakes/userDtoFactory";

describe("UserService.changeRole", () => {
  let setup: TestContainerSetup;
  let service: UserService;

  beforeEach(() => {
    setup = createTestContainer();
    service = setup.container.resolve(UserService);
  });

  it("changes role when actor is admin", async () => {
    setup.fakes.user.seed([
      makeAdminDto({ id: "admin-1" }),
      makeUserDto({ id: "user-1", role: "member" }),
    ]);
    const actor = await setup.container.resolve(UserService).getUser("admin-1");

    const updated = await service.changeRole("user-1", "admin", actor);

    expect(updated.role).toBe("admin");
    expect(setup.fakes.user.getCallCount("patchUser")).toBe(1);
  });
});
```

The pattern is consistent across all integration tests: build container → seed fakes → resolve service → exercise → assert.

## Test container vs. production container

Both go through the same `register<Feature>Module` shape, but the test container:

- Substitutes DataSources with fakes
- Registers a sentinel HttpClient that throws if resolved
- (Optionally) replaces side-effecting infrastructure like loggers, analytics, telemetry

Everything else is identical. This keeps the tests honest — when production registration changes (e.g., adding a caching layer to the Repository), the tests pick it up automatically.

## What about feature modules?

In production, each feature has a `register<Feature>Module(container)` function called from `bootstrap.ts`. You might be tempted to reuse those functions in the test container. Don't — the production functions register the real DataSource, and you'd have to override it after the fact. Cleaner to have the test container register everything explicitly so the substitution is visible.

For very large apps, an alternative is a `register<Feature>ModuleForTest(container, fakes)` companion function in each feature module. Use this only when the test container file gets unwieldy (>200 lines).

## Resetting between tests

Vitest's `beforeEach` rebuilds the entire container per test. This is the right granularity:

- ✅ Each test gets a fresh fake with no seeded data
- ✅ Each test gets fresh singleton instances (Repository caches don't leak across tests)
- ✅ No coordination needed between tests — they can run in any order

Don't try to share a container across tests with `clear()` calls on fakes. The performance cost of rebuilding is negligible (microseconds), and the isolation is worth it.
