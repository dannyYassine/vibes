# Backend API Feature

## Summary

Rust/Axum backend server that proxies external weather APIs (OpenWeatherMap, ip-api.com) and serves as a bridge between the frontend and third-party services. Handles caching, error handling, and response transformation.

## Key Files

**Server Setup:**
- `backend/src/main.rs` — Axum server, route registration, middleware (lines 1-58)

**Routes:**
- `backend/src/routes/weather.rs` — GET `/api/weather` — current weather with 10 min cache
- `backend/src/routes/forecast.rs` — GET `/api/forecast` — hourly + daily forecast with 30 min cache
- `backend/src/routes/geocode.rs` — GET `/api/geocode` — search locations by name
- `backend/src/routes/geolocate.rs` — GET `/api/geolocate` — IP-based geolocation

**Services:**
- `backend/src/services/weather_api.rs` — OpenWeatherMap client (lines 32-260)
- `backend/src/services/personality.rs` — Personality generation (see personality.md)
- `backend/src/services/cache.rs` — Response caching (see caching.md)

**Error Handling:**
- `backend/src/error.rs` — AppError type, HTTP response mapping

**Data Models:**
- `backend/src/models/weather.rs` — Weather types and OWM structs
- `backend/src/models/forecast.rs` — Forecast types and OWM structs

## Server Configuration

**Port:** 127.0.0.1:3001 (localhost only, line 48)

**CORS:** Allows all origins, methods, headers (lines 34-37)
```rust
let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any);
```

**Routes** (lines 39-46):
- `GET /api/health` → simple status check
- `GET /api/weather` → current weather
- `GET /api/forecast` → hourly + daily forecast
- `GET /api/geocode` → location search
- `GET /api/geolocate` → IP-based location

**State** (lines 14-17):
```rust
pub struct AppState {
    pub weather_api: Arc<WeatherApiClient>,
    pub cache: Cache,
}
```
- Shared across all handlers
- `WeatherApiClient` is Arc'd for cloneable reference

## Environment

**Required:**
- `OPENWEATHER_API_KEY` — OpenWeatherMap API key (line 26)
- Loaded from `.env` file via `dotenvy::dotenv()` (line 24)
- Panics if not set

## API Endpoints

### GET `/api/weather`

**Query Parameters:**
- `lat` (required) — Latitude (float)
- `lon` (required) — Longitude (float)

**Response:**
```json
{
  "temperature": 20.5,
  "feels_like": 18.0,
  "humidity": 65,
  "pressure": 1013,
  "wind_speed": 4.2,
  "wind_direction": 270,
  "condition": "clear",
  "condition_description": "Clear sky",
  "icon_code": "01d",
  "is_daytime": true,
  "personality_headline": "It's nice.\noutside.",
  "personality_subtitle": "Enjoy it while it lasts.",
  "location_name": "Montreal, CA",
  "updated_at": "2024-04-14T15:30:00Z"
}
```

**Implementation** (weather.rs):
- Line 21-26: Extract and validate lat/lon
- Line 28: Generate cache key
- Line 31-35: Check cache
- Line 37: Fetch from OpenWeatherMap if miss
- Line 40-44: Cache for 10 minutes
- Return response

### GET `/api/forecast`

**Query Parameters:**
- `lat` (required) — Latitude
- `lon` (required) — Longitude

**Response:**
```json
{
  "hourly": [
    {
      "time": "2024-04-14T18:00:00Z",
      "temperature": 20.5,
      "condition": "clear",
      "icon_code": "01d",
      "precipitation_probability": 10
    }
  ],
  "daily": [
    {
      "date": "2024-04-14",
      "temp_high": 23.0,
      "temp_low": 15.0,
      "condition": "clear",
      "condition_label": "Clear sky",
      "icon_code": "01d"
    }
  ]
}
```

**Implementation** (forecast.rs):
- Similar pattern to weather endpoint
- Line 28: Cache key for forecast
- Line 31-35: Check cache
- Line 37: Fetch forecast
- Line 40-44: Cache for 30 minutes

### GET `/api/geocode`

**Query Parameters:**
- `q` (required) — Search query, e.g., "Toronto"

**Response:**
```json
[
  {
    "name": "Toronto",
    "lat": 43.6629,
    "lon": -79.3957,
    "country": "CA",
    "state": "ON"
  }
]
```

**Implementation** (geocode.rs):
- Line 18-20: Extract and validate query
- Line 22: Call `weather_api.geocode(query)`
- No caching (search results not cached)
- Returns up to 5 matches (OWM limit)

### GET `/api/geolocate`

**Query Parameters:** None

**Response:**
```json
{
  "lat": 45.5031,
  "lon": -73.5698,
  "city": "Montreal",
  "country": "CA"
}
```

**Implementation** (geolocate.rs):
- No parameters
- Calls external `ip-api.com` API
- Returns user's IP-based location
- No caching

## Data Models

**WeatherCondition** (weather.rs, lines 5-17):
- Enum: Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow, Mist, Fog, Haze, Dust, Tornado
- `from_owm_main(main: &str)` maps OpenWeatherMap strings to enum (lines 19-36)
- Serialized as snake_case: "clear", "clouds", etc.

**CurrentWeatherResponse** (weather.rs, lines 38-54):
- Final response sent to frontend
- Includes generated personality text

**ForecastResponse** (forecast.rs, lines 5-9):
- Contains `hourly: Vec<HourlyForecast>` and `daily: Vec<DailyForecast>`

## Error Handling

**AppError** (error.rs):
```rust
pub enum AppError {
    WeatherApi(reqwest::Error),
    ApiClient(ApiClientError),
    BadRequest(String),
}
```

**HTTP Mapping:**
- `WeatherApi` → 502 Bad Gateway
- `ApiClient` → 502 Bad Gateway
- `BadRequest` → 400 Bad Request

**Response Format:**
```json
{
  "error": "description"
}
```

## OpenWeatherMap Integration

**Base URL:** `https://api.openweathermap.org`

**Endpoints Used:**
- `/data/2.5/weather` — current weather
- `/data/2.5/forecast` — 5-day/3-hour forecast
- `/geo/1.0/direct` — geocoding

**Parameters:**
- `units=metric` — Celsius temperatures
- `appid={api_key}` — authentication

**Error Handling:**
- Checks `cod` field in response for OWM errors (lines 61-73 in weather_api.rs)
- Validates response before deserializing (lines 76-83)
- Logs errors via `tracing` crate

## Logging

**Tracing Integration:**
- `tracing_subscriber::fmt::init()` at startup (line 21)
- Info level: server startup (line 49)
- Error level: OWM failures, parse errors (throughout weather_api.rs)

## Related Features

- **Current Weather** — Consumes `/api/weather`
- **Forecasts** — Consume `/api/forecast`
- **Location** — Consumes `/api/geolocate` and `/api/geocode`
- **Caching** — Transparent layer above weather/forecast routes
- **Personality** — Generated server-side in weather responses
