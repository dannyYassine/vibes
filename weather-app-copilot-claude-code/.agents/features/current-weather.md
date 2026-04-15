# Current Weather Feature

## Summary

Displays the current temperature, weather condition, location, and dynamic personality-driven headlines/subtitles. The UI adapts its background gradient, text color, and styling based on the condition and day/night cycle.

## Key Files

**Frontend Components:**
- `frontend/src/app/features/weather/hero-section/hero-section.ts` — Main display component for current weather

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — Central state store; line 19-42 manage current weather signals
- `frontend/src/app/shared/services/weather.service.ts` — HTTP client; `getCurrentWeather()` at line 12-17

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `CurrentWeather` interface (lines 14-29)
- `frontend/src/app/shared/models/theme.model.ts` — Gradient config and theme logic

**Backend:**
- `backend/src/routes/weather.rs` — GET `/api/weather` endpoint; fetches and caches current weather
- `backend/src/models/weather.rs` — `CurrentWeatherResponse`, `OwmCurrentResponse`, parsing logic
- `backend/src/services/weather_api.rs` — `fetch_current()` at line 47-117; calls OpenWeatherMap 2.5/weather API
- `backend/src/services/personality.rs` — Generates headlines/subtitles based on condition and temperature

## Data Flow

```
OpenWeatherMap API
  ↓ (fetch_current)
backend/weather_api.rs (parse OWM response)
  ↓ (apply personality)
backend/personality.rs (generate_personality)
  ↓
backend/routes/weather.rs (cache 10min)
  ↓
frontend/weather.service.ts (HTTP GET /api/weather)
  ↓
frontend/weather-store.service.ts (signal: currentWeather)
  ↓
frontend/hero-section.ts (display, compute gradient/colors)
  ↓
Template renders temperature, condition, headline, subtitle
```

## Models / Types

**CurrentWeather** (TypeScript):
- `temperature: number` — Celsius
- `feels_like: number`
- `humidity: number` (0-100)
- `pressure: number` (hPa)
- `wind_speed: number` (m/s)
- `wind_direction: number` (0-360°)
- `condition: WeatherCondition` — enum: clear, clouds, rain, drizzle, thunderstorm, snow, mist, fog, haze, dust, tornado
- `condition_description: string` — Human-readable, e.g., "Partly cloudy"
- `icon_code: string` — OpenWeatherMap icon ID, e.g., "01d"
- `is_daytime: boolean` — Derived from icon (ends in 'd' = day, 'n' = night)
- `personality_headline: string` — Witty, multi-line text
- `personality_subtitle: string` — Advisory/suggestion text
- `location_name: string` — City, Country
- `updated_at: string` — RFC3339 timestamp

**GradientConfig** (TypeScript):
- `stops: string[]` — Hex colors for gradient
- `direction: string` — CSS direction, e.g., "135deg"
- `textColor: string` — Hex for optimal contrast

## Entry Points

**Initialization:**
- `WeatherStore.initialize()` (line 52) called by `WeatherViewComponent.ngOnInit()` and `PopupComponent.ngOnInit()`

**Display:**
- `HeroSectionComponent` renders via `hero-section.html` template
- Reads: `store.currentWeather`, `store.gradientCss`, `store.textColor`, `store.headlineText`, `store.subtitleText`

**Update Trigger:**
- `fetchWeather()` (line 79) called on init and every 10 min via `startAutoRefresh()`
- Also updates system tray: `trayService.updateTray(weather.temperature, weather.condition)` (line 102)

## Related Features

- **Theming** — Gradient and text color computed from condition + daytime
- **Personality System** — Headlines/subtitles generated server-side
- **System Tray** — Updated with current temp and emoji
- **Data Cards** — Humidity, pressure, wind extracted from same response
