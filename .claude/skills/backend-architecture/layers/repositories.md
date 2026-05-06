# Repositories

## Rule

Repositories are the only layer that communicates with the data store. Callable only from usecases and services.

## What a Repository Does

- Persists and retrieves domain entities
- Returns fully-constructed model instances — never raw rows or query results
- Defines an interface contract; implementation is injected via DI

## What a Repository Does Not Do

- Does not contain business logic
- Does not call services or usecases
- Does not call other repositories (use a service to coordinate)
- Does not return raw DB rows — always hydrate into models

## Interface-First Pattern

Define the interface; bind the implementation in the DI container:

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

class OrmUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return row ? User.fromDatabase(row) : null;
  }
  // ...
}
```

## Hydration Pattern

Repository methods call `Model.fromDatabase(row)` to construct model instances:

```typescript
async findAll(): Promise<User[]> {
  const rows = await db.query('SELECT * FROM users');
  return rows.map(row => User.fromDatabase(row));
}
```

Never return raw rows. The caller receives a proper model.

## Naming

`NounRepository` / `NounRepositoryInterface`:

| Interface | Implementation |
|---|---|
| `UserRepository` | `OrmUserRepository` |
| `OrderRepository` | `SqlOrderRepository` |
| `ProductRepository` | `MongoProductRepository` |

## Standard Methods

Prefer these names for consistency:

| Method | Purpose |
|---|---|
| `findById(id)` | Fetch single by primary key |
| `findByEmail(email)` | Fetch single by unique field |
| `findAll()` | Fetch all records |
| `save(entity)` | Insert or update |
| `delete(id)` | Remove by primary key |

## DI Registration

Bind interface to implementation as singleton:

```typescript
container.bind<UserRepository>('UserRepository').to(OrmUserRepository).inSingletonScope();
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Repository called from a controller | Route through a usecase |
| Repository containing business logic (`if user.isAdmin`) | Move to service or model |
| Repository returning raw DB rows | Hydrate with `Model.fromDatabase(row)` |
| Repository calling a service | Reverse the dependency — services call repos, never the other way |
| One repository calling another | Coordinate in a service or usecase |
| Repository registered without an interface | Always bind to interface for testability |
