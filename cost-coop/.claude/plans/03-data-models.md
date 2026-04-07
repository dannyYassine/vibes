# CostCoop - Data Models

## Entity Relationship Overview

```
User ──┬── 1:N ──► Order (as requester)
       ├── 1:N ──► Order (as runner)
       ├── 1:N ──► Rating (given)
       ├── 1:N ──► Rating (received)
       ├── 1:N ──► PaymentMethod
       ├── 1:1 ──► RunnerProfile
       └── N:N ──► User (friends/contacts)

Store ──┬── 1:N ──► MenuItem
        └── 1:N ──► Order

Order ──┬── 1:N ──► OrderItem
        ├── 1:1 ──► Payment
        └── 1:1 ──► Rating
```

## Tables

### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| display_name | VARCHAR(100) | NOT NULL | Display name in app |
| avatar_url | TEXT | NULLABLE | Profile picture URL (Supabase Storage) |
| phone_number | VARCHAR(20) | NULLABLE | Optional phone number |
| auth_provider | VARCHAR(20) | NOT NULL | 'email', 'google', 'apple' |
| auth_provider_id | VARCHAR(255) | NULLABLE | External auth provider user ID |
| is_runner_enabled | BOOLEAN | DEFAULT false | Whether user has runner mode activated |
| created_at | TIMESTAMPTZ | DEFAULT now() | Account creation time |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last profile update |

### runner_profiles
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id, UNIQUE | One profile per user |
| is_available | BOOLEAN | DEFAULT false | Currently accepting orders |
| preferred_store_id | UUID | FK → stores.id, NULLABLE | Default store |
| total_deliveries | INT | DEFAULT 0 | Lifetime delivery count |
| average_rating | DECIMAL(3,2) | DEFAULT 0.00 | Running average of ratings |
| current_streak | INT | DEFAULT 0 | Consecutive active days |
| longest_streak | INT | DEFAULT 0 | Best streak achieved |
| level | INT | DEFAULT 1 | Runner level (gamification) |
| xp_points | INT | DEFAULT 0 | Experience points |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### stores
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| name | VARCHAR(255) | NOT NULL | e.g., "Costco Wholesale - Brossard" |
| address_line1 | VARCHAR(255) | NOT NULL | Street address |
| address_line2 | VARCHAR(255) | NULLABLE | |
| city | VARCHAR(100) | NOT NULL | |
| state_province | VARCHAR(100) | NOT NULL | |
| postal_code | VARCHAR(20) | NOT NULL | |
| country | VARCHAR(2) | NOT NULL | ISO country code |
| latitude | DECIMAL(10,7) | NOT NULL | For future GPS features |
| longitude | DECIMAL(10,7) | NOT NULL | |
| timezone | VARCHAR(50) | NOT NULL | e.g., "America/Montreal" |
| is_active | BOOLEAN | DEFAULT true | Whether store is accepting orders |
| operating_hours | JSONB | NOT NULL | Food court hours per day |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### menu_items
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| store_id | UUID | FK → stores.id, NULLABLE | NULL = available at all stores |
| name | VARCHAR(255) | NOT NULL | e.g., "Hot Dog Combo" |
| description | TEXT | NULLABLE | Item description |
| price_cents | INT | NOT NULL | Price in cents (e.g., 150 = $1.50) |
| category | VARCHAR(50) | NOT NULL | 'hot_food', 'pizza', 'drinks', 'desserts', 'combos' |
| image_url | TEXT | NULLABLE | Item photo URL |
| is_available | BOOLEAN | DEFAULT true | Currently available |
| is_regional | BOOLEAN | DEFAULT false | Regional/seasonal item |
| sort_order | INT | DEFAULT 0 | Display ordering |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### orders
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| requester_id | UUID | FK → users.id, NOT NULL | Who placed the order |
| runner_id | UUID | FK → users.id, NULLABLE | Who accepted (NULL until accepted) |
| store_id | UUID | FK → stores.id, NOT NULL | Which Costco location |
| status | VARCHAR(30) | NOT NULL | Order lifecycle state |
| delivery_address | TEXT | NOT NULL | Where to deliver |
| delivery_notes | TEXT | NULLABLE | Special instructions |
| subtotal_cents | INT | NOT NULL | Food cost total |
| service_fee_cents | INT | NOT NULL | Platform/runner fee |
| tip_cents | INT | DEFAULT 0 | Optional tip for runner |
| total_cents | INT | NOT NULL | subtotal + service_fee + tip |
| scheduled_for | TIMESTAMPTZ | NULLABLE | NULL = ASAP, otherwise future time |
| accepted_at | TIMESTAMPTZ | NULLABLE | When runner accepted |
| purchased_at | TIMESTAMPTZ | NULLABLE | When runner bought the food |
| delivered_at | TIMESTAMPTZ | NULLABLE | When runner completed delivery |
| cancelled_at | TIMESTAMPTZ | NULLABLE | If order was cancelled |
| cancellation_reason | TEXT | NULLABLE | Why it was cancelled |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Order statuses**: `pending` → `accepted` → `purchased` → `in_transit` → `delivered` | `cancelled`

