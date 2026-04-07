# CostCoop - Technical Challenges

## 1. Payment Integration (High Risk)

### Challenge
Handling real money flow between strangers: requester pays → platform holds funds → runner gets reimbursed + fee + tip. This requires escrow-like functionality, fraud protection, and regulatory compliance.

### Approach
- **Stripe Connect** with Express accounts for runners
- Requester payment is captured via Payment Intent
- On delivery confirmation, funds are split: runner payout (food cost + fee + tip) via Stripe Transfer, platform keeps remainder
- Refund flow for cancelled/disputed orders
- Handle edge cases: runner can't find item, partial orders, store is closed

### Risks
- Stripe Connect onboarding friction for runners (requires identity verification)
- Handling disputes between requester and runner
- Tax implications for runner earnings (1099 reporting in US/T4A in Canada)
- Currency handling for international expansion

---

## 2. Trust & Safety (High Risk)

### Challenge
Connecting strangers for food pickup and delivery creates trust and safety concerns on both sides.

### Approach
- **Runner verification**: email verification required, optional phone verification for higher trust tier
- **Rating system**: bilateral ratings after each delivery; low-rated users get deprioritized or suspended
- **Order disputes**: built-in dispute flow — requester can report issues, platform reviews and mediates
- **Photo verification**: runner can upload receipt photo as proof of purchase
- **Account reputation**: minimum rating threshold to remain active

### Risks
- Fake accounts / fraud (ordering and never paying, accepting and never delivering)
- Food safety concerns (food sitting in car too long)
- Runner enters Costco but can't find items or store is out of stock
- Privacy: requester shares home address with runner

### Mitigations
- Require payment upfront before order is broadcast
- Time limits on order fulfillment (auto-cancel if not purchased within X minutes)
- Mask exact address until order is accepted (show neighborhood only)
- Report/block functionality

---

## 3. UniFFI / FFI Boundary (Medium Risk)

### Challenge
Bridging Rust to Swift and Kotlin via UniFFI adds build complexity and constraints on what types can cross the boundary. Async Rust functions need special handling.

### Approach
- Use UniFFI proc macros (`#[uniffi::export]`) for clean interface definition
- Keep the FFI surface area minimal — expose high-level operations, not internals
- Use UniFFI's async support (available since 0.25+) for network calls
- All complex types must be UniFFI-compatible (no generics, limited trait objects)
- Test bindings generation as part of CI

### Specific Concerns
- Async function support across FFI (Rust async → Swift async/Kotlin coroutines)
- Error handling: Rust `Result<T, E>` must map cleanly to Swift throws / Kotlin exceptions
- Build pipeline: cross-compilation to iOS (aarch64-apple-ios) and Android (multiple ABIs) targets
- Binary size — Rust + reqwest + tokio adds to app size; strip symbols and use LTO
- Debugging across the FFI boundary (stack traces may be opaque)

### Mitigations
- Keep core crate's public API simple and well-documented
- Write integration tests that exercise the generated Swift/Kotlin bindings
- Use `cargo-ndk` for Android cross-compilation and `cargo-lipo` / `cargo xcode` for iOS
- Set up a `Makefile` with build targets: `build-ios`, `build-android`, `generate-bindings`
- Consider `swift-bridge` as alternative if UniFFI's limitations become blocking

---

## 4. Race Conditions in Order Acceptance (Medium Risk)

### Challenge
Broadcast model means multiple runners see the same order. Two runners could try to accept simultaneously.

### Approach
- Use PostgreSQL `UPDATE ... WHERE status = 'pending' RETURNING *` for atomic acceptance
- Only one runner succeeds; others get a 409 Conflict response
- Mobile app handles 409 gracefully ("Order already taken, check for others")

---

## 5. Menu Accuracy (Low-Medium Risk)

### Challenge
Costco food court menus can vary by location and items can run out. There's no official Costco API to pull real-time menu data.

### Approach
- Seed database with standard Costco food court items and known prices
- Allow admin/community corrections for regional items
- Runner can flag items as unavailable during fulfillment
- Requester gets notified of substitutions or unavailable items
- Prices stored as estimates — runner pays actual price, system adjusts if needed

---

## 6. Offline / Poor Connectivity (Low Risk for MVP)

### Challenge
Runners inside Costco warehouses may have poor cellular reception.

### Approach (Post-MVP)
- Cache accepted order details locally
- Queue status updates when offline, sync when back online
- Show last-known status to requester with "last updated" timestamp
- For MVP: rely on polling with graceful timeout handling

---

## 7. App Store Approval (Medium Risk)

### Challenge
Apple and Google may scrutinize the app's relationship with Costco (trademark concerns) and the peer-to-peer delivery model (regulatory concerns).

### Approach
- Clear disclaimer: "CostCoop is not affiliated with, endorsed by, or sponsored by Costco Wholesale"
- Ensure app complies with gig-economy regulations in target markets
- Consult legal counsel before submission
- Have contingency naming/branding if Costco trademark is an issue
