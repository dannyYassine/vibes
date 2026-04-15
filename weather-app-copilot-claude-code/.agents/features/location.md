# Location & Geolocation Feature

## Summary

Handles user location detection and search. On startup, tries IP-based geolocation via backend; falls back to localStorage; last resort is Montreal default. Supports geocoding search to find locations by name.

## Key Files

**Frontend Services:**
- `frontend/src/app/shared/services/location.service.ts` — All location logic
- `frontend/src/app/shared/services/weather.service.ts` — `geocode()` at line 26-31

**Frontend Store:**
- `frontend/src/app/shared/services/weather-store.service.ts` — `initialize()` (line 52-77) orchestrates location fetching

**Backend Routes:**
- `backend/src/routes/geolocate.rs` — GET `/api/geolocate`; calls ip-api.com to get user's IP-based location
- `backend/src/routes/geocode.rs` — GET `/api/geocode`; proxies OpenWeatherMap geocoding API

**Backend Services:**
- `backend/src/services/weather_api.rs` — `geocode()` at line 231-259; calls OWM `/geo/1.0/direct` API

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `GeoLocation` interface (lines 53-59)

## Data Flow

### On App Startup (initialize)

```
1. Try IP-based geolocation:
   frontend/weather.service.ts: geolocate()
     ↓
   backend/routes/geolocate.rs
     ↓
   ip-api.com (external API)
     ↓
   Returns: {lat, lon, city, country}
     ↓
   Saved to location.service.saveLocation()

2. On failure, fallback:
   location.service.getLastLocation() (from localStorage)
     ↓
   If null, use getDefaultLocation() (Montreal: 45.5031824, -73.5698065)

3. Fetch weather for final location
```

### Geocode Search

```
User searches "Toronto"
  ↓
frontend/weather.service.ts: geocode(query)
  ↓
backend/routes/geocode.rs: get_geocode(q=query)
  ↓
backend/services/weather_api.rs: geocode(query)
  ↓
OpenWeatherMap /geo/1.0/direct API (limit=5)
  ↓
Returns: GeoLocation[] (up to 5 matches)
```

## Models / Types

**StoredLocation** (TypeScript):
- `lat: number`
- `lon: number`
- `name: string` — City, Country or custom label

**GeoLocation** (TypeScript / Rust):
- `name: string` — City name
- `lat: number`
- `lon: number`
- `country: string` — Country code or full name
- `state?: string` — Optional state/province

## Storage

**localStorage Key:** `'weather_last_location'`
- Persists across sessions
- Updated every time weather is fetched (line 105-109 in weather-store.service.ts)
- Format: JSON stringified `StoredLocation`

**Default Fallback:**
- Location: Montreal, CA (45.5031824, -73.5698065)
- Used if no geolocation and no localStorage

## Entry Points

**Initialization:**
- `WeatherStore.initialize()` (line 52-77)
  - Calls `geolocate()` (line 60-63)
  - On error, loads from `getLastLocation()` (line 71)
  - On null, uses `getDefaultLocation()` (line 72)
  - Passes final location to `fetchWeather(lat, lon)`

**Search/Geocode:**
- Not yet implemented in UI; backend endpoint ready
- Would be triggered by user search input → `weatherService.geocode(query)`

**Permission Handling:**
- `LocationService.permissionDenied` signal (line 12) — set if geolocation denied (currently unused in app)
- Browser geolocation API available but not used (lines 30-47, commented as unused)

## External APIs Used

1. **ip-api.com** — `/json/?fields=lat,lon,city,country`
   - Returns user's IP-based location
   - No API key required
   - Called server-side (backend)

2. **OpenWeatherMap** — `/geo/1.0/direct?q={query}&limit=5&appid={key}`
   - Geocoding: search location by name
   - Requires API key (same as weather API)
   - Returns up to 5 matches

## Related Features

- **Current Weather** — Depends on location to fetch weather
- **System Tray** — Shows location in weather display
