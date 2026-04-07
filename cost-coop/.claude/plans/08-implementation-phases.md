# CostCoop - Implementation Phases

## Strategy: MVP First, Then Iterate

Target: 3-6 months for MVP, then iterative feature additions.

---

## Phase 1: Foundation (Weeks 1-3)

### Goals
Set up the project infrastructure, tooling, and basic backend.

### Tasks
- [ ] Initialize Cargo workspace with `api`, `db`, `shared`, `mobile` crates
- [ ] Set up Docker Compose for local PostgreSQL
- [ ] Configure Supabase project (DB, Auth, Storage)
- [ ] Implement database migrations (users, stores, menu_items, orders, order_items)
- [ ] Set up Axum server with basic health check endpoint
- [ ] Implement config loading from environment variables
- [ ] Set up error handling and logging (tracing)
- [ ] Set up CI pipeline (cargo check, clippy, tests)
- [ ] Scaffold `core` crate with UniFFI setup and basic exported function
- [ ] Set up Xcode project (`ios/`) with SwiftUI, link Rust core via XCFramework
- [ ] Set up Android project (`android/`) with Jetpack Compose, link Rust core via JNI/UniFFI
- [ ] Create `Makefile` with `build-ios`, `build-android`, `generate-bindings` targets
- [ ] **Validate UniFFI pipeline** — call a Rust function from Swift and Kotlin, verify round-trip

### Deliverable
Running API server + iOS and Android apps calling into Rust core.

---

## Phase 2: Authentication (Weeks 3-5)

### Goals
Users can register, log in, and manage their profiles.

### Tasks
- [ ] Integrate Supabase Auth for email/password registration
- [ ] Integrate Google OAuth flow
- [ ] Integrate Apple Sign-In flow
- [ ] Build JWT validation middleware for Axum
- [ ] Implement user profile CRUD endpoints
- [ ] Implement auth module in Rust core (login, register, OAuth token exchange)
- [ ] Build LoginView (SwiftUI) + LoginScreen (Compose) calling Rust core
- [ ] Build RegisterView (SwiftUI) + RegisterScreen (Compose)
- [ ] Integrate Apple Sign-In (iOS) and Google Sign-In (both platforms)
- [ ] Implement secure token storage (Keychain on iOS, EncryptedSharedPreferences on Android)
- [ ] Build ProfileView (SwiftUI) + ProfileScreen (Compose)

### Deliverable
Users can sign up, log in, and see their profile on mobile.

---

## Phase 3: Menu & Store Browsing (Weeks 5-7)

### Goals
Users can browse Costco locations and their food court menus.

### Tasks
- [ ] Seed database with Costco store locations (start with 10-20 major stores)
- [ ] Seed database with standard food court menu items + prices
- [ ] Implement store listing and detail endpoints
- [ ] Implement menu listing endpoints (by store, by category)
- [ ] Implement store/menu modules in Rust core
- [ ] Implement cart module in Rust core (local state, no network)
- [ ] Build HomeView / HomeScreen with store selector (both platforms)
- [ ] Build MenuView / MenuScreen with category tabs and item cards
- [ ] Build ItemDetailView / ItemDetailScreen with quantity picker
- [ ] Build CartView / CartScreen with item list and totals

### Deliverable
Users can select a Costco, browse the food court menu, and build a cart.

---

## Phase 4: Core Ordering Flow (Weeks 7-10)

### Goals
Complete order lifecycle: place order → runner accepts → purchased → delivered.

### Tasks
- [ ] Implement order creation endpoint (with atomic item validation)
- [ ] Implement order broadcast: list pending orders by store
- [ ] Implement order acceptance (atomic, race-condition safe)
- [ ] Implement order status transitions (purchased, in_transit, delivered)
- [ ] Implement order cancellation (with reason)
- [ ] Implement order and runner modules in Rust core
- [ ] Build CheckoutView / CheckoutScreen (delivery address + confirmation)
- [ ] Build OrderStatusView / OrderStatusScreen with polling + status timeline
- [ ] Build RunnerDashboardView / RunnerDashboardScreen (available orders feed)
- [ ] Build RunnerOrderDetailView / RunnerOrderDetailScreen (accept + status actions)
- [ ] Implement runner profile creation and availability toggle in core
- [ ] Build role switcher in profile (requester ↔ runner) on both platforms
- [ ] Implement push notifications (APNs on iOS, FCM on Android)

### Deliverable
Full ordering flow works end-to-end. Two users can interact: one orders, one delivers.

---

## Phase 5: Payments (Weeks 10-13)

### Goals
Real money flows through the app.

### Tasks
- [ ] Set up Stripe Connect account
- [ ] Implement payment method CRUD (add/remove cards via Stripe)
- [ ] Implement payment capture on order creation
- [ ] Implement runner payout on delivery confirmation
- [ ] Implement service fee calculation
- [ ] Implement tip handling
- [ ] Build payment method management views (both platforms)
- [ ] Integrate Stripe iOS SDK and Stripe Android SDK for card input
- [ ] Integrate payment into checkout flow
- [ ] Implement refund flow for cancellations
- [ ] Handle Stripe webhooks for payment status updates

### Deliverable
MVP complete — users can order, pay, and runners get paid.

---

## Phase 6: Ratings & Order History (Weeks 13-16)

### Goals
Build trust through ratings and let users track their history.

### Tasks
- [ ] Implement rating creation endpoint
- [ ] Implement average rating calculation + update on runner profile
- [ ] Build Rate Runner screen (post-delivery prompt)
- [ ] Build Order History screen (requester view)
- [ ] Build Delivery History screen (runner view)
- [ ] Show runner rating on order acceptance cards
- [ ] Implement favorites (save orders for re-ordering)

### Deliverable
Post-MVP v1 with trust and quality signals.

---

## Phase 7: Runner Gamification (Weeks 16-20)

### Goals
Incentivize runner engagement with achievements and social proof.

### Tasks
- [ ] Implement badge system (define criteria, award on trigger)
- [ ] Implement streak tracking (daily active runner)
- [ ] Implement XP/level system
- [ ] Implement leaderboard (per store, global)
- [ ] Build Earnings dashboard screen
- [ ] Build Runner Stats screen (badges, streaks, leaderboard position)
- [ ] Build batch order acceptance (pick up multiple orders at same store)

### Deliverable
Engaging runner experience with progression mechanics.

---

## Phase 8: Social Features (Weeks 20-24)

### Goals
Grow through social connections and referrals.

### Tasks
- [ ] Implement friend system (add, accept, list)
- [ ] Implement order sharing (generate shareable link)
- [ ] Implement group orders (multiple requesters, one pickup)
- [ ] Implement referral code system with credit rewards
- [ ] Build friends list screen
- [ ] Build group order flow
- [ ] Build referral/invite screen

### Deliverable
Full feature set as originally planned.

---

## Post-Launch Roadmap

- GPS-based store detection and runner proximity
- Geofencing (verify runner is at Costco)
- WebSocket-based live order tracking
- In-app messaging between requester and runner
- Route optimization for multi-order runners
- Expanded menu: deli, bakery, rotisserie chicken
- Admin dashboard for menu/store management
- Analytics and reporting
