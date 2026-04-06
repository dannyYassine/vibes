# Weather App Backend

A high-performance REST API server built with Rust, Axum, and Tokio. Provides weather data, forecast information, location geocoding, and implements intelligent caching for efficient data delivery.

## Overview

The backend is a standalone Rust server that provides RESTful API endpoints for weather-related operations. It integrates with third-party weather APIs (OpenWeather), implements response caching, manages location geocoding, and provides personality-driven weather descriptions. The server runs on port 3001 and supports CORS for cross-origin requests.

**Current Version**: 0.1.0
**Edition**: 2024
**Rust Requirement**: 1.70+

## Technology Stack

### Web Framework
- **Axum**: 0.8 - Ergonomic and modular web framework
- **Tokio**: 1.x with full features - Async runtime
- **Tower-HTTP**: 0.6 - HTTP utilities with CORS support

### Data Processing
- **Serde**: 1.0 with derive feature - Serialization/deserialization
- **Serde_JSON**: 1.0 - JSON handling
- **Chrono**: 0.4 - Date and time handling

### External Integration
- **Reqwest**: 0.12 with JSON feature - HTTP client for API calls

### Utilities
- **Dotenvy**: 0.15 - Environment variable loading
- **Rand**: 0.9 - Random number generation
- **Tracing**: 0.1 - Structured logging
- **Tracing-Subscriber**: 0.3 - Log output formatting

## Project Structure

```
backend/
├── src/
│   ├── main.rs                      # Application entry point
│   ├── error.rs                     # Error handling and types
│   │
│   ├── models/                      # Data models and structures
│   │   ├── mod.rs                   # Module exports
│   │   ├── weather.rs               # Weather data structures
│   │   └── forecast.rs              # Forecast data structures
│   │
│   ├── routes/                      # API endpoint handlers
│   │   ├── mod.rs                   # Module exports
│   │   ├── weather.rs               # Current weather endpoint
│   │   ├── forecast.rs              # Forecast endpoint
│   │   └── geocode.rs               # Location geocoding endpoint
│   │
│   ├── services/                    # Business logic
│   │   ├── mod.rs                   # Module exports
│   │   ├── weather_api.rs           # OpenWeather API client
│   │   ├── cache.rs                 # Response caching
│   │   └── personality.rs           # Personality descriptions
│   │
│   ├── Cargo.toml                   # Rust dependencies
│   ├── Cargo.lock                   # Locked versions
│   ├── .env                         # Environment variables
│   └── .env.example                 # Environment template
│
└── target/                          # Build output directory
```

## Core Components

### Application Entry Point (`src/main.rs`)

Initializes and runs the Axum server:

