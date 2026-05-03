# Functional Testing

## Philosophy

Test the delivery mechanism as a black box from the outside. Functional tests verify that the delivery mechanism correctly translates external input (HTTP request, event, job payload, CLI args) into the right DTO and passes it to the right usecase.

The usecase may be mocked — functional tests are not about business logic. They are about the translation layer.

## What to Assert

- Correct HTTP status code and response shape (controllers)
- Usecase was called exactly once with the correct DTO
- DTO fields map correctly from raw input
- Error input produces correct error response (400, 422, etc.)

## Per-Type Approach

### Controller

Make a real HTTP request via a test client:

```typescript
it('POST /users returns 201 with user id', async () => {
  mockCreateUserUseCase.execute.mockResolvedValue({ id: 'abc', email: 'jane@example.com' });

  const res = await request(app).post('/users').send({ email: 'jane@example.com', name: 'Jane' });

  expect(res.status).toBe(201);
  expect(res.body.id).toBe('abc');
  expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'jane@example.com' })
  );
});
```

### Listener

Invoke `handle(event)` directly and assert the usecase received the correct DTO:

```typescript
it('passes correct DTO to OnboardUserUseCase on UserRegisteredEvent', async () => {
  const event = new UserRegisteredEvent({ userId: '123', email: 'jane@example.com' });

  await userRegisteredListener.handle(event);

  expect(mockOnboardUserUseCase.execute).toHaveBeenCalledWith(
    expect.objectContaining({ userId: '123', email: 'jane@example.com' })
  );
});
```

### Job

Invoke `handle(job)` directly with a fake job payload:

```typescript
it('passes correct DTO to SendWelcomeEmailUseCase', async () => {
  const job = { data: { userId: '123' } };

  await sendWelcomeEmailUserJob.handle(job);

  expect(mockSendWelcomeEmailUseCase.execute).toHaveBeenCalledWith(
    expect.objectContaining({ userId: '123' })
  );
});
```

### Command (CLI)

```typescript
it('passes correct DTO to CreateUserUseCase', async () => {
  await createUserUserCommand.handle({ email: 'jane@example.com', name: 'Jane', roleId: 1 });

  expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'jane@example.com' })
  );
});
```

## Rules

- Mock the usecase — isolate delivery mechanism behaviour from business logic
- Do not assert DB state — that belongs in integration tests
- One test per input shape / edge case (missing field, malformed input, auth failure)
