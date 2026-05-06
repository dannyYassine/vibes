# Targeted Unit Tests

**Path:** `src/features/<feature-name>/__tests__/unit/<Layer>.test.ts`

## When to write a unit test

Unit tests are the **secondary** tier of testing in this architecture. Default to service integration tests; reach for a unit test only in these cases:

1. **Bug fix.** A defect surfaced in production or in QA. Write a unit test that fails before the fix and passes after — it documents the bug forever and prevents regressions.
2. **Tricky pure logic.** Date math, parsing, complex ViewModel formatting — places where the integration test is too coarse to drive the edge cases efficiently.
3. **Entity invariants.** Constructor validation logic is leaf-level pure code. A direct unit test on the constructor is the right tool.

If you find yourself writing a unit test outside these cases, ask whether the integration test would cover it instead. Usually it will.

## Strict rules

- **Unit tests are additive, not a replacement.** The integration test for the feature still exists and still must pass. The unit test is a focused regression check.
- **Live in `__tests__/unit/`.** This makes their secondary status visually obvious to anyone reading the test directory.
- **Name the file after the layer being tested.** `UserRepository.test.ts`, `UserViewModel.test.ts`. Don't name them after the bug — names should still describe what's being tested.
- **Reference the integration test in a comment when fixing a bug.** Example: `// Regression test for bug #1247 — see user.integration.test.ts > "changeRole > rejects when target deactivated"`.

## Bug fix workflow

When a bug is reported:

1. **Reproduce in the integration test first.** Add a new `it(...)` to the relevant `describe` block in `<feature>.integration.test.ts`. If it fails, you've reproduced the bug.
2. **Fix the bug.** Make the integration test pass.
3. **Decide if a unit test is worthwhile.**
   - If the bug is in pure leaf logic (mapping, formatting, validation), add a focused unit test in `__tests__/unit/`.
   - If the bug is in business logic, the integration test alone is enough — adding a unit test on the Service would just duplicate coverage.
4. **Both tests pass; commit.**

## Examples by layer

### Entity unit test

```typescript
// src/features/user/__tests__/unit/User.test.ts
import { describe, it, expect } from "vitest";
import { User } from "../../domain/User";

describe("User entity", () => {
  describe("constructor validation", () => {
    it("throws when id is empty", () => {
      expect(() => buildUser({ id: "" })).toThrow("User.id is required");
    });

    it("throws when email is missing @", () => {
      expect(() => buildUser({ email: "not-an-email" })).toThrow(
        "User.email must be a valid email",
      );
    });

    it("throws when fullName is whitespace", () => {
      expect(() => buildUser({ fullName: "   " })).toThrow(
        "User.fullName cannot be empty",
      );
    });
  });

  describe("hasLoggedInWithin", () => {
    // Regression test for bug #2103 — boundary case at exactly N days
    // See user.integration.test.ts > "listDormantUsers"
    it("returns true at exactly the boundary day", () => {
      const user = buildUser({
        lastLoginAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      });
      expect(user.hasLoggedInWithin(90)).toBe(true);
    });

    it("returns false one second past the boundary", () => {
      const user = buildUser({
        lastLoginAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000 - 1000),
      });
      expect(user.hasLoggedInWithin(90)).toBe(false);
    });
  });
});

function buildUser(overrides: Partial<ConstructorParameters<typeof User>[0]>) {
  return new User({
    id: "user-1",
    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: null,
    role: "member",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  });
}
```

Constructor validation is the canonical case for entity unit tests — it's pure leaf logic and the integration test won't drive every invalid-input case efficiently.

### ViewModel unit test

```typescript
// src/features/user/__tests__/unit/UserViewModel.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { UserViewModel } from "../../presentation/UserViewModel";
import { User } from "../../domain/User";

describe("UserViewModel.formattedLastLogin", () => {
  afterEach(() => vi.useRealTimers());

  // Regression test for bug #1893 — relative date formatting
  // returned "0 days ago" instead of "Today" for same-day logins
  it("returns 'Today' when last login is the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T15:00:00Z"));

    const user = buildUser({ lastLoginAt: new Date("2026-05-04T08:00:00Z") });
    const vm = new UserViewModel(user, user);

    expect(vm.formattedLastLogin).toBe("Today");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T15:00:00Z"));

    const user = buildUser({ lastLoginAt: new Date("2026-05-03T08:00:00Z") });
    const vm = new UserViewModel(user, user);

    expect(vm.formattedLastLogin).toBe("Yesterday");
  });

  it("returns 'Never' when lastLoginAt is null", () => {
    const user = buildUser({ lastLoginAt: null });
    const vm = new UserViewModel(user, user);

    expect(vm.formattedLastLogin).toBe("Never");
  });
});

function buildUser(overrides: Partial<ConstructorParameters<typeof User>[0]>) {
  return new User({
    id: "user-1",
    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: null,
    role: "member",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastLoginAt: null,
    ...overrides,
  });
}
```

