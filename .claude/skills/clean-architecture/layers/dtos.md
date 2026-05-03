# DTOs (Data Transfer Objects)

## Rule

DTOs are plain data containers built by delivery mechanisms and passed as the sole argument to `usecase.execute(dto)`.

## What a DTO Is

- Plain data object — fields only, no methods, no business logic
- Carries validated input from delivery layer into the usecase
- Represents the "what the user is asking for" in structured form

## What a DTO Is Not

- Not a model (no domain methods, no `fromDatabase`)
- Not a request/response object (no HTTP concerns)
- Not DI-registered (never in the container)

## Construction

Built inline inside the delivery mechanism after input validation:

```typescript
// In a controller
const dto = new CreateUserDto(request.body.email, request.body.name);
await this.createUserUseCase.execute(dto);
```

Delivery mechanism validates raw input BEFORE constructing the DTO. Once constructed, the DTO is trusted by the usecase — no re-validation needed.

## Naming

`VerbNounDto` — matches the usecase name:

| Usecase | DTO |
|---|---|
| `CreateUserUseCase` | `CreateUserDto` |
| `CancelOrderUseCase` | `CancelOrderDto` |
| `PublishPostUseCase` | `PublishPostDto` |

## Fields

Primitives and nested plain objects only:

```typescript
class CreateUserDto {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly roleId: number,
  ) {}
}
```

Never include: model instances, service references, repository references, or request objects.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| DTO with domain methods (`dto.validate()`) | Move validation to delivery mechanism before DTO construction |
| DTO containing a model instance | Use the model's fields as primitives in the DTO |
| DTO with a service reference | Never — DTOs are data only |
| Usecase mutating a shared DTO object | DTOs should be treated as immutable after creation |
| Delivery mechanism skipping the DTO (passes raw request to usecase) | Always build a DTO; usecases never receive request objects |
