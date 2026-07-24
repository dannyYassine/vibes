# Testing Service Providers

**Test type: Integration**

## Rule

Test that the container resolves every registered binding successfully and that events map to the correct listeners. Do not test Laravel's container — test that your wiring is correct.

## Module Service Provider — Binding Resolution

Verify every binding resolves without error. Catch misconfigured bindings (missing implementations, interface mismatches, unresolved constructor params).

```php
describe('UserServiceProvider', () => {
    beforeEach(function () {
        $this->app->register(UserServiceProvider::class);
    });

    test('resolves UserRepository', function () {
        $repo = $this->app->make(UserRepository::class);
        expect($repo)->toBeInstanceOf(UserRepository::class);
        expect($repo)->toBeInstanceOf(OrmUserRepository::class);
    });

    test('resolves CreateUserUseCase as transient', function () {
        $a = $this->app->make(CreateUserUseCase::class);
        $b = $this->app->make(CreateUserUseCase::class);
        expect($a)->toBeInstanceOf(CreateUserUseCase::class);
        expect($a)->not->toBe($b);
    });

    test('resolves NotificationService as singleton', function () {
        $a = $this->app->make(NotificationService::class);
        $b = $this->app->make(NotificationService::class);
        expect($a)->toBe($b);
    });

    test('resolves all usecases without error', function () {
        $usecases = [
            CreateUserUseCase::class,
            GetUserUseCase::class,
            UpdateUserUseCase::class,
            DeleteUserUseCase::class,
        ];
        foreach ($usecases as $usecase) {
            expect(fn () => $this->app->make($usecase))->not->toThrow();
        }
    });
});
```

## ApplicationServiceProvider — Module Provider Loading

Verify every module provider is registered. Catches missing module registrations when new modules are added.

```php
describe('ApplicationServiceProvider', () => {
    test('registers all module service providers', function () {
        $this->app->register(ApplicationServiceProvider::class);

        $providers = $this->app->getLoadedProviders();
        expect($providers)->toHaveKey(UserServiceProvider::class);
        expect($providers)->toHaveKey(OrderServiceProvider::class);
        expect($providers)->toHaveKey(PaymentServiceProvider::class);
        // ... every module checked
    });

    test('every module provider resolves its own bindings', function () {
        $this->app->register(ApplicationServiceProvider::class);

        // Sample one binding per module
        expect(fn () => $this->app->make(UserRepository::class))->not->toThrow();
        expect(fn () => $this->app->make(OrderRepository::class))->not->toThrow();
        expect(fn () => $this->app->make(PaymentGatewayService::class))->not->toThrow();
    });
});
```

## EventServiceProvider — Event to Listener Mapping

Verify each event triggers the correct listener(s). Use a spy on the listener rather than testing the listener's internal logic.

```php
describe('EventServiceProvider', () => {
    beforeEach(function () {
        $this->app->register(EventServiceProvider::class);
        $this->app->register(ApplicationServiceProvider::class);
    });

    test('UserRegisteredEvent triggers SendWelcomeEmailListener', function () {
        $listener = Mockery::mock(SendWelcomeEmailListener::class);
        $listener->shouldReceive('handle')->once();
        $this->app->instance(SendWelcomeEmailListener::class, $listener);

        event(new UserRegisteredEvent(user: User::factory()->make()));

        // If listener not triggered, the event mapping is missing
    });

    test('UserRegisteredEvent triggers CreateAuditLogListener', function () {
        $listener = Mockery::mock(CreateAuditLogListener::class);
        $listener->shouldReceive('handle')->once();
        $this->app->instance(CreateAuditLogListener::class, $listener);

        event(new UserRegisteredEvent(user: User::factory()->make()));
    });

    test('OrderPlacedEvent triggers UpdateInventoryListener', function () {
        $listener = Mockery::mock(UpdateInventoryListener::class);
        $listener->shouldReceive('handle')->once();
        $this->app->instance(UpdateInventoryListener::class, $listener);

        event(new OrderPlacedEvent(order: Order::factory()->make()));
    });
});
```

## What to Cover

| Provider | What to test | Why |
|---|---|---|
| Module provider | Every binding resolves | Catches missing deps, typos in class strings, interface mismatches |
| Module provider | Transient vs singleton | Ensures lifetime correctness |
| ApplicationServiceProvider | Every module provider is loaded | Prevents missing module registration when adding new modules |
| EventServiceProvider | Every event maps to the correct listener(s) | Catches missing `$listen` entries |
| EventServiceProvider | Every subscriber is registered | Catches missing `$subscribe` entries |

## Setup

- Use Laravel's `$this->app` (the `Application` instance) from the test base class
- Register only the provider under test, not the full app — isolate the wiring
- Use `$this->app->make()` to trigger autoloading and catch missing deps
- Use `$this->app->instance()` to swap a listener with a spy for event mapping tests
- Reset between tests — Laravel's `RefreshDatabase` or `$this->artisan('config:clear')` as needed

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Testing that Laravel's container works | Test your bindings, not the framework |
| Mocking every dependency to resolve one binding | Use `$this->app->make()` — real resolution catches real issues |
| Only testing `register()` runs without error | Assert each binding resolves to the expected concrete class |
| Skipping EventServiceProvider tests | Missing event maps are silent failures — test them |
| Registering all providers for every test | Register only the provider under test for isolation |