ViewModel formatting tests are well-suited to unit tests because relative date logic has many edge cases that would clutter the integration test.

### Repository unit test

```typescript
// src/features/user/__tests__/unit/UserRepository.test.ts
import { describe, it, expect, vi } from "vitest";
import { UserRepository } from "../../domain/UserRepository";
import { FakeUserDataSource } from "../fakes/FakeUserDataSource";
import { makeUserDto } from "../fakes/userDtoFactory";

describe("UserRepository caching", () => {
  // Regression test for bug #2207 — cache TTL was off-by-one
  // See user.integration.test.ts > "getUser caches subsequent fetches within TTL"
  it("returns cached entity within TTL window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));

    const dataSource = new FakeUserDataSource();
    dataSource.seed([makeUserDto({ id: "user-1" })]);
    const repo = new UserRepository(dataSource as never);

    await repo.findById("user-1");
    vi.setSystemTime(new Date("2026-05-04T12:00:59Z")); // 59s later — within 60s TTL
    await repo.findById("user-1");

    expect(dataSource.getCallCount("fetchUser")).toBe(1);
    vi.useRealTimers();
  });

  it("refetches after TTL expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));

    const dataSource = new FakeUserDataSource();
    dataSource.seed([makeUserDto({ id: "user-1" })]);
    const repo = new UserRepository(dataSource as never);

    await repo.findById("user-1");
    vi.setSystemTime(new Date("2026-05-04T12:01:01Z")); // 61s later — past 60s TTL
    await repo.findById("user-1");

    expect(dataSource.getCallCount("fetchUser")).toBe(2);
    vi.useRealTimers();
  });
});
```

Caching boundary tests are a good unit-test target because driving exact timing through the integration test requires the same `vi.useFakeTimers` setup but with more setup overhead.

### Presenter unit test

Presenter unit tests are rare. Most Presenter behavior is "set loading, await service, set loaded or error" — that's mechanical and well-covered by component tests (which drive state through `setStateForTest`). When you do need a Presenter unit test:

```typescript
// src/features/user/__tests__/unit/UserDetailPresenter.test.ts
import { describe, it, expect, vi } from "vitest";
import { UserDetailPresenter } from "../../presentation/UserDetailPresenter";

describe("UserDetailPresenter.onDestroyed", () => {
  // Regression test for bug #2401 — in-flight requests were not aborted
  // when the user navigated away mid-load
  it("aborts the in-flight loadUser request", async () => {
    const abortSpy = vi.fn();
    const service = {
      getUser: vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ),
    } as never;
    const presenter = new UserDetailPresenter(service);
    presenter.configure("user-1", buildCurrentUser());

    const originalAbortController = AbortController;
    globalThis.AbortController = class extends originalAbortController {
      abort() {
        abortSpy();
        super.abort();
      }
    } as never;

    void presenter.loadUser();
    presenter.onDestroyed();

    expect(abortSpy).toHaveBeenCalled();

    globalThis.AbortController = originalAbortController;
  });
});
```

(`buildCurrentUser` factory omitted for brevity — same pattern as Entity unit tests.)

This kind of test is justified because the integration test can't easily observe abort behavior — it's a side effect inside a single Presenter method.

## What unit tests should NOT cover

- **Happy paths already covered by integration tests.** Don't unit-test `UserService.getUser` returning a user — the integration test covers it. Adding a unit test here is duplicate coverage with no extra signal.
- **Trivial getters/setters.** `vm.id` returning `user.id` is too trivial to be worth a test.
- **Framework-mocked behavior.** Don't unit-test that `useEffect` calls `onMounted` — that's framework code, not yours.

## Why this discipline matters

A test suite is a liability as well as an asset. Every unit test:

- Slows down the suite (a little)
- Couples the test code to the implementation
- Has to be maintained when the code changes
- Risks giving false confidence ("100% coverage on this method!") for trivial cases

The two-tier strategy — integration as default, unit as exception — gives you most of the safety net of a comprehensive test suite without the maintenance cost of one.

## Decision tree

When you're about to write a test, walk through this:

1. Does the integration test for this feature already cover the case? → Don't write a new test.
2. Are you fixing a bug? → Write the integration test for the failing case first. Then decide if a unit test on the leaf adds documentation value.
3. Is this a leaf concern (entity invariant, formatter, parser)? → Unit test is fine.
4. Is this a multi-layer concern (use case, authorization, mapping)? → Integration test, not unit test.
5. Is this a UI concern (rendering, click handler)? → Component test with mocked Presenter.

If none of the above fit, lean toward the integration test by default.
