# CostCoop - Mobile Modules

## Architecture: React Native + Expo

```
┌───────────────────────────────────────────────┐
│           React Native App (Expo)             │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Screens (React Components - .tsx)      │  │
│  │  LoginScreen, HomeScreen, CartScreen... │  │
│  └────────────────┬────────────────────────┘  │
│                   │                           │
│  ┌────────────────┴────────────────────────┐  │
│  │  State (Zustand Stores)                 │  │
│  │  authStore, cartStore, orderStore...    │  │
│  └────────────────┬────────────────────────┘  │
│                   │                           │
│  ┌────────────────┴────────────────────────┐  │
│  │  Services (Axios API Client)            │  │
│  │  authService, orderService, etc.        │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
                    │
                    │ HTTPS (REST JSON)
                    ▼
            Rust API Server (Axum)
```

---

## Screens (`src/screens/`)

All screens are React functional components written in TypeScript (.tsx).

### Auth Screens

| Screen | File | Description |
|--------|------|-------------|
| LoginScreen | `screens/auth/LoginScreen.tsx` | Email/password + Sign in with Google/Apple |
| RegisterScreen | `screens/auth/RegisterScreen.tsx` | Account creation |
| ForgotPasswordScreen | `screens/auth/ForgotPasswordScreen.tsx` | Password reset flow |

### Requester Screens

| Screen | File | Description |
|--------|------|-------------|
| HomeScreen | `screens/requester/HomeScreen.tsx` | Store selector + featured items + active order |
| MenuScreen | `screens/requester/MenuScreen.tsx` | Menu grid with category tabs |
| ItemDetailScreen | `screens/requester/ItemDetailScreen.tsx` | Item detail + add to cart |
| CartScreen | `screens/requester/CartScreen.tsx` | Cart items + delivery address + tip |
| CheckoutScreen | `screens/requester/CheckoutScreen.tsx` | Payment + confirm |
| OrderStatusScreen | `screens/requester/OrderStatusScreen.tsx` | Status timeline + polling |
| OrderHistoryScreen | `screens/requester/OrderHistoryScreen.tsx` | Past orders list |

### Runner Screens

| Screen | File | Description |
|--------|------|-------------|
| RunnerDashboardScreen | `screens/runner/RunnerDashboardScreen.tsx` | Available orders feed |
| RunnerOrderDetailScreen | `screens/runner/RunnerOrderDetailScreen.tsx` | Accepted order + actions |
| EarningsScreen | `screens/runner/EarningsScreen.tsx` | Revenue charts |
| RunnerStatsScreen | `screens/runner/RunnerStatsScreen.tsx` | Badges, streaks, leaderboard |

### Profile Screens

| Screen | File | Description |
|--------|------|-------------|
| ProfileScreen | `screens/profile/ProfileScreen.tsx` | Profile edit + role switch |
| SettingsScreen | `screens/profile/SettingsScreen.tsx` | Preferences |

---

## Components (`src/components/`)

Reusable UI components shared across screens.

| Component | File | Description |
|-----------|------|-------------|
| StoreSelector | `components/StoreSelectorView.tsx` | Costco location picker |
| RatingStars | `components/RatingStars.tsx` | Star rating display and input |
| OrderCard | `components/OrderCard.tsx` | Order summary card (used in lists) |
| MenuCard | `components/MenuCard.tsx` | Menu item card with image + price |
| LoadingView | `components/LoadingView.tsx` | Skeleton screens and loading states |
| Button | `components/Button.tsx` | Primary/secondary/ghost button variants |

---

## Services (`src/services/`)

API service layer using Axios for HTTP communication with the Rust backend.

### API Client (`services/api.ts`)

```typescript
import axios from 'axios';
import { getToken } from '../utils/storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth header interceptor
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error response interceptor (handle 401, refresh token, etc.)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Service Modules

| Service | File | Description |
|---------|------|-------------|
| API Client | `services/api.ts` | Axios instance with auth headers, interceptors, base URL |
| Auth | `services/authService.ts` | Login, register, OAuth token exchange, logout |
| Stores | `services/storeService.ts` | Store listing, menu fetching, categories |
| Orders | `services/orderService.ts` | Order CRUD, status transitions, polling |
| Payments | `services/paymentService.ts` | Payment method CRUD via Stripe |
| Runner | `services/runnerService.ts` | Runner profile, availability, order acceptance, earnings |
| User | `services/userService.ts` | Profile get/update, push token registration |

### Example Service

```typescript
// services/orderService.ts
import api from './api';
import { CreateOrderRequest, Order, OrderStatus } from '../types/api';

