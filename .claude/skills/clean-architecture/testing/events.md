# Testing Events

**Test type: Integration** (asserted within the usecase integration test)

## Rule

Events are never tested in isolation. Assert that an event is dispatched at the correct point in the usecase integration test — not in a separate event test.

## Pattern

Spy on the event's `dispatch` method (or listen on the event bus) within the usecase integration test:

```typescript
it('dispatches UserRegisteredEvent after user is created', async () => {
  const dispatchSpy = jest.spyOn(UserRegisteredEvent, 'dispatch');

  const dto = new CreateUserDto('jane@example.com', 'Jane', roleId);
  await createUserUseCase.execute(dto);

  expect(dispatchSpy).toHaveBeenCalledOnce();
  expect(dispatchSpy).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'jane@example.com' })
  );
});
```

## What to Assert

- Event was dispatched exactly once (not zero, not twice)
- Event payload contains the correct data (user id, relevant fields)
- Event is dispatched at the right point (after the DB write, not before)

## What NOT to Do

```typescript
// WRONG — testing the event class in isolation has no value
it('UserRegisteredEvent stores the user', () => {
  const event = new UserRegisteredEvent(user);
  expect(event.user).toBe(user); // trivial, meaningless
});
```

Events are dumb data carriers. Their value is in when and where they are dispatched — which is only visible in context of the usecase.
