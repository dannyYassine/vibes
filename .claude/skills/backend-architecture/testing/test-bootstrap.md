# Test Bootstrap

## Rule

Deep integration tests need the full application — all service providers registered, events wired, container primed. The test bootstrap is a single helper that creates and boots the app once, shared across all deep integration test suites.

**This is not required for most usecase tests.** Prefer light integration (fake events/jobs, per-test container setup) unless you need real listeners, subscribers, or the full event pipeline to execute.

See `testing/types/integration.md` for when to choose light vs deep.

## The Pattern

```php
// tests/Bootstrap.php

class Bootstrap
{
    private static ?Application $app = null;

    public static function app(): Application
    {
        if (self::$app === null) {
            self::$app = self::createApp();
        }
        return self::$app;
    }

    private static function createApp(): Application
    {
        $app = new Application(__DIR__ . '/../');

        $app->singleton(Illuminate\Contracts\Http\Kernel::class, App\Http\Kernel::class);
        $app->singleton(Illuminate\Contracts\Console\Kernel::class, App\Console\Kernel::class);

        // Register the application service provider — loads all module providers
        $app->register(App\Providers\ApplicationServiceProvider::class);

        // Register the event service provider — wires all event→listener maps
        $app->register(App\Providers\EventServiceProvider::class);

        $app->boot();

        return $app;
    }
}
```

## Usage in Tests

```php
describe('CreateUserUseCase', function () {
    beforeAll(function () {
        $this->app = Bootstrap::app();
        $this->app->instance(EventServiceProvider::class,
            $this->app->make(EventServiceProvider::class)
        );
    });

    beforeEach(function () {
        // Refresh database between tests
        $this->app->make(RefreshDatabaseState::class)->refresh();
    });

    test('creates user and dispatches UserRegisteredEvent', function () {
        $usecase = $this->app->make(CreateUserUseCase::class);
        $dto = new CreateUserDto('jane@example.com', 'Jane', $roleId);

        $user = $usecase->execute($dto);

        expect($user->email)->toBe('jane@example.com');
        expect(Event::dispatched(UserRegisteredEvent::class))->toBeTrue();
    });
});
```

## What Gets Bootstrapped

| Component | Why |
|---|---|
| ApplicationServiceProvider | Loads every module provider → all bindings registered |
| EventServiceProvider | All event→listener maps + subscriber registration |
| HTTP Kernel | Available for functional request tests |
| Console Kernel | Available for command tests |
| Config | All config files loaded |

## Rules

- Boot once per test suite, not per test
- Do not register providers selectively in tests — boot the real app
- Swap external services (mail, SMS, payment gateways) via the container after boot, not by excluding providers
- Use a fresh DB transaction per test (rollback after each)

## Where This File Lives

```
tests/
  Bootstrap.php          <--- shared bootstrap
  Integration/
    User/
      CreateUserUseCaseTest.php
      GetUserUseCaseTest.php
    Order/
      PlaceOrderUseCaseTest.php
    ...
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Each test suite creating its own app | Single Bootstrap::app() shared across suites |
| Selectively registering only some module providers | Boot the full app — partial boot hides broken wiring |
| Mocking the container in integration tests | Use the real container; swap only external side-effects |
| Calling `new Application()` in every test | Use Bootstrap::app() singleton |