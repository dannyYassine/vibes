# Testing Handlers

**Test type: Integration** (exercised via the usecase or service that calls the handler)

## Rule

Do not test handlers in isolation. Their behaviour is covered by the usecase integration test that triggers them. When `CreateUserUseCase` integration test passes and asserts a welcome email was sent, the `UserSendWelcomeEmailHandler` is implicitly tested.

## Why Not Test Handlers Directly

Handlers are short-lived, plain-var-constructed objects. Testing them directly would require setting up the same preconditions as the usecase test — without the added benefit of testing the full intent.

## Rare Exception

A handler may warrant a unit test when it contains complex standalone logic not easily exercised via integration:

```typescript
describe('OrderGeneratePdfHandler', () => {
  test('includes all line items in generated PDF', async () => {
    const handler = new OrderGeneratePdfHandler(orderId, lineItems);
    const pdf = await handler.execute();

    expect(pdf.pages[0].content).toContain('Item A');
    expect(pdf.pages[0].content).toContain('Item B');
  });
});
```

If the integration test already covers this path, skip the unit test.
