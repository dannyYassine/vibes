# Vitest Setup & Conventions

**Path:** `vitest.config.ts` and supporting setup files

## Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false, // Always import { describe, it, expect } explicitly
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/features/**/*.ts", "src/features/**/*.tsx"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
      ],
      // No global threshold — coverage is a diagnostic, not a gate.
      // Service integration tests will naturally cover Repository/Service/Entity/ViewModel.
      // If a feature shows low coverage, it usually means missing integration tests, not missing unit tests.
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## Setup file

```typescript
// src/__tests__/setup.ts
import { afterEach } from "vitest";

// React Testing Library cleanup. Skip the import if the project doesn't use RTL.
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

For Vue projects, replace the React Testing Library cleanup with whatever cleanup the test utilities require (Vue Test Utils unmounts automatically when the test exits, but explicit cleanup of side effects like timers is still good practice).

## Project-wide conventions

### Test file naming

| Pattern | Purpose |
|---------|---------|
| `<feature>.integration.test.ts` | Service-level integration test (primary) |
| `<Feature>View.test.tsx` / `.ts` | Component test with mocked Presenter |
| `unit/<Layer>.test.ts` | Targeted unit test (bug fix or tricky logic) |

### Imports

- **No globals.** Set `globals: false` and import `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` from `"vitest"` in every file. This makes test files self-contained and refactor-friendly.
- **Use `@/` aliases for production code.** Match the path setup of the production app so imports look identical to source code.

### Faking time

Use Vitest's fake timers when:
- Testing TTL caching behavior
- Testing date-dependent ViewModel formatting (`formattedLastLogin`)
- Testing dormancy / staleness checks on entities

```typescript
import { vi, afterEach } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

it("does something with time", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));
  // ...
});
```

Always reset to real timers in `afterEach` — leaked fake timers cause hard-to-debug failures in unrelated tests.

### Async assertions

For Presenter actions that fire async work (Service calls), `await` the action:

```typescript
await service.changeRole(targetId, "admin", actor);
expect(setup.fakes.user.getCallCount("patchUser")).toBe(1);
```

For component tests where the Presenter is mocked, you usually don't need to await — `vi.fn()` records the call synchronously.

### Snapshot testing

Don't use snapshot tests for component output. They:
- Encourage broad assertions that catch unrelated changes
- Trade clarity ("what specifically broke?") for convenience
- Tend to be regenerated without scrutiny when they fail

Assert on specific roles, text, or attributes instead. The component test references show the patterns.

### Coverage

Aim for high coverage **as a side effect** of writing the right tests, not as a target. The two-tier strategy naturally produces:

| Layer | Coverage source |
|-------|-----------------|
| DataSource | Mocked — production code is light, fake provides equivalent coverage in tests |
| DTO | Type-only — no coverage relevant |
| Repository | Service integration tests |
| Entity | Service integration tests + occasional unit tests |
| Service | Service integration tests |
| Presenter | Component tests + occasional unit tests |
| ViewModel | Service integration tests + occasional unit tests for formatting |
| View | Component tests |

If a feature has comprehensive integration + component tests and still shows low coverage, that's a signal — usually a code path that the use cases never exercise (dead code) or a state branch the component test forgot.

## Folder structure summary

```
src/
├── features/
│   └── user/
│       ├── data/
│       ├── domain/
│       ├── presentation/
│       ├── userModule.ts
│       └── __tests__/
│           ├── user.integration.test.ts          # PRIMARY
│           ├── UserDetailView.test.tsx           # Component test
│           ├── fakes/
│           │   ├── FakeUserDataSource.ts
│           │   └── userDtoFactory.ts
│           └── unit/                              # Optional, bug fixes
│               ├── User.test.ts
│               ├── UserViewModel.test.ts
│               └── UserRepository.test.ts
└── __tests__/
    ├── setup.ts
    └── shared/
        ├── createTestContainer.ts                # DI for integration tests
        ├── createFakePresenter.ts                # Helper for component tests
        ├── renderWithContainer.tsx               # React-only
        └── mountWithContainer.ts                 # Vue-only
```

The structure mirrors the production layout — every feature owns its tests, and the `__tests__/shared/` folder holds cross-feature helpers (test container, render helpers).

## Running tests

```bash
# All tests
vitest

# Watch mode (default for vitest with no args)
vitest

# Run once and exit (CI mode)
vitest run

# Run only one feature's tests
vitest src/features/user

# Run only integration tests
vitest --testNamePattern="integration"

# Coverage report
vitest run --coverage
```

For CI, use `vitest run --coverage --reporter=verbose --reporter=junit --outputFile=junit.xml` to produce machine-readable output for your pipeline.
