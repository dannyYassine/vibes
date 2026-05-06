# Layer 7: ViewModel

**Path:** `src/features/user/presentation/UserViewModel.ts`

## Responsibility

The ViewModel is a **DTO-style class for the View**. It accepts one or many Entities (plus any context the UI needs, like the current user) and exposes UI-ready properties: formatted strings, computed booleans for visibility, display-friendly enums.

The ViewModel is the **only thing the View ever sees**. The View must never import an Entity directly — that coupling is what the ViewModel exists to prevent.

## Strict rules

- **Constructor accepts Entities, not raw data.** `new UserViewModel(user)` or `new UserViewModel(user, currentUser)`. Never `new UserViewModel({ id, name, ... })`.
- **Exposes display-ready props, not domain logic.** `displayName`, `formattedLastLogin`, `roleLabel`, `canShowAdminBadge`, `avatarInitials`. The View should never need to format anything itself.
- **Read-only.** ViewModels are computed from Entities; if the Entity changes, the Presenter creates a new ViewModel. Don't mutate.
- **No service calls, no async work.** ViewModels are pure data adapters — synchronous, deterministic, side-effect-free.
- **One ViewModel class per UI shape, not per Entity.** A user list item and a user detail page might both be backed by `User` but expose different ViewModels (`UserListItemViewModel`, `UserDetailViewModel`).

## Canonical example

```typescript
// src/features/user/presentation/UserViewModel.ts
import type { User, UserRole } from "../domain/User";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  member: "Team member",
  guest: "Guest",
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: "purple",
  member: "blue",
  guest: "gray",
};

/**
 * ViewModel for the user detail page.
 * Exposes everything the detail view needs to render — no entity access required.
 */
export class UserViewModel {
  constructor(
    private readonly user: User,
    private readonly currentUser: User,
  ) {}

  get id(): string {
    return this.user.id;
  }

  get email(): string {
    return this.user.email;
  }

  get displayName(): string {
    return this.user.fullName;
  }

  get avatarInitials(): string {
    return this.user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  get avatarUrl(): string | null {
    return this.user.avatarUrl;
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.user.role];
  }

  get roleBadgeColor(): string {
    return ROLE_BADGE_COLORS[this.user.role];
  }

  get statusLabel(): string {
    if (!this.user.isActive) return "Deactivated";
    if (this.user.isDormant()) return "Dormant";
    return "Active";
  }

  get formattedLastLogin(): string {
    if (!this.user.lastLoginAt) return "Never";
    return this.formatRelative(this.user.lastLoginAt);
  }

  get formattedJoinedAt(): string {
    return this.user.createdAt.toLocaleDateString();
  }

  // UI-visibility computed props — NOT domain logic.

  get canShowAdminBadge(): boolean {
    return this.user.isAdmin();
  }

  get canEditRole(): boolean {
    return this.currentUser.canEditOtherUsers() && this.currentUser.id !== this.user.id;
  }

  get canDeactivate(): boolean {
    return (
      this.currentUser.canEditOtherUsers() &&
      this.currentUser.id !== this.user.id &&
      this.user.isActive
    );
  }

  get isSelf(): boolean {
    return this.currentUser.id === this.user.id;
  }

  private formatRelative(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}

/**
 * Lighter ViewModel for list rows — exposes only what the list cell needs.
 * Backed by the same User entity, but a different UI shape.
 */
export class UserListItemViewModel {
  constructor(private readonly user: User) {}

  get id(): string {
    return this.user.id;
  }
  get displayName(): string {
    return this.user.fullName;
  }
  get email(): string {
    return this.user.email;
  }
  get roleLabel(): string {
    return ROLE_LABELS[this.user.role];
  }
  get isInactive(): boolean {
    return !this.user.isActive;
  }
  get avatarUrl(): string | null {
    return this.user.avatarUrl;
  }
}

/**
 * Aggregating ViewModel — accepts many entities and exposes derived UI props.
 */
export class UserListViewModel {
  readonly items: UserListItemViewModel[];

  constructor(users: User[]) {
    this.items = users.map((u) => new UserListItemViewModel(u));
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get totalLabel(): string {
    return this.items.length === 1 ? "1 user" : `${this.items.length} users`;
  }

  get hasInactiveUsers(): boolean {
    return this.items.some((item) => item.isInactive);
  }
}
```

## ViewModel patterns

**Single-entity ViewModel:** Wraps one Entity for a detail screen.
```typescript
new UserViewModel(user, currentUser)
```

**Aggregating ViewModel:** Wraps a collection. Often holds an array of item ViewModels and adds list-level computed props.
```typescript
new UserListViewModel(users)
```

**Composite ViewModel:** Combines multiple entities for a single UI region.
```typescript
new UserDashboardViewModel(user, recentInvoices, activeTeams)
```

All three are valid. Pick the shape that matches the UI region.

## "But this feels redundant"

It's tempting to skip the ViewModel when it's "just forwarding props." Don't. The forwarding is the point. The day the View imports `User` directly is the day every UI change requires touching domain code, and every domain change requires touching every View.

Even a ViewModel that exposes only `id` and `displayName` earns its keep:
- The View has a single, predictable contract
- Adding a computed prop (e.g., a new badge) is a one-file change
- The View can be rendered in tests with a mock ViewModel — no Entity construction needed

## What does NOT belong in a ViewModel

- **Service calls** — that's the Presenter.
- **Mutations** — ViewModels are read-only snapshots.
- **Domain rules** (`canBePromoted` based on multi-entity policy) — that's the Service or Entity.
- **Loading or error state** — that's the Presenter's `state`, not the ViewModel itself.

## Testing

ViewModel tests are pure unit tests — no mocks beyond constructing input Entities. They verify:
- Display strings format correctly (relative dates, role labels, initials)
- Visibility computed props (`canEditRole`, `canDeactivate`) return the right booleans for given Entity states

Like Entity tests, these are fast and stable. 100% coverage is reasonable.
