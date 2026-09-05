# Layer 1: Gateway

**Path:** `src/features/user/data/UserGateway.ts`

## Responsibility

The Gateway owns **all external I/O**: REST, GraphQL, WebSockets, localStorage. It manages headers, status codes, retries, and network errors. It has **zero business logic**.

The Gateway absorbs what used to be three layers (DataSource + DTO + Repository). One file, one job: talk to the outside world in its native shape and hand the raw results upward.

## Strict rules

- **One file per feature** containing three things: the API-model types, the gateway interface, and the implementing class.
- **API-model type = plain object matching the API wire shape.** snake_case is OK, everything nullable-friendly, dates as ISO strings. Name it `<Feature>ApiModel` (e.g. `UserApiModel`).
- **The interface is the substitution seam for tests; the class is the real HTTP impl.** `IUserGateway` is what Services depend on; `UserApiGateway` is what the container registers. The constructor takes injected infrastructure (e.g. `HttpClient`).
- **Zero business logic.** No authorization checks, no domain rules, no entity construction. It *may*: retry, normalize HTTP errors into typed errors (e.g. `UserNotFoundError` carrying the `status`), parse JSON.
- **API models must not pass above the Service.** The Service maps them to Entities at its boundary. No file outside the feature's `data/` folder + Service may import `<Feature>ApiModel`.
- **Registered as a singleton in the container**, against the interface token.

## Canonical example

```typescript
// src/features/user/data/UserGateway.ts
import { HttpClient } from "@/infra/http/HttpClient";

export class UserNotFoundError extends Error {
  constructor(
    public readonly userId: string,
    public readonly status: number,
  ) {
    super(`User ${userId} not found`);
    this.name = "UserNotFoundError";
  }
}

/** API wire shape — snake_case, ISO date strings, everything nullable-friendly. */
export type UserApiModel = {
  usr_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  birth_year: number | null;
  avatar_url: string | null;
  role: "admin" | "member" | "guest";
  is_active: boolean;
  created_at: string;   // ISO 8601
  updated_at: string;
  last_login_at: string | null;
};

export type UpdateUserApiModel = {
  first_name: string;
  last_name: string | null;
  role: "admin" | "member" | "guest";
};

export interface IUserGateway {
  fetchUser(id: string): Promise<UserApiModel>;
  fetchUsers(page: number, perPage: number): Promise<UserApiModel[]>;
  updateUser(id: string, payload: UpdateUserApiModel): Promise<UserApiModel>;
  deleteUser(id: string): Promise<void>;
}

export class UserApiGateway implements IUserGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async fetchUser(id: string): Promise<UserApiModel> {
    const res = await this.httpClient.get(`/api/v1/users/${id}`);
    if (res.status === 404) throw new UserNotFoundError(id);
    return res.json();
  }
  // ... other methods follow the same pattern: build request, check status, parse JSON, throw typed errors
}
```

Typed errors like `UserNotFoundError` are defined in the gateway file and carry the HTTP `status`. The rest of the app catches domain-shaped errors, never raw `Response` objects.

## Why one file instead of three

The old DataSource / DTO / Repository split existed for two reasons: isolating caching (Repository) and isolating wire-shape parsing (DTO + DataSource). Both reasons are gone:

- **Mapping** now happens in the Service (API model → Entity), so a separate DTO layer bought nothing.
- **Caching** was speculative — most apps never add it.

If you later need caching or a second data source, add it **here** — a decorator over `IUserGateway`, in this same folder — without touching the Service. If the Gateway ever outgrows one file, re-splitting later is a one-file refactor, cheap. Splitting upfront is paying complexity for a problem you don't have.

## Testing

Gateways are faked in tests via a `FakeUserGateway` implementing `IUserGateway` (see `testing/01-fakes.md`). The fake returns canned `UserApiModel` objects; no HTTP occurs above the Gateway.

Direct unit tests of the Gateway itself are rare — only for custom serialization or retry logic worth locking down.

## What does NOT belong in a Gateway

- **Mapping to Entity** — that's the Service's boundary job.
- **Business rules** (authorization, multi-entity policies) — Service.
- **Building ViewModels** — Presenter.
- **UI state** (loading flags, error messages for display) — Presenter.
