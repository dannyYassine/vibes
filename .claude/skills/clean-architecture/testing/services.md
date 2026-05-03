# Testing Services

**Test type: Integration** (via the usecase that calls the service)

## Rule

Do not test services in isolation. Their behaviour is validated as part of the usecase integration test that exercises them. The service's correctness is proven when the usecase test passes.

## Why Not Test Services Directly

Testing a service directly means duplicating coverage that already exists in the usecase test. It also binds the test to implementation details (which service a usecase calls) rather than observable outcomes.

## Rare Exception: Service-Helpers

A service-helper may warrant a unit test when its business logic is complex and not easily exercised through the full integration path:

```typescript
describe('GithubReadService', () => {
  test('filters out archived repos', async () => {
    mockGithubReadHelper.listOrgRepos.mockResolvedValue([
      { name: 'active', archived: false },
      { name: 'old', archived: true },
    ]);

    const repos = await githubReadService.getActiveRepos('myorg');

    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('active');
  });
});
```

This is justified because:
- The helper is mocked (the test is about the service's business logic, not the SDK)
- The filtering logic is non-trivial and the integration path requires real GitHub API access

## Default Behaviour

If you are about to write a test that instantiates a service directly without a clear justification, write a usecase integration test instead.
