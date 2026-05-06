# Delivery Mechanisms

## Rule

Delivery mechanisms are the system's entry points from a framework. They translate external input into a DTO, call a usecase, and format the response. They never contain business logic.

## Naming Convention

All delivery mechanism classes follow `{Action}{Module}{Type}` — module name always sits just before the type suffix. When the action already contains the module name, the module word appears twice:

- `CreateUser` + `User` + `Command` → `CreateUserUserCommand`
- `SendWelcomeEmail` + `User` + `Job` → `SendWelcomeEmailUserJob`
- `User` + `Controller` → `UserController` (no action prefix for controllers)

## The Five Types

| Type | Trigger | Example |
|---|---|---|
| Controller | HTTP request | `UserController.create(req, res)` |
| Command | CLI invocation | `CreateUserUserCommand.handle(argv)` |
| Job | Dispatched to a queue; picked up by a worker | `SendWelcomeEmailUserJob.handle(job)` |
| Listener | Synchronous domain event | `UserRegisteredListener.handle(event)` |
| Subscriber | Event bus / message broker | `OrderEventsSubscriber.subscribe()` |

## Jobs

A Job is dispatched (by a usecase or service) and picked up asynchronously by a queue worker. Each Job class has exactly one usecase. The job payload carries the data needed to build the DTO.

Dispatching a job from a usecase:

```typescript
// Inside CreateUserUseCase.execute(dto)
await queue.dispatch(new SendWelcomeEmailUserJob({ userId: user.id }));
```

The Job class itself (the worker side) is the delivery mechanism:

```typescript
class SendWelcomeEmailUserJob {
  constructor(private readonly sendWelcomeEmailUseCase: SendWelcomeEmailUseCase) {}

  async handle(job: Job): Promise<void> {
    const dto = new SendWelcomeEmailDto(job.data.userId);
    await this.sendWelcomeEmailUseCase.execute(dto);
  }
}
```

## What Every Delivery Mechanism Does

1. Parse and validate raw input (HTTP body, CLI args, job payload, event data)
2. Build a DTO from validated input
3. Resolve the usecase from DI (via constructor injection)
4. Call `usecase.execute(dto)`
5. Transform the result into the appropriate output format (HTTP response, exit code, ACK)

## What Delivery Mechanisms Must NOT Do

- Call repositories directly
- Call services directly
- Call helpers
- Instantiate models
- Contain business logic or conditional domain rules

## Skeletons

### Controller

```typescript
class UserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  async create(req: Request, res: Response): Promise<void> {
    const validated = validateCreateUserBody(req.body); // throws on invalid
    const dto = new CreateUserDto(validated.email, validated.name, validated.roleId);
    const user = await this.createUserUseCase.execute(dto);
    res.status(201).json({ id: user.id });
  }
}
```

### Command (CLI)

```typescript
class CreateUserUserCommand {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  async handle(argv: ParsedArgs): Promise<void> {
    const dto = new CreateUserDto(argv.email, argv.name, argv.roleId);
    await this.createUserUseCase.execute(dto);
    console.log('User created.');
  }
}
```

### Job (Queue Worker)

```typescript
class SendWelcomeEmailUserJob {
  constructor(private readonly sendWelcomeEmailUseCase: SendWelcomeEmailUseCase) {}

  async handle(job: Job): Promise<void> {
    const dto = new SendWelcomeEmailDto(job.data.userId);
    await this.sendWelcomeEmailUseCase.execute(dto);
  }
}
```

### Listener (Sync Event)

```typescript
class UserCreatedListener {
  constructor(private readonly onboardUserUseCase: OnboardUserUseCase) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const dto = new OnboardUserDto(event.userId, event.email);
    await this.onboardUserUseCase.execute(dto);
  }
}
```

### Subscriber (Event Bus)

```typescript
class OrderEventsSubscriber {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  subscribe(): void {
    eventBus.on('order.placed', async (event) => {
      const dto = new ProcessPaymentDto(event.orderId, event.amount);
      await this.processPaymentUseCase.execute(dto);
    });

    eventBus.on('order.cancelled', async (event) => {
      const dto = new CancelOrderDto(event.orderId, event.reason);
      await this.cancelOrderUseCase.execute(dto);
    });
  }
}
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Controller calling a repository | Route through a usecase |
| Controller calling a service directly | Route through a usecase |
| Controller with `if/else` business logic | Move to usecase or service |
| Controller calling multiple unrelated usecases | Each controller action should call one usecase |
| Job with multiple usecases | One job = one usecase; split into separate jobs |
| Delivery mechanism constructing a model | Build a DTO; the usecase creates models |
| Delivery mechanism calling a handler | Move handler invocation into the usecase |
