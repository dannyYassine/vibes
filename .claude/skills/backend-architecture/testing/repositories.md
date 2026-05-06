# Testing Repositories

**Test type: Integration**

## Rule

Repositories are tested with a real database (test DB or in-memory equivalent). The key assertion is that data round-trips correctly and that returned values are model instances — not raw rows.

## Pattern

```typescript
describe('OrmUserRepository', () => {
  beforeEach(() => db.beginTransaction());
  afterEach(() => db.rollback());

  test('saves and retrieves a user by id', async () => {
    const user = new User(generateId(), 'jane@example.com', 'Jane', UserStatus.Active, new Date());
    await userRepository.save(user);

    const found = await userRepository.findById(user.id);

    expect(found).toBeInstanceOf(User);
    expect(found!.email).toBe('jane@example.com');
  });

  test('returns null when user does not exist', async () => {
    const result = await userRepository.findById('nonexistent-id');
    expect(result).toBeNull();
  });

  test('returns a User instance (not a raw row) from findAll', async () => {
    await seedUsers(3);
    const users = await userRepository.findAll();

    expect(users.every(u => u instanceof User)).toBe(true);
  });
});
```

## What to Cover

- `save` → `findById` round-trip (data persists correctly)
- `findAll` returns correct count and correct model instances
- Not-found cases return `null` (not undefined, not an error)
- Hydration: returned objects must be model instances via `Model.fromDatabase(row)`
- Delete removes the record

## Isolation

Run each test in a transaction and roll back after. Never leave test data in the DB between tests.
