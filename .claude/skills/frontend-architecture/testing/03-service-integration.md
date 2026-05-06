# Service Integration Tests

**Path:** `src/features/<feature-name>/__tests__/<feature>.integration.test.ts`

## This is the primary test type

Service integration tests are the **bulk of the test suite**. They exercise the real Repository → Service → Entity → ViewModel pipeline with only the DataSource faked. One test file per feature, organized by use case.

If you can write a service integration test for a behavior, write it there first. Reach for unit tests only for bug fixes or genuinely tricky pure logic that benefits from focused, fast feedback.

## What's real, what's fake

| Layer | In integration tests |
|-------|----------------------|
| DataSource | **Fake** (in-memory) |
| DTO | Real type |
| Repository | **Real** (with all mapping, caching, error handling) |
| Entity | **Real** |
| Service | **Real** |
| ViewModel | **Real** (when test asserts on UI-ready output) |
| Presenter | Not exercised — tested via component tests |

This means a single test catches mapping bugs, cache bugs, business logic bugs, entity invariant bugs, and ViewModel formatting bugs in one shot.

## Strict rules

- **Resolve the Service from the test container, not by `new`-ing it.** Going through the container exercises the real wiring.
- **Seed fakes via `setup.fakes.<feature>.seed([...])`.** Don't push DTOs into the container.
- **Assert on Entities and ViewModels, not DTOs.** DTOs die at the Repository — tests above the Repository should never see them.
- **Cover the use case, not the methods.** A test named `"changeRole denies non-admin actors"` is better than `"calls userRepository.update with correct args"`. The first is what the product cares about; the second is implementation detail.
- **No HTTP, no real timers, no network.** All side effects are intercepted by fakes.

## Canonical example

```typescript
// src/features/user/__tests__/user.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContainer, type TestContainerSetup } from "@/__tests__/shared/createTestContainer";
import { UserService, UnauthorizedActionError, UserAlreadyHasRoleError } from "../domain/UserService";
import { UserRepository, UserNotFoundError } from "../domain/UserRepository";
import { UserViewModel } from "../presentation/UserViewModel";
import {
  makeUserDto,
  makeAdminDto,
  makeDormantUserDto,
} from "./fakes/userDtoFactory";

describe("User feature", () => {
  let setup: TestContainerSetup;
  let service: UserService;

  beforeEach(() => {
    setup = createTestContainer();
    service = setup.container.resolve(UserService);
  });

  describe("getUser", () => {
    it("returns the user as a domain entity with mapped fields", async () => {
      setup.fakes.user.seed([
        makeUserDto({
          id: "user-1",
          email: "jane@example.com",
          full_name: "Jane Doe",
          role: "member",
          last_login_at: "2026-04-30T08:00:00.000Z",
        }),
      ]);

      const user = await service.getUser("user-1");

      expect(user.id).toBe("user-1");
      expect(user.email).toBe("jane@example.com");
      expect(user.fullName).toBe("Jane Doe"); // snake_case → camelCase mapping
      expect(user.role).toBe("member");
      expect(user.lastLoginAt).toBeInstanceOf(Date); // string → Date mapping
      expect(user.isAdmin()).toBe(false); // entity method works
    });

    it("throws UserNotFoundError for unknown ids", async () => {
      await expect(service.getUser("missing")).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });

    it("caches subsequent fetches within TTL", async () => {
      setup.fakes.user.seed([makeUserDto({ id: "user-1" })]);

      await service.getUser("user-1");
      await service.getUser("user-1");

      expect(setup.fakes.user.getCallCount("fetchUser")).toBe(1);
    });
  });

  describe("changeRole", () => {
    it("promotes a member to admin when actor is admin", async () => {
      setup.fakes.user.seed([
        makeAdminDto({ id: "admin-1" }),
        makeUserDto({ id: "user-1", role: "member" }),
      ]);
      const actor = await service.getUser("admin-1");

      const updated = await service.changeRole("user-1", "admin", actor);

      expect(updated.role).toBe("admin");
      expect(updated.isAdmin()).toBe(true);
      expect(setup.fakes.user.getCallCount("patchUser")).toBe(1);
    });

    it("rejects when actor lacks edit permission", async () => {
      setup.fakes.user.seed([
        makeUserDto({ id: "member-1", role: "member" }),
        makeUserDto({ id: "target", role: "member" }),
      ]);
      const actor = await service.getUser("member-1");

      await expect(
        service.changeRole("target", "admin", actor),
      ).rejects.toBeInstanceOf(UnauthorizedActionError);

      // No patch should have been issued
      expect(setup.fakes.user.getCallCount("patchUser")).toBe(0);
    });

    it("rejects when target already has the requested role", async () => {
      setup.fakes.user.seed([
        makeAdminDto({ id: "admin-1" }),
        makeUserDto({ id: "target", role: "admin" }),
      ]);
      const actor = await service.getUser("admin-1");

      await expect(
        service.changeRole("target", "admin", actor),
      ).rejects.toBeInstanceOf(UserAlreadyHasRoleError);
    });
  });

  describe("listDormantUsers", () => {
    it("returns only users who haven't logged in within 90 days", async () => {
      setup.fakes.user.seed([
        makeUserDto({ id: "active", last_login_at: "2026-05-01T00:00:00.000Z" }),
        makeDormantUserDto({ id: "dormant-1" }),
        makeDormantUserDto({ id: "dormant-2" }),
      ]);

      const dormant = await service.listDormantUsers(1, 50);

      expect(dormant.map((u) => u.id).sort()).toEqual(["dormant-1", "dormant-2"]);
      expect(dormant.every((u) => u.isDormant())).toBe(true);
    });
  });

  describe("ViewModel projection", () => {
    // Optional: when ViewModel formatting is part of the value the user gets,
    // assert on it through the integration test rather than a separate unit test.
    it("exposes formatted display props for the detail screen", async () => {
      setup.fakes.user.seed([
        makeAdminDto({
          id: "admin-1",
          full_name: "Alice Admin",
          last_login_at: "2026-05-04T12:00:00.000Z",
        }),
      ]);
      const currentUser = await service.getUser("admin-1");
      const vm = new UserViewModel(currentUser, currentUser);

      expect(vm.displayName).toBe("Alice Admin");
      expect(vm.avatarInitials).toBe("AA");
      expect(vm.roleLabel).toBe("Administrator");
      expect(vm.canShowAdminBadge).toBe(true);
      expect(vm.isSelf).toBe(true); // admin viewing own profile
    });
  });
});
```

