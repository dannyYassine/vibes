# Testing Delivery Mechanisms

**Test type: Functional**

See `testing/types/functional.md` for the full philosophy.

## Rule

Test the delivery mechanism as a black box. Mock the usecase. Assert that the correct DTO is constructed from the raw input and the usecase is called once.

## Controllers

Use a real HTTP test client. Do not invoke the controller method directly.

```typescript
describe('POST /users', () => {
  test('returns 201 with user id on valid input', async () => {
    mockCreateUserUseCase.execute.mockResolvedValue({ id: 'abc', email: 'jane@example.com' });

    const res = await request(app)
      .post('/users')
      .send({ email: 'jane@example.com', name: 'Jane', roleId: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'abc' });
    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', name: 'Jane' })
    );
  });

  test('returns 422 when email is missing', async () => {
    const res = await request(app).post('/users').send({ name: 'Jane' });
    expect(res.status).toBe(422);
    expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
  });
});
```

## Listeners

Invoke `handle(event)` directly; assert the usecase received the correct DTO:

```typescript
describe('UserRegisteredListener', () => {
  test('calls OnboardUserUseCase with correct DTO', async () => {
    const event = new UserRegisteredEvent({ userId: '123', email: 'jane@example.com' });

    await userRegisteredListener.handle(event);

    expect(mockOnboardUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', email: 'jane@example.com' })
    );
  });
});
```

## Jobs

Invoke `handle(job)` with a fake job payload:

```typescript
describe('SendWelcomeEmailUserJob', () => {
  test('calls SendWelcomeEmailUseCase with correct DTO', async () => {
    await sendWelcomeEmailUserJob.handle({ data: { userId: '123' } });

    expect(mockSendWelcomeEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123' })
    );
  });
});
```

## Commands (CLI)

```typescript
describe('CreateUserUserCommand', () => {
  test('calls CreateUserUseCase with correct DTO', async () => {
    await createUserUserCommand.handle({ email: 'jane@example.com', name: 'Jane', roleId: 1 });

    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' })
    );
  });
});
```

## Subscribers

Emit the event on the bus; assert the correct downstream job or listener was triggered:

```typescript
describe('OrderEventsSubscriber', () => {
  test('dispatches ProcessPaymentOrderJob when order.placed is emitted', async () => {
    subscriber.subscribe();
    eventBus.emit('order.placed', { orderId: '42', amount: 100 });

    expect(mockQueue.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ data: { orderId: '42' } })
    );
  });
});
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Asserting DB state in a functional test | DB assertions belong in integration tests |
| Not mocking the usecase | Mock it — delivery tests are about translation only |
| Calling controller method directly instead of HTTP client | Use a test HTTP client for controllers |
