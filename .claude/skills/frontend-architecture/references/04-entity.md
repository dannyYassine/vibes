# Layer 4: Entity

**Path:** `src/features/user/domain/User.ts`

## Responsibility

The Entity is the **pure domain model**. It represents what a `User` *is* in your business domain — independent of any API, any framework, any UI concern.

Entities are framework-agnostic. They could be lifted out of this codebase and dropped into a Node.js script, a CLI, or a different frontend framework, and they'd still work without modification.

## Strict rules

- **Imports nothing.** No frameworks, no DTOs, no services, no presenters. The only acceptable imports are other Entities or value objects.
- **Holds data + invariants.** Construction validates required fields. Methods enforce business rules.
- **Properties use camelCase.** This is the domain shape, not the API shape.
- **Dates are `Date` objects, not strings.** The Repository handles the parsing.
- **Optional fields are explicitly nullable**, not `undefined`. `null` means "we know there isn't one"; `undefined` means "we forgot to set it." Domain code should never have ambiguity.

## Canonical example

```typescript
// src/features/user/domain/User.ts

export type UserRole = "admin" | "member" | "guest";

export type UserProps = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export class User {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt: Date | null;

  constructor(props: UserProps) {
    if (!props.id) throw new Error("User.id is required");
    if (!props.email.includes("@")) throw new Error("User.email must be a valid email");
    if (!props.fullName.trim()) throw new Error("User.fullName cannot be empty");

    this.id = props.id;
    this.email = props.email;
    this.fullName = props.fullName;
    this.avatarUrl = props.avatarUrl;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.lastLoginAt = props.lastLoginAt;
  }

  // Domain logic — pure functions of entity state

  isAdmin(): boolean {
    return this.role === "admin";
  }

  canEditOtherUsers(): boolean {
    return this.role === "admin" && this.isActive;
  }

  hasLoggedInWithin(days: number): boolean {
    if (!this.lastLoginAt) return false;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.lastLoginAt.getTime() >= cutoff;
  }

  isDormant(): boolean {
    return !this.hasLoggedInWithin(90);
  }

  // Value-returning operations are immutable — return a new instance

  withUpdatedName(fullName: string): User {
    return new User({ ...this.toProps(), fullName, updatedAt: new Date() });
  }

  withRole(role: UserRole): User {
    return new User({ ...this.toProps(), role, updatedAt: new Date() });
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    };
  }
}
```

## Domain logic vs. UI logic vs. business logic

A common confusion. Use these tests to decide where logic belongs:

- **Domain logic (Entity):** "Is this user an admin?" — a fact about the user that's true regardless of who's asking. Lives on the Entity.
- **UI logic (ViewModel):** "Should the admin badge be visible in the user list?" — depends on UI state. Lives on the ViewModel.
- **Business logic (Service):** "Can the current user promote this user to admin?" — involves orchestrating multiple entities and policies. Lives on the Service.

`User.isAdmin()` is fine on the Entity. `User.shouldShowAdminBadge()` is not — that's a UI concern. `User.promoteTo(role, byUser)` is not — that's a multi-entity policy.

## Why class-based, not type-based?

You could express `User` as a `type` with helper functions. The class form is preferred because:

- Construction validates invariants in one place
- Methods discover naturally on the entity (`user.isAdmin()` reads better than `isAdmin(user)`)
- Immutability is enforced via `readonly` properties
- The class identity makes it impossible to accidentally pass a DTO where an Entity is expected

If your team prefers functional style, the alternative is a `type` plus a namespace of free functions — but be strict about not mutating, and always validate at construction-time helpers.

## Testing

Entity tests are pure unit tests with no mocks. They verify:
- Constructor validation throws on invalid input
- Domain methods return correct values for given states
- Immutable operations return new instances without mutating the original

These are the fastest, most stable tests in the codebase. There's no reason not to have 100% coverage on entities.
