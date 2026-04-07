# CostCoop - API Boundary

## Base URL

```
Production: https://api.costcoop.com/api/v1
Local:      http://localhost:3000/api/v1
```

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

Tokens are issued by Supabase Auth and validated by Axum middleware.

---

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register with email/password |
| POST | `/auth/login` | No | Login with email/password |
| POST | `/auth/oauth/google` | No | Google OAuth callback |
| POST | `/auth/oauth/apple` | No | Apple Sign-In callback |
| POST | `/auth/refresh` | No | Refresh JWT token |
| POST | `/auth/logout` | Yes | Invalidate session |
| POST | `/auth/forgot-password` | No | Send password reset email |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Get current user profile |
| PATCH | `/users/me` | Yes | Update profile (name, avatar, phone) |
| GET | `/users/me/runner-profile` | Yes | Get runner profile and stats |
| POST | `/users/me/runner-profile` | Yes | Enable runner mode / create runner profile |
| PATCH | `/users/me/runner-profile` | Yes | Update runner settings (availability, preferred store) |
| GET | `/users/:id/public` | Yes | Get public profile of another user (name, rating) |

### Stores

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stores` | No | List all active Costco locations |
| GET | `/stores/:id` | No | Get store details + operating hours |
| GET | `/stores/:id/menu` | No | Get menu items for a specific store |

### Menu

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/menu/categories` | No | List menu categories |
| GET | `/menu/items/:id` | No | Get single menu item details |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | Yes | Create a new order (requester) |
| GET | `/orders/mine` | Yes | List my orders (as requester) |
| GET | `/orders/available` | Yes | List available orders to accept (runner, filtered by store) |
| GET | `/orders/active` | Yes | Get currently active order (requester or runner) |
| GET | `/orders/:id` | Yes | Get order details |
| POST | `/orders/:id/accept` | Yes | Accept an order (runner) |
| POST | `/orders/:id/purchased` | Yes | Mark food as purchased (runner) |
| POST | `/orders/:id/in-transit` | Yes | Mark as in transit (runner) |
| POST | `/orders/:id/delivered` | Yes | Mark as delivered (runner) |
| POST | `/orders/:id/cancel` | Yes | Cancel an order (requester or runner, with reason) |
| GET | `/orders/:id/status` | Yes | Poll order status |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments/methods` | Yes | List saved payment methods |
| POST | `/payments/methods` | Yes | Add a payment method (Stripe token) |
| DELETE | `/payments/methods/:id` | Yes | Remove a payment method |
| POST | `/payments/methods/:id/default` | Yes | Set as default payment method |
| GET | `/payments/earnings` | Yes | Runner earnings summary |
| GET | `/payments/history` | Yes | Payment/payout history |

### Ratings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders/:id/rate` | Yes | Rate the other party after delivery |
| GET | `/users/:id/ratings` | Yes | Get ratings for a user |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications/register-device` | Yes | Register push notification token (FCM/APNs) |
| GET | `/notifications/preferences` | Yes | Get notification preferences |
| PATCH | `/notifications/preferences` | Yes | Update notification preferences |

### Social (Post-MVP)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/friends` | Yes | List friends |
| POST | `/friends/invite` | Yes | Send friend request |
| POST | `/friends/:id/accept` | Yes | Accept friend request |
| DELETE | `/friends/:id` | Yes | Remove friend |
| POST | `/orders/:id/share` | Yes | Share order link with friends |
| POST | `/referrals/generate` | Yes | Generate referral code |

### Runner Gamification (Post-MVP)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/runners/leaderboard` | Yes | Get leaderboard (by store or global) |
| GET | `/runners/badges` | Yes | List all available badges |
| GET | `/users/me/badges` | Yes | Get my earned badges |
| GET | `/users/me/streak` | Yes | Get current streak info |

---

## Request/Response Examples

### Create Order
```json
// POST /orders
// Request:
{
  "store_id": "uuid",
  "delivery_address": "123 Main St, Montreal, QC H1A 1A1",
  "delivery_notes": "Ring doorbell, apartment 4B",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "notes": "no onions" },
    { "menu_item_id": "uuid", "quantity": 1, "notes": null }
  ],
  "tip_cents": 300,
  "payment_method_id": "uuid"
}

// Response: 201
{
  "id": "uuid",
  "status": "pending",
  "subtotal_cents": 750,
  "service_fee_cents": 399,
  "tip_cents": 300,
  "total_cents": 1449,
  "created_at": "2026-04-07T12:00:00Z"
}
```

### Accept Order (Runner)
```json
// POST /orders/:id/accept
// Response: 200
{
  "id": "uuid",
  "status": "accepted",
  "runner_id": "uuid",
  "accepted_at": "2026-04-07T12:05:00Z",
  "items": [
    { "name": "Hot Dog Combo", "quantity": 2, "notes": "no onions" },
    { "name": "Pepperoni Pizza Slice", "quantity": 1 }
  ],
  "delivery_address": "123 Main St, Montreal, QC H1A 1A1",
  "delivery_notes": "Ring doorbell, apartment 4B"
}
```

## Error Format

```json
{
  "error": {
    "code": "ORDER_ALREADY_ACCEPTED",
    "message": "This order has already been accepted by another runner.",
    "status": 409
  }
}
```

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Unauthenticated | 30 requests/minute per IP |
| Authenticated | 120 requests/minute per user |
| Order creation | 5 orders/minute per user |
| Order acceptance | 10 accepts/minute per runner |
