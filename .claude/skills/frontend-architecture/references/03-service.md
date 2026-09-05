# Layer 3: Service

**Path:** `src/features/user/domain/UserService.ts`

## Responsibility

The Service holds **business logic and use cases**. It orchestrates one or more Gateways, applies cross-entity policies, and exposes use-case-centric methods that the Presenter calls.

If the Gateway answers "give me the raw API response for user X," the Service answers "promote this user to admin, but only if the current user has permission and the target user is active."

## Strict rules

- **Use-case-centric method names.** `promoteToAdmin`, `deactivateUser`, `inviteToTeam` — not `updateUser`, `patchUser`, `saveUser`. The Service vocabulary matches the product vocabulary.
- **No HTTP, no UI.** The Service deals in Entities and primitives only. API models appear only as transient inputs, mapped to Entities at the boundary (see "The mapping rule").
- **Throws domain errors.** `UnauthorizedActionError`, `UserAlreadyAdminError`. Never throws HTTP errors — those got translated at the Gateway.
- **Stateless.** A Service has no instance state beyond its injected dependencies. State lives in Entities (returned to callers) or in Presenters (UI state).
- **One Service per feature, not one per use case.** A `UserService` can have many methods. Don't fragment into `PromoteUserService`, `DeactivateUserService`.

## Canonical example

```typescript
// src/features/user/domain/UserService.ts
import type { User, UserRole } from "./User";
import type { IUserGateway, UserApiModel, UpdateUserApiModel } from "../data/UserGateway";

export class UnauthorizedActionError extends Error { /* same as before */ }
export class UserAlreadyHasRoleError extends Error { /* same as before */ }

export class UserService {
  constructor(private readonly gateway: IUserGateway) {}

  /** The API-model → Entity mapping lives HERE — the Gateway's wire shape dies at this boundary. */
  private toUser(api: UserApiModel): User {
    return new User({
      id: api.usr_id,
      email: api.email,
      fullName: [api.first_name, api.last_name].filter(Boolean).join(" "),
      birthYear: api.birth_year,
      avatarUrl: api.avatar_url,
      role: api.role,
      isActive: api.is_active,
      createdAt: new Date(api.created_at),
      updatedAt: new Date(api.updated_at),
      lastLoginAt: api.last_login_at ? new Date(api.last_login_at) : null,
    });
  }

  /** fullName (domain) → first_name/last_name (wire). Only the Service knows both shapes. */
  private toUpdatePayload(user: User, patch: { fullName?: string; role?: UserRole }): UpdateUserApiModel {
    const fullName = (patch.fullName ?? user.fullName).trim();
    const [first, ...rest] = fullName.split(/\s+/);
    return {
      first_name: first ?? "",
      last_name: rest.length > 0 ? rest.join(" ") : null,
      role: patch.role ?? user.role,
    };
  }

  async getUser(id: string): Promise<User> {
    return this.toUser(await this.gateway.fetchUser(id));
  }

  async listActiveUsers(page: number, perPage: number): Promise<User[]> {
    const users = await this.gateway.fetchUsers(page, perPage);
    return users.map((u) => this.toUser(u)).filter((user) => user.isActive);
  }

  async changeRole(targetId: string, newRole: UserRole, actor: User): Promise<User> {
    if (!actor.canEditOtherUsers()) throw new UnauthorizedActionError("changeRole");
    const target = await this.getUser(targetId);
    if (target.role === newRole) throw new UserAlreadyHasRoleError(targetId, newRole);
    return this.toUser(await this.gateway.updateUser(targetId, this.toUpdatePayload(target, { role: newRole })));
  }

  async updateProfile(targetId: string, fullName: string, birthYear: number): Promise<User> {
    const target = await this.getUser(targetId);
    if (birthYear === null || new Date().getFullYear() - birthYear < 18) {
      throw new Error("User must be an adult.");
    }
    return this.toUser(await this.gateway.updateUser(targetId, this.toUpdatePayload(target, { fullName })));
  }
}
```

## The mapping rule

**API model → Entity happens in the Service.** This used to be the Repository's job; with the Gateway collapse, the Service owns it.

- Inbound: every Gateway result passes through a private `toX(api)` mapper before escaping the method. Callers never see `usr_id` or `created_at: string`.
- Outbound: every Gateway argument is built by a private `toUpdatePayload(user, patch)` mapper. The Entity's `fullName` becomes `first_name` + `last_name` here, and nowhere else.

Why it matters: when the backend renames `usr_id` to `user_id` or splits `fullName` into three fields, exactly one private method changes — the mapping method. No Presenter, no ViewModel, no test fixture ever hears about it. **This is the ONLY place the wire shape appears above the Gateway.**

## What goes in the Service vs. the Entity

- **Single-entity facts** → Entity. `user.isAdmin()`, `user.isDormant()`.
- **Multi-entity policies** → Service. `service.changeRole(target, role, actor)` involves both the actor and the target.
- **Cross-feature orchestration** → Service. Inviting a user might involve `UserGateway`, `TeamGateway`, and `EmailGateway`.
- **External-side-effect operations** → Service. Sending an email, queueing a job, emitting an event.

If a Service method has only one line — `return this.toUser(await this.gateway.fetchUser(id))` — that's fine, keep it. The Service is the stable interface the Presenter depends on; if you bypass it, every UI change ripples through to the Gateway.

## Multi-Gateway services

Services can compose multiple Gateways when a use case spans features:

```typescript
// Interface members for ITeamGateway / IEmailGateway omitted for brevity.
constructor(
  private readonly userGateway: IUserGateway,
  private readonly teamGateway: ITeamGateway,
  private readonly emailGateway: IEmailGateway,
) {}

async inviteUserToTeam(email: string, teamId: string, inviter: User): Promise<User> {
  const team = this.toTeam(await this.teamGateway.fetchTeam(teamId));
  if (!team.canBeJoinedBy(inviter)) {
    throw new UnauthorizedActionError("inviteUserToTeam");
  }

  const user = this.toUser(await this.userGateway.createUser({ email, fullName: email }));
  await this.teamGateway.addMember(teamId, user.id);
  await this.emailGateway.sendInvite(user.email, team.name, inviter.fullName);
  return user;
}
```

When a use case spans features, the Service typically lives in the feature whose noun dominates — here, it might be a `TeamService.inviteUser` rather than `UserService.inviteToTeam`. Use the dominant-noun rule when in doubt.

## Testing

Service tests mock the Gateway (and any other injected dependencies) and verify:
- Authorization checks fire correctly (the actor's permissions matter)
- Cross-entity rules are enforced
- The right Gateway methods are called with the right arguments
- Domain errors are thrown for invalid use cases

Because Gateways are mocked, Service tests run instantly. They're the right place to lock down business rules — these tests should outnumber every other layer's tests combined.
