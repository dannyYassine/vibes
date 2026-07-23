# Service-Helper

## Rule

A service-helper is a one-to-one pair with a Helper class. It contains the required application logic around third-party SDK calls. The helper is the thin wrapper; the service-helper is where the logic lives.

**Only the service-helper may call its paired helper.** No other class touches the helper directly.

## Why This Layer Exists

Helpers wrap third-party SDKs — they are thin, stateless, and contain no logic:

```typescript
class GithubReadHelper {
  fetchRepoData(owner: string, repo: string): RawGithubRepo {
    return octokit.repos.get({ owner, repo });
  }
}
```

But real applications always need logic around those calls:

- Transform raw API responses into domain models
- Filter, map, or aggregate results
- Handle API pagination
- Map error types from SDK exceptions to domain errors
- Validate response shape before passing it upward

That logic belongs in the service-helper, not in the helper, not scattered across usecases:

```typescript
class GithubReadService {
  constructor(private readonly helper: GithubReadHelper) {}

  async getActiveRepos(org: string): Promise<Repo[]> {
    const raw = this.helper.fetchRepoData(org, '*');
    // Business logic lives here — filtering, mapping, error handling
    return raw
      .filter(r => !r.archived)
      .map(r => Repo.fromRaw(r));
  }

  async getRepoById(owner: string, repo: string): Promise<Repo> {
    try {
      const raw = this.helper.fetchRepoData(owner, repo);
      return Repo.fromRaw(raw);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new RepoNotFoundError(`${owner}/${repo}`);
      }
      throw new ExternalServiceError('GitHub API error', { cause: error });
    }
  }
}
```

## Why Not Put Logic in the Helper?

Helpers are mocked in tests. If logic lives in the helper, it cannot be tested without calling the real SDK. By putting logic in the service-helper, the helper is mocked and the service-helper's logic is fully testable:

```typescript
// Test — mock the helper, test the logic
const mockHelper = { fetchRepoData: jest.fn() };
const service = new GithubReadService(mockHelper);

mockHelper.fetchRepoData.mockReturnValue([{ archived: true }, { archived: false }]);

const result = await service.getActiveRepos('my-org');

expect(result).toHaveLength(1);
expect(mockHelper.fetchRepoData).toHaveBeenCalledWith('my-org', '*');
```

## Naming

Mirror the helper. Keep naming consistent per project:

| Helper | Service-Helper |
|---|---|
| `GithubReadHelper` | `GithubReadService` |
| `SlackPostHelper` | `SlackPostService` |
| `StripeChargeHelper` | `StripePaymentService` |
| `S3UploadHelper` | `S3UploadService` |

If the project convention uses a `ServiceHelper` suffix, that is also valid — just stay consistent:

| Helper | Service-Helper |
|---|---|
| `GithubReadHelper` | `GithubReadServiceHelper` |
| `SlackPostHelper` | `SlackPostServiceHelper` |

## Structure

```typescript
class SlackPostService {
  constructor(private readonly helper: SlackPostHelper) {}

  async sendAlert(channel: string, message: string): Promise<void> {
    const formatted = this.formatAlertMessage(message);
    await this.helper.postMessage(channel, formatted);
  }

  private formatAlertMessage(msg: string): string {
    return `[ALERT] ${msg}`;
  }
}
```

## Allowed Calls

- Its paired helper (exclusive — no other class may call this helper)
- Other services
- Repositories
- Factories
- Handlers (via `new Handler(plainVars)`)

## Forbidden Calls

- Usecases
- Delivery-layer concerns (controllers, commands, jobs, listeners, subscribers)
- Any helper other than its paired helper

## DI Registration

Registered as singleton. The paired helper is NOT registered — the service-helper holds a direct reference or receives it via constructor:

```typescript
container.bind(GithubReadService).toSelf().inSingletonScope();
// GithubReadHelper is NOT in the container
```

## Key Constraints

- **1:1 with a helper** — never one service-helper for multiple helpers, never one helper shared by multiple service-helpers
- **Helper is always mocked in tests** — the service-helper contains the logic that gets tested
- **Service-helper may call other services** — if the third-party logic needs additional domain data, inject other services
- **Service-helper may call repositories** — if the third-party result needs enrichment from local data

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Logic in the helper (untestable) | Move to the service-helper |
| Usecase calling the helper directly | Call the service-helper instead |
| Service-helper calling another helper | Route through that helper's paired service-helper |
| Service-helper that just delegates (no logic) | Re-evaluate if a helper is needed, or merge into an existing service |
| Two service-helpers sharing one helper | Split the helper or create a domain service |
| Helper registered in DI | Helpers are stateless — instantiate inline or inject into the service-helper |