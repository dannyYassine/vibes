# CostCoop - Master Plan

## What Is CostCoop?

A peer-to-peer mobile app where users order Costco food court items and other Costco members (or non-members) at the store pick up and deliver them. Think Uber Eats, but exclusively for Costco food court — powered by a community of runners instead of professional drivers.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile framework | React Native + TypeScript + Expo | Single codebase for iOS & Android, fast iteration, huge ecosystem |
| Backend framework | Axum (Rust) | Tokio-native, composable middleware |
| Database | PostgreSQL via Supabase | Managed hosting, built-in auth/storage |
| API style | REST (JSON) | Simple, well-tooled, sufficient for MVP |
| Auth | Supabase Auth | Email/password + Google + Apple OAuth |
| Payments | Stripe Connect | Industry standard for marketplace payments |
| Hosting | Sevalla (API) + Supabase (DB) | |
| Notifications | Push (FCM/APNs) + polling | Simple for MVP, WebSocket later |
| Design | Clean minimal | Trust and simplicity for peer-to-peer model |

## Delivery Model

- Broadcast: orders visible to all available runners at selected store
- First-accept: first runner to tap "Accept" gets the order
- Fee: fixed service fee + optional tip
- Payment: in-app (requester pays upfront, runner reimbursed on delivery)

## User Roles

- **Requester**: orders food from home, pays through app
- **Runner**: at Costco (or goes to Costco), picks up food and delivers
- One account can switch between both roles

## MVP Scope (3-6 months)

1. Auth (email/password + Google + Apple)
2. Store selector (manual)
3. Menu browsing by Costco location
4. Cart and checkout
5. Order placement with in-app payment
6. Runner dashboard with order broadcast
7. Order lifecycle (accept → purchase → deliver)
8. Push notifications for status updates
9. Basic order history

## Post-MVP Roadmap

- Ratings and reviews
- Runner earnings dashboard
- Gamification (badges, streaks, leaderboards)
- Social features (friends, group orders, referrals)
- GPS-based store detection
- Geofencing (verify runner at Costco)
- Live order tracking (WebSocket)
- In-app messaging
- Admin dashboard

## Documents Index

| Document | Description |
|----------|-------------|
| [00-overview.md](00-overview.md) | Project vision, tech stack, high-level decisions |
| [01-features.md](01-features.md) | Complete feature list by role and phase |
| [01-architecture.md](01-architecture.md) | System architecture and design decisions |
| [02-project-structure.md](02-project-structure.md) | Cargo workspace and directory layout |
| [03-data-models.md](03-data-models.md) | Database schema, tables, indexes |
| [04-api-boundary.md](04-api-boundary.md) | REST API endpoints and contracts |
| [05-mobile-modules.md](05-mobile-modules.md) | React Native screens, components, services, state |
| [06-rust-modules.md](06-rust-modules.md) | Backend crate module breakdown |
| [07-technical-challenges.md](07-technical-challenges.md) | Known risks and mitigation strategies |
| [08-implementation-phases.md](08-implementation-phases.md) | 8-phase implementation plan |
| [09-testing-strategy.md](09-testing-strategy.md) | Test pyramid, CI pipeline, fixtures |
| [10-dependencies.md](10-dependencies.md) | Rust crates, external services, tooling |
| [design.md](design.md) | Design system, colors, typography, layouts |
| [PROGRESS.md](PROGRESS.md) | Current implementation progress |
| [BUGS.md](BUGS.md) | Known bugs and issues |
