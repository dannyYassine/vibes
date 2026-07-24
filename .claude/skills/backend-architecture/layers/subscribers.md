# Subscribers

## Rule

A subscriber registers interest in one or more events and handles them when the event bus fires. Subscribers handle events synchronously (inline). The subscriber itself is a delivery mechanism — its registered callbacks must parse event data, build a DTO, and call a usecase. If the usecase needs to defer work, it dispatches a job internally — the subscriber does not touch the queue.

Subscribers are fire-and-observe. They return void.

## Naming

`ModuleEventsSubscriber` or `ModuleVerbPastTenseSubscriber`:

- Ends with `Subscriber`
- Describes the events or the module it subscribes to

| Good | Bad |
|---|---|
| `OrderEventsSubscriber` | `OrderSubscriber` (too vague) |
| `UserRegisteredSubscriber` | `UserSubscriber` (does not identify the event) |
| `PaymentEventsSubscriber` | `PaymentListener` (misleading — subscriber != listener) |

## Class Structure

A subscriber may handle one or more events, all synchronously via usecases:

```typescript
class OrderEventsSubscriber {
  constructor(
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  subscribe(): void {
    eventBus.on(OrderPlacedEvent, async (event) => {
      const dto = new ProcessPaymentDto(event.orderId, event.amount);
      await this.processPaymentUseCase.execute(dto);
    });

    eventBus.on(OrderCancelledEvent, async (event) => {
      const dto = new CancelOrderDto(event.orderId, event.reason);
      await this.cancelOrderUseCase.execute(dto);
    });
  }
}
```

If async work is needed, the usecase called by the subscriber handles it — the subscriber only routes data to the correct usecase.

Laravel equivalent — subscriber registered in `EventServiceProvider`:

```php
class OrderEventSubscriber
{
    public function __construct(
        private ProcessPaymentUseCase $processPaymentUseCase,
        private CancelOrderUseCase $cancelOrderUseCase,
    ) {}

    public function handleOrderPlaced(OrderPlaced $event): void
    {
        $dto = new ProcessPaymentDto($event->orderId, $event->amount);
        $this->processPaymentUseCase->execute($dto);
    }

    public function handleOrderCancelled(OrderCancelled $event): void
    {
        $dto = new CancelOrderDto($event->orderId, $event->reason);
        $this->cancelOrderUseCase->execute($dto);
    }

    public function subscribe(Dispatcher $events): array
    {
        return [
            OrderPlacedEvent::class => 'handleOrderPlaced',
            OrderCancelledEvent::class => 'handleOrderCancelled',
        ];
    }
}
```

Registration in `EventServiceProvider`:

```php
protected $subscribe = [
    OrderEventSubscriber::class,
];
```

## What a Subscriber Does

1. Register callbacks on the event bus via `subscribe()`
2. When an event fires: extract data, build a DTO
3. Only calls `usecase.execute(dto)`
4. Return void

## Sync vs Async Decision

| Work type | How |
|---|---|
| Fast, critical side-effect (audit log, cache invalidation) | Subscriber calls usecase inline — usecase handles it synchronously |
| Slow or non-critical work (email, report, webhook) | Subscriber calls usecase inline — usecase dispatches a job internally |
| Sequential chain (process payment → generate receipt → notify) | Subscriber calls usecase inline — usecase dispatches a job, which calls another usecase, and so on |

## What a Subscriber Must NOT Do

- Return a value to the event bus
- Call repositories directly
- Call services directly (except within a usecase)
- Call helpers
- Contain business logic or conditional domain rules
- Dispatch jobs directly — the usecase handles that
- Listen for only one event (that is a listener; use `listeners.md`)

## Key Constraints

- **subscribe() registers handlers** — it does not handle events itself. The registered callbacks do.
- **One subscriber may handle multiple events** — unlike a listener (one event, one concern).
- **Subscriber never dispatches jobs** — it calls a usecase. If the work is async, the usecase dispatches the job.
- **No return value** — return `void`. The event bus expects no response.
- **Handler callbacks are delivery mechanisms** — each callback must parse → DTO → usecase.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Subscriber handling only one event | Use a listener instead (simpler contract) |
| `handleOrderPlaced` calling a repository directly | Route through a usecase |
| `handleOrderPlaced` with business logic (`if`/`else` on event data) | Move to usecase or service |
| Subscriber dispatching a job directly | Call a usecase instead — the usecase dispatches jobs if needed |
| Subscriber blocking on heavy sync work (email send, PDF generation) | The usecase it calls should dispatch a job for the heavy work |
| Subscriber registering inline anonymous functions with DI-heavy callbacks | Extract named handler methods; keep `subscribe()` thin |
| Using a subscriber when synchronous-only is fine | Use a listener (simpler, no bus overhead) |

## Testing

Two levels:

- **Functional** — call subscriber handler directly, mock the usecase. Tests DTO construction and routing logic. See `testing/delivery-mechanisms.md`.
- **Integration (wiring)** — bootstrap the app, fire the real event, verify the subscriber's usecase was called. Tests the `EventServiceProvider.$subscribe` mapping. See `testing/subscribers.md`.
