# Weather App - Implementation Plan

## Summary

A minimalist, expressive weather app blending two visual styles:
- **Hero zone**: Bold typography with weather-reactive gradient backgrounds and personality-driven text (Inspirations 1 & 2)
- **Data zone**: Dark-themed data cards, hourly strip, and 10-day forecast (Inspirations 3 & 4)

**Stack**: Angular 19 (standalone components, signals) + Tauri v2 + Rust/Axum backend

---

## Step 0: Write design.md

Populate `.claude/plans/design.md` with design decisions, color palettes, typography scale, and component specs documented below.

---

## Step 1: Scaffold Projects

### 1a. Workspace structure
```
weather-app-copilot-claude-code/
  frontend/          # Angular 19 app
  backend/           # Rust/Axum API server
  src-tauri/         # Tauri v2 shell
```

### 1b. Angular
- `ng new frontend --style=scss --routing=false --standalone --skip-tests`
- Add `@angular/animations` dependency

### 1c. Rust backend
- `cargo init backend`
- Dependencies: `axum`, `tokio`, `serde`, `serde_json`, `reqwest`, `tower-http` (cors), `rand`

### 1d. Tauri
- Initialize Tauri v2 inside the workspace root pointing at the Angular frontend
- Window: 420x780px default, resizable, min 380x600

---

## Step 2: Backend (Rust/Axum)

### Critical files
- `backend/src/main.rs` - Axum server, router, CORS
- `backend/src/routes/weather.rs` - `GET /api/weather?lat=&lon=`
- `backend/src/routes/forecast.rs` - `GET /api/forecast?lat=&lon=`
- `backend/src/routes/geocode.rs` - `GET /api/geocode?q=`
- `backend/src/models/weather.rs` - `CurrentWeatherResponse`, `WeatherCondition` enum
- `backend/src/models/forecast.rs` - `HourlyForecast`, `DailyForecast`
- `backend/src/services/weather_api.rs` - OpenWeatherMap HTTP client (`reqwest`)
- `backend/src/services/cache.rs` - In-memory TTL cache (`RwLock<HashMap>`)
- `backend/src/services/personality.rs` - Expressive headline/subtitle generator

### API design

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/weather?lat=&lon=` | Current conditions + personality text |
| GET | `/api/forecast?lat=&lon=` | 48h hourly + 10-day daily |
| GET | `/api/geocode?q=` | Location search results |
| GET | `/api/health` | `{ "status": "ok" }` |

### Weather API
- Provider: **OpenWeatherMap One Call 3.0**
- API key from env var `OPENWEATHER_API_KEY`
- Units: metric
- Cache: 10min for current, 30min for forecast

### Personality text generator
Maps `WeatherCondition` + temperature to expressive headlines:
- Clear+Hot: `"Fucking love this."` / `"in the sun."`
- Rain: `"It's fucking raining."` / `"now."`
- Snow: `"It's freezing."` / `"absolutely freezing."`
- Cloudy: `"Meh."` / `"it's cloudy."`
- Thunderstorm: `"Oh hell."` / `"it's storming."`
- Subtitle always witty: `"You can look outside to get more information."`

### Data models (Rust)
```rust
pub enum WeatherCondition {
    Clear, Clouds, Rain, Drizzle, Thunderstorm,
    Snow, Mist, Fog, Haze, Dust, Tornado,
}

pub struct CurrentWeatherResponse {
    temperature: f64, feels_like: f64, humidity: u32,
    pressure: u32, wind_speed: f64, wind_direction: u32,
    condition: WeatherCondition, condition_description: String,
    icon_code: String, is_daytime: bool,
    personality_headline: String, personality_subtitle: String,
    location_name: String, updated_at: String,
}

pub struct HourlyForecast {
    time: String, temperature: f64, condition: WeatherCondition,
    icon_code: String, precipitation_probability: u32,
}