## Test naming

Tests describe **product behavior**, not method calls:

✅ `"promotes a member to admin when actor is admin"`
✅ `"rejects when actor lacks edit permission"`
✅ `"caches subsequent fetches within TTL"`

❌ `"calls userRepository.update with correct args"`
❌ `"setState is called twice"`
❌ `"toEntity maps full_name correctly"`

The good names survive refactoring — if you rewrite the Repository's caching strategy, the cache test still describes the desired behavior. The bad names break with implementation changes and force test rewrites.

## Organizing by use case

For features with many use cases, structure the file by Service method:

```
describe("User feature", () => {
  describe("getUser", () => { ... });
  describe("listActiveUsers", () => { ... });
  describe("listDormantUsers", () => { ... });
  describe("changeRole", () => {
    it("promotes...", ...);
    it("demotes...", ...);
    it("rejects when...", ...);
    it("rejects already-has-role...", ...);
  });
  describe("deactivate", () => { ... });
  describe("updateProfile", () => { ... });
});
```

Inside each `describe` block, cover:
1. The happy path
2. Each authorization rejection
3. Each domain rule rejection (`UserAlreadyHasRoleError`, etc.)
4. Edge cases the API contract specifies (404 → `UserNotFoundError`, etc.)

If a use case has more than ~6 scenarios, consider whether the Service is doing too much — multi-step orchestration sometimes signals a missing intermediate use case.

## Asserting on Entity behavior

When asserting on an Entity returned from the Service, exercise its domain methods to catch invariant bugs:

```typescript
const user = await service.getUser("user-1");

expect(user.role).toBe("admin");           // direct field
expect(user.isAdmin()).toBe(true);          // entity method
expect(user.canEditOtherUsers()).toBe(true); // composed entity method
```

If `user.isAdmin()` returns the wrong thing, you've caught a bug in the entity even though the test was written against the Service.

## What integration tests do NOT cover

- **Component rendering** — that's the component test (`*View.test.tsx` / `*View.test.ts`).
- **Presenter UI state transitions** — covered indirectly through component tests; only test directly when fixing a Presenter-specific bug.
- **HTTP wire format** — fake DataSources skip this. If you need to verify wire format, write a focused DataSource unit test (rare).
- **End-to-end flows across features** — that's a higher-level test (Cypress / Playwright), out of scope for this skill.

## When integration tests are slow

The pipeline is fast — fake DataSources resolve in microseconds, real Repository/Service code is pure logic. If a test suite slows down, the cause is almost always:

1. **Real timers in the production code** — use `vi.useFakeTimers()` to control them
2. **Large seeded datasets** — reduce to the minimum that proves the behavior
3. **Test container rebuilt with too many features** — split tests by feature so each test file's container is small

Don't introduce mock Repositories or mock Services to "speed things up." That breaks the integration guarantee, which is the entire point of this layer of testing.
