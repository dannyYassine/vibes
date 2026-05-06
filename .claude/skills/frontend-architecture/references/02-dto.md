# Layer 2: DTO

**Path:** `src/features/user/data/UserDto.ts`

## Responsibility

A plain TypeScript type describing the **exact shape of the API response or request body**. DTOs match the backend's wire format — including snake_case fields, nullable everything, ISO date strings, and any other backend conventions.

DTOs are the only place where API conventions are allowed to leak. They die at the Repository boundary; nothing above the Repository ever sees a DTO.

## Strict rules

- **Match the API exactly.** If the backend sends `created_at` as a string, the DTO has `created_at: string` — not `createdAt: Date`.
- **Type-only file.** No classes, no methods, no logic. Just `type` or `interface` declarations.
- **Nullable when the API is nullable.** Don't lie about optionality to make consumers' lives easier — that's the Repository's job.
- **One file per feature.** All request/response DTOs for the `User` feature live in `UserDto.ts`.
- **Suffix every type with `Dto`.** `UserDto`, `CreateUserDto`, `UpdateUserDto`, `UserListResponseDto`. The suffix is the visual marker that says "API shape, not domain."

## Canonical example

```typescript
// src/features/user/data/UserDto.ts

export type UserDto = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "admin" | "member" | "guest";
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_login_at: string | null;
};

export type CreateUserDto = {
  email: string;
  full_name: string;
  role: "admin" | "member" | "guest";
};

export type UpdateUserDto = {
  full_name?: string;
  role?: "admin" | "member" | "guest";
  is_active?: boolean;
};

export type UserListResponseDto = {
  data: UserDto[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
};
```

## What does NOT belong in a DTO

- **Computed properties** (`get displayName()`) — that's the Entity or ViewModel.
- **Defaults** (`role: "member" = "member"`) — the API decides defaults; if it sent null, the DTO says null.
- **Validation** — Repository or Service handles invalid data.
- **Date parsing** — DTOs hold strings. Entities hold `Date` objects.
- **camelCase renaming** — if the API uses snake_case, the DTO uses snake_case. The Repository renames during mapping.

## Why DTOs are separate from Entities

If you map API responses directly into your domain types, every backend change ripples through the entire codebase. With a DTO layer:

- Backend renames `full_name` to `display_name` → only the DTO and the Repository's mapping function change. The Entity stays the same.
- Backend adds a new field → optional addition to the DTO, ignored by the Repository until you decide to expose it.
- Backend wraps responses in `{ data: ... }` envelopes → captured in the DTO type, unwrapped by the Repository.

## Testing

DTOs are types — there's nothing to test directly. Their correctness is verified indirectly through DataSource tests (which check that real API responses match the DTO shape) and Repository tests (which check that mapping handles all DTO variants).
