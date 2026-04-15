# Response Caching Feature

## Summary

In-memory TTL (time-to-live) cache layer on the backend that stores API responses from OpenWeatherMap. Reduces API calls, improves response time, and respects OpenWeatherMap rate limits during normal app operation.

## Key Files

**Backend Service:**
- `backend/src/services/cache.rs` — Cache implementation (lines 1-55)

**Cache Usage:**
- `backend/src/routes/weather.rs` — Uses cache for current weather (10 min TTL)
- `backend/src/routes/forecast.rs` — Uses cache for forecasts (30 min TTL)

## Implementation Details

**CacheEntry Struct** (cache.rs):
```rust
struct CacheEntry {
    data: serde_json::Value,
    expires_at: Instant,
}
```
- Stores JSON value
- Tracks expiration time (Instant, not system time)

**Cache Struct** (cache.rs):
```rust
#[derive(Clone)]
pub struct Cache {
    store: Arc<RwLock<HashMap<String, CacheEntry>>>,
}
```
- Async-safe: uses `RwLock` for concurrent reads/writes
- Cloneable: shared state across handlers via `Arc`

## Data Flow

### Current Weather Cache (10 min TTL)

```
GET /api/weather?lat=45.5&lon=-73.5
  ↓
weather.rs: get_weather()
  ↓
Cache key: "weather:45.50,-73.50"
  ↓
Check cache.get(key)
  ↓ (hit)
Return cached response
  ↓ (miss)
Call weather_api.fetch_current()
  ↓
OpenWeatherMap API
  ↓
Serialize result to JSON
  ↓
cache.set(key, value, Duration::from_secs(600))
  ↓
Return response
```

### Forecast Cache (30 min TTL)

```
GET /api/forecast?lat=45.5&lon=-73.5
  ↓
forecast.rs: get_forecast()
  ↓
Cache key: "forecast:45.50,-73.50"
  ↓
Check cache.get(key)
  ↓ (hit)
Return cached response
  ↓ (miss)
Call weather_api.fetch_forecast()
  ↓
OpenWeatherMap API
  ↓
Serialize result to JSON
  ↓
cache.set(key, value, Duration::from_secs(1800))
  ↓
Return response
```

## Models / Types

**Cache Keys** (cache.rs):
- `Cache::weather_key(lat: f64, lon: f64)` → `"weather:{lat:.2},{lon:.2}"`
- `Cache::forecast_key(lat: f64, lon: f64)` → `"forecast:{lat:.2},{lon:.2}"`
- Keys rounded to 2 decimal places for location grouping

**TTL Values:**
- Current weather: 600 seconds (10 minutes)
- Forecast: 1800 seconds (30 minutes)

## API Methods

**Get** (cache.rs, lines 24-32):
```rust
pub async fn get(&self, key: &str) -> Option<serde_json::Value>
```
- Returns `Some(value)` if key exists and not expired
- Returns `None` if key missing or expired
- Does NOT remove expired entries proactively

**Set** (cache.rs, lines 34-46):
```rust
pub async fn set(&self, key: String, data: serde_json::Value, ttl: Duration)
```
- Inserts or updates entry
- Calculates expiration: `Instant::now() + ttl`
- Lazy eviction: removes ALL expired entries on every set (line 45)
  - `store.retain(|_, v| v.expires_at > Instant::now())`

## Entry Points

**Current Weather Route** (weather.rs, lines 17-48):
- Line 28: `Cache::weather_key(lat, lon)` generates key
- Line 31-35: Check cache, return if hit
- Line 37: Fetch from API on miss
- Line 40-44: Cache result for 10 min

**Forecast Route** (forecast.rs, lines 17-48):
- Line 28: `Cache::forecast_key(lat, lon)` generates key
- Line 31-35: Check cache, return if hit
- Line 37: Fetch from API on miss
- Line 40-44: Cache result for 30 min

## Concurrency

**Thread-Safe:**
- `Arc<RwLock<HashMap>>` allows concurrent reads
- Multiple requests at same location can read simultaneously
- Writes are serialized (only one at a time)

**Async:**
- `.read().await` for reading
- `.write().await` for writing
- Non-blocking for Tokio async runtime

## Cleanup Strategy

**Lazy Eviction:**
- No background task
- Expired entries removed on next `set()` call
- Cleanup: `store.retain(|_, v| v.expires_at > Instant::now())`
- If cache is rarely updated, expired entries persist in memory (minor leak)

**No Max Size:**
- HashMap grows unbounded
- Practical limit: ~10 locations × 2 caches (20 entries max for typical user)

## Related Features

- **Backend API** — Caching is transparent to routes; reduces external API calls
- **Geolocation** — Location parameters determine cache keys
- **Current Weather** — Primary cache consumer (frequent updates)
- **Forecasts** — Secondary cache consumer (less frequent)
