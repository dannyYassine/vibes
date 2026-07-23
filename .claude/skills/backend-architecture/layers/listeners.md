# Listeners

## Rule

A listener is a **synchronous delivery mechanism** triggered by a domain event. It runs inline in the same process/thread. Listener `handle(event)` must parse event data, build a DTO, and call a usecase. No business logic, no return value.

Listeners are fire-and-observe — the caller does not expect a response.

## Naming

`ModuleVerbPastTenseEvent` → `ModuleVerbPastTenseListener`:

- Ends with `Listener`
- Matches the event name (event's `ModuleVerbPastTense` + `Listener`)

| Event | Listener |
|---|---|
| `UserRegisteredEvent` | `UserRegisteredListener` |
| `OrderPlacedEvent` | `OrderPlacedListener` |
| `PaymentFailedEvent` | `PaymentFailedListener` |

## Class Structure

```typescript
class UserRegisteredListener {
  constructor(
    private readonly onboardUserUseCase: OnboardUserUseCase,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const dto = new OnboardUserDto(event.user.id, event.user.email);
    await this.onboardUserUseCase.execute(dto);
  }
}
```

Laravel equivalent — listener class registered in `EventServiceProvider`:

```php
class UserRegisteredListener
{
    public function __construct(
        private OnboardUserUseCase $onboardUserUseCase,
    ) {}

    public function handle(UserRegistered $event): void
    {
        $dto = new OnboardUserDto(
            $event->user->id,
            $event->user->email
        );
        $this->onboardUserUseCase->execute($dto);
    }
}
```

Registration in `EventServiceProvider`:

```php
protected $listen = [
    UserRegisteredEvent::class => [
        UserRegisteredListener::class,
    ],
];
```

## What a Listener Does

1. Receive the event object
2. Extract data from the event
3. Build a DTO
4. Call `usecase.execute(dto)`
5. Return void — no response

## What a Listener Must NOT Do

- Return a value to the caller
- Call repositories directly
- Call services directly
- Call helpers
- Contain business logic or conditional domain rules
- Dispatch events (the event is the trigger, not the outcome)
- Dispatch jobs directly (use a subscriber for async work — see `subscribers.md`)

## Key Constraints

- **Synchronous only** — the caller waits. Heavy work blocks the response. Use a subscriber + job for deferred work.
- **One event = one listener concern** — a listener handles exactly one event and calls exactly one usecase. If multiple side-effects are needed, chain through a usecase or split into separate listeners.
- **No return value** — return `void`. The caller does not consume a result.
- **Listener never dispatches a job** — a listener is synchronous. If async is needed, use a subscriber.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| `handle` calling a repository directly | Route through a usecase |
| `handle` with business logic (`if/else`, validation) | Move to usecase or service |
| Listener dispatching a job | Move to a subscriber, which may dispatch jobs |
| Listener returning data to the caller | Return void; use a usecase if a result is needed |
| Heavy synchronous work in listener (email, report generation) | Use a subscriber that dispatches a job |
| One listener handling multiple events | Split into one listener per event |