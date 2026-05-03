# Testing Usecases

**Test type: Integration**

See `testing/types/integration.md` for the full philosophy.

## The Usecase Is the Entry Point

Every integration test starts by calling `usecase.execute(dto)`. Never call a service or repository directly in a test — that bypasses the architecture and tests implementation details.

## Pattern

```typescript
describe('CreateUserUseCase', () => {
  test('creates a user and dispatches UserRegisteredEvent', async () => {
    const dto = new CreateUserDto('jane@example.com', 'Jane', roleId);

    const user = await createUserUseCase.execute(dto);

    // assert return value
    expect(user.id).toBeDefined();
    expect(user.email).toBe('jane@example.com');

    // assert DB state
    const saved = await userRepository.findByEmail('jane@example.com');
    expect(saved).not.toBeNull();

    // assert side effects
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id })
    );
  });

  test('throws UserAlreadyExistsError when email is taken', async () => {
    await seedUser({ email: 'jane@example.com' });
    const dto = new CreateUserDto('jane@example.com', 'Jane', roleId);

    await expect(createUserUseCase.execute(dto)).rejects.toThrow(UserAlreadyExistsError);
  });
});
```

## What to Cover

- Happy path: correct return value + DB state + events/jobs
- Error paths: each business rule violation should have a test
- Edge cases that surface in the usecase (empty results, boundary conditions)

## Setup

- Use real repositories with a test DB or in-memory equivalent
- Use real services — do not mock them
- Spy on event dispatch and job queuing (not mock — spy, so the real dispatch still runs)
- Reset DB state between tests (transaction rollback or truncation)
