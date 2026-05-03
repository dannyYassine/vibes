# Unit Testing

## Philosophy

Test a single class in isolation with all or most dependencies mocked.

**Helpers are the primary — and almost only — target for unit tests.** They are pure, stateless, and have no external dependencies, making them the ideal unit test subject.

For all other layers, prefer integration tests. Unit tests on services, usecases, handlers, etc. are very rare and only justified when:
- A class has complex branching logic that is impractical to exercise through a full integration test
- The integration path is too expensive to set up for a specific edge case

When in doubt, write an integration test instead.

## Helpers: The Standard Case

Helpers need no mocking — they are stateless wrappers. Just call the method and assert:

```typescript
describe('GithubReadHelper', () => {
  test('parses repo name from full path', () => {
    expect(GithubReadHelper.parseRepoName('owner/repo')).toBe('repo');
  });

  test('returns null for invalid path', () => {
    expect(GithubReadHelper.parseRepoName('invalid')).toBeNull();
  });
});
```

Cover every public method. Cover every branch. These tests are fast and require no setup.

## Rare Exception: Other Layers

When a unit test is justified outside of helpers:

```typescript
// Only if the edge case cannot be reached via integration
it('returns fallback price when pricing service throws', async () => {
  mockPricingService.calculate.mockRejectedValue(new Error('timeout'));
  const result = await orderService.getPrice(orderId);
  expect(result).toBe(0);
});
```

## Rules

- No DB, no network, no filesystem
- Mock at the boundary of the class under test
- If you find yourself writing more than 2-3 unit tests for a non-helper class, consider whether integration tests would be more valuable
