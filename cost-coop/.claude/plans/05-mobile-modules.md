# CostCoop - Mobile Modules

## Architecture: Rust Core + Native UI

```
┌───────────────────────────────────────────────┐
│              Native UI Layer                   │
│  ┌──────────────────┐ ┌────────────────────┐  │
│  │  iOS (SwiftUI)   │ │ Android (Compose)  │  │
│  │  ViewModels      │ │ ViewModels         │  │
│  └────────┬─────────┘ └────────┬───────────┘  │
│           │    UniFFI bindings  │              │
│  ┌────────┴─────────────────────┴───────────┐  │
│  │           Rust Core Library               │  │
│  │  API Client │ Auth │ Orders │ Cart │ State│  │
│  └───────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

---

## Rust Core Library (`crates/core`)

The core crate contains all business logic, networking, and state. Native UI layers are thin — they call into the core and render the results.

### Exposed Interface (via UniFFI)

```rust
// Core entry point
pub struct CostCoopCore {
    // Initialized once on app launch with base URL + stored auth token
}

impl CostCoopCore {
    pub fn new(base_url: String, stored_token: Option<String>) -> Self;
    pub fn is_authenticated(&self) -> bool;
}

// Auth
pub async fn login(email: String, password: String) -> Result<AuthResponse, CoreError>;
pub async fn register(email: String, password: String, name: String) -> Result<AuthResponse, CoreError>;
pub async fn login_with_google(id_token: String) -> Result<AuthResponse, CoreError>;
pub async fn login_with_apple(id_token: String) -> Result<AuthResponse, CoreError>;
pub async fn logout() -> Result<(), CoreError>;

// Stores & Menu
pub async fn get_stores() -> Result<Vec<Store>, CoreError>;
pub async fn get_store_menu(store_id: String) -> Result<Vec<MenuItem>, CoreError>;
pub async fn get_menu_categories() -> Result<Vec<Category>, CoreError>;

// Cart (local state, no network)
pub fn add_to_cart(item: CartItem);
pub fn remove_from_cart(item_id: String);
pub fn update_cart_quantity(item_id: String, quantity: i32);
pub fn get_cart() -> Cart;
pub fn clear_cart();

// Orders
pub async fn create_order(request: CreateOrderRequest) -> Result<Order, CoreError>;
pub async fn get_order_status(order_id: String) -> Result<OrderStatus, CoreError>;
pub async fn get_my_orders() -> Result<Vec<Order>, CoreError>;
pub async fn cancel_order(order_id: String, reason: String) -> Result<(), CoreError>;

// Runner
pub async fn enable_runner_mode() -> Result<RunnerProfile, CoreError>;
pub async fn set_runner_availability(available: bool) -> Result<(), CoreError>;
pub async fn get_available_orders(store_id: String) -> Result<Vec<Order>, CoreError>;
pub async fn accept_order(order_id: String) -> Result<Order, CoreError>;
pub async fn mark_order_purchased(order_id: String) -> Result<(), CoreError>;
pub async fn mark_order_in_transit(order_id: String) -> Result<(), CoreError>;
pub async fn mark_order_delivered(order_id: String) -> Result<(), CoreError>;
pub async fn get_earnings() -> Result<EarningsSummary, CoreError>;

// Ratings
pub async fn rate_order(order_id: String, score: i32, comment: Option<String>) -> Result<(), CoreError>;

// Payments
pub async fn get_payment_methods() -> Result<Vec<PaymentMethod>, CoreError>;
pub async fn add_payment_method(stripe_token: String) -> Result<PaymentMethod, CoreError>;
pub async fn remove_payment_method(method_id: String) -> Result<(), CoreError>;

// User Profile
pub async fn get_profile() -> Result<UserProfile, CoreError>;
pub async fn update_profile(request: UpdateProfileRequest) -> Result<UserProfile, CoreError>;

