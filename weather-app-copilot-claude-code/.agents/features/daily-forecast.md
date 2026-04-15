# Daily Forecast Feature

## Summary

Displays a multi-day forecast (up to 10 days) with high/low temperatures, weather condition, and a human-readable condition label. Data is derived by aggregating 3-hour forecast entries into daily highs/lows.

## Key Files

**Frontend Components:**
- `frontend/src/app/features/weather/daily-forecast/daily-forecast.ts` — Container; injects store at line 14
- `frontend/src/app/features/weather/daily-forecast/daily-row/daily-row.ts` — Individual daily row

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — State; `dailyForecast` signal at line 21

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `DailyForecast` interface (lines 39-46)

**Backend:**
- `backend/src/routes/forecast.rs` — GET `/api/forecast` endpoint
- `backend/src/models/forecast.rs` — `DailyForecast`, `OwmForecastEntry` structs
- `backend/src/services/weather_api.rs` — `fetch_forecast()` at line 119-229; builds daily array (line 176-226):
  - Groups entries by date (BTreeMap, line 177-180)
  - Tracks temp_high/temp_low for each day (line 182-204)
  - Takes first weather condition per day as representative
  - Limits output to 10 days (line 208)

## Data Flow

```
OpenWeatherMap 5-day/3-hour Forecast API
  ↓ (fetch_forecast)
backend/weather_api.rs (aggregate 3-hour entries by date)
  ↓ (extract daily high/low, main condition, description)
backend/forecast.rs (DailyForecast array, date sorted)
  ↓
backend/routes/forecast.rs (cache 30min)
  ↓
frontend/weather.service.ts (HTTP GET /api/forecast)
  ↓
frontend/weather-store.service.ts (signal: dailyForecast)
  ↓
frontend/daily-forecast.ts (loop over array)
  ↓
frontend/daily-row.ts (render each day)
  ↓
Template displays date, high/low, condition, icon
```

## Models / Types

**DailyForecast** (TypeScript):
- `date: string` — YYYY-MM-DD format
- `temp_high: number` — Highest temp for the day (°C)
- `temp_low: number` — Lowest temp for the day (°C)
- `condition: WeatherCondition` — enum (representative, from first 3-hour entry)
- `condition_label: string` — Human-readable, e.g., "Partly cloudy" (capitalized)
- `icon_code: string` — OpenWeatherMap icon

## Entry Points

**Data Fetch:**
- `WeatherStore.fetchWeather()` (line 84-95) calls `weather.service.getForecast(lat, lon)`
- Sets `dailyForecast` signal (line 100)

**Display:**
- `DailyForecastComponent` renders in `weather-view.html` (imported at line 6)
- Iterates `dailyForecast` via template, renders `DailyRowComponent` for each
- Has `ScrollRevealDirective` for staggered animations (line 9)

**Update Frequency:**
- Auto-refresh every 10 minutes via `startAutoRefresh()` (line 122-125)
- Cache TTL: 30 minutes

## Aggregation Logic (Backend)

Date grouping in `fetch_forecast()`:
1. Iterate all 3-hour forecast entries (5-day window)
2. Extract date (YYYY-MM-DD) from Unix timestamp
3. For each date, track: highest temp_max, lowest temp_min, first weather condition
4. Sort by date (BTreeMap)
5. Return first 10 days

## Related Features

- **Hourly Forecast** — Sibling feature, same API call but uses all 3-hour entries
- **Current Weather** — Same fetch operation
- **Theming** — Daily row condition icons styled with weather-icon component
