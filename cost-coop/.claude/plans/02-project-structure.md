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
│   └── shared/                   # Shared types used by the API server
│       ├── src/
│       │   ├── lib.rs
│       │   ├── dto/              # Data transfer objects (API request/response)
│       │   │   ├── mod.rs
│       │   │   ├── auth.rs
│       │   │   ├── user.rs
│       │   │   ├── store.rs
│       │   │   ├── menu.rs
│       │   │   ├── order.rs
│       │   │   └── payment.rs
│       │   └── validation.rs     # Shared validation logic
│       └── Cargo.toml
│
├── mobile/                       # React Native app (Expo)
│   ├── app.json                  # Expo configuration
│   ├── App.tsx                   # App entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── eas.json                  # Expo Application Services build config
│   ├── assets/                   # Static assets (images, fonts)
│   ├── src/
│   │   ├── screens/              # Screen components
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   └── ForgotPasswordScreen.tsx
│   │   │   ├── requester/
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   ├── MenuScreen.tsx
│   │   │   │   ├── ItemDetailScreen.tsx
│   │   │   │   ├── CartScreen.tsx
│   │   │   │   ├── CheckoutScreen.tsx
│   │   │   │   ├── OrderStatusScreen.tsx
│   │   │   │   └── OrderHistoryScreen.tsx
│   │   │   ├── runner/
│   │   │   │   ├── RunnerDashboardScreen.tsx
│   │   │   │   ├── RunnerOrderDetailScreen.tsx
│   │   │   │   ├── EarningsScreen.tsx
│   │   │   │   └── RunnerStatsScreen.tsx
│   │   │   └── profile/
│   │   │       ├── ProfileScreen.tsx
│   │   │       └── SettingsScreen.tsx
│   │   ├── components/           # Reusable UI components
│   │   │   ├── StoreSelectorView.tsx
│   │   │   ├── RatingStars.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── MenuCard.tsx
│   │   │   ├── LoadingView.tsx
│   │   │   └── Button.tsx
│   │   ├── services/             # API client and external service wrappers
│   │   │   ├── api.ts            # Axios instance with auth headers, interceptors
│   │   │   ├── authService.ts    # Login, register, OAuth token exchange
│   │   │   ├── orderService.ts   # Order CRUD
│   │   │   ├── storeService.ts   # Store and menu fetching
│   │   │   ├── paymentService.ts # Payment method management
│   │   │   ├── runnerService.ts  # Runner operations
│   │   │   └── userService.ts    # Profile management
│   │   ├── state/                # Zustand stores
│   │   │   ├── authStore.ts      # Auth token, user profile
│   │   │   ├── cartStore.ts      # Cart items, totals
│   │   │   ├── orderStore.ts     # Active order, order history
│   │   │   ├── runnerStore.ts    # Runner profile, availability
│   │   │   └── storeStore.ts     # Selected store, menu items
│   │   ├── navigation/           # React Navigation setup
│   │   │   ├── AppNavigator.tsx  # Root navigator (auth vs main)
│   │   │   ├── MainTabs.tsx      # Bottom tab navigator
│   │   │   ├── RequesterStack.tsx
│   │   │   ├── RunnerStack.tsx
│   │   │   └── ProfileStack.tsx
│   │   ├── theme/                # Design tokens
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   └── spacing.ts
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── api.ts            # API request/response types
│   │   │   ├── models.ts         # Domain models
│   │   │   └── navigation.ts     # Navigation param types
│   │   └── utils/                # Helpers and utilities
│   │       ├── storage.ts        # Secure token storage (expo-secure-store)
│   │       └── formatting.ts     # Price formatting, date formatting
│   └── __tests__/                # Test files
│       ├── screens/
│       ├── components/
│       ├── services/
│       └── state/
│
├── Cargo.toml                    # Workspace root
├── Cargo.lock
├── .env.example                  # Environment variable template
├── docker-compose.yml            # Local dev (Postgres, etc.)
├── README.md
└── .gitignore
```

## Workspace Configuration

The project uses a Cargo workspace for the Rust backend crates (`api`, `db`, `shared`). The `shared` crate contains DTOs and validation logic used by the API server. The `mobile/` directory is an independent React Native (Expo) project that communicates with the Rust API over HTTP/JSON. TypeScript types in `mobile/src/types/` mirror the API contracts defined by the `shared` crate.

## Build Pipeline

```
┌──────────────┐                    ┌────────────────┐
│  mobile/     │   EAS Build (iOS)  │   iOS .ipa     │
│  React Native│ ─────────────────► │   (App Store)  │
│  + Expo      │                    └────────────────┘
│              │  EAS Build (Android)┌────────────────┐
│              │ ─────────────────► │   .apk / .aab  │
└──────────────┘                    │  (Play Store)  │
                                    └────────────────┘

Build targets:
  iOS + Android via Expo Application Services (EAS)
  OTA updates via expo-updates
```
