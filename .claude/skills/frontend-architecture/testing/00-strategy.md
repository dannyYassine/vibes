# Testing Strategy

This skill prescribes a **two-tier testing approach**:

1. **Integration tests at the Service layer** — the primary form of testing. Cover real Service → Entity → ViewModel flows with only the Gateway faked. One test exercises 4 layers.
2. **Component tests with mocked Presenters** — the only kind of view-level test. Verify rendering and that user actions call the right Presenter methods with the right arguments.

Individual unit tests on Entity, ViewModel, or Presenter in isolation are reserved for **bug fixes** — when an integration test fails and a focused regression test would document the bug. They're not the default form of testing.

## The non-negotiable rule

**No test ever makes a real HTTP call.** The Gateway layer is always faked, in every test, at every layer. A test suite that hits the network is not a test suite — it's a fragile, slow, environment-dependent thing that fails on planes and during outages.

Mock at the Gateway boundary, not above it. Mocking Service means tests verify mocks, not real code.

## Why integration over unit tests

Most "unit tests" of frontend code test things that are too trivial to be worth testing in isolation. A Service's API-model→Entity mapping has no logic to mock around — testing it through a Service test verifies the same code path with the bonus of catching integration mistakes (wrong Gateway wired into the Service, ViewModel built from the wrong Entity, etc.).

The Service owns the API-model→Entity mapping (its private `toUser`/`toUpdatePayload` methods), so the integration test is exactly where mapping bugs surface — snake_case not converted, missing `Date` coercion, nullable fields mishandled.

The test pyramid for this architecture:

```
        [Component tests]      ← mocked Presenter, verify render + intent
        /                  \
       [Service integration tests]  ← fake Gateway only, real everything else
             (the bulk of tests)
               |
        [Targeted unit tests]   ← only when fixing a bug or testing tricky logic
```

## What integration tests cover

A service integration test exercises:

- Service's API-model → Entity mapping (the private `toUser`/`toUpdatePayload` methods)
- Service's business logic and authorization
- Entity invariants and domain methods
- (Optionally) ViewModel projections, when the test asserts on UI-ready output

This means a single integration test for `UserService.changeRole` catches:
- Wrong field mapping in `UserService.toUser`
- Wrong authorization rule in `UserService`
- Wrong invariant on `User` entity
- Wrong API-model payload built for the Gateway

That's the value: each test exercises real code paths, not isolated mocks.

## Where unit tests still earn their keep

- **Bug fixes.** When you find a defect, write a focused unit test that fails before the fix and passes after. This documents the bug forever.
- **Tricky pure logic.** Date math, parsing edge cases, complex ViewModel formatting. Faster feedback than spinning up a full integration test.
- **Entity invariants.** Constructor validation logic is leaf-level — a unit test directly on the entity constructor is the right tool.

In all three cases, the unit test is **additive** to the integration tests, not a replacement for them.

## File structure (strict)

```
src/features/<feature-name>/
└── __tests__/
    ├── <feature>.integration.test.ts     # PRIMARY
    ├── <Feature>View.test.ts(.tsx)       # component test, mocked Presenter
    ├── fakes/
    │   ├── Fake<Feature>Gateway.ts
    │   └── <feature>ApiModelFactory.ts
    └── unit/                             # bug fixes / tricky logic only
```

The `__tests__/` folder lives alongside the feature it tests. Unit tests go in a `unit/` subfolder to make their secondary status visually obvious.

## Reference files

Read these in order:

1. `testing/01-fakes.md` — Building in-memory fake Gateways
2. `testing/02-test-container.md` — Test-time DI container with fakes wired in
3. `testing/03-service-integration.md` — **Primary test type**. Service-level integration tests with the FakeGateway
4. `testing/04-component-react.md` — React component tests with mocked Presenter
5. `testing/05-component-vue.md` — Vue component tests with mocked Presenter
6. `testing/06-unit-tests.md` — When and how to write targeted unit tests (bug fixes only)
7. `testing/07-vitest-setup.md` — Vitest configuration, helpers, and conventions

## Quick reference: which test for what?

| Scenario | Test type |
|----------|-----------|
| New feature | Service integration test + component test |
| New use case on existing feature | Add to existing service integration test file |
| Bug fix in API-model→Entity mapping | Unit test on Service mapping (regression) + integration test still passes |
| Bug fix in business rule | Add scenario to integration test |
| Bug fix in date formatting | Unit test on ViewModel |
| Component renders wrong | Component test with mocked Presenter |
| Component calls wrong method on click | Component test with mocked Presenter |
| Visual regression | Out of scope — use Storybook + visual diff tools |
