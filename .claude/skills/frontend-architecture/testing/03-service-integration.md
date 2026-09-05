# Service Integration Tests

**Path:** `src/features/<feature-name>/__tests__/<feature>.integration.test.ts`

## This is the primary test type

Service integration tests are the **bulk of the test suite**. They exercise the pipeline: FakeUserGateway → real UserService → real User entity — with only the Gateway faked. One test file per feature, organized by use case.

If you can write a service integration test for a behavior, write it there first. Reach for unit tests only for bug fixes or genuinely tricky pure logic that benefits from focused, fast feedback.

## What's real, what's fake

| Layer | In integration tests |
|-------|----------------------|
| Gateway | **Fake** (in-memory) |
| API model | Real type |
| Entity | **Real** |
| Service | **Real** (owns the API-model→Entity mapping) |
| ViewModel | **Real** (when test asserts on UI-ready output) |
| Presenter | Not exercised — tested via component tests |

This means a single test catches mapping bugs (in the Service's private `toUser`/`toUpdatePayload` methods), business logic bugs, entity invariant bugs, and ViewModel formatting bugs in one shot.

## Strict rules

- **Resolve the Service from the test container, not by `new`-ing it.** Going through the container exercises the real wiring.
- **Seed fakes via `setup.fakes.<feature>.seed([...])`.** Don't push API models into the container.
- **Assert on Entities, never API models.** API models die at the Service's `toUser` boundary — tests above that boundary should never see them.
- **Cover the use case, not the methods.** A test named `"changeRole denies non-admin actors"` is better than `"calls userGateway.updateUser with correct args"`. The first is what the product cares about; the second is implementation detail.
- **No HTTP, no real timers, no network.** All side effects are intercepted by fakes.

## Canonical example

```typescript
// src/features/user/__tests__/user.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContainer, type TestContainerSetup } from "@/__tests__/shared/createTestContainer";
import { UserService, UnauthorizedActionError, UserAlreadyHasRoleError, UserNotFoundError } from "../domain/UserService";
import {
  makeUserApiModel,
  makeAdminApiModel,
  makeDormantUserApiModel,
} from "./fakes/userApiModelFactory";

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
        makeUserApiModel({
          usr_id: "user-1",
          email: "jane@example.com",
          first_name: "Jane",
          last_name: "Doe",
          role: "member",
          last_login_at: "2026-04-30T08:00:00.000Z",
        }),
      ]);

      const user = await service.getUser("user-1");

      expect(user.id).toBe("user-1");
      expect(user.email).toBe("jane@example.com");
      expect(user.fullName).toBe("Jane Doe"); // snake_case → camelCase mapping
      expect(user.role).toBe("member");
      expect(user.lastLoginAt).toBeInstanceOf(Date); // ISO string → Date mapping
      expect(user.isAdmin()).toBe(false); // entity method works
    });

    it("throws UserNotFoundError for unknown ids", async () => {
      await expect(service.getUser("missing")).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });

    it("maps null last_login_at to null and falls back fullName to first_name", async () => {
      setup.fakes.user.seed([
        makeUserApiModel({
          usr_id: "user-2",
          first_name: "Cher",
          last_name: null,
          last_login_at: null,
        }),
      ]);

      const user = await service.getUser("user-2");

      expect(user.lastLoginAt).toBeNull();
      expect(user.fullName).toBe("Cher");
    });
  });

  describe("changeRole", () => {
    it("promotes a member to admin when actor is admin", async () => {
      setup.fakes.user.seed([
        makeAdminApiModel({ usr_id: "admin-1" }),
        makeUserApiModel({ usr_id: "user-1", role: "member" }),
      ]);
      const actor = await service.getUser("admin-1");

      const updated = await service.changeRole("user-1", "admin", actor);

      expect(updated.role).toBe("admin");
      expect(updated.isAdmin()).toBe(true);
      expect(setup.fakes.user.getCallCount("updateUser")).toBe(1);
    });

    it("rejects when actor lacks edit permission", async () => {
      setup.fakes.user.seed([
        makeUserApiModel({ usr_id: "member-1", role: "member" }),
        makeUserApiModel({ usr_id: "target", role: "member" }),
      ]);
      const actor = await service.getUser("member-1");

      await expect(
        service.changeRole("target", "admin", actor),
      ).rejects.toBeInstanceOf(UnauthorizedActionError);

      // No update should have been issued
      expect(setup.fakes.user.getCallCount("updateUser")).toBe(0);
    });

    it("rejects when target already has the requested role", async () => {
      setup.fakes.user.seed([
        makeAdminApiModel({ usr_id: "admin-1" }),
        makeUserApiModel({ usr_id: "target", role: "admin" }),
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
        makeUserApiModel({ usr_id: "active", last_login_at: "2026-05-01T00:00:00.000Z" }),
        makeDormantUserApiModel({ usr_id: "dormant-1" }),
        makeDormantUserApiModel({ usr_id: "dormant-2" }),
      ]);

      const dormant = await service.listDormantUsers(1, 50);

      expect(dormant.map((u) => u.id).sort()).toEqual(["dormant-1", "dormant-2"]);
      expect(dormant.every((u) => u.isDormant())).toBe(true);
    });
  });
});
```

## Test naming

Tests describe **product behavior**, not method calls:

✅ `"promotes a member to admin when actor is admin"`
✅ `"rejects when actor lacks edit permission"`
✅ `"maps null last_login_at to null and falls back fullName to first_name"`

❌ `"calls userGateway.updateUser with correct args"`
❌ `"setState is called twice"`
❌ `"toUser maps first_name correctly"`

The good names survive refactoring — if you rework the Service's internal mapping, the behavior test still describes the desired outcome. The bad names break with implementation changes and force test rewrites.

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
4. Mapping edge cases the API contract specifies (nullable fields, null dates, 404 → `UserNotFoundError`)

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

- **Component rendering** — that's the component test (`*View.test.ts(.tsx)`).
- **Presenter UI state transitions** — covered indirectly through component tests; only test directly when fixing a Presenter-specific bug.
- **HTTP wire format** — fake Gateways skip this. If you need to verify wire format, write a focused Gateway unit test (rare).
- **End-to-end flows across features** — that's a higher-level test (Cypress / Playwright), out of scope for this skill.

## When integration tests are slow

The pipeline is fast — fake Gateways resolve in microseconds, real Service and Entity code is pure logic. If a test suite slows down, the cause is almost always:

1. **Real timers in the production code** — use `vi.useFakeTimers()` to control them
2. **Large seeded datasets** — reduce to the minimum that proves the behavior
3. **Test container rebuilt with too many features** — split tests by feature so each test file's container is small

Don't mock Services to speed things up — the fake Gateway already makes everything fast, and mocking above it means testing mocks instead of real code paths.
