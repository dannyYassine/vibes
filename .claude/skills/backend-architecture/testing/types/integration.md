# Integration Testing

## Philosophy

The usecase is the entry point. Integration tests verify that a complete intent — from DTO input to DB state and side effects — works correctly with real dependencies.

Test the **intent**, not the implementation. Do not assert which internal methods were called; assert what changed in the system.

## Default: Stub Delivery Mechanisms

Integration tests default to stubbing events and jobs. The usecase and repositories are real, but listeners, subscribers, and background workers never execute. The test verifies dispatch happened — not what the downstream delivery mechanism does with it.

```php
describe('CreateUserUseCase', function () {
    beforeEach(function () {
        Event::fake();
        Bus::fake();
    });

    test('creates user and dispatches UserRegisteredEvent', function () {
        $usecase = $this->app->make(CreateUserUseCase::class);
        $dto = new CreateUserDto('jane@example.com', 'Jane', $roleId);

        $user = $usecase->execute($dto);

        expect($user->email)->toBe('jane@example.com');

        Event::assertDispatched(UserRegisteredEvent::class);
        Bus::assertDispatched(SendWelcomeEmailUserJob::class);
    });
});
```

Delivery mechanisms (listeners, subscribers, jobs) are tested independently. See `testing/delivery-mechanisms.md`.

## When Not to Stub

Some tests need real listeners or subscribers to execute — subscriber integration tests, event→listener wiring, or end-to-end pipeline verification. In those cases, skip `Event::fake()` / `Bus::fake()` and use the full bootstrap.

See `testing/test-bootstrap.md` and `testing/service-providers.md`.

## What to Assert

- Return value of `usecase.execute(dto)`
- Database state after execution (records created, updated, deleted)
- Events dispatched (assert the event class and data, no listener fires)
- Jobs queued (assert the job class and payload, no worker executes)

## Setup Pattern

```
seed DB with prerequisite data
  ↓
build a DTO
  ↓
call usecase.execute(dto)
  ↓
assert return value
assert DB state
assert events / jobs
```

## Rules

- **Stub events and jobs by default** — `Event::fake()` + `Bus::fake()` in `beforeEach`. Only skip when testing the delivery pipeline itself
- **Assert dispatch, not execution** — verify the event/job was dispatched with correct data. Do not verify what listeners or workers do with it (tested separately)
- **Do not mock the usecase** — the usecase IS the entry point
- **Do not mock internal services or repositories** — let the full flow run
- Use a real DB (test DB, in-memory DB, or transactional fixture)
- Reset/rollback DB state between tests
- One meaningful scenario per test; name it in plain English
- Test both happy paths and error paths (throws on duplicate email, etc.)

## Test Naming

Plain English describing what the intent does:

```
it('creates a user and sends a welcome email')
it('throws UserAlreadyExistsError when email is taken')
it('cancels an order and refunds the payment')
```
