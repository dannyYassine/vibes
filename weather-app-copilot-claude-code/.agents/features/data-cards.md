# Data Cards Feature

## Summary

Displays three metric cards showing wind speed (km/h), pressure (hPa), and humidity (%). Values are extracted from current weather data and computed into human-readable formats.

## Key Files

**Frontend Components:**
- `frontend/src/app/features/weather/data-cards/data-cards.ts` — Container; computes card values (lines 17-39)
- `frontend/src/app/features/weather/data-cards/data-card/data-card.ts` — Individual card display

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — State; `currentWeather` signal at line 19

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `CurrentWeather` interface

## Data Flow

```
CurrentWeather (from store.currentWeather signal)
  ↓ (computed properties)
data-cards.ts:
  - windSpeed: wind_speed * 3.6 + " km/h"
  - pressure: pressure + " hPa"
  - humidity: humidity + "%"
  ↓
data-card.ts (render each card with label, value, icon)
  ↓
Template displays icon + label + value
```

## Models / Types

**Extracted Values** (computed in data-cards.ts):
- `windSpeed: string` — m/s converted to km/h, e.g., "18 km/h"
- `pressure: string` — hPa from current weather, e.g., "1013 hPa"
- `humidity: string` — Percentage, e.g., "65%"

**Fallback:** If `currentWeather()` is null, displays `'--'` for each value

## Card Configuration

Each card is defined as:
- **Wind:** SVG icon (lines 35), label "Wind Speed", value from `windSpeed` computed
- **Pressure:** SVG icon (line 37), label (implicit), value from `pressure` computed
- **Humidity:** SVG icon (line 39), label (implicit), value from `humidity` computed

All icons are inline SVG strings (feather icons style).

## Entry Points

**Data Source:**
- `WeatherStore.currentWeather` signal (line 19 in weather-store.service.ts)

**Display:**
- `DataCardsComponent` rendered in `weather-view.html` (imported at line 4)
- No separate child routing; cards rendered as three consecutive `<app-data-card>` elements

**Update Frequency:**
- Updates whenever `currentWeather` signal changes
- Tied to `fetchWeather()` in store (every 10 min)

## Unit Conversions

- **Wind Speed:** backend returns m/s; multiply by 3.6 for km/h conversion (line 20)
- **Pressure:** backend returns hPa; no conversion needed
- **Humidity:** backend returns 0-100 percentage; no conversion needed

## Related Features

- **Current Weather** — Same data source (currentWeather signal)
- **Theming** — Card background and text inherit from hero gradient
