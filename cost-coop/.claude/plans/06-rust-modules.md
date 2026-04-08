# CostCoop - Rust Backend Modules

## Crate: `api` (Axum Server)

### Module Structure

```
api/src/
├── main.rs              # Server bootstrap, router assembly
├── config.rs            # Config struct loaded from env vars
├── state.rs             # AppState: DB pool, config, Stripe client
├── error.rs             # Unified AppError enum + IntoResponse impl
├── routes/
│   ├── mod.rs           # Router assembly
│   ├── auth.rs          # POST /auth/* handlers
│   ├── users.rs         # GET/PATCH /users/* handlers
│   ├── stores.rs        # GET /stores/* handlers
│   ├── menu.rs          # GET /menu/* handlers
│   ├── orders.rs        # CRUD + state transitions for orders
│   ├── payments.rs      # Payment method CRUD + Stripe webhooks
│   ├── ratings.rs       # POST /orders/:id/rate
│   └── notifications.rs # Device registration + preferences
└── middleware/
    ├── mod.rs
    ├── auth.rs          # JWT extraction + validation via Supabase
    └── rate_limit.rs    # Token bucket rate limiter
```

### Key Types

```rust
// state.rs
pub struct AppState {
    pub db: PgPool,
    pub config: AppConfig,
    pub stripe: stripe::Client,
    pub http_client: reqwest::Client,  // for Supabase Auth calls
}

// config.rs
pub struct AppConfig {
    pub database_url: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_role_key: String,
    pub stripe_secret_key: String,
    pub stripe_webhook_secret: String,
    pub fcm_server_key: String,
    pub server_port: u16,
    pub environment: Environment,  // Dev | Staging | Production
}

// error.rs
pub enum AppError {
    NotFound(String),
    Unauthorized,
    Forbidden,
    BadRequest(String),
    Conflict(String),           // e.g., order already accepted
    Internal(anyhow::Error),
    Database(sqlx::Error),
    Stripe(stripe::StripeError),
    Validation(Vec<ValidationError>),
}
```

---

## Crate: `db` (Database Layer)

### Module Structure

```
db/src/
├── lib.rs               # Re-exports, pool initialization
├── pool.rs              # PgPool creation + configuration
├── models/
│   ├── mod.rs
│   ├── user.rs          # User, RunnerProfile structs
│   ├── store.rs         # Store struct
│   ├── menu_item.rs     # MenuItem struct
│   ├── order.rs         # Order, OrderItem, OrderStatus enum
│   ├── payment.rs       # Payment, PaymentMethod structs
│   ├── rating.rs        # Rating struct
│   ├── badge.rs         # Badge, UserBadge structs
│   └── friendship.rs    # Friendship struct
└── queries/
    ├── mod.rs
    ├── user.rs          # find_by_id, find_by_email, create, update
    ├── store.rs         # list_active, find_by_id
    ├── menu.rs          # list_by_store, find_by_id, list_categories
    ├── order.rs         # create, find_by_id, list_by_requester, list_available, update_status
    ├── payment.rs       # create_method, list_methods, create_payment, update_status
    ├── rating.rs        # create, list_for_user, average_for_user
    └── badge.rs         # list_all, list_earned, award_badge
```

### Query Pattern

All queries use `sqlx` with compile-time checked SQL:

```rust
// Example: queries/order.rs
pub async fn list_available_for_store(
    pool: &PgPool,
    store_id: Uuid,
) -> Result<Vec<Order>, sqlx::Error> {
    sqlx::query_as!(
        Order,
        r#"
        SELECT id, requester_id, runner_id, store_id,
               status as "status: OrderStatus",
               subtotal_cents, service_fee_cents, tip_cents, total_cents,
               created_at
        FROM orders
        WHERE store_id = $1 AND status = 'pending'
        ORDER BY created_at ASC
        "#,
        store_id
    )
    .fetch_all(pool)
    .await
}
```

### Migrations

Located in `db/migrations/`, run via `sqlx migrate run`:

| Migration | Description |
|-----------|-------------|
| 001_create_users | Users table + auth fields |
| 002_create_runner_profiles | Runner profiles + gamification fields |
| 003_create_stores | Costco store locations |
| 004_create_menu_items | Food court menu items |
| 005_create_orders | Orders + order_items tables |
| 006_create_payments | Payments + payment_methods tables |
| 007_create_ratings | Ratings table |
| 008_create_badges | Badges + user_badges tables |
| 009_create_friendships | Friend relationships |
| 010_create_indexes | Performance indexes |

---

## Crate: `shared` (Shared Types)

### Module Structure

```
shared/src/
├── lib.rs
├── dto/
│   ├── mod.rs
│   ├── auth.rs          # LoginRequest, RegisterRequest, AuthResponse
│   ├── user.rs          # UserProfile, UpdateProfileRequest, PublicUser
│   ├── store.rs         # StoreListItem, StoreDetail
│   ├── menu.rs          # MenuItemResponse, CategoryResponse
│   ├── order.rs         # CreateOrderRequest, OrderResponse, OrderStatusResponse
│   └── payment.rs       # AddPaymentMethodRequest, EarningsSummary
└── validation.rs        # Shared validation (email format, price bounds, etc.)
```

### DTO Pattern

```rust
// shared/src/dto/order.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub store_id: Uuid,
    pub delivery_address: String,
    pub delivery_notes: Option<String>,
    pub items: Vec<OrderItemRequest>,
    pub tip_cents: Option<i32>,
    pub payment_method_id: Uuid,
}

#[derive(Deserialize)]
pub struct OrderItemRequest {
    pub menu_item_id: Uuid,
    pub quantity: i32,
    pub notes: Option<String>,
}

#[derive(Serialize)]
pub struct OrderResponse {
    pub id: Uuid,
    pub status: String,
    pub subtotal_cents: i32,
    pub service_fee_cents: i32,
    pub tip_cents: i32,
    pub total_cents: i32,
    pub created_at: String,
}
```

The `shared` crate is depended on by the `api` crate, ensuring consistent types across the backend. The React Native mobile app defines its own TypeScript types that mirror these DTOs.
