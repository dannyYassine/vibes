# Container (Dependency Injection Registry)

## Rule

The container is the single registry of all long-lived, injectable classes. Every layer participates in DI — **except handlers**, which are always instantiated with `new Handler(plainVars)` at the call site.

## DI Participation by Layer

| Layer | DI Role | Notes |
|---|---|---|
| Usecases | Registered + injected | Transient by default |
| Core services | Registered + injected | Singleton |
| Domain services | Registered + injected | Singleton |
| Service-helpers | Registered + injected | Singleton; paired Helper is NOT registered |
| Repositories | Registered + injected | Singleton |
| Factories | Registered + injected | Singleton |
| Delivery mechanisms | Receives injections | Framework-managed; usecases injected into constructor |
| Helpers | Not registered | Stateless; called directly by their paired service-helper |
| Models | Not registered | Domain objects; instantiated with `new` or `fromDatabase` |
| DTOs | Not registered | Plain data; built inline by delivery mechanisms |
| **Handlers** | **Never uses DI** | Always `new Handler(plainVars)` — no injection, ever |

## Lifetimes

| Type | Lifetime | Reason |
|---|---|---|
| Repositories | Singleton | Shared, stateless DB adapter |
| Services (all sub-types) | Singleton | Shared, stateless collaborators |
| Factories | Singleton | Shared, stateless builders |
| Usecases | Transient (or singleton if stateless) | Per-request safety; use singleton only if confirmed stateless |

## Binding Pattern

Bind interface to concrete implementation:

```typescript
// Repository — interface to implementation
container.bind<UserRepository>('UserRepository')
  .to(OrmUserRepository)
  .inSingletonScope();

// Service
container.bind(NotificationService)
  .toSelf()
  .inSingletonScope();

// Service-helper (paired with its helper; helper itself is NOT registered)
container.bind(GithubReadService)
  .toSelf()
  .inSingletonScope();

// Factory
container.bind(OrderFactory)
  .toSelf()
  .inSingletonScope();

// Usecase — transient by default
container.bind(CreateUserUseCase)
  .toSelf()
  .inTransientScope();
```

## Resolution in Delivery Mechanisms

Delivery mechanisms receive usecases via constructor injection (the framework or container resolves them):

```typescript
class UserController {
  constructor(
    @inject(CreateUserUseCase) private readonly createUser: CreateUserUseCase,
    @inject(GetUserUseCase) private readonly getUser: GetUserUseCase,
  ) {}
}
```

## Circular Dependencies

Circular deps indicate a design flaw. Break them by:
1. Extracting shared logic into a domain service
2. Introducing an event (usecase emits, listener handles)
3. Inverting the dependency via an interface

Never solve circular deps by using lazy injection or property injection as a workaround without fixing the root design issue.

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Registering a handler | Construct with `new Handler(plainVars)` at call site |
| Registering a helper | Helpers are stateless; called directly by their service-helper |
| Registering a model | Models are domain objects, not services |
| Delivery mechanism using container as service locator (`container.get(Repo)`) | Inject dependencies via constructor |
| Using property injection instead of constructor injection | Fix the circular dependency; use constructor injection |
| Registering everything as singleton without checking for state | Verify statelessness; use transient for stateful objects |