export const orderService = {
  create: (request: CreateOrderRequest) =>
    api.post<Order>('/api/v1/orders', request).then(r => r.data),

  getStatus: (orderId: string) =>
    api.get<OrderStatus>(`/api/v1/orders/${orderId}/status`).then(r => r.data),

  getMyOrders: () =>
    api.get<Order[]>('/api/v1/orders/mine').then(r => r.data),

  cancel: (orderId: string, reason: string) =>
    api.post(`/api/v1/orders/${orderId}/cancel`, { reason }),

  getAvailable: (storeId: string) =>
    api.get<Order[]>(`/api/v1/orders/available?store_id=${storeId}`).then(r => r.data),

  accept: (orderId: string) =>
    api.post<Order>(`/api/v1/orders/${orderId}/accept`).then(r => r.data),

  markPurchased: (orderId: string) =>
    api.post(`/api/v1/orders/${orderId}/purchased`),

  markInTransit: (orderId: string) =>
    api.post(`/api/v1/orders/${orderId}/in-transit`),

  markDelivered: (orderId: string) =>
    api.post(`/api/v1/orders/${orderId}/delivered`),
};
```

---

## State Management (`src/state/`)

Zustand stores provide lightweight, performant state management.

### Stores

| Store | File | Description |
|-------|------|-------------|
| Auth Store | `state/authStore.ts` | Auth token, user profile, login/logout actions |
| Cart Store | `state/cartStore.ts` | Cart items, totals, add/remove/clear actions |
| Order Store | `state/orderStore.ts` | Active order, order history, polling |
| Runner Store | `state/runnerStore.ts` | Runner profile, availability, available orders |
| Store Store | `state/storeStore.ts` | Selected Costco store, menu items, categories |

### Example Store

```typescript
// state/cartStore.ts
import { create } from 'zustand';
import { CartItem } from '../types/models';

interface CartState {
  items: CartItem[];
  storeId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  storeId: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(i => i.menuItemId === item.menuItemId);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item], storeId: item.storeId };
    }),

  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter(i => i.menuItemId !== itemId) })),

  updateQuantity: (itemId, quantity) =>
    set((state) => ({
      items: state.items.map(i =>
        i.menuItemId === itemId ? { ...i, quantity } : i
      ),
    })),

  clear: () => set({ items: [], storeId: null }),

  subtotalCents: () =>
    get().items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
}));
```

---

## Navigation (`src/navigation/`)

React Navigation with bottom tabs and nested stack navigators.

### Navigator Structure

```typescript
// navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../state/authStore';
import { MainTabs } from './MainTabs';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Tab Navigator

```typescript
// navigation/MainTabs.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RequesterStack } from './RequesterStack';
import { RunnerStack } from './RunnerStack';
import { ProfileStack } from './ProfileStack';
import { OrderHistoryScreen } from '../screens/requester/OrderHistoryScreen';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={RequesterStack} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Runner" component={RunnerStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
```

### Stack Navigators

Each tab contains a stack navigator for drill-down navigation:

- **RequesterStack**: Home -> Menu -> ItemDetail -> Cart -> Checkout -> OrderStatus
- **RunnerStack**: RunnerDashboard -> RunnerOrderDetail -> Earnings -> RunnerStats
- **ProfileStack**: Profile -> Settings

---

## TypeScript Types (`src/types/`)

### API Types

```typescript
// types/api.ts
export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isRunnerEnabled: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export type OrderStatus = 'pending' | 'accepted' | 'purchased' | 'in_transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItemSummary[];
  totalCents: number;
  createdAt: string;
}

export interface CreateOrderRequest {
  storeId: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  items: OrderItemRequest[];
  tipCents?: number;
  paymentMethodId: string;
}

export interface EarningsSummary {
  todayCents: number;
  weekCents: number;
  monthCents: number;
  totalDeliveries: number;
}

export interface PaymentMethod {
  id: string;
  cardBrand: string;
  cardLastFour: string;
  isDefault: boolean;
}

export interface RunnerProfile {
  isAvailable: boolean;
  totalDeliveries: number;
  averageRating: number;
  level: number;
  currentStreak: number;
}
```

---

## Platform-Specific Integrations

All platform integrations are handled through Expo modules and React Native libraries:

- **Apple Sign-In**: `expo-apple-authentication` -- pass ID token to backend
- **Google Sign-In**: `@react-native-google-signin/google-signin` -- pass ID token to backend
- **Push Notifications**: `expo-notifications` -- register token via API
- **Secure Storage**: `expo-secure-store` -- JWT token persistence
- **Stripe Payments**: `@stripe/stripe-react-native` -- card input and payment UI
- **Deep Linking**: React Navigation deep linking configuration
