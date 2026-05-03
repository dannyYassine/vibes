# Factories

## Rule

Factories centralise the construction of complex model instances. DI-injected. Must not call repositories or contain business logic.

## When to Use a Factory

Use a factory when:
- Construction logic is complex or conditional
- Multiple fields require computation or transformation at creation time
- The same construction logic is reused in multiple usecases

Use `new Model(...)` directly when:
- Construction is trivial (few fields, no computation)
- It only happens in one place

## What a Factory Does

- Assembles model instances (and optionally child models)
- Applies creation-time defaults and computed fields
- Hides construction complexity from usecases

## What a Factory Does Not Do

- Does not call repositories (no fetching)
- Does not contain business logic or decisions (that belongs in usecases/services)
- Does not validate user input (that's the DTO or delivery layer)

## Structure

```typescript
class OrderFactory {
  constructor(private readonly productFactory: ProductFactory) {}

  create(customerId: string, lineItems: OrderLineInput[]): Order {
    const lines = lineItems.map(item =>
      this.productFactory.createLine(item.productId, item.quantity, item.unitPrice)
    );
    return new Order(generateId(), customerId, lines, OrderStatus.Pending, new Date());
  }
}
```

## Naming

`NounFactory`:

`UserFactory`, `OrderFactory`, `InvoiceFactory`, `ProductFactory`

## DI Registration

Registered as singletons:

```typescript
container.bind(OrderFactory).toSelf().inSingletonScope();
container.bind(ProductFactory).toSelf().inSingletonScope();
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Factory calling a repository to fetch related data | Fetch in the usecase/service first, pass data to factory |
| Factory containing `if/else` business rules | Move decisions to the usecase; factory only assembles |
| Factory used as a service (doing operations beyond construction) | Extract the operation into a service |
| Not using a factory when the same construction appears in 3+ places | Introduce a factory to centralise |
