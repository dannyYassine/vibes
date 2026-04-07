# CostCoop - Project Structure

## Monorepo Layout

```
cost-coop/
├── .claude/
│   └── plans/                    # Project planning documents
│
├── crates/                       # Rust workspace members
│   ├── api/                      # Axum REST API server
│   │   ├── src/
│   │   │   ├── main.rs           # Entry point, server startup
│   │   │   ├── config.rs         # Environment/config loading
│   │   │   ├── routes/           # Route handlers organized by domain
│   │   │   │   ├── mod.rs
│   │   │   │   ├── auth.rs       # Login, register, OAuth callbacks
│   │   │   │   ├── users.rs      # Profile CRUD
│   │   │   │   ├── stores.rs     # Costco location endpoints
│   │   │   │   ├── menu.rs       # Menu item endpoints
│   │   │   │   ├── orders.rs     # Order lifecycle endpoints
│   │   │   │   ├── payments.rs   # Payment processing
│   │   │   │   └── notifications.rs
│   │   │   ├── middleware/        # Tower middleware
│   │   │   │   ├── mod.rs
│   │   │   │   ├── auth.rs       # JWT validation
│   │   │   │   └── rate_limit.rs
│   │   │   ├── error.rs          # Unified error types
│   │   │   └── state.rs          # App state (DB pool, config)
│   │   └── Cargo.toml
│   │
│   ├── db/                       # Database layer
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── models/           # Rust structs mapping to DB tables
│   │   │   │   ├── mod.rs
│   │   │   │   ├── user.rs
│   │   │   │   ├── store.rs
│   │   │   │   ├── menu_item.rs
│   │   │   │   ├── order.rs
│   │   │   │   ├── payment.rs
│   │   │   │   └── notification.rs
│   │   │   ├── queries/          # SQL query functions
│   │   │   │   ├── mod.rs
│   │   │   │   ├── user.rs
│   │   │   │   ├── store.rs
│   │   │   │   ├── menu.rs
│   │   │   │   ├── order.rs
│   │   │   │   └── payment.rs
│   │   │   └── pool.rs           # Connection pool setup
│   │   ├── migrations/           # SQL migrations
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_create_stores.sql
│   │   │   ├── 003_create_menu_items.sql
│   │   │   ├── 004_create_orders.sql
│   │   │   └── ...
│   │   └── Cargo.toml
│   │
│   ├── shared/                   # Shared types between API and mobile core
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── dto/              # Data transfer objects (API request/response)
│   │   │   │   ├── mod.rs
│   │   │   │   ├── auth.rs
│   │   │   │   ├── user.rs
│   │   │   │   ├── store.rs
│   │   │   │   ├── menu.rs
│   │   │   │   ├── order.rs
│   │   │   │   └── payment.rs
│   │   │   └── validation.rs     # Shared validation logic
│   │   └── Cargo.toml
│   │
│   └── core/                     # Rust mobile core library (via UniFFI)
│       ├── src/
│       │   ├── lib.rs            # UniFFI scaffolding + re-exports
│       │   ├── api_client.rs     # HTTP client wrapping reqwest
│       │   ├── auth.rs           # Auth logic (login, register, token mgmt)
│       │   ├── orders.rs         # Order operations (create, accept, status)
│       │   ├── stores.rs         # Store/menu fetching
│       │   ├── payments.rs       # Payment method management
│       │   ├── notifications.rs  # Push notification registration
│       │   ├── cart.rs           # Cart state and calculations
│       │   ├── user.rs           # Profile management
│       │   ├── runner.rs         # Runner-specific logic
│       │   ├── state.rs          # Core app state container
│       │   └── error.rs          # Error types exposed to native
│       ├── uniffi.toml           # UniFFI configuration
│       ├── src/costcoop.udl      # UniFFI interface definition (if using UDL)
│       └── Cargo.toml
│
├── ios/                          # iOS native app (Xcode project)
│   ├── CostCoop.xcodeproj/
│   ├── CostCoop/
│   │   ├── App/
│   │   │   ├── CostCoopApp.swift        # App entry point
│   │   │   └── AppDelegate.swift        # Push notifications setup
│   │   ├── Views/                       # SwiftUI views
│   │   │   ├── Auth/
│   │   │   │   ├── LoginView.swift
│   │   │   │   ├── RegisterView.swift
│   │   │   │   └── ForgotPasswordView.swift
│   │   │   ├── Requester/
│   │   │   │   ├── HomeView.swift
│   │   │   │   ├── MenuView.swift
│   │   │   │   ├── ItemDetailView.swift
│   │   │   │   ├── CartView.swift
│   │   │   │   ├── CheckoutView.swift
│   │   │   │   ├── OrderStatusView.swift
│   │   │   │   └── OrderHistoryView.swift
│   │   │   ├── Runner/
│   │   │   │   ├── RunnerDashboardView.swift
│   │   │   │   ├── RunnerOrderDetailView.swift
│   │   │   │   ├── EarningsView.swift
│   │   │   │   └── RunnerStatsView.swift
│   │   │   ├── Profile/
│   │   │   │   ├── ProfileView.swift
│   │   │   │   └── SettingsView.swift
│   │   │   └── Shared/
│   │   │       ├── StoreSelectorView.swift
│   │   │       ├── RatingStarsView.swift
│   │   │       ├── OrderCardView.swift
│   │   │       ├── MenuCardView.swift
│   │   │       └── LoadingView.swift
│   │   ├── ViewModels/                  # ObservableObjects bridging Rust core
│   │   │   ├── AuthViewModel.swift
│   │   │   ├── MenuViewModel.swift
│   │   │   ├── CartViewModel.swift
│   │   │   ├── OrderViewModel.swift
│   │   │   ├── RunnerViewModel.swift
│   │   │   └── ProfileViewModel.swift
│   │   ├── Navigation/
│   │   │   ├── AppRouter.swift          # Tab-based navigation
│   │   │   └── DeepLinkHandler.swift
│   │   ├── Extensions/                  # Swift extensions + helpers
│   │   ├── Theme/
│   │   │   ├── Colors.swift
│   │   │   ├── Typography.swift
│   │   │   └── Spacing.swift
│   │   └── Generated/                   # UniFFI-generated Swift bindings
│   │       └── costcoop.swift
│   ├── Assets.xcassets/
│   └── Info.plist
│
├── android/                      # Android native app (Gradle project)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/costcoop/
│   │   │   │   ├── CostCoopApp.kt              # Application class
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   │   ├── RegisterScreen.kt
│   │   │   │   │   │   └── ForgotPasswordScreen.kt
│   │   │   │   │   ├── requester/
│   │   │   │   │   │   ├── HomeScreen.kt
│   │   │   │   │   │   ├── MenuScreen.kt
│   │   │   │   │   │   ├── ItemDetailScreen.kt
│   │   │   │   │   │   ├── CartScreen.kt
│   │   │   │   │   │   ├── CheckoutScreen.kt
│   │   │   │   │   │   ├── OrderStatusScreen.kt
│   │   │   │   │   │   └── OrderHistoryScreen.kt
│   │   │   │   │   ├── runner/
│   │   │   │   │   │   ├── RunnerDashboardScreen.kt
│   │   │   │   │   │   ├── RunnerOrderDetailScreen.kt
│   │   │   │   │   │   ├── EarningsScreen.kt
│   │   │   │   │   │   └── RunnerStatsScreen.kt
│   │   │   │   │   ├── profile/
│   │   │   │   │   │   ├── ProfileScreen.kt
│   │   │   │   │   │   └── SettingsScreen.kt
│   │   │   │   │   ├── shared/
│   │   │   │   │   │   ├── StoreSelectorView.kt
│   │   │   │   │   │   ├── RatingStarsView.kt
│   │   │   │   │   │   ├── OrderCardView.kt
│   │   │   │   │   │   ├── MenuCardView.kt
│   │   │   │   │   │   └── LoadingView.kt
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── AppNavigation.kt
│   │   │   │   │   └── theme/
│   │   │   │   │       ├── Color.kt
│   │   │   │   │       ├── Type.kt
│   │   │   │   │       └── Theme.kt
│   │   │   │   ├── viewmodel/
│   │   │   │   │   ├── AuthViewModel.kt
│   │   │   │   │   ├── MenuViewModel.kt
│   │   │   │   │   ├── CartViewModel.kt
│   │   │   │   │   ├── OrderViewModel.kt
│   │   │   │   │   ├── RunnerViewModel.kt
│   │   │   │   │   └── ProfileViewModel.kt
│   │   │   │   └── generated/                   # UniFFI-generated Kotlin bindings
│   │   │   │       └── costcoop.kt
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
├── Cargo.toml                    # Workspace root
├── Cargo.lock
├── Makefile                      # Build commands (build-ios, build-android, generate-bindings)
├── .env.example                  # Environment variable template
├── docker-compose.yml            # Local dev (Postgres, etc.)
├── README.md
└── .gitignore
```

## Workspace Configuration

The project uses a Cargo workspace for the Rust crates. The `core` crate uses UniFFI to generate Swift and Kotlin bindings, which are consumed by the native `ios/` and `android/` projects. The `shared` crate contains DTOs used by both the API server and the mobile core, ensuring type safety across the full stack.

## Build Pipeline

```
┌─────────┐     UniFFI      ┌─────────────┐     Xcode      ┌─────────┐
│  core   │ ──────────────► │ costcoop.swift │ ───────────► │ iOS .ipa │
│  crate  │                 └─────────────┘                └─────────┘
│         │     UniFFI      ┌──────────────┐    Gradle     ┌──────────┐
│         │ ──────────────► │ costcoop.kt   │ ───────────► │ .apk/.aab│
└─────────┘                 └──────────────┘               └──────────┘

Build targets:
  iOS:     aarch64-apple-ios, aarch64-apple-ios-sim
  Android: aarch64-linux-android, armv7-linux-androideabi, x86_64-linux-android
```
