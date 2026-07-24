# Service Providers

## Rule

Service providers wire dependencies into the DI container. They are the single place where bindings, singletons, and aliases are registered — never scattered across modules or done inline.

There are three tiers:

1. **Module Service Provider** — one per module; registers that module's dependencies
2. **Application Service Provider** — single per app; loads all module service providers
3. **Event Service Provider** — single per app; maps events to listeners, registers subscribers

## Tier 1: Module Service Provider

Each module has exactly one service provider. It owns all DI bindings for that module.

```
app/
  Modules/
    User/
      Providers/
        UserServiceProvider.php
    Order/
      Providers/
        OrderServiceProvider.php
    Payment/
      Providers/
        PaymentServiceProvider.php
```

```php
class UserServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Repository — interface to implementation
        $this->app->bind(UserRepository::class, OrmUserRepository::class);

        // Service
        $this->app->singleton(NotificationService::class);

        // Usecase — transient
        $this->app->bind(CreateUserUseCase::class);
        $this->app->bind(GetUserUseCase::class);
    }

    public function boot(): void
    {
        // Only for side-effects after all providers have registered
    }
}
```

### Rules

- `register()`: bindings only — no side-effects, no calls to usecases/services, no event dispatching
- `boot()`: side-effects only — event listeners, model observers, route overrides. Never bind here
- One provider per module, no exceptions
- Do not bind repositories, services, or usecases from another module's provider

## Tier 2: Application Service Provider

Single per app. Loads all module service providers. Does no bindings of its own.

```php
class ApplicationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->register(UserServiceProvider::class);
        $this->app->register(OrderServiceProvider::class);
        $this->app->register(PaymentServiceProvider::class);
        // ... every module registered here
    }

    public function boot(): void
    {
        //
    }
}
```

Registered in `config/app.php` as the only provider (all module providers are loaded through it):

```php
'providers' => [
    App\Providers\ApplicationServiceProvider::class,
],
```

### Rules

- Registers module providers only — no direct bindings
- Never registers module providers from inside another module provider
- Load order matters when providers have inter-module deps
- The provider list in `config/app.php` should be minimal (ideally just the ApplicationServiceProvider)

## Tier 3: Event Service Provider

Single per app. Maps events to listeners and registers subscribers. Keeps all event routing in one place.

```php
class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        UserRegisteredEvent::class => [
            SendWelcomeEmailListener::class,
            CreateAuditLogListener::class,
        ],
        OrderPlacedEvent::class => [
            UpdateInventoryListener::class,
        ],
    ];

    protected $subscribe = [
        UserRegisteredSubscriber::class,
        OrderNotificationSubscriber::class,
    ];

    public function boot(): void
    {
        parent::boot();
    }
}
```

Registered alongside the ApplicationServiceProvider in `config/app.php`:

```php
'providers' => [
    App\Providers\ApplicationServiceProvider::class,
    App\Providers\EventServiceProvider::class,
],
```

### Rules

- One event can have multiple listeners — order matters (first in array runs first)
- One subscriber class handles multiple events via a `subscribe` method
- Listeners = synchronous, inline execution
- Subscribers = can defer via queue but registration stays here
- Do not register listeners or subscribers in module providers — all go here

## Key Constraints

- **No bindings outside a service provider** — not in routes, controllers, or facades
- **Module providers do not cross-register** — UserServiceProvider never binds an Order repository
- **ApplicationServiceProvider does not bind** — it delegates to module providers
- **EventServiceProvider does not bind usecases** — it maps events to listeners only
- **boot() is not a second register()** — side-effects only, never bindings

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Binding repositories directly in a controller or usecase | Move to the module's service provider |
| Several module providers binding the same interface | Pick one module to own the binding; others depend on the interface |
| `boot()` method binding a repository | Move binding to `register()` |
| `register()` method dispatching events or calling services | Move side-effects to `boot()` |
| Registering EventServiceProvider inside ApplicationServiceProvider | Keep them as separate top-level providers in `config/app.php` |
| Listener registration scattered across multiple providers | Consolidate in EventServiceProvider |
| Module provider registering another module's bindings | Each module owns its own bindings |