pub struct DailyForecast {
    date: String, temp_high: f64, temp_low: f64,
    condition: WeatherCondition, condition_label: String, icon_code: String,
}
```

---

## Step 3: Angular Foundation

### Critical files
- `frontend/src/styles/_variables.scss` - Color palettes, spacing, breakpoints
- `frontend/src/styles/_typography.scss` - Font face, type scale
- `frontend/src/styles/_animations.scss` - Keyframes, transition helpers
- `frontend/src/styles/global.scss` - Reset, base styles
- `frontend/src/app/shared/services/weather-store.service.ts` - Signals-based central state
- `frontend/src/app/shared/services/weather.service.ts` - HTTP calls to backend
- `frontend/src/app/shared/services/location.service.ts` - Geolocation + localStorage
- `frontend/src/app/shared/services/theme.service.ts` - Gradient computation
- `frontend/src/app/shared/models/weather.model.ts` - TypeScript interfaces

### State management
Angular Signals (no RxJS store):
```
WeatherStore {
  currentWeather: signal<CurrentWeather | null>
  hourlyForecast: signal<HourlyForecast[]>
  dailyForecast: signal<DailyForecast[]>
  location: signal<Location | null>
  loading: signal<boolean>
  // Computed
  weatherCondition: computed -> WeatherCondition
  gradientConfig: computed -> GradientConfig
  headlineText: computed -> string
}
```

### Font
**Inter** (open-source SF Pro alternative), loaded via Google Fonts CDN.

---

## Step 4: Angular Components (UI)

### Layout (single scrollable view, 5 zones)

```
+-------------------------------------------------+
|  HERO SECTION (full viewport height)            |
|  - Weather-reactive gradient background          |
|  - Line-art weather icon (top-left)              |
|  - Bold expressive headline (bottom-left)        |
|  - Weather keyword in outlined/stroke style      |
|  - Witty subtitle below headline                 |
|  - Large temperature (right side, ultra-thin)    |
|  - "Feels like X" below temp                     |
|  - Location name + arrow (bottom-right)          |
+-------------------------------------------------+
|  DATA CARDS (3 frosted-glass cards, row)         |
|  - Wind | Pressure | Humidity                    |
|  - Icon + label + value per card                 |
+-------------------------------------------------+
|  HOURLY FORECAST (horizontal scroll)             |
|  - "NOW" label for current hour                  |
|  - Each: time, icon, temperature                 |
+-------------------------------------------------+
|  10-DAY FORECAST (dark bg, list rows)            |
|  - Each: date, icon, high, bar, low, label       |
+-------------------------------------------------+
|  ADVISORY BAR (footer)                           |
|  - Advisory text | last update time               |
+-------------------------------------------------+
```

### Component tree
```
app-root
  app-weather-view
    app-hero-section
      app-weather-icon
      app-headline-text
      app-temperature-display
      app-location-badge
    app-data-cards
      app-data-card (x3)
    app-hourly-forecast
      app-hourly-item (xN)
    app-daily-forecast
      app-daily-row (x10)
    app-advisory-bar
    app-loading-overlay
```

### Critical component files
- `frontend/src/app/features/weather/weather-view.ts` - Main container
- `frontend/src/app/features/weather/hero-section/hero-section.ts` - Personality hero
- `frontend/src/app/features/weather/data-cards/data-cards.ts` - Frosted glass cards
- `frontend/src/app/features/weather/hourly-forecast/hourly-forecast.ts` - Scrollable strip
- `frontend/src/app/features/weather/daily-forecast/daily-forecast.ts` - 10-day list
- `frontend/src/app/shared/components/weather-icon/weather-icon.ts` - SVG icon renderer

---

## Step 5: Visual Design System

### Color palettes (weather-reactive gradients for hero)

| Condition | Gradient | Text |
|-----------|----------|------|
| Clear/Sunny | `#F9D976 -> #F39F86 -> #E8837C` | Dark |
| Cloudy | `#D4D3DD -> #B8C6DB -> #A0AAB8` | Dark |
| Rain | `#B0C4DE -> #8AACC8 -> #6B8DB2 -> #C8B6D4` | Dark |
| Snow | `#E8EAF6 -> #C5CAE9 -> #9FA8DA -> #B39DDB` | Dark |
| Thunderstorm | `#4A4458 -> #37474F -> #263238` | Light |
| Night Clear | `#1A1A2E -> #16213E -> #0F3460` | Light |

