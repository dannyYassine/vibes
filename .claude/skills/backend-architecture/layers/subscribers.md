# Subscribers

## Rule

A subscriber registers interest in one or more events and handles them when the event bus fires. Subscribers can handle events synchronously (inline) or dispatch a Job to defer work to a queue. The subscriber itself is a delivery mechanism — its registered callbacks must parse event data, build a DTO, and call a usecase (or dispatch a job that will).

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

A subscriber may handle events inline or dispatch jobs:

```typescript
class OrderEventsSubscriber {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly queue: Queue,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
  ) {}

  subscribe(): void {
    eventBus.on(OrderPlacedEvent, async (event) => {
      // sync — inline audit log
      await this.auditLogService.log('order.placed', event.orderId);

      // async — dispatch job for payment processing
      await this.queue.dispatch(
        new ProcessPaymentOrderJob({ orderId: event.orderId, amount: event.amount })
      );
    });

    eventBus.on(OrderCancelledEvent, async (event) => {
      // handle synchronously via usecase
      const dto = new CancelOrderDto(event.orderId, event.reason);
      await this.cancelOrderUseCase.execute(dto);
    });
  }
}
```

Laravel equivalent — subscriber registered in `EventServiceProvider`:

```php
class OrderEventSubscriber
{
    public function __construct(
        private ProcessPaymentUseCase $processPaymentUseCase,
        private Queue $queue,
    ) {}

    public function handleOrderPlaced(OrderPlaced $event): void
    {
        $dto = new ProcessPaymentDto($event->orderId, $event->amount);
        $this->queue->dispatch(new ProcessPaymentOrderJob($dto));
    }

    public function handleOrderCancelled(OrderCancelled $event): void
    {
        $dto = new CancelOrderDto($event->orderId, $event->reason);
        $this->processPaymentUseCase->execute($dto);
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
3. Either call `usecase.execute(dto)` directly or dispatch a job
4. Return void

## Sync vs Async Decision

| Work type | Handle in subscriber | Dispatch as Job |
|---|---|---|
| Fast, critical side-effect (audit log, cache invalidation) | Inline — synchronous | No |
| Slow or non-critical work (email, report, webhook) | No | Dispatch a Job |
| Sequential chain (process payment → generate receipt → notify) | No | Dispatch a Job; the usecase called by the job dispatches the next |

## What a Subscriber Must NOT Do

- Return a value to the event bus
- Call repositories directly
- Call services directly (except within a usecase)
- Call helpers
- Contain business logic or conditional domain rules (beyond the sync/async routing decision)
- Listen for only one event (that is a listener; use `listeners.md`)

## Key Constraints

- **subscribe() registers handlers** — it does not handle events itself. The registered callbacks do.
- **One subscriber may handle multiple events** — unlike a listener (one event, one concern).
- **Subscriber may dispatch jobs** — this is the primary reason to use a subscriber over a listener.
- **No return value** — return `void`. The event bus expects no response.
- **Handler callbacks are delivery mechanisms** — each callback must parse → DTO → usecase.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Subscriber handling only one event | Use a listener instead (simpler contract) |
| `handleOrderPlaced` calling a repository directly | Route through a usecase |
| `handleOrderPlaced` with business logic (`if`/`else` on event data) | Move to usecase or service |
| Subscriber blocking on heavy sync work (email send, PDF generation) | Dispatch a job instead |
| Subscriber registering inline anonymous functions with DI-heavy callbacks | Extract named handler methods; keep `subscribe()` thin |
| Using a subscriber when synchronous-only is fine | Use a listener (simpler, no bus overhead) |