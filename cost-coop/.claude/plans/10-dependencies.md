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

## Core Crate (`core` — Rust mobile library)

| Crate | Version | Purpose |
|-------|---------|---------|
| `uniffi` | 0.28.x | FFI binding generation (Swift + Kotlin) |
| `reqwest` | 0.12.x | HTTP client for API calls |
| `serde` | 1.x | JSON serialization |
| `serde_json` | 1.x | JSON support |
| `uuid` | 1.x | ID handling |
| `chrono` | 0.4.x | Date formatting |
| `tokio` | 1.x | Async runtime |

## iOS Dependencies (Swift Package Manager / CocoaPods)

| Package | Purpose |
|---------|---------|
| GoogleSignIn | Google OAuth |
| Stripe iOS SDK | Payment UI components |
| Firebase Messaging | Push notifications (FCM) |

## Android Dependencies (Gradle)

| Package | Purpose |
|---------|---------|
| `androidx.compose.*` | Jetpack Compose UI |
| `androidx.navigation:navigation-compose` | Navigation |
| `androidx.lifecycle:lifecycle-viewmodel-compose` | ViewModels |
| `com.google.android.gms:play-services-auth` | Google Sign-In |
| `com.stripe:stripe-android` | Payment UI |
| `com.google.firebase:firebase-messaging` | Push notifications |
| `net.java.dev.jna:jna` | JNA for UniFFI bindings |

## Development & Testing

| Crate | Version | Purpose |
|-------|---------|---------|
| `cargo-watch` | latest | Auto-rebuild on file changes |
| `sqlx-cli` | latest | Database migration tool |
| `axum-test` | latest | API integration test helpers |
| `fake` | latest | Generate fake test data |
| `wiremock` | latest | Mock external services (Stripe) in tests |
| `cargo-llvm-cov` | latest | Code coverage reporting |
| `cargo-ndk` | latest | Android cross-compilation |
| `uniffi-bindgen` | 0.28.x | Generate Swift/Kotlin bindings from Rust |

## External Services

| Service | Purpose | Environment |
|---------|---------|-------------|
| **Supabase** | Hosted PostgreSQL + Auth + Storage | Production |
| **PostgreSQL 16** | Local database | Development (Docker) |
| **Stripe Connect** | Payment processing + runner payouts | All |
| **Firebase Cloud Messaging** | Android push notifications | All |
| **Apple Push Notification Service** | iOS push notifications | All |
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
members = ["crates/api", "crates/db", "crates/shared", "crates/core"]

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