// Notifications
pub async fn register_push_token(token: String, platform: Platform) -> Result<(), CoreError>;
```

### Core Modules

| Module | File | Description |
|--------|------|-------------|
| API Client | `api_client.rs` | reqwest-based HTTP client, handles auth headers, token refresh |
| Auth | `auth.rs` | Login/register/OAuth flows, token storage callbacks |
| Orders | `orders.rs` | Order CRUD, status transitions |
| Stores | `stores.rs` | Store listing, menu fetching |
| Cart | `cart.rs` | Local cart state (no network, in-memory) |
| Payments | `payments.rs` | Payment method CRUD |
| Runner | `runner.rs` | Runner profile, availability, order acceptance |
| User | `user.rs` | Profile management |
| Notifications | `notifications.rs` | Push token registration |
| State | `state.rs` | Core state container (auth token, user profile, cart) |
| Error | `error.rs` | `CoreError` enum exposed to native via UniFFI |

### UniFFI Types

Types exposed across the FFI boundary:

```rust
// Enums
pub enum OrderStatus { Pending, Accepted, Purchased, InTransit, Delivered, Cancelled }
pub enum Platform { Ios, Android }
pub enum CoreError { Network(String), Unauthorized, NotFound, Conflict(String), Validation(String), Internal(String) }

// Structs (all with UniFFI derives)
pub struct AuthResponse { pub token: String, pub user: UserProfile }
pub struct UserProfile { pub id: String, pub email: String, pub display_name: String, pub avatar_url: Option<String>, pub is_runner_enabled: bool }
pub struct Store { pub id: String, pub name: String, pub address: String, pub city: String, pub is_active: bool }
pub struct MenuItem { pub id: String, pub name: String, pub description: Option<String>, pub price_cents: i32, pub category: String, pub image_url: Option<String>, pub is_available: bool }
pub struct CartItem { pub menu_item_id: String, pub name: String, pub price_cents: i32, pub quantity: i32, pub notes: Option<String> }
pub struct Cart { pub items: Vec<CartItem>, pub subtotal_cents: i32, pub store_id: Option<String> }
pub struct Order { pub id: String, pub status: OrderStatus, pub items: Vec<OrderItemSummary>, pub total_cents: i32, pub created_at: String }
pub struct EarningsSummary { pub today_cents: i32, pub week_cents: i32, pub month_cents: i32, pub total_deliveries: i32 }
pub struct PaymentMethod { pub id: String, pub card_brand: String, pub card_last_four: String, pub is_default: bool }
pub struct RunnerProfile { pub is_available: bool, pub total_deliveries: i32, pub average_rating: f64, pub level: i32, pub current_streak: i32 }
```

---

## iOS Native Layer (SwiftUI)

### Views

| View | File | Description |
|------|------|-------------|
| LoginView | `Views/Auth/LoginView.swift` | Email/password + Sign in with Google/Apple |
| RegisterView | `Views/Auth/RegisterView.swift` | Account creation |
| HomeView | `Views/Requester/HomeView.swift` | Store selector + featured items + active order |
| MenuView | `Views/Requester/MenuView.swift` | Menu grid with category tabs |
| ItemDetailView | `Views/Requester/ItemDetailView.swift` | Item detail + add to cart |
| CartView | `Views/Requester/CartView.swift` | Cart items + delivery address + tip |
| CheckoutView | `Views/Requester/CheckoutView.swift` | Payment + confirm |
| OrderStatusView | `Views/Requester/OrderStatusView.swift` | Status timeline + polling |
| OrderHistoryView | `Views/Requester/OrderHistoryView.swift` | Past orders list |
| RunnerDashboardView | `Views/Runner/RunnerDashboardView.swift` | Available orders feed |
| RunnerOrderDetailView | `Views/Runner/RunnerOrderDetailView.swift` | Accepted order + actions |
| EarningsView | `Views/Runner/EarningsView.swift` | Revenue charts |
| RunnerStatsView | `Views/Runner/RunnerStatsView.swift` | Badges, streaks, leaderboard |
| ProfileView | `Views/Profile/ProfileView.swift` | Profile edit + role switch |
| SettingsView | `Views/Profile/SettingsView.swift` | Preferences |

### ViewModels

Each ViewModel is an `@Observable` class that wraps calls to the Rust core:

```swift
@Observable
class OrderViewModel {
    var activeOrder: Order?
    var orderHistory: [Order] = []
    var isLoading = false
    var error: String?

