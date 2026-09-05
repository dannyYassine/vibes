# Fake Gateways

**Path:** `src/features/<feature-name>/__tests__/fakes/Fake<Feature>Gateway.ts`

## Purpose

A **fake Gateway** is an in-memory implementation of the Gateway that satisfies the same TypeScript shape as the real one. It stores API models in a `Map`, supports the same methods, and lets tests control responses precisely without ever touching the network.

The fake implements `IUserGateway` — the interface defined in `data/UserGateway.ts`. That interface exists precisely for this: it's the substitution seam. The Service depends on the interface; tests bind the fake to it.

Fakes are the only thing tests ever substitute. Services, Entities, ViewModels, and Presenters always run as the real code in integration tests.

## Strict rules

- **One fake per real Gateway.** `FakeUserGateway` mirrors `UserApiGateway`. Same method signatures, same return types.
- **Stores API models, not Entities.** The fake operates at the same boundary as the real Gateway — API model in, API model out (snake_case wire shape).
- **No business logic.** The fake just stores and returns data. Filtering, sorting, and pagination are implemented as faithfully as the real API behavior — but not as new logic.
- **Deterministic.** Given the same seed data and the same calls, the fake produces the same results. No timestamps based on `Date.now()`, no random IDs unless explicitly seeded.
- **Helper methods for test setup.** `seed(...)`, `clear()`, `getCallCount(method)`, `failNext(...)` — methods on the fake that the test uses but the production interface doesn't expose.

## Canonical example

```typescript
// src/features/user/__tests__/fakes/FakeUserGateway.ts
import type { IUserGateway } from "../../data/UserGateway";
import type { UserApiModel, UpdateUserApiModel } from "../../data/UserGateway";

export class FakeUserGateway implements IUserGateway {
  private store = new Map<string, UserApiModel>();
  private callCounts = {
    fetchUser: 0,
    fetchUsers: 0,
    updateUser: 0,
    deleteUser: 0,
  };

  // --- Production interface (mirrors real UserGateway) ---

  async fetchUser(id: string): Promise<UserApiModel> {
    this.callCounts.fetchUser++;
    const apiModel = this.store.get(id);
    if (!apiModel) {
      throw this.notFound(id);
    }
    return structuredClone(apiModel);
  }

  async fetchUsers(page: number, perPage: number): Promise<UserApiModel[]> {
    this.callCounts.fetchUsers++;
    const all = Array.from(this.store.values());
    const start = (page - 1) * perPage;
    return all.slice(start, start + perPage).map(structuredClone);
  }

  async updateUser(id: string, payload: UpdateUserApiModel): Promise<UserApiModel> {
    this.callCounts.updateUser++;
    const existing = this.store.get(id);
    if (!existing) throw this.notFound(id);

    const updated: UserApiModel = {
      ...existing,
      first_name: payload.first_name ?? existing.first_name,
      last_name: payload.last_name ?? existing.last_name,
      role: payload.role ?? existing.role,
      updated_at: this.fixedTimestamp,
    };
    this.store.set(id, updated);
    return structuredClone(updated);
  }

  async deleteUser(id: string): Promise<void> {
    this.callCounts.deleteUser++;
    if (!this.store.has(id)) throw this.notFound(id);
    this.store.delete(id);
  }

  // --- Test helpers (not on the real interface) ---

  /** Seed one or many API models into the fake. */
  seed(apiModels: UserApiModel[]): this {
    for (const apiModel of apiModels) {
      this.store.set(apiModel.usr_id, structuredClone(apiModel));
    }
    return this;
  }

  /** Remove all seeded data and reset call counts. */
  clear(): this {
    this.store.clear();
    this.callCounts = {
      fetchUser: 0,
      fetchUsers: 0,
      updateUser: 0,
      deleteUser: 0,
    };
    return this;
  }

  /** How many times a method was called — useful for asserting call behavior. */
  getCallCount(method: keyof FakeUserGateway["callCounts"]): number {
    return this.callCounts[method];
  }

  /** Force the next call to a method to throw a specific error. */
  failNext(method: "fetchUser" | "fetchUsers" | "updateUser", error: Error): this {
    const original = this[method].bind(this);
    (this as Record<string, unknown>)[method] = async (...args: unknown[]) => {
      (this as Record<string, unknown>)[method] = original;
      throw error;
    };
    return this;
  }

  // --- Internals ---

  private get fixedTimestamp(): string {
    return "2026-01-01T00:00:00.000Z";
  }

  private notFound(id: string): Error & { status: number } {
    const err = new Error(`User ${id} not found`) as Error & { status: number };
    err.status = 404;
    return err;
  }
}
```

## API model factories

Tests need realistic seed data. Co-locate factory functions with the fake:

```typescript
// src/features/user/__tests__/fakes/userApiModelFactory.ts
import type { UserApiModel } from "../../data/UserGateway";

export function makeUserApiModel(overrides: Partial<UserApiModel> = {}): UserApiModel {
  return {
    usr_id: "user-1",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    birth_year: 1990,
    avatar_url: null,
    role: "member",
    is_active: true,
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
    last_login_at: "2026-04-30T08:00:00.000Z",
    ...overrides,
  };
}

export function makeAdminApiModel(overrides: Partial<UserApiModel> = {}): UserApiModel {
  return makeUserApiModel({ usr_id: "admin-1", role: "admin", ...overrides });
}

export function makeDormantUserApiModel(overrides: Partial<UserApiModel> = {}): UserApiModel {
  return makeUserApiModel({
    usr_id: "dormant-1",
    last_login_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  });
}
```

Use `Partial<UserApiModel>` overrides so tests only specify the fields that matter to that scenario.

## What goes in the production interface vs. test helpers

| Method | Belongs on... | Why |
|--------|---------------|-----|
| `fetchUser(id)` | Production interface | Real Gateway exposes it |
| `seed(apiModels)` | Test helper | Real Gateway has no seed concept |
| `getCallCount(method)` | Test helper | Real Gateway doesn't track calls |
| `failNext(method, error)` | Test helper | Real Gateway fails based on the API, not test config |
| `clear()` | Test helper | Real Gateway has no in-memory store |

Keep the production-interface methods strictly compatible with the real Gateway — that's what makes the fake substitutable.

## Why a class, not a plain object with mock functions?

Two reasons:

1. **Type safety.** The class implements the same interface as the real Gateway, so if you add a method to the real one and forget to update the fake, TypeScript catches it.
2. **Stateful behavior.** A real Gateway backed by an API has stateful behavior (PUT affects subsequent GET). Trying to express that with `vi.fn()` per method requires manual coordination between mocks. A class with a `Map` makes it natural.

Avoid using `vi.fn()` for Gateway methods. Save `vi.fn()` for places where you genuinely just need a spy — primarily, the Presenter mock in component tests.

## Sharing fakes across test files

Place shared fakes and factories in `src/features/<feature>/__tests__/fakes/` so any test in the feature can import them. If a fake needs to be used across features (rare — usually a sign of a missing abstraction), promote it to `src/__tests__/shared/fakes/`.

Don't try to make one universal fake that covers every test scenario. It's fine and often clearer to have a small `setupSimpleScenario()` function that returns a pre-seeded fake for the common case, with tests calling `.seed()` directly when they need something different.