```rust
#[tokio::main]
async fn main() {
    // 1. Initialize logging
    tracing_subscriber::fmt::init();

    // 2. Load environment variables from .env
    let _ = dotenvy::dotenv();

    // 3. Get API key from environment
    let api_key = std::env::var("OPENWEATHER_API_KEY")
        .expect("OPENWEATHER_API_KEY must be set");

    // 4. Create application state
    let state = AppState {
        weather_api: Arc::new(WeatherApiClient::new(api_key)),
        cache: Cache::new(),
    };

    // 5. Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 6. Build router with routes
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/weather", get(routes::weather::get_weather))
        .route("/api/forecast", get(routes::forecast::get_forecast))
        .route("/api/geocode", get(routes::geocode::get_geocode))
        .layer(cors)
        .with_state(state);

    // 7. Start server
    let addr = "127.0.0.1:3001";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

**Key Setup**:
- Async runtime initialized with Tokio
- Environment variables loaded from `.env`
- OpenWeather API key required from environment
- Application state created with API client and cache
- CORS layer allows all origins/methods (configurable)
- Four main routes registered
- Server runs on `127.0.0.1:3001`

### Error Handling (`src/error.rs`)

Custom error types for API responses:
- API errors (invalid requests, not found)
- Weather service errors
- External API failures
- Serialization errors

Implements `IntoResponse` for automatic HTTP error responses.

### Application State

```rust
#[derive(Clone)]
pub struct AppState {
    pub weather_api: Arc<WeatherApiClient>,
    pub cache: Cache,
}
```

Shared across all request handlers:
- `weather_api` - Wrapped in `Arc` for thread-safe sharing
- `cache` - Handles response caching to reduce API calls

## Models (`src/models/`)

### Weather Data (`models/weather.rs`)

Structures for current weather information:
- `CurrentWeather` - Current conditions and measurements
- `WeatherCondition` - Weather state enum (Clear, Clouds, Rain, etc.)
- `Wind` - Wind information (speed, direction)
- Temperature, humidity, pressure data

### Forecast Data (`models/forecast.rs`)

Structures for forecast information:
- `HourlyForecast` - Hourly predictions
- `DailyForecast` - Daily predictions
- `ForecastItem` - Individual forecast point with timestamps
- Precipitation probabilities
- Temperature ranges

All models implement `Serialize`/`Deserialize` for JSON conversion.

## Routes (`src/routes/`)

### Health Check (`routes/health` - in main.rs)

**Endpoint**: `GET /api/health`

Returns server status:
```json
{
  "status": "ok"
}
```

Used for monitoring and load balancer health checks.

### Current Weather (`routes/weather.rs`)

**Endpoint**: `GET /api/weather?latitude=0.0&longitude=0.0`

Query parameters:
- `latitude` (f64, required) - Geographic latitude
- `longitude` (f64, required) - Geographic longitude

Returns:
```json
{
  "temperature": 20.5,
  "feels_like": 19.2,
  "humidity": 65,
  "pressure": 1013,
  "condition": "Clouds",
  "description": "Partly cloudy skies with a chance of afternoon showers",
  "wind_speed": 10.2,
  "wind_direction": 180,
  "location": {
    "latitude": 0.0,
    "longitude": 0.0,
    "city": "Example City",
    "country": "Country"
  }
}
```

### Forecast (`routes/forecast.rs`)

**Endpoint**: `GET /api/forecast?latitude=0.0&longitude=0.0`

Query parameters:
- `latitude` (f64, required) - Geographic latitude
- `longitude` (f64, required) - Geographic longitude

Returns:
```json
{
  "hourly": [
    {
      "timestamp": "2024-04-06T15:00:00Z",
      "temperature": 20.5,
      "condition": "Clouds",
      "precipitation_probability": 10.5
    }
  ],
  "daily": [
    {
      "date": "2024-04-07",
      "max_temperature": 22.5,
      "min_temperature": 18.2,
      "condition": "Partly Cloudy"
    }
  ]
}
```

### Geocoding (`routes/geocode.rs`)

**Endpoint**: `GET /api/geocode?query=London`

Query parameters:
- `query` (String, required) - Location name or partial address

Returns:
```json
{
  "results": [
    {
      "name": "London",
      "country": "United Kingdom",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "region": "England"
    }
  ]
}
```

Used for location search and name-to-coordinates conversion.

## Services (`src/services/`)

### Weather API Client (`services/weather_api.rs`)

HTTP client for OpenWeather API integration:

```rust
pub struct WeatherApiClient {
    api_key: String,
    client: reqwest::Client,
}
```

Methods:
- `get_current_weather(lat, lon)` - Fetch current conditions
- `get_forecast(lat, lon)` - Fetch hourly/daily forecast
- `geocode(query)` - Search locations by name

Handles:
- HTTP requests to OpenWeather API
- Response parsing and validation
- Error handling for network issues
- Rate limiting and retries (configurable)

### Caching Service (`services/cache.rs`)

Intelligent response caching layer:

```rust
pub struct Cache {
    // Thread-safe cache storage
}
```

Features:
- In-memory caching of API responses
- TTL (Time-to-live) management
- Automatic cache invalidation
- Reduces external API calls
- Configurable cache duration per endpoint

Cache strategy:
- Weather: 10-minute TTL
- Forecast: 30-minute TTL
- Geocode: 24-hour TTL

### Personality Service (`services/personality.rs`)

Generates contextual weather descriptions:

```rust
pub fn get_personality_headline(
    condition: &WeatherCondition,
    temperature: f64,
    wind_speed: f64,
) -> String {
    // Returns personality-driven descriptions like:
    // "Sunny day, perfect for a picnic!"
    // "Rainy weather, cozy inside day"
    // "Thunderstorms brewing, stay safe!"
}
```

Features:
- Context-aware descriptions based on:
  - Weather condition
  - Temperature ranges
  - Wind speed
  - Time of day
- Adds personality to API responses
- Used by frontend for display

## Environment Configuration

### `.env` File

```
OPENWEATHER_API_KEY=your_api_key_here
```

Required for API calls to OpenWeather. Get from [OpenWeather](https://openweathermap.org/api).

### `.env.example`

Template file showing required environment variables. Copy to `.env` and fill in values.

## Development Commands

### Prerequisites
- Rust 1.70+ (with Cargo)
- OpenWeather API key

### Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your OpenWeather API key
nano .env
```

### Run Development Server
```bash
cargo run
```
Starts the server on `http://127.0.0.1:3001` with debug logging.

### Build for Production
```bash
cargo build --release
```
Creates optimized binary in `target/release/backend`.

### Run Tests
```bash
cargo test
```
Executes unit and integration tests.

### Watch Mode
```bash
cargo watch -x run
```
Automatically restarts server on file changes (requires `cargo-watch`).

### Format Code
```bash
cargo fmt
```
Formats Rust code to standard style.

### Lint Code
```bash
cargo clippy
```
Runs linter for code quality suggestions.

## API Examples

