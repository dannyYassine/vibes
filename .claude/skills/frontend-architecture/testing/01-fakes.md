# Fake DataSources

**Path:** `src/features/<feature-name>/__tests__/fakes/Fake<Feature>DataSource.ts`

## Purpose

A **fake DataSource** is an in-memory implementation of the DataSource that satisfies the same TypeScript shape as the real one. It stores DTOs in a `Map`, supports the same methods, and lets tests control responses precisely without ever touching the network.

Fakes are the only thing tests ever substitute. Repositories, Services, Entities, ViewModels, and Presenters always run as the real code in integration tests.

## Strict rules

- **One fake per real DataSource.** `FakeUserDataSource` mirrors `UserDataSource`. Same method signatures, same return types.
- **Stores DTOs, not Entities.** The fake operates at the same boundary as the real DataSource — DTO in, DTO out.
- **No business logic.** The fake just stores and returns data. Filtering, sorting, and pagination are implemented as faithfully as the real API behavior — but not as new logic.
- **Deterministic.** Given the same seed data and the same calls, the fake produces the same results. No timestamps based on `Date.now()`, no random IDs unless explicitly seeded.
- **Helper methods for test setup.** `seed(...)`, `clear()`, `getCallCount(method)` — methods on the fake that the test uses but the production interface doesn't expose.

## Canonical example

```typescript
// src/features/user/__tests__/fakes/FakeUserDataSource.ts
import type { UserDto, UpdateUserDto } from "../../data/UserDto";

export class FakeUserDataSource {
  private store = new Map<string, UserDto>();
  private callCounts = {
    fetchUser: 0,
    fetchUsers: 0,
    patchUser: 0,
    deleteUser: 0,
  };

  // --- Production interface (mirrors real UserDataSource) ---

  async fetchUser(id: string): Promise<UserDto> {
    this.callCounts.fetchUser++;
    const dto = this.store.get(id);
    if (!dto) {
      throw this.notFound(id);
    }
    return structuredClone(dto);
  }

  async fetchUsers(params: {
    page: number;
    perPage: number;
  }): Promise<UserDto[]> {
    this.callCounts.fetchUsers++;
    const all = Array.from(this.store.values());
    const start = (params.page - 1) * params.perPage;
    return all.slice(start, start + params.perPage).map(structuredClone);
  }

  async patchUser(id: string, payload: UpdateUserDto): Promise<UserDto> {
    this.callCounts.patchUser++;
    const existing = this.store.get(id);
    if (!existing) throw this.notFound(id);

    const updated: UserDto = {
      ...existing,
      full_name: payload.full_name ?? existing.full_name,
      role: payload.role ?? existing.role,
      is_active: payload.is_active ?? existing.is_active,
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

  /** Seed one or many DTOs into the fake. */
  seed(dtos: UserDto[]): this {
    for (const dto of dtos) {
      this.store.set(dto.id, structuredClone(dto));
    }
    return this;
  }

  /** Remove all seeded data and reset call counts. */
  clear(): this {
    this.store.clear();
    this.callCounts = {
      fetchUser: 0,
      fetchUsers: 0,
      patchUser: 0,
      deleteUser: 0,
    };
    return this;
  }

  /** How many times a method was called — useful for asserting caching behavior. */
  getCallCount(method: keyof FakeUserDataSource["callCounts"]): number {
    return this.callCounts[method];
  }

  /** Force the next call to a method to throw a specific error. */
  failNext(method: "fetchUser" | "fetchUsers" | "patchUser", error: Error): this {
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

## DTO factories

Tests need realistic seed data. Co-locate factory functions with the fake:

```typescript
// src/features/user/__tests__/fakes/userDtoFactory.ts
import type { UserDto } from "../../data/UserDto";

export function makeUserDto(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: "user-1",
    email: "jane@example.com",
    full_name: "Jane Doe",
    avatar_url: null,
    role: "member",
    is_active: true,
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
    last_login_at: "2026-04-30T08:00:00.000Z",
    ...overrides,
  };
}

export function makeAdminDto(overrides: Partial<UserDto> = {}): UserDto {
  return makeUserDto({ id: "admin-1", role: "admin", ...overrides });
}

export function makeDormantUserDto(overrides: Partial<UserDto> = {}): UserDto {
  return makeUserDto({
    id: "dormant-1",
    last_login_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  });
}
```

Use `Partial<UserDto>` overrides so tests only specify the fields that matter to that scenario.

## What goes in the production interface vs. test helpers

| Method | Belongs on... | Why |
|--------|---------------|-----|
| `fetchUser(id)` | Production interface | Real DataSource exposes it |
| `seed(dtos)` | Test helper | Real DataSource has no seed concept |
| `getCallCount(method)` | Test helper | Real DataSource doesn't track calls |
| `failNext(method, error)` | Test helper | Real DataSource fails based on the API, not test config |
| `clear()` | Test helper | Real DataSource has no in-memory store |

Keep the production-interface methods strictly compatible with the real DataSource — that's what makes the fake substitutable.

## Why a class, not a plain object with mock functions?

Two reasons:

1. **Type safety.** The class implements the same interface as the real DataSource, so if you add a method to the real one and forget to update the fake, TypeScript catches it.
2. **Stateful behavior.** A real DataSource backed by an API has stateful behavior (PATCH affects subsequent GET). Trying to express that with `vi.fn()` per method requires manual coordination between mocks. A class with a `Map` makes it natural.

Avoid using `vi.fn()` for DataSource methods. Save `vi.fn()` for places where you genuinely just need a spy — primarily, the Presenter mock in component tests.

## Sharing fakes across test files

Place shared fakes and factories in `src/features/<feature>/__tests__/fakes/` so any test in the feature can import them. If a fake needs to be used across features (rare — usually a sign of a missing abstraction), promote it to `src/__tests__/shared/fakes/`.

Don't try to make one universal fake that covers every test scenario. It's fine and often clearer to have a small `setupSimpleScenario()` function that returns a pre-seeded fake for the common case, with tests calling `.seed()` directly when they need something different.
