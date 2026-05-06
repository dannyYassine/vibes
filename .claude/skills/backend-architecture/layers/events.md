# Events

## Rule

Events capture something that already happened. Any layer may dispatch an event, but only at the source of truth — the exact point where the logic occurred. Events are picked up by listeners (sync) or subscribers (sync or async via queue).

## Naming

`ModuleVerbPastTenseEvent`:

- Ends with `Event`
- Starts with the module/domain name
- Verb in past tense

| Good | Bad |
|---|---|
| `UserRegisteredEvent` | `UserRegisterEvent` |
| `OrderPlacedEvent` | `PlaceOrderEvent` |
| `PaymentFailedEvent` | `PaymentFailEvent` |
| `PostPublishedEvent` | `PublishPostEvent` |
| `SubscriptionCancelledEvent` | `CancelSubscriptionEvent` |

## Dispatch Syntax

```typescript
UserRegisteredEvent::dispatch(user);
OrderPlacedEvent::dispatch(order);
PaymentFailedEvent::dispatch(payment, reason);
```

The event class carries the data. Dispatch is a static call at the point the logic completes.

## Event Class Structure

```typescript
class UserRegisteredEvent {
  constructor(
    public readonly user: User,
    public readonly occurredAt: Date = new Date(),
  ) {}

  static dispatch(user: User): void {
    eventBus.emit(new UserRegisteredEvent(user));
  }
}
```

## Where to Dispatch

Dispatch at the source of truth — the layer where the action definitively occurred:

| Scenario | Dispatch from |
|---|---|
| User registered via a usecase | End of `CreateUserUseCase.execute(dto)` |
| Order status changed via a domain method | End of the service that called `order.place()` |
| Payment processed via a service | End of `PaymentService.charge(...)` |

**Do not dispatch** from a delivery mechanism. The delivery mechanism does not own the logic — the usecase or service does.

## Consumers: Listeners vs Subscribers

| Consumer | Execution | Use when |
|---|---|---|
| Listener | Synchronous — runs inline in the same process/thread | Side-effect must complete before the caller continues |
| Subscriber | Sync or async — can be deferred via a Job/queue | Side-effect can be deferred or is non-critical to the caller |

A subscriber may dispatch a Job to handle the work asynchronously:

```typescript
class UserRegisteredSubscriber {
  subscribe(): void {
    eventBus.on(UserRegisteredEvent, async (event) => {
      // sync handling
      await this.auditLogService.log(event);

      // async — dispatch a job for non-critical work
      await queue.dispatch(new SendWelcomeEmailUserJob({ userId: event.user.id }));
    });
  }
}
```

## Key Constraints

- **Dispatch at the source of truth** — not in a delivery mechanism, not speculatively
- **Events are immutable** — data is set at construction; no mutation after dispatch
- **One event per logical occurrence** — do not dispatch the same event from multiple places for the same action
- **Listeners and subscribers do not return values** — they are fire-and-observe, not request-response
- **Event class carries only the data needed** — no services, no repositories as fields

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Dispatching from a controller | Move dispatch into the usecase or service |
| Event verb in present/future tense (`UserRegisterEvent`) | Use past tense: `UserRegisteredEvent` |
| Event that does not start with the module name | Prefix with module: `UserRegisteredEvent`, not `RegisteredEvent` |
| Listener doing heavy work synchronously | Dispatch a Job from the subscriber for async handling |
| Event carrying a service or repository reference | Carry only data (model fields or primitives) |
| Same event dispatched from both a usecase and a service for the same action | Pick one source of truth; remove the duplicate dispatch |