### Frosted glass cards
- `background: rgba(255, 255, 255, 0.15)`
- `backdrop-filter: blur(20px)`
- `border: 1px solid rgba(255, 255, 255, 0.2)`
- `border-radius: 16px`

### Dark data zone
- Background: `#1C1C2E`
- Text: `#EAEAEA`
- Muted: `#8E8E93`

### Typography scale

| Element | Weight | Size |
|---------|--------|------|
| Hero headline | 900 (Black) | 72-96px |
| Hero weather word | 900 + CSS text-stroke (outlined) | 72-96px |
| Hero subtitle | 400 | 16px, 0.6 opacity |
| Temperature | 200 (Thin) | 120px |
| Feels-like | 400 | 14px |
| Card value | 600 | 24px |
| Card label | 400 | 13px |
| Hourly temp | 600 | 16px |
| Daily high | 700 | 18px |
| Daily low | 400 | 15px, muted |

### Animations
- Gradient: CSS cross-fade 1.5s on condition change
- Hero text: stagger in word-by-word (120ms delay)
- Data cards: slide-up + fade via IntersectionObserver (staggered 100ms)
- Daily rows: slide-up + fade via IntersectionObserver (staggered 50ms)
- Hourly: CSS scroll-snap with momentum
- Grain texture overlay on hero (SVG feTurbulence, 4% opacity)
- All respect `prefers-reduced-motion`

---

## Step 6: Tauri Integration

### Critical files
- `src-tauri/tauri.conf.json` - Window config, sidecar setup
- `src-tauri/src/lib.rs` - Tauri entry point

### Configuration
- Window: 420x780, resizable, min 380x600, title "Weather"
- Dev: proxy to `http://localhost:4200` (Angular dev server)
- Prod: serve from `dist/frontend/browser`
- Backend runs separately (start with `cargo run` in `backend/`)

---

## Step 7: Polish & Refinement

- Add subtle noise/grain texture overlay on hero gradient (as seen in Inspiration 1)
- Ensure smooth scrolling between hero and data zones
- Loading skeleton/overlay for initial fetch
- Error state (fallback city if geolocation denied)
- Store last location in `localStorage`
- Auto-refresh every 10 minutes

---

## Implementation Order

1. Write `design.md` with design decisions
2. Scaffold all three projects (Angular, Rust backend, Tauri)
3. Backend: models -> services -> routes -> test with curl
4. Angular: global styles -> services/store -> shared components
5. Angular: hero section -> data cards -> hourly -> daily -> advisory bar
6. Animations and polish
7. Tauri integration and sidecar config
8. End-to-end testing

---

## How to Run

1. `cp backend/.env.example backend/.env` and add your OpenWeatherMap API key
2. Terminal 1: `cd backend && cargo run`
3. Terminal 2: `cd frontend && ng serve`
4. Browser: `http://localhost:4200`
5. Or with Tauri: `cd src-tauri && cargo tauri dev` (with backend running separately)

---

## Verification

1. **Backend**: `cargo run` in `backend/`, then `curl http://localhost:3001/api/health` returns OK. `curl http://localhost:3001/api/weather?lat=45.0&lon=-73.0` returns weather JSON with personality text.
2. **Frontend**: `ng serve` in `frontend/`, opens in browser, shows loading state, fetches from backend, renders hero + all data zones.
3. **Tauri**: `cargo tauri dev` from `src-tauri/` launches the app window, weather data loads and displays correctly.
4. **Visual check**: Gradient matches weather condition. Personality text displays with outlined keyword. Data cards show frosted glass. Hourly scrolls horizontally. 10-day forecast rows render. Animations trigger on scroll.
