# Testing Factories

**Test type: Integration** (factory exercised via the usecase that uses it)

## Rule

Factory correctness is verified by asserting the return value of the usecase integration test. If `CreateOrderUseCase` returns an `Order` with the correct lines and totals, the `OrderFactory` that built it is implicitly correct.

## Why Not Test Factories Directly

Factories are pure constructors — they take input and produce a model. Testing a factory in isolation duplicates the assertions already present in the usecase integration test and adds maintenance cost without additional safety.

## What the Integration Test Covers

- Model instances are created with correct field values
- Nested child objects (e.g. `OrderLine[]`) are assembled correctly
- Factory defaults (generated IDs, default status, timestamps) are applied

## Rare Exception

A factory with complex conditional construction logic may warrant a focused unit test:

```typescript
it('applies promotional discount when promo code is valid', () => {
  const order = orderFactory.create(customerId, lines, 'PROMO10');
  expect(order.discountPercent).toBe(10);
});

it('applies no discount when promo code is invalid', () => {
  const order = orderFactory.create(customerId, lines, 'INVALID');
  expect(order.discountPercent).toBe(0);
});
```

Only write this if the conditional logic is not reachable with reasonable effort through a usecase integration test.