    func createOrder(_ request: CreateOrderRequest) async {
        isLoading = true
        do {
            activeOrder = try await CostCoopCore.shared.createOrder(request: request)
        } catch let e as CoreError {
            error = e.localizedDescription
        }
        isLoading = false
    }

    func pollOrderStatus() async { /* timer-based polling via core */ }
}
```

### iOS-Specific Integrations
- **Apple Sign-In**: `AuthenticationServices` framework → pass ID token to Rust core
- **Google Sign-In**: Google Sign-In SDK → pass ID token to Rust core
- **Push Notifications**: `UNUserNotificationCenter` → register token via Rust core
- **Secure Storage**: Keychain via `Security` framework for JWT token persistence
- **Apple Pay**: `PassKit` framework (post-MVP)

---

## Android Native Layer (Jetpack Compose)

### Screens

| Screen | File | Description |
|--------|------|-------------|
| LoginScreen | `ui/auth/LoginScreen.kt` | Email/password + Google sign-in |
| RegisterScreen | `ui/auth/RegisterScreen.kt` | Account creation |
| HomeScreen | `ui/requester/HomeScreen.kt` | Store selector + featured items |
| MenuScreen | `ui/requester/MenuScreen.kt` | Menu grid with category tabs |
| ItemDetailScreen | `ui/requester/ItemDetailScreen.kt` | Item detail + add to cart |
| CartScreen | `ui/requester/CartScreen.kt` | Cart + delivery + tip |
| CheckoutScreen | `ui/requester/CheckoutScreen.kt` | Payment + confirm |
| OrderStatusScreen | `ui/requester/OrderStatusScreen.kt` | Status timeline |
| OrderHistoryScreen | `ui/requester/OrderHistoryScreen.kt` | Past orders |
| RunnerDashboardScreen | `ui/runner/RunnerDashboardScreen.kt` | Available orders |
| RunnerOrderDetailScreen | `ui/runner/RunnerOrderDetailScreen.kt` | Accepted order + actions |
| EarningsScreen | `ui/runner/EarningsScreen.kt` | Revenue charts |
| RunnerStatsScreen | `ui/runner/RunnerStatsScreen.kt` | Badges, streaks |
| ProfileScreen | `ui/profile/ProfileScreen.kt` | Profile + role switch |
| SettingsScreen | `ui/profile/SettingsScreen.kt` | Preferences |

### ViewModels

Each ViewModel extends `ViewModel()` and calls into Rust core via generated Kotlin bindings:

```kotlin
class OrderViewModel : ViewModel() {
    private val _activeOrder = MutableStateFlow<Order?>(null)
    val activeOrder: StateFlow<Order?> = _activeOrder.asStateFlow()

    fun createOrder(request: CreateOrderRequest) {
        viewModelScope.launch {
            try {
                _activeOrder.value = CostCoopCore.createOrder(request)
            } catch (e: CoreError) {
                // handle error
            }
        }
    }
}
```

### Android-Specific Integrations
- **Google Sign-In**: Credential Manager API → pass ID token to Rust core
- **Push Notifications**: Firebase Cloud Messaging → register token via Rust core
- **Secure Storage**: EncryptedSharedPreferences for JWT token persistence
- **Google Pay**: Google Pay API (post-MVP)

---

## Navigation

### iOS (SwiftUI NavigationStack)
```swift
enum AppTab: Hashable {
    case home, orders, runner, profile
}

// Tab-based root with NavigationStack per tab
TabView(selection: $selectedTab) {
    NavigationStack { HomeView() }.tag(AppTab.home)
    NavigationStack { OrderHistoryView() }.tag(AppTab.orders)
    NavigationStack { RunnerDashboardView() }.tag(AppTab.runner)
    NavigationStack { ProfileView() }.tag(AppTab.profile)
}
```

### Android (Jetpack Navigation Compose)
```kotlin
sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Menu : Screen("menu/{storeId}")
    object Cart : Screen("cart")
    object OrderStatus : Screen("order/{orderId}")
    object RunnerDashboard : Screen("runner")
    object Profile : Screen("profile")
    // ...
}
```
