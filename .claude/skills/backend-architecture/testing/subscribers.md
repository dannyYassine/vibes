# Testing Subscribers

**Test type: Integration (wiring)**

See `testing/types/integration.md` for the full philosophy.

## Rule

Subscribers are delivery mechanisms — they receive an event, parse data, and calls a usecase. The test must only verify the usecase was called with the correct data. No DB assertions, no event assertions, no business logic checks. Those belong in the usecase's integration tests.

Test that the real event dispatch reaches the subscriber and the subscriber's handler calls its usecase (or dispatches its job) with the correct data. Bootstrap the full app so EventServiceProvider wiring is real. Swap the usecase with a mock/stub — everything else runs live.

This verifies the chain: `EventServiceProvider.$subscribe` → subscriber registered → event fires → handler runs → `usecase.execute(dto)` or `queue.dispatch(job)`.

## Mock Library

Use the project's mock/stub library — Mockery (PHP), jest.mock (TypeScript), unittest.mock (Python), etc. The language and framework determine the tool. The pattern is always the same: swap the usecase, assert `execute` was called with the correct DTO, assert nothing else. For job-dispatching subscribers, swap the queue and assert `dispatch` was called with the correct job payload.

## Pattern

### Subscriber calls a usecase

```php
describe('OrderEventSubscriber calls CancelOrderUseCase', function () {
    beforeAll(function () {
        $this->app = Bootstrap::app();
    });

    beforeEach(function () {
        $this->cancelOrderUseCase = Mockery::mock(CancelOrderUseCase::class);
        $this->app->instance(CancelOrderUseCase::class, $this->cancelOrderUseCase);
    });

    test('calls CancelOrderUseCase when OrderCancelledEvent fires', function () {
        $order = Order::factory()->create();

        $this->cancelOrderUseCase
            ->shouldReceive('execute')
            ->once()
            ->with(Mockery::on(function (CancelOrderDto $dto) use ($order) {
                return $dto->orderId === $order->id;
            }));

        event(new OrderCancelledEvent($order));
    });
});
```

### Subscriber dispatches a job

```php
describe('OrderEventSubscriber dispatches ProcessPaymentOrderJob', function () {
    beforeAll(function () {
        $this->app = Bootstrap::app();
    });

    beforeEach(function () {
        Bus::fake();
    });

    test('dispatches ProcessPaymentOrderJob when OrderPlacedEvent fires', function () {
        $order = Order::factory()->create(['amount' => 100]);

        event(new OrderPlacedEvent($order));

        Bus::assertDispatched(ProcessPaymentOrderJob::class, function ($job) use ($order) {
            return $job->orderId === $order->id
                && $job->amount === 100;
        });
    });
});
```

Here `Bus::fake()` is acceptable — the test verifies the subscriber's routing logic (event X → job Y with correct payload), not what the job does. The job is tested independently.

## When to Use This

| Test approach | When | Docs |
|---|---|---|
| **Functional** — call subscriber handler directly with mocked usecase/queue | Testing the handler method in isolation (parsing, routing) | `testing/delivery-mechanisms.md` |
| **Integration (wiring)** — fire real event, verify subscriber fires | Testing `EventServiceProvider` subscription and full dispatch pipeline | This file |

Write functional tests for subscriber handler logic. Add integration wiring tests at the module or app level to catch missing `$subscribe` entries and incorrect event-to-handler mapping.

## What to Cover

- Every subscriber registered in `EventServiceProvider.$subscribe` is loaded
- Each event triggers the correct handler method
- Handler passes the correct data to the usecase or dispatches the correct job payload

## Setup

- Use `Bootstrap::app()` — all providers registered, event maps live
- Swap usecases with mocks/spies to verify they are called
- Use `Bus::fake()` when verifying job dispatch — the subscriber's routing is the concern, not job execution
- Use real events — `event(new OrderPlacedEvent(...))` goes through the real bus

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Calling `Event::fake()` in a wiring test | Use spies or Bus::fake() — fakes prevent real dispatch to subscriber |
| Testing every handler method through wiring integration | Functional tests cover parsing; wiring tests cover routing |
| Not resetting mocked instances between tests | `Mockery::close()` or fresh `$this->app->instance()` per test |
| Asserting job execution details in wiring test | `Bus::fake()` + `assertDispatched` — verify routing, not execution |