### Get Current Weather
```bash
curl "http://127.0.0.1:3001/api/weather?latitude=51.5074&longitude=-0.1278"
```

### Get Forecast
```bash
curl "http://127.0.0.1:3001/api/forecast?latitude=51.5074&longitude=-0.1278"
```

### Search Location
```bash
curl "http://127.0.0.1:3001/api/geocode?query=London"
```

### Check Health
```bash
curl "http://127.0.0.1:3001/api/health"
```

## Architecture Patterns

### Dependency Injection
- Shared state passed via Axum middleware
- `AppState` contains all services
- Handlers extract state as needed

### Error Handling
- Custom error types implementing `IntoResponse`
- Automatic HTTP status code mapping
- JSON error responses

### Async/Await
- All I/O operations non-blocking
- Tokio runtime for async execution
- Efficient connection pooling

### Middleware
- CORS layer for cross-origin requests
- Tracing layer for request logging
- Custom middleware can be added

## Performance Considerations

### Caching
- Reduces external API calls
- Configurable TTL per endpoint
- Thread-safe concurrent access

### Connection Pooling
- Reqwest client reuses connections
- Efficient resource usage
- Automatic pool management

### Async Runtime
- Tokio handles thousands of concurrent requests
- Non-blocking I/O prevents thread blocking
- Minimal resource overhead

## Security Considerations

### CORS
Currently allows all origins (`Any`). For production:
```rust
let cors = CorsLayer::new()
    .allow_origin("https://example.com".parse()?)
    .allow_methods([Method::GET])
    .allow_headers([header::CONTENT_TYPE]);
```

### API Key Protection
- Stored in environment variables
- Never committed to version control
- Use `.env` file (not in git)

### Input Validation
- Latitude/longitude ranges validated
- Query string parameters sanitized
- API key validated before use

### HTTPS
Recommended for production deployment. Use reverse proxy (nginx) or deployment platform.

## Logging

Structured logging with Tracing:

```rust
tracing::info!("Weather API call for lat={}, lon={}", lat, lon);
tracing::warn!("Cache miss for coordinates");
tracing::error!("Failed to fetch from external API: {}", err);
```

Log levels in production:
- `error` - Critical failures
- `warn` - Recoverable issues
- `info` - Important events
- `debug` - Detailed diagnostics (disabled in production)

## Deployment

### Local Testing
```bash
cargo run
# Server accessible at http://127.0.0.1:3001
```

### Docker Deployment
```dockerfile
FROM rust:latest
WORKDIR /app
COPY . .
RUN cargo build --release
EXPOSE 3001
CMD ["./target/release/backend"]
```

### Environment Setup
```bash
export OPENWEATHER_API_KEY="your_key_here"
./target/release/backend
```

### Reverse Proxy (nginx)
```nginx
server {
    listen 80;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring & Health Checks

Health endpoint for load balancers:
- `GET /api/health` - Returns 200 OK with status
- Use in Kubernetes probes
- Configure monitoring tools to check periodically

Response time SLO:
- Health: < 10ms
- Weather: < 500ms (with cache)
- Forecast: < 1000ms (with cache)
- Geocode: < 2000ms

## Dependencies Overview

### Core Runtime
- **tokio** - Async runtime for server
- **axum** - Web framework and routing

### HTTP & Network
- **reqwest** - HTTP client for external APIs
- **tower-http** - HTTP utilities and middleware

### Data Handling
- **serde**/**serde_json** - JSON serialization
- **chrono** - Date/time handling

### Development
- **dotenvy** - Environment variable loading
- **tracing** - Structured logging

## Troubleshooting

### "OPENWEATHER_API_KEY must be set"
Ensure `.env` file exists with valid API key:
```bash
cp .env.example .env
# Edit .env with your OpenWeather API key
```

### Connection Refused
Ensure server is running and listening on port 3001:
```bash
lsof -i :3001
```

### Slow API Responses
Check:
1. Cache is working (should improve after first call)
2. OpenWeather API status
3. Network connectivity
4. External API rate limits

### CORS Errors
Configure CORS layer in `main.rs` to match frontend domain.

## Resources

- [Axum Documentation](https://docs.rs/axum/latest/axum/)
- [Tokio Documentation](https://tokio.rs/)
- [Serde Documentation](https://serde.rs/)
- [Tracing Documentation](https://docs.rs/tracing/latest/tracing/)
- [OpenWeather API Docs](https://openweathermap.org/api)
- [Rust Book](https://doc.rust-lang.org/book/)

## Contributing

1. Follow Rust naming conventions (snake_case)
2. Run `cargo clippy` before committing
3. Keep functions focused and testable
4. Add error handling for all I/O
5. Document public APIs with doc comments
6. Test new endpoints with curl before submitting PR

---

**Part of the Weather App project** - High-Performance REST API with Rust, Axum, and Tokio
