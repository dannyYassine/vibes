# Hourly Forecast Feature

## Summary

Displays a horizontal scrollable list of weather conditions for the next 48 hours in 3-hour intervals. Each item shows time, temperature, condition icon, and precipitation probability.

## Key Files

**Frontend Components:**
- `frontend/src/app/features/weather/hourly-forecast/hourly-forecast.ts` — Container; injects store at line 14
- `frontend/src/app/features/weather/hourly-forecast/hourly-item/hourly-item.ts` — Individual hourly item

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — State; `hourlyForecast` signal at line 20

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `HourlyForecast` interface (lines 31-37)

**Backend:**
- `backend/src/routes/forecast.rs` — GET `/api/forecast` endpoint; fetches and caches 30 min
- `backend/src/models/forecast.rs` — `HourlyForecast`, `OwmForecastEntry` structs
- `backend/src/services/weather_api.rs` — `fetch_forecast()` at line 119-229; builds hourly array from 3-hour entries (line 158-174)

## Data Flow

```
OpenWeatherMap 5-day/3-hour Forecast API
  ↓ (fetch_forecast)
backend/weather_api.rs
  ↓ (process first 16 entries = 48 hours)
backend/forecast.rs (HourlyForecast array)
  ↓
backend/routes/forecast.rs (cache 30min)
  ↓
frontend/weather.service.ts (HTTP GET /api/forecast)
  ↓
frontend/weather-store.service.ts (signal: hourlyForecast)
  ↓
frontend/hourly-forecast.ts (loop over array)
  ↓
frontend/hourly-item.ts (render each item)
  ↓
Template displays time, icon, temp, precipitation %
```

## Models / Types

**HourlyForecast** (TypeScript):
- `time: string` — RFC3339 timestamp
- `temperature: number` — Celsius
- `condition: WeatherCondition` — enum
- `icon_code: string` — OpenWeatherMap icon
- `precipitation_probability: number` — 0-100 %

## Entry Points

**Data Fetch:**
- `WeatherStore.fetchWeather()` (line 84-95) calls `weather.service.getForecast(lat, lon)`
- Sets `hourlyForecast` signal (line 99)

**Display:**
- `HourlyForecastComponent` renders in `weather-view.html` (imported at line 5)
- Iterates `hourlyForecast` via template, renders `HourlyItemComponent` for each

**Update Frequency:**
- Auto-refresh every 10 minutes via `startAutoRefresh()` (line 122-125)
- Cache TTL: 30 minutes

## Related Features

- **Daily Forecast** — Sibling feature, same API call
- **Current Weather** — Same fetch operation, different data subset
- **Weather Icons** — Items use `WeatherIconComponent` to render icons
