# Usecases

## Rule

One usecase = one user intent. Receives a DTO, orchestrates services and repositories, returns a result.

## What a Usecase Does

- Represents a single, named user action
- Coordinates services, repositories, factories, and handlers to fulfil that action
- Translates domain results into return values for the delivery layer

## What a Usecase Does Not Do

- Does not contain raw SQL or database queries
- Does not call other usecases
- Does not call helpers directly (call a service that internally uses a service-helper)
- Does not interact with delivery-layer concerns (HTTP, CLI, events)
- Does not hold state between calls

## Signature

Single `execute(dto)` method:

```typescript
class CreateUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly userFactory: UserFactory,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new UserAlreadyExistsError(dto.email);

    const user = this.userFactory.create(dto.email, dto.name, dto.roleId);
    await this.userRepository.save(user);

    await this.userService.sendWelcomeNotification(user);
    return user;
  }
}
```

## Naming

`{Action}{Module}UseCase` — module sits just before `UseCase`. When the action already contains the module name, the module word appears twice (e.g. `CreateUserUserUseCase`). Paired DTO follows the same pattern:

| Usecase | DTO |
|---|---|
| `GetUserUseCase` | `GetUserDto` |
| `CreateUserUseCase` | `CreateUserDto` |
| `CancelOrderUseCase` | `CancelOrderDto` |
| `PublishPostUseCase` | `PublishPostDto` |

## May Call

- Services (core, domain, service-helpers) — via DI
- Repositories — via DI
- Factories — via DI
- Handlers — via `new VerbNounHandler(plainVar)`

## DI Registration

Always registered in the DI container. Injected into delivery mechanisms (controllers, commands, etc.):

```typescript
container.bind(CreateUserUseCase).toSelf().inTransientScope();
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Usecase calling another usecase | Extract shared logic into a service |
| Usecase with multiple unrelated operations | Split into two usecases |
| Usecase containing raw SQL | Move to repository |
| Usecase calling a helper directly | Call a service that uses a service-helper internally |
| Usecase accepting a raw request object | Build a DTO in the delivery mechanism first |
| Usecase holding instance state | Make it stateless; pass everything via `execute(dto)` |
