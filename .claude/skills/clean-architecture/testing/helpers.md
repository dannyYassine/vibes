# Testing Helpers

**Test type: Unit — always**

Helpers are the primary target for unit testing. They are stateless, pure wrappers with no injected dependencies, which makes them the ideal unit test subject.

## Pattern

No setup, no mocking. Just call the method and assert:

```typescript
describe('GithubReadHelper', () => {
  test('parses owner from full repo path', () => {
    expect(GithubReadHelper.parseOwner('owner/repo')).toBe('owner');
  });

  test('parses repo name from full repo path', () => {
    expect(GithubReadHelper.parseRepoName('owner/repo')).toBe('repo');
  });

  test('returns null for path without separator', () => {
    expect(GithubReadHelper.parseRepoName('invalid')).toBeNull();
  });
});
```

## Coverage Expectations

- Test every public method
- Cover every branch (if/else, null checks, edge inputs)
- Cover boundary values (empty string, zero, null, max length)
- These tests run fast — there is no excuse for incomplete coverage

## What NOT to Do

```typescript
// WRONG — mocking in a helper test means the helper has hidden dependencies
mockSdkClient.fetch.mockResolvedValue(...);

// Helpers should not have dependencies to mock
// If you need to mock something, the class is not a helper — re-classify it
```

If a helper requires mocking to test, it has dependencies and should be reclassified as a service-helper or service.
