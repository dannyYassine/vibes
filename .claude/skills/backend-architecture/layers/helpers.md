# Helpers

## Rule

Helpers are thin wrappers over third-party tech or SDKs. No business logic. **Only their paired service-helper class may call them — no other class.**

## What a Helper Is

- Thin adapter over a third-party library, SDK, or external API client
- Returns raw data; applies no filtering, transformation, or domain logic
- Stateless — no constructor injection, no instance state
- The boundary between your codebase and external tech

## What a Helper Is Not

- Not a utility function bag (that's a domain service or inline code)
- Not a business logic layer
- Not DI-registered
- Not callable from usecases, controllers, or any service other than its paired service-helper

## The Pairing Rule

Every helper has exactly one service-helper that owns it:

```
GithubReadHelper  ←→  GithubReadService  (service-helper)
SlackPostHelper   ←→  SlackPostService   (service-helper)
StripeApiHelper   ←→  StripePaymentService (service-helper)
```

No other class may call `GithubReadHelper`. If a usecase needs GitHub data, it calls `GithubReadService`.

## Structure

```typescript
class GithubReadHelper {
  fetchRepo(owner: string, repo: string): RawGithubRepoResponse {
    return octokit.repos.get({ owner, repo });
  }

  listOrgRepos(org: string): RawGithubRepoResponse[] {
    return octokit.repos.listForOrg({ org });
  }
}
```

No constructor injection. Methods take plain inputs, return raw SDK/API responses. No `if/else` for business rules.

## Naming

Mirror the third-party tech and operation:

| Helper | Wraps |
|---|---|
| `GithubReadHelper` | GitHub API read operations |
| `SlackPostHelper` | Slack message posting |
| `StripeChargeHelper` | Stripe charge API |
| `S3UploadHelper` | AWS S3 upload operations |

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Helper called directly from a usecase | Call the paired service-helper instead |
| Helper called from a controller | Move through service-helper → service/usecase |
| Helper containing `if/else` domain logic | Move logic to the service-helper |
| Helper calling a repository | Helpers wrap external tech only — repositories are internal |
| Helper registered in DI | Never — helpers are stateless, not managed by container |
| Two service-helpers sharing one helper | Split the helper or create a domain service |
