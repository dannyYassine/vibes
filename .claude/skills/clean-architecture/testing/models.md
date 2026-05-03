# Testing Models

**Test type: Integration** (model behaviour exercised via usecase flow)

## Rule

Model domain methods and construction are verified as part of integration tests. When a usecase integration test asserts that `order.cancel()` results in a cancelled order in the DB, the model method is tested implicitly.

## Why Not Unit-Test Models Directly

Domain methods like `order.cancel()` only make sense in the context of the flow that calls them. An isolated unit test for a domain method risks testing a method without the guards (status checks, business rules) that the usecase enforces before calling it.

## What the Integration Test Covers

- Domain method invocation produces the correct state change (verified via DB assertion)
- `fromDatabase(row)` hydration correctness (verified by the repository integration test)
- Computed properties return correct values (verified by asserting usecase return value)

## Rare Exception

If a domain method has complex internal logic worth exhaustive branch testing, a focused unit test is acceptable:

```typescript
it('throws when cancelling an already-cancelled order', () => {
  const order = new Order(id, customerId, lines, OrderStatus.Cancelled, date);
  expect(() => order.cancel()).toThrow(OrderAlreadyInStateError);
});
```

Keep these minimal. If the integration test exercises the path, skip it here.
