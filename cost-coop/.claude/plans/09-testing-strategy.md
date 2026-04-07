# CostCoop - Testing Strategy

## Approach: Full Test Pyramid

```
         ╱╲
        ╱ E2E ╲          Few, slow, high confidence
       ╱────────╲
      ╱Integration╲      Moderate count, medium speed
     ╱──────────────╲
    ╱   Unit Tests    ╲   Many, fast, focused
   ╱────────────────────╲
```

---

## Unit Tests

### Backend (`api`, `db`, `shared` crates)

**What to test:**
- Business logic functions (fee calculation, order total computation, rating averaging)
- Validation logic (email format, price bounds, order constraints)
- DTO serialization/deserialization
- Error type conversions
- Order state machine transitions (valid and invalid)

**Tools:**
- `#[cfg(test)]` modules within each source file
- `cargo test` via the standard Rust test harness

**Examples:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_service_fee() {
        assert_eq!(calculate_service_fee(1500), 399); // $15.00 order → $3.99 fee
    }

    #[test]
    fn test_order_status_transition_valid() {
        assert!(OrderStatus::Pending.can_transition_to(OrderStatus::Accepted));
    }

    #[test]
    fn test_order_status_transition_invalid() {
        assert!(!OrderStatus::Delivered.can_transition_to(OrderStatus::Pending));
    }
}
```

**Coverage target:** 80%+ for `shared` crate, 70%+ for business logic in `api`

### Mobile Core (`core` crate)

**What to test:**
- Cart logic (add, remove, totals calculation)
- Auth state transitions
- API response parsing and DTO mapping
- Error mapping to `CoreError`
- Order status state machine

### iOS (XCTest)

**What to test:**
- ViewModels correctly call Rust core and update published state
- Navigation flows
- UI snapshot tests for key screens

### Android (JUnit + Compose Testing)

**What to test:**
- ViewModels correctly call Rust core and update StateFlow
- Navigation flows
- Compose UI tests for key screens

---

## Integration Tests

### API Integration Tests

**What to test:**
- Full request/response cycle for each endpoint
- Authentication flows (register → login → authenticated request)
- Order lifecycle (create → accept → purchase → deliver)
- Payment flows with Stripe test mode
- Error responses (404, 401, 409, 422)
- Race condition handling (two runners accept same order)

**Tools:**
- `axum::test` helpers or `reqwest` against a test server
- `sqlx` test fixtures with `#[sqlx::test]` for isolated DB per test
- Docker PostgreSQL for CI (matches Supabase production schema)

**Setup:**
```rust
// tests/common/mod.rs
pub async fn setup_test_app() -> (TestServer, PgPool) {
    let pool = setup_test_database().await;
    run_migrations(&pool).await;
    let app = create_app(pool.clone());
    let server = TestServer::new(app);
    (server, pool)
}
```

**Example:**
```rust
#[sqlx::test]
async fn test_create_and_accept_order(pool: PgPool) {
    let (server, _) = setup_test_app_with_pool(pool).await;

    // Register requester and runner
    let requester_token = register_and_login(&server, "requester@test.com").await;
    let runner_token = register_and_login(&server, "runner@test.com").await;

    // Create order
    let order = server.post("/api/v1/orders")
        .bearer(&requester_token)
        .json(&create_order_request())
        .await
        .assert_status(201)
        .json::<OrderResponse>();

    // Accept order
    server.post(&format!("/api/v1/orders/{}/accept", order.id))
        .bearer(&runner_token)
        .await
        .assert_status(200);

    // Verify second accept fails
    let runner2_token = register_and_login(&server, "runner2@test.com").await;
    server.post(&format!("/api/v1/orders/{}/accept", order.id))
        .bearer(&runner2_token)
        .await
        .assert_status(409);
}
```

**Coverage target:** All happy paths + critical error paths for every endpoint

---

## End-to-End Tests

### Mobile E2E

**What to test:**
- Complete user journeys:
  1. Register → Browse menu → Add to cart → Checkout → Track order
  2. Enable runner mode → See available orders → Accept → Mark delivered
  3. Rate runner after delivery
- Navigation flows (deep links, back button behavior)
- Offline/error state handling

**Tools:**
- **iOS**: XCUITest for UI automation
- **Android**: Espresso or Compose UI tests
- **Cross-platform**: Maestro for declarative E2E flows on both platforms

### API E2E (Smoke Tests)

**What to test:**
- Deploy staging environment, run critical path smoke tests
- Verify Supabase Auth integration works end-to-end
- Verify Stripe test payments complete successfully

**Tools:**
- Shell scripts or Rust integration test binary against staging URL
- Run post-deploy in CI

---

## Test Data & Fixtures

### Seed Data
- 5 test Costco store locations
- 15 standard menu items across categories
- 3 test users (requester, runner, dual-role)
- Sample orders in various states

### Test Database
- Each integration test gets an isolated database (via `sqlx::test` or schema-per-test)
- Migrations run automatically before each test suite
- No shared mutable state between tests

---

## CI Pipeline

```yaml
# Runs on every PR and push to main
steps:
  1. cargo fmt --check        # Formatting
  2. cargo clippy -- -D warnings  # Linting
  3. cargo test --workspace   # Unit + integration tests
  4. cargo build --release    # Verify release build compiles
```

### CI Environment
- PostgreSQL service container for integration tests
- Stripe test API keys in CI secrets
- Supabase local emulator (or test project) for auth integration tests

---

## Manual Testing Checklist (Per Release)

- [ ] Fresh install and registration on iOS
- [ ] Fresh install and registration on Android
- [ ] Google OAuth login on both platforms
- [ ] Apple Sign-In on iOS
- [ ] Complete order flow (requester side)
- [ ] Complete fulfillment flow (runner side)
- [ ] Payment processing in Stripe test mode
- [ ] Push notification delivery
- [ ] App backgrounding and foregrounding during active order
- [ ] Poor network simulation
