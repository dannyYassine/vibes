# CostCoop - Implementation Phases

## Strategy: MVP First, Then Iterate

Target: 3-6 months for MVP, then iterative feature additions.

---

## Phase 1: Foundation (Weeks 1-3)

### Goals
Set up the project infrastructure, tooling, and basic backend.

### Tasks
- [ ] Initialize Cargo workspace with `api`, `db`, `shared` crates
- [ ] Set up Docker Compose for local PostgreSQL
- [ ] Configure Supabase project (DB, Auth, Storage)
- [ ] Implement database migrations (users, stores, menu_items, orders, order_items)
- [ ] Set up Axum server with basic health check endpoint
- [ ] Implement config loading from environment variables
- [ ] Set up error handling and logging (tracing)
- [ ] Set up CI pipeline (cargo check, clippy, tests)
- [ ] Scaffold React Native app with Expo (`mobile/`) using TypeScript template
- [ ] Set up React Navigation with bottom tabs and stack navigators
- [ ] Set up Axios API client with base URL and auth interceptors
- [ ] Set up Zustand for state management with initial auth store
- [ ] Configure EAS Build for iOS and Android
- [ ] **Validate end-to-end** — React Native app calls Rust API health endpoint and displays result

### Deliverable
Running API server + React Native (Expo) app calling the backend API.

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
- [ ] Implement auth service in React Native (authService.ts + authStore)
- [ ] Build LoginScreen.tsx (email/password + Google/Apple social buttons)
- [ ] Build RegisterScreen.tsx
- [ ] Integrate expo-auth-session for Google OAuth and Apple Sign-In
- [ ] Implement secure token storage with expo-secure-store
- [ ] Build ProfileScreen.tsx

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
- [ ] Implement storeService.ts and storeStore (Zustand)
- [ ] Implement cartStore (Zustand, local state, no network)
- [ ] Build HomeScreen.tsx with store selector
- [ ] Build MenuScreen.tsx with category tabs and item cards
- [ ] Build ItemDetailScreen.tsx with quantity picker
- [ ] Build CartScreen.tsx with item list and totals

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
- [ ] Implement orderService.ts, runnerService.ts, and Zustand stores
- [ ] Build CheckoutScreen.tsx (delivery address + confirmation)
- [ ] Build OrderStatusScreen.tsx with polling + status timeline
- [ ] Build RunnerDashboardScreen.tsx (available orders feed)
- [ ] Build RunnerOrderDetailScreen.tsx (accept + status actions)
- [ ] Implement runner profile creation and availability toggle
- [ ] Build role switcher in ProfileScreen (requester ↔ runner)
- [ ] Implement push notifications with expo-notifications

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
- [ ] Build payment method management screen in React Native
- [ ] Integrate @stripe/stripe-react-native for card input
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
