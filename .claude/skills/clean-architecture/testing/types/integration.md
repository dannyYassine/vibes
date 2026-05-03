# Integration Testing

## Philosophy

The usecase is the entry point. Integration tests verify that a complete intent — from DTO input to DB state and side effects — works correctly with real dependencies.

Test the **intent**, not the implementation. Do not assert which internal methods were called; assert what changed in the system.

## What to Assert

- Return value of `usecase.execute(dto)`
- Database state after execution (records created, updated, deleted)
- Events dispatched (`UserRegisteredEvent::dispatch` was called with correct data)
- Jobs queued (correct job class enqueued with correct payload)

## Setup Pattern

```
seed DB with prerequisite data
  ↓
build a DTO
  ↓
call usecase.execute(dto)
  ↓
assert return value
assert DB state
assert events / jobs
```

## Example

```typescript
it('creates a user and dispatches UserRegisteredEvent', async () => {
  const dto = new CreateUserDto('jane@example.com', 'Jane', roleId);

  const user = await createUserUseCase.execute(dto);

  expect(user.email).toBe('jane@example.com');
  expect(await userRepository.findByEmail('jane@example.com')).not.toBeNull();
  expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id }));
});
```

## Rules

- **Do not mock the usecase** — the usecase IS the entry point
- **Do not mock internal services or repositories** — let the full flow run
- Use a real DB (test DB, in-memory DB, or transactional fixture)
- Reset/rollback DB state between tests
- One meaningful scenario per test; name it in plain English
- Test both happy paths and error paths (throws on duplicate email, etc.)

## Test Naming

Plain English describing what the intent does:

```
it('creates a user and sends a welcome email')
it('throws UserAlreadyExistsError when email is taken')
it('cancels an order and refunds the payment')
```
