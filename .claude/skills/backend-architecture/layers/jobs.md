# Jobs

## Rule

A Job represents deferred work dispatched to a queue and consumed asynchronously by a worker. Jobs have a dual nature:

- **Dispatch side**: Any layer may dispatch a job at the source of truth — the point where the work is definitively needed. A job can be dispatched within its own module.
- **Consumer side** (`handle`): Always a delivery mechanism. The worker re-enters the application, so it must parse the payload, build a DTO, and call a usecase. No business logic in `handle`.

## Naming

`ActionModuleJob`:

- Ends with `Job`
- Starts with the action
- Module name between action and `Job`

| Good | Bad |
|---|---|
| `SendWelcomeEmailUserJob` | `SendWelcomeEmailJob` (missing module) |
| `ProcessPaymentOrderJob` | `OrderPaymentProcessJob` (wrong order) |
| `GenerateReportAnalyticsJob` | `AnalyticsReportGenerateJob` (wrong order) |

## Job Class Structure

The job class lives in its own module. Constructor and handle serve different roles:

- **Constructor**: Receives only serializable job data (payload). Called at dispatch time to instantiate the job before queuing.
- **Handle**: Receives injected dependencies (usecases, services). Called later by the runtime worker when the job is dequeued and executed. Dependencies are wired through the framework's DI container at execution time.

```typescript
// Module: user
// File: jobs/SendWelcomeEmailUserJob.ts

class SendWelcomeEmailUserJob {
  constructor(
    public readonly data: { userId: string },
  ) {}

  async handle(usecase: SendWelcomeEmailUseCase): Promise<void> {
    const dto = new SendWelcomeEmailDto(this.data.userId);
    await usecase.execute(dto);
  }
}
```

## Dispatch Side — Where to Dispatch

A job can be dispatched from any layer, but only at the source of truth for that work:

| Layer | Dispatch from | Example |
|---|---|---|
| Usecase | End of `execute(dto)` — after primary work completes | `CreateUserUseCase` dispatches `SendWelcomeEmailUserJob` after user is persisted |
| Service | After domain logic completes | `PaymentService` dispatches `GenerateReceiptOrderJob` after charging |
| Subscriber | Inside event handler, for deferred side-effects | `UserRegisteredSubscriber` dispatches `SendWelcomeEmailUserJob` |
| Another job | At the end of `handle` — chain jobs sequentially | `ProcessPaymentOrderJob` dispatches `GenerateReceiptOrderJob` after payment succeeds |

Dispatch happens via a queue abstraction (injected or imported):

```typescript
// Inside CreateUserUseCase.execute(dto)
await this.queue.dispatch(new SendWelcomeEmailUserJob({ userId: user.id }));
```

## Dispatching Within the Same Module

A job may be dispatched within its own module (e.g., `UserModule` dispatches `UserModule` jobs). This is valid when:

- The trigger (usecase, service, subscriber) and the job belong to the same module
- The job represents deferred work scoped to that module's domain
- The dispatch still occurs at the source of truth

```typescript
// Both live in the User module
class CreateUserUseCase {
  async execute(dto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(dto);
    // Same module — dispatching a User job from a User usecase
    await this.queue.dispatch(new SendWelcomeEmailUserJob({ userId: user.id }));
    return user;
  }
}
```

Cross-module dispatch is also valid:

```typescript
// Subscribe to User events inside the Analytics module
class UserRegisteredSubscriber {
  subscribe(): void {
    eventBus.on(UserRegisteredEvent, async (event) => {
      // Cross-module — Analytics dispatches a User job
      await this.queue.dispatch(new GenerateReportAnalyticsJob({ userId: event.user.id }));
    });
  }
}
```

## Consumer Side — Handle Is a Delivery Mechanism

The `handle` method is a delivery mechanism. It follows the same rules as controllers and commands:

1. Parse and validate raw input (`job.data`)
2. Build a DTO from validated input
3. Call `usecase.execute(dto)`
4. Acknowledge the job (framework handles this)

Jobs must never:

- Call repositories directly
- Call services directly
- Call helpers
- Contain business logic or conditional domain rules

```typescript
// Correct — handle is thin, delegates to usecase
class SendWelcomeEmailUserJob {
  constructor(public readonly data: { userId: string }) {}

  async handle(usecase: SendWelcomeEmailUseCase): Promise<void> {
    const dto = new SendWelcomeEmailDto(this.data.userId);
    await usecase.execute(dto);
  }
}

// Wrong — business logic in handle
class SendWelcomeEmailUserJob {
  constructor(public readonly data: { userId: string }) {}

  async handle(): Promise<void> {
    const user = await this.userRepository.findById(this.data.userId); // NO
    if (user.emailVerified) { // NO — business logic
      await this.emailService.send(user.email); // NO — calling service directly
    }
  }
}
```

## Key Constraints

- **One job = one usecase** — a job's `handle` must call exactly one usecase. Split into separate jobs for multiple concerns.
- **Payload carries only primitives or IDs** — no models, no services, no repositories as fields.
- **Job must be serializable** — the dispatched object (or its payload) must survive serialization/deserialization through the queue.
- **Dispatch at the source of truth** — not speculatively, not from a delivery mechanism.
- **Handle never dispatches** — the job consumer is a delivery mechanism; if chaining is needed, the usecase called by `handle` may dispatch the next job.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| `handle` calling a repository directly | Route through a usecase |
| `handle` calling a service directly | Route through a usecase |
| `handle` with `if/else` business logic | Move to usecase or service |
| Job with multiple usecases | One job = one usecase; split into separate jobs |
| Dispatching a job from a controller | Move dispatch into the usecase or service |
| Non-serializable payload (model instances, DB refs) | Use IDs and primitives only |
| Same job dispatched from multiple layers for the same reason | Pick one source of truth; remove duplicates |
| Job calling another job's `handle` directly | Use the queue to dispatch |