### order_items
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| order_id | UUID | FK → orders.id, NOT NULL | Parent order |
| menu_item_id | UUID | FK → menu_items.id, NOT NULL | Which menu item |
| quantity | INT | NOT NULL, CHECK > 0 | How many |
| unit_price_cents | INT | NOT NULL | Price at time of order |
| notes | TEXT | NULLABLE | Customization notes (e.g., "no onions") |

### payments
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| order_id | UUID | FK → orders.id, UNIQUE | One payment per order |
| requester_charge_cents | INT | NOT NULL | Amount charged to requester |
| runner_payout_cents | INT | NOT NULL | Amount paid out to runner |
| platform_fee_cents | INT | NOT NULL | CostCoop's cut |
| stripe_payment_intent_id | VARCHAR(255) | NULLABLE | Stripe reference |
| stripe_transfer_id | VARCHAR(255) | NULLABLE | Stripe Connect transfer |
| status | VARCHAR(20) | NOT NULL | 'pending', 'captured', 'transferred', 'refunded' |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### ratings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| order_id | UUID | FK → orders.id, UNIQUE | One rating per order |
| from_user_id | UUID | FK → users.id, NOT NULL | Who gave the rating |
| to_user_id | UUID | FK → users.id, NOT NULL | Who was rated |
| score | SMALLINT | NOT NULL, CHECK 1-5 | Star rating |
| comment | TEXT | NULLABLE | Optional written feedback |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### payment_methods
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id, NOT NULL | Card owner |
| stripe_payment_method_id | VARCHAR(255) | NOT NULL | Stripe PM reference |
| card_brand | VARCHAR(20) | NOT NULL | 'visa', 'mastercard', etc. |
| card_last_four | VARCHAR(4) | NOT NULL | Last 4 digits |
| is_default | BOOLEAN | DEFAULT false | Primary payment method |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### badges
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| name | VARCHAR(100) | NOT NULL | e.g., "First Delivery" |
| description | TEXT | NOT NULL | What the badge is for |
| icon_url | TEXT | NOT NULL | Badge icon |
| xp_reward | INT | DEFAULT 0 | XP granted when earned |
| criteria | JSONB | NOT NULL | Conditions to earn (e.g., {"deliveries_gte": 10}) |

### user_badges
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK → users.id | Composite PK |
| badge_id | UUID | FK → badges.id | Composite PK |
| earned_at | TIMESTAMPTZ | DEFAULT now() | When badge was earned |

### friendships
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id | Who sent the request |
| friend_id | UUID | FK → users.id | Who received it |
| status | VARCHAR(20) | NOT NULL | 'pending', 'accepted', 'blocked' |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

## Key Indexes

```sql
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_requester ON orders(requester_id, created_at DESC);
CREATE INDEX idx_orders_runner ON orders(runner_id, created_at DESC);
CREATE INDEX idx_menu_items_store ON menu_items(store_id, is_available);
CREATE INDEX idx_runner_profiles_store ON runner_profiles(preferred_store_id, is_available);
CREATE INDEX idx_ratings_to_user ON ratings(to_user_id);
```
