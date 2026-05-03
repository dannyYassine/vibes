# Models

## Rule

Models represent domain entities. Two construction paths: `new Model(...)` for creation, `Model.fromDatabase(row)` for hydration from storage.

## What a Model Is

- A domain entity with its own invariants and behaviour
- The subject of persistence, not the mechanism
- May contain domain-level methods (e.g. `order.cancel()`, `user.isActive()`)

## What a Model Is Not

- Not a repository (no queries)
- Not a service (no injected dependencies)
- Not a DTO (not for carrying input between layers)

## Two Construction Paths

### Creation path — for new entities

Called from a factory (complex) or directly from a usecase/service (simple):

```typescript
const user = new User(
  generateId(),
  dto.email,
  dto.name,
  UserStatus.Active,
  new Date(),
);
```

### Hydration path — for DB-fetched entities

Static factory method on the model itself, called only from repositories:

```typescript
class User {
  static fromDatabase(row: UserRow): User {
    return new User(
      row.id,
      row.email,
      row.name,
      row.status as UserStatus,
      new Date(row.created_at),
    );
  }
}
```

## Domain Methods

Models may contain domain behaviour:

```typescript
class Order {
  cancel(): void {
    if (this.status === OrderStatus.Shipped) {
      throw new OrderAlreadyShippedError(this.id);
    }
    this.status = OrderStatus.Cancelled;
  }

  get total(): Money {
    return this.lines.reduce((sum, line) => sum.add(line.subtotal), Money.zero());
  }
}
```

## What Models Must NOT Do

- Call repositories
- Call services
- Contain query logic
- Import external libraries (except value-object utilities)

## Naming

`Noun` — matches the domain concept:

`User`, `Order`, `Product`, `Invoice`, `Post`, `Subscription`

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Model calling a repository (`this.repo.findRelated()`) | Use eager loading in repository or a service to coordinate |
| Anemic model (no domain methods, only getters/setters) | Move domain logic from services into the model |
| Model accepting a service in its constructor | Models have no injected dependencies |
| Model used as a DTO (passed raw from controller to usecase) | Create a proper DTO; model is a domain entity, not a transport object |
| Direct row mapping in a service (not via `fromDatabase`) | Move hydration into the repository using `Model.fromDatabase(row)` |
