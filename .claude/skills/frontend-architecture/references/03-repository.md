# Layer 3: Repository

**Path:** `src/features/user/domain/UserRepository.ts`

## Responsibility

The Repository is the **boundary between the data layer and the domain layer**. It calls one or more DataSources, maps DTOs to Entities, normalizes errors, and (optionally) handles caching, retries, and offline support.

Above the Repository, no one knows about HTTP, JSON shape, or backend conventions. Below it, no one knows about domain concepts.

## Strict rules

- **Returns Entities only.** Never leaks DTOs upward.
- **Owns the mapping.** DTO → Entity conversion happens here, in dedicated mapper functions or static methods.
- **Normalizes errors.** HTTP 404 becomes `UserNotFoundError`. HTTP 401 becomes `UnauthorizedError`. The Service should never need to check status codes.
- **No business logic.** Don't decide *which* user to fetch or *what* to do with one — the Service decides. The Repository just answers "give me the user with id X."
- **Returns domain results, not framework primitives.** No `Promise<Response>`, no `Promise<AxiosResponse>` — always `Promise<User>` or `Promise<User[]>`.

## Canonical example

```typescript
// src/features/user/domain/UserRepository.ts
import { User } from "./User";
import type { UserDataSource } from "../data/UserDataSource";
import type { UserDto, UpdateUserDto } from "../data/UserDto";

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User ${id} not found`);
    this.name = "UserNotFoundError";
  }
}

export class UserRepository {
  private readonly cache = new Map<string, { entity: User; fetchedAt: number }>();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly dataSource: UserDataSource) {}

  async findById(id: string, options: { force?: boolean } = {}): Promise<User> {
    const cached = this.cache.get(id);
    if (!options.force && cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.entity;
    }

    try {
      const dto = await this.dataSource.fetchUser(id);
      const entity = this.toEntity(dto);
      this.cache.set(id, { entity, fetchedAt: Date.now() });
      return entity;
    } catch (error) {
      if (this.isNotFound(error)) throw new UserNotFoundError(id);
      throw error;
    }
  }

  async findAll(params: { page: number; perPage: number }): Promise<User[]> {
    const dtos = await this.dataSource.fetchUsers(params);
    return dtos.map((dto) => this.toEntity(dto));
  }

  async update(id: string, changes: Partial<Pick<User, "fullName" | "role" | "isActive">>): Promise<User> {
    const payload: UpdateUserDto = {
      full_name: changes.fullName,
      role: changes.role,
      is_active: changes.isActive,
    };
    const dto = await this.dataSource.patchUser(id, payload);
    const entity = this.toEntity(dto);
    this.cache.set(id, { entity, fetchedAt: Date.now() });
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.deleteUser(id);
    this.cache.delete(id);
  }

  private toEntity(dto: UserDto): User {
    return new User({
      id: dto.id,
      email: dto.email,
      fullName: dto.full_name,
      avatarUrl: dto.avatar_url,
      role: dto.role,
      isActive: dto.is_active,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
      lastLoginAt: dto.last_login_at ? new Date(dto.last_login_at) : null,
    });
  }

  private isNotFound(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 404
    );
  }
}
```

## Mapping patterns

For simple mappings, a private `toEntity` method on the Repository is enough. When mapping gets complex — multiple DTOs feeding into one Entity, computed fields, conditional shapes — extract a dedicated mapper:

```typescript
// src/features/user/domain/UserMapper.ts
export class UserMapper {
  static fromDto(dto: UserDto): User { /* ... */ }
  static fromDtos(dtos: UserDto[]): User[] { /* ... */ }
  static fromDtoWithProfile(userDto: UserDto, profileDto: ProfileDto): User { /* ... */ }
}
```

The mapper is the only place outside the DataSource that imports DTO types.

## Multi-source orchestration

When a Repository combines multiple DataSources, it stays in the Repository — never in the Service:

```typescript
constructor(
  private readonly userDataSource: UserDataSource,
  private readonly avatarDataSource: AvatarDataSource,
  private readonly localCache: UserCacheDataSource,
) {}

async findById(id: string): Promise<User> {
  const cached = await this.localCache.get(id);
  if (cached) return UserMapper.fromDto(cached);

  const [userDto, avatarDto] = await Promise.all([
    this.userDataSource.fetchUser(id),
    this.avatarDataSource.fetchAvatar(id),
  ]);
  const entity = UserMapper.fromDtoWithAvatar(userDto, avatarDto);
  await this.localCache.set(id, userDto);
  return entity;
}
```

The Service calls `repository.findById(id)` and never knows there were three sources behind it.

## Testing

Repository tests mock the DataSource and verify:
- DTOs are mapped to Entities correctly (every field, including renames and date parsing)
- HTTP errors are translated into domain errors
- Caching behavior (hits, misses, TTL expiry, force refresh)
- Multi-source orchestration produces the right combined Entity
