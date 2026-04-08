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

## 3. React Native Performance & Expo Limitations (Medium Risk)

### Challenge
React Native introduces a JavaScript bridge between the UI and native layers. Complex list rendering, animations, and real-time updates may encounter performance bottlenecks. Expo's managed workflow limits access to some native modules.

### Approach
- Use `react-native-reanimated` for performant, native-driven animations
- Use `FlashList` instead of `FlatList` for large order/menu lists
- Keep component re-renders minimal with Zustand selectors and `React.memo`
- Use Expo's Config Plugins for native module access when managed workflow is insufficient
- Eject to bare workflow only as a last resort

### Specific Concerns
- JavaScript bridge overhead for frequent state updates (e.g., order status polling)
- Large menu lists with images may cause jank without proper optimization
- Expo managed workflow may not support all required native modules (e.g., advanced Stripe features)
- OTA update size limits with expo-updates
- Hermes engine compatibility with all dependencies

### Mitigations
- Profile early with React DevTools and Flipper to identify bottlenecks
- Use `expo-image` for optimized image loading and caching
- Implement pagination and virtualized lists for menu and order screens
- Use Expo Config Plugins to add native capabilities without ejecting
- Test on low-end Android devices to ensure acceptable performance
- Keep bundle size small by auditing dependencies with `npx expo-doctor`

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
