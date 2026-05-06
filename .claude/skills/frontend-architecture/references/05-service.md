# Layer 5: Service

**Path:** `src/features/user/domain/UserService.ts`

## Responsibility

The Service holds **business logic and use cases**. It orchestrates one or more Repositories, applies cross-entity policies, and exposes use-case-centric methods that the Presenter calls.

If the Repository answers "give me the user with id X," the Service answers "promote this user to admin, but only if the current user has permission and the target user is active."

## Strict rules

- **Use-case-centric method names.** `promoteToAdmin`, `deactivateUser`, `inviteToTeam` — not `updateUser`, `patchUser`, `saveUser`. The Service vocabulary matches the product vocabulary.
- **No HTTP, no DTOs, no UI.** The Service deals in Entities and primitives only.
- **Throws domain errors.** `UnauthorizedActionError`, `UserAlreadyAdminError`. Never throws HTTP errors — those got translated at the Repository.
- **Stateless.** A Service has no instance state beyond its injected dependencies. State lives in Entities (returned to callers) or in Presenters (UI state).
- **One Service per feature, not one per use case.** A `UserService` can have many methods. Don't fragment into `PromoteUserService`, `DeactivateUserService`.

## Canonical example

```typescript
// src/features/user/domain/UserService.ts
import type { User, UserRole } from "./User";
import type { UserRepository } from "./UserRepository";

export class UnauthorizedActionError extends Error {
  constructor(action: string) {
    super(`Unauthorized to perform: ${action}`);
    this.name = "UnauthorizedActionError";
  }
}

export class UserAlreadyHasRoleError extends Error {
  constructor(userId: string, role: UserRole) {
    super(`User ${userId} already has role ${role}`);
    this.name = "UserAlreadyHasRoleError";
  }
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUser(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }

  async listActiveUsers(page: number, perPage: number): Promise<User[]> {
    const users = await this.userRepository.findAll({ page, perPage });
    return users.filter((user) => user.isActive);
  }

  async listDormantUsers(page: number, perPage: number): Promise<User[]> {
    const users = await this.userRepository.findAll({ page, perPage });
    return users.filter((user) => user.isDormant());
  }

  async changeRole(targetId: string, newRole: UserRole, actor: User): Promise<User> {
    if (!actor.canEditOtherUsers()) {
      throw new UnauthorizedActionError("changeRole");
    }

    const target = await this.userRepository.findById(targetId);
    if (target.role === newRole) {
      throw new UserAlreadyHasRoleError(targetId, newRole);
    }

    return this.userRepository.update(targetId, { role: newRole });
  }

  async deactivate(targetId: string, actor: User): Promise<User> {
    if (!actor.canEditOtherUsers()) {
      throw new UnauthorizedActionError("deactivate");
    }
    if (targetId === actor.id) {
      throw new UnauthorizedActionError("cannot deactivate self");
    }

    return this.userRepository.update(targetId, { isActive: false });
  }

  async updateProfile(targetId: string, fullName: string, actor: User): Promise<User> {
    const isSelf = targetId === actor.id;
    const isAdmin = actor.canEditOtherUsers();
    if (!isSelf && !isAdmin) {
      throw new UnauthorizedActionError("updateProfile");
    }

    return this.userRepository.update(targetId, { fullName });
  }
}
```

## What goes in the Service vs. the Entity

- **Single-entity facts** → Entity. `user.isAdmin()`, `user.isDormant()`.
- **Multi-entity policies** → Service. `service.changeRole(target, role, actor)` involves both the actor and the target.
- **Cross-feature orchestration** → Service. Inviting a user might involve `UserRepository`, `TeamRepository`, and `EmailRepository`.
- **External-side-effect operations** → Service. Sending an email, queueing a job, emitting an event.

If a Service method has only one line — `return this.repository.findById(id)` — that's fine, keep it. The Service is the stable interface the Presenter depends on; if you bypass it, every UI change ripples through to the Repository.

## Multi-Repository services

Services can compose multiple Repositories when a use case spans features:

```typescript
constructor(
  private readonly userRepository: UserRepository,
  private readonly teamRepository: TeamRepository,
  private readonly emailRepository: EmailRepository,
) {}

async inviteUserToTeam(email: string, teamId: string, inviter: User): Promise<User> {
  const team = await this.teamRepository.findById(teamId);
  if (!team.canBeJoinedBy(inviter)) {
    throw new UnauthorizedActionError("inviteUserToTeam");
  }

  const user = await this.userRepository.create({ email, fullName: email });
  await this.teamRepository.addMember(teamId, user.id);
  await this.emailRepository.sendInvite(user.email, team.name, inviter.fullName);
  return user;
}
```

When a use case spans features, the Service typically lives in the feature whose noun dominates — here, it might be a `TeamService.inviteUser` rather than `UserService.inviteToTeam`. Use the dominant-noun rule when in doubt.

## Testing

Service tests mock the Repository (and any other injected dependencies) and verify:
- Authorization checks fire correctly (the actor's permissions matter)
- Cross-entity rules are enforced
- The right Repository methods are called with the right arguments
- Domain errors are thrown for invalid use cases

Because Repositories are mocked, Service tests run instantly. They're the right place to lock down business rules — these tests should outnumber every other layer's tests combined.
