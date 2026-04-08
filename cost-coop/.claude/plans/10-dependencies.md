# CostCoop - Dependencies

## Backend Crates (`api` + `db`)

| Crate | Version | Purpose |
|-------|---------|---------|
| `axum` | latest | HTTP framework (routing, middleware, extractors) |
| `tokio` | 1.x | Async runtime |
| `tower` | latest | Middleware framework (rate limiting, CORS, compression) |
| `tower-http` | latest | HTTP-specific Tower middleware (CORS, tracing, compression) |
| `sqlx` | 0.8.x | Async PostgreSQL driver with compile-time query checking |
| `serde` | 1.x | Serialization/deserialization |
| `serde_json` | 1.x | JSON support |
| `uuid` | 1.x | UUID generation and parsing |
| `chrono` | 0.4.x | Date/time handling |
| `tracing` | latest | Structured logging |
| `tracing-subscriber` | latest | Log output formatting |
| `dotenvy` | latest | .env file loading |
| `anyhow` | 1.x | Error handling (internal errors) |
| `thiserror` | latest | Error type derivation |
| `jsonwebtoken` | latest | JWT token validation (Supabase tokens) |
| `reqwest` | 0.12.x | HTTP client (for Supabase API calls, Stripe) |
| `stripe-rust` | latest | Stripe API client |
| `validator` | latest | Request validation derive macros |

## Shared Crate

| Crate | Version | Purpose |
|-------|---------|---------|
| `serde` | 1.x | DTO serialization |
| `uuid` | 1.x | Shared ID types |
| `chrono` | 0.4.x | Shared timestamp types |
| `validator` | latest | Shared validation rules |

## React Native / Mobile (`mobile/`)

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.76.x | Mobile framework |
| `expo` | ~52 | Build tooling, OTA updates, native module access |
| `typescript` | 5.x | Type safety |
| `@react-navigation/native` | latest | Navigation framework |
| `@react-navigation/bottom-tabs` | latest | Bottom tab navigator |
| `@react-navigation/native-stack` | latest | Stack navigator |
| `zustand` | latest | State management |
| `axios` | latest | HTTP client |
| `expo-secure-store` | latest | Secure token storage (Keychain / EncryptedSharedPrefs) |
| `expo-notifications` | latest | Push notifications (FCM + APNs) |
| `expo-auth-session` | latest | Google/Apple OAuth flows |
| `expo-image` | latest | Optimized image loading and caching |
| `@stripe/stripe-react-native` | latest | Payment UI (card input, Apple/Google Pay) |
| `react-native-reanimated` | latest | Performant animations |
| `react-native-screens` | latest | Native screen containers |
| `react-native-safe-area-context` | latest | Safe area insets |
| `@shopify/flash-list` | latest | High-performance list rendering |
| `date-fns` | latest | Date formatting |

## Development & Testing

| Crate | Version | Purpose |
|-------|---------|---------|
| `cargo-watch` | latest | Auto-rebuild on file changes |
| `sqlx-cli` | latest | Database migration tool |
| `axum-test` | latest | API integration test helpers |
| `fake` | latest | Generate fake test data |
| `wiremock` | latest | Mock external services (Stripe) in tests |
| `cargo-llvm-cov` | latest | Code coverage reporting |
| `jest` | latest | React Native unit/component tests |
| `@testing-library/react-native` | latest | Component testing utilities |
| `detox` | latest | E2E mobile testing |

## External Services

| Service | Purpose | Environment |
|---------|---------|-------------|
| **Supabase** | Hosted PostgreSQL + Auth + Storage | Production |
| **PostgreSQL 16** | Local database | Development (Docker) |
| **Stripe Connect** | Payment processing + runner payouts | All |
| **Expo Push Notifications** | Push notifications (wraps FCM + APNs) | All |
| **Sevalla** | Rust API hosting | Production |

## Infrastructure / Tooling

| Tool | Purpose |
|------|---------|
| Docker / Docker Compose | Local development environment |
| GitHub Actions | CI/CD pipeline |
| `cargo fmt` | Code formatting |
| `cargo clippy` | Linting |
| `sqlx prepare` | Offline query checking for CI |

## Cargo Workspace Dependencies

Use workspace-level dependency declarations to keep versions consistent:

```toml
# Root Cargo.toml
[workspace]
members = ["crates/api", "crates/db", "crates/shared"]

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }
anyhow = "1"
thiserror = "2"
tracing = "0.1"
```
