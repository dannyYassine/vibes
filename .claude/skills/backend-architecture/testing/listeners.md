# Testing Listeners

**Test type: Integration (wiring)**

See `testing/types/integration.md` for the full philosophy.

## Rule

Listeners are delivery mechanisms — they parse event data, build a DTO, and call a usecase. The test must only verify the usecase was called with the correct DTO. No DB assertions, no event assertions, no business logic checks. Those belong in the usecase's integration tests.

Test that the real event dispatch reaches the listener and the listener calls its usecase. Bootstrap the full app so EventServiceProvider wiring is real. Swap the usecase with a mock/stub — everything else runs live.

This verifies the chain: `EventServiceProvider.$listen` → listener dispatched → `handle()` → `usecase.execute(dto)`.

## Mock Library

Use the project's mock/stub library — Mockery (PHP), jest.mock (TypeScript), unittest.mock (Python), etc. The language and framework determine the tool. The pattern is always the same: swap the usecase, assert `execute` was called with the correct DTO, assert nothing else.

## Pattern

```php
describe('UserRegisteredListener wiring', function () {
    beforeAll(function () {
        $this->app = Bootstrap::app();
    });

    beforeEach(function () {
        $this->listener = Mockery::mock(UserRegisteredListener::class);
        $this->listener->shouldReceive('handle')->once();
        $this->app->instance(UserRegisteredListener::class, $this->listener);
    });

    test('dispatches to UserRegisteredListener when UserRegisteredEvent fires', function () {
        $user = User::factory()->create();

        event(new UserRegisteredEvent($user));

        // If EventServiceProvider wiring is correct, listener.handle() was called
    });
});
```

Or swap the usecase inside the real listener instead of the whole listener:

```php
describe('UserRegisteredListener calls OnboardUserUseCase', function () {
    beforeAll(function () {
        $this->app = Bootstrap::app();
    });

    beforeEach(function () {
        $this->onboardUserUseCase = Mockery::mock(OnboardUserUseCase::class);
        $this->app->instance(OnboardUserUseCase::class, $this->onboardUserUseCase);
    });

    test('calls OnboardUserUseCase.execute with correct DTO', function () {
        $user = User::factory()->create(['email' => 'jane@example.com']);

        $this->onboardUserUseCase
            ->shouldReceive('execute')
            ->once()
            ->with(Mockery::on(function (OnboardUserDto $dto) use ($user) {
                return $dto->userId === $user->id
                    && $dto->email === 'jane@example.com';
            }));

        event(new UserRegisteredEvent($user));
    });
});
```

## When to Use This

| Test approach | When | Docs |
|---|---|---|
| **Functional** — call `listener.handle(event)` directly with mocked usecase | Testing the listener class in isolation (parsing, DTO construction) | `testing/delivery-mechanisms.md` |
| **Integration (wiring)** — fire real event, verify listener fires | Testing `EventServiceProvider` mapping and full dispatch pipeline | This file |

Write the functional test for listener logic. Add the integration wiring test at the module or app level to catch missing or incorrect `$listen` entries.

## What to Cover

- Every listener registered in `EventServiceProvider.$listen` maps to the correct event
- Listener receives the correct event data and builds the right DTO
- Listener calls its usecase exactly once

## Setup

- Use `Bootstrap::app()` — all providers registered, event maps live
- Swap only the listener or its usecase with a spy/mock
- Use real events — `event(new UserRegisteredEvent(...))` goes through the real bus
- Reset between tests (Laravel `Event::fake()` defeats the purpose — use spies instead)

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Calling `Event::fake()` in a wiring test | Use spies, not fakes — fakes prevent the real dispatch |
| Testing `EventServiceProvider` registration separately | Combine with the existing listener test — fire real event, verify |
| Testing every listener this way | Use for critical wiring only; functional tests cover behavior |
| Not resetting mocked instances between tests | `Mockery::close()` or `$this->app->instance()` fresh per test |