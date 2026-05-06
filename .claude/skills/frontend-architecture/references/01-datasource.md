# Layer 1: DataSource

**Path:** `src/features/user/data/UserDataSource.ts`

## Responsibility

Pure HTTP transport. The DataSource knows about endpoints, headers, query params, and the raw shape of API responses. It returns DTOs (Layer 2) — never entities, never anything domain-aware.

One DataSource per external system. If your `User` data comes from your own REST API, that's one DataSource. If you also pull user avatars from a third-party service, that's a second DataSource.

## Strict rules

- **Returns DTOs only.** Never returns entities, never returns mapped objects.
- **No business logic.** No validation, no defaulting, no computation. Just transport.
- **No caching.** Caching is the Repository's job.
- **Errors are HTTP errors.** Don't translate them into domain errors here — the Repository does that.
- **Methods named after the API operation**, not the use case. `fetchUser`, `postUser`, `patchUser` — not `getUserProfile` or `saveUser`.

## Canonical example

```typescript
// src/features/user/data/UserDataSource.ts
import type { UserDto, UpdateUserDto } from "./UserDto";

export class UserDataSource {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async fetchUser(id: string): Promise<UserDto> {
    const response = await this.httpClient.get(`${this.baseUrl}/users/${id}`);
    return response.data as UserDto;
  }

  async fetchUsers(params: { page: number; perPage: number }): Promise<UserDto[]> {
    const response = await this.httpClient.get(`${this.baseUrl}/users`, {
      params: { page: params.page, per_page: params.perPage },
    });
    return response.data as UserDto[];
  }

  async patchUser(id: string, payload: UpdateUserDto): Promise<UserDto> {
    const response = await this.httpClient.patch(`${this.baseUrl}/users/${id}`, payload);
    return response.data as UserDto;
  }

  async deleteUser(id: string): Promise<void> {
    await this.httpClient.delete(`${this.baseUrl}/users/${id}`);
  }
}
```

## What goes here vs. the Repository

| Concern | DataSource | Repository |
|---------|-----------|------------|
| HTTP request | ✅ | ❌ |
| URL construction | ✅ | ❌ |
| Query param formatting | ✅ | ❌ |
| Auth headers | ✅ (or HTTP client interceptor) | ❌ |
| Retry logic | ❌ | ✅ |
| Caching | ❌ | ✅ |
| DTO → Entity mapping | ❌ | ✅ |
| Combining multiple sources | ❌ | ✅ |
| Domain error translation | ❌ | ✅ |

## Testing

DataSource tests mock the `HttpClient`. They verify that:
- The correct URL is called
- Query params are formatted correctly (e.g., `perPage` → `per_page`)
- The returned DTO matches the API contract

You do NOT test mapping or business logic here — those tests live at the Repository and Service layers.
