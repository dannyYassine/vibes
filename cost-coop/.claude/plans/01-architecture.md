# CostCoop - Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│         React Native App (Expo)         │
│        TypeScript + React Navigation    │
│                                         │
│  Screens │ Components │ Zustand Stores  │
│           API Services (Axios)          │
└──────────────────┬──────────────────────┘
                   │
                   │ HTTPS (REST JSON)
                   ▼
┌─────────────────────────────────────────────────────┐
│                  Rust API Server                     │
│                (Axum + Tower middleware)              │
│                  Hosted on Sevalla                    │
├─────────────────────────────────────────────────────┤
│  Auth Middleware │ Rate Limiting │ Request Logging    │
├─────────────────────────────────────────────────────┤
│  Routes:                                             │
│  /api/v1/auth/*        - Authentication              │
│  /api/v1/users/*       - User profiles               │
│  /api/v1/stores/*      - Costco locations            │
│  /api/v1/menu/*        - Food court menu items       │
│  /api/v1/orders/*      - Order management            │
│  /api/v1/payments/*    - Payment processing          │
│  /api/v1/notifications/* - Push notifications        │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Supabase    │ │  Stripe  │ │  FCM / APNs  │
│  (Postgres   │ │ Connect  │ │  (Push       │
│   + Auth     │ │ (Payments│ │  Notifications│
│   + Storage) │ │  + Tips) │ │  )           │
└──────────────┘ └──────────┘ └──────────────┘
```

## Architecture Decisions

### Backend: Axum over Actix
- Axum is built on Tower/Hyper with strong ecosystem support
- Better composability with Tower middleware
- Tokio-native async runtime
- Growing community and Rust ecosystem alignment

### Database: Supabase (hosted PostgreSQL)
- **Local development**: Docker PostgreSQL for fast iteration
- **Production**: Supabase managed PostgreSQL
- Supabase Auth handles OAuth (Google, Apple) and email/password
- Supabase Storage for user avatars, receipt photos
- Supabase Realtime can be used for future WebSocket features

### Mobile: React Native + Expo
- **React Native** with **TypeScript** for a single cross-platform codebase
- **Expo** managed workflow for streamlined builds, OTA updates, and native module access
- **React Navigation** for tab-based and stack-based navigation
- **Zustand** for lightweight, performant state management
- **Axios** for HTTP communication with the Rust backend API
- Single codebase deploys to both iOS and Android with native performance
- No FFI boundary or native code required — all business logic lives in TypeScript

### API Design: REST
- Simple, well-understood, great tooling
- JSON request/response bodies
- Versioned endpoints (`/api/v1/`)
- Stateless — JWT-based authentication

### Notifications: Polling + Push
- Push notifications via FCM (Android) and APNs (iOS) for order status changes
- Client-side polling for order status screens (5-10 second intervals)
- Future: migrate to WebSocket for live order tracking

## Security Architecture

- JWT tokens issued by Supabase Auth, validated by Axum middleware
- HTTPS everywhere
- Input validation on all API endpoints
- Rate limiting per user/IP
- Payment tokens never touch our server (Stripe handles PCI compliance)
- Runner identity verification (future)

## Scalability Considerations

- Stateless API servers — horizontal scaling on Sevalla
- Connection pooling to Supabase via `sqlx` with `PgPool`
- CDN for static assets (menu images, store photos)
- Database indexing strategy for order queries (by store, by status, by user)
