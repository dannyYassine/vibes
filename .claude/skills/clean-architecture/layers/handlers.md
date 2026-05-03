# Handlers

## Rule

Handlers perform a single focused operation. Never DI-injected. Constructor takes plain variables only. Callable from any layer except delivery mechanisms.

## What a Handler Is

- A short-lived, per-call object that encapsulates one discrete operation
- Constructed at the point of use with plain data (strings, numbers, booleans)
- Not a shared collaborator — created, used, and discarded inline

## What a Handler Is Not

- Not DI-registered
- Not a service (services are long-lived shared collaborators)
- Not callable from controllers, commands, actions, listeners, or subscribers

## Constructor Contract

Constructor accepts only plain variables — no injected services, repositories, or external libs:

```typescript
class UserSendWelcomeEmailHandler {
  constructor(
    private readonly email: string,
    private readonly userName: string,
  ) {}

  async execute(): Promise<void> {
    // focused operation using only the plain vars provided
  }
}
```

## Calling a Handler

From a usecase or service:

```typescript
// Inside CreateUserUseCase.execute(dto)
const handler = new UserSendWelcomeEmailHandler(user.email, user.name);
await handler.execute();
```

Never in a controller:

```typescript
// WRONG — handler called from delivery mechanism
class UserController {
  handle(req) {
    const handler = new UserSendWelcomeEmailHandler(req.body.email, req.body.name);
    await handler.execute(); // violation
  }
}
```

## Naming

`{Module}{Action}Handler` — module first, ends with `Handler`:

| Handler | Does |
|---|---|
| `UserGetHomePageHandler` | Builds home page data for a user |
| `UserSendWelcomeEmailHandler` | Sends welcome email to a user |
| `OrderGeneratePdfHandler` | Generates a PDF for an order |
| `MediaResizeImageHandler` | Resizes an uploaded image |

## May Be Called From

- Usecases
- Core services
- Domain services
- Service-helpers

## May NOT Be Called From

- Controllers
- Commands
- Actions
- Listeners
- Subscribers

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Handler injected into DI container | Remove from container; construct inline with `new` |
| Handler called from a controller | Move the call into the usecase |
| Handler constructor receiving a service or repository | Extract needed data before constructing the handler; pass primitives only |
| Handler doing two unrelated things | Split into two handlers |
| Handler holding state across calls | Make it stateless; pass all data via constructor |
