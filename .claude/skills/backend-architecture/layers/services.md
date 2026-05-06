# Services

## Rule

Services encapsulate business logic. All service sub-types are DI-injected. Services never call usecases or interact with the delivery layer.

## Three Sub-Types

### 1. Domain Service

Shareable business logic used by multiple other services.

- Use when the same logic would otherwise be duplicated across services
- Has no corresponding helper
- Named: `NounDomainService`

```typescript
class PricingDomainService {
  constructor(private readonly taxRepository: TaxRepository) {}

  calculateTotal(basePrice: number, regionCode: string): Money {
    const taxRate = await this.taxRepository.findByRegion(regionCode);
    return new Money(basePrice * (1 + taxRate.rate));
  }
}
// Used by both OrderService and QuoteService
```

### 2. Core Service

Standard inner service. The default type when no qualifier is needed. Used directly by usecases and/or other services.

- Named: `NounService`

```typescript
class NotificationService {
  constructor(
    private readonly emailHandler: EmailHandler,
    private readonly userRepository: UserRepository,
  ) {}

  async sendWelcome(user: User): Promise<void> {
    const handler = new SendWelcomeEmailHandler(user.email, user.name);
    await handler.execute();
  }
}
```

### 3. Service-Helper

One-to-one pair with a Helper class. Applies business logic to the helper's raw output. **The only class that may call its paired Helper.**

- Named to mirror the helper: `GithubReadHelper` → `GithubReadService` (or `GithubReadServiceHelper` — keep naming consistent per project)
- The service-helper is the only caller of its paired helper — no other class touches the helper directly

```typescript
// GithubReadHelper — thin wrapper, no business logic
class GithubReadHelper {
  fetchRepoData(owner: string, repo: string): RawGithubRepo { ... }
}

// GithubReadService — service-helper, applies business logic
class GithubReadService {
  constructor(private readonly helper: GithubReadHelper) {}

  async getActiveRepos(org: string): Promise<Repo[]> {
    const raw = this.helper.fetchRepoData(org, '*');
    return raw.filter(r => !r.archived).map(r => Repo.fromRaw(r));
  }
}
```

## All Services: Allowed Calls

- Other services (any sub-type)
- Repositories
- Factories
- Handlers (via `new Handler(plainVars)`)
- Models (construction and domain methods)

## All Services: Forbidden Calls

- Usecases
- Delivery-layer concerns (HTTP, CLI, event emission)
- Helpers — except service-helpers calling their own paired helper

## DI Registration

All services registered as singletons:

```typescript
container.bind(NotificationService).toSelf().inSingletonScope();
container.bind(GithubReadService).toSelf().inSingletonScope();
container.bind(PricingDomainService).toSelf().inSingletonScope();
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Service calling a usecase | Never — reverse the dependency or introduce an event |
| Service calling a helper it doesn't own | Route through the helper's paired service-helper |
| Service acting as a controller (accepts request objects) | Move delivery concerns to the delivery mechanism |
| God service with many unrelated responsibilities | Split into focused services or extract a domain service |
| Service-helper not mirroring its helper 1:1 | Keep the pairing strict — one service-helper per helper |
