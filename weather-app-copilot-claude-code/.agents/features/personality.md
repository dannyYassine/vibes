# Personality System

## Summary

Generates context-aware, witty headlines and subtitles for weather conditions. Personality changes based on condition, temperature range, and day/night. Adds character and helpful advice to the weather display.

## Key Files

**Backend Service:**
- `backend/src/services/personality.rs` — Personality text generation (lines 1-200)

**Backend Integration:**
- `backend/src/services/weather_api.rs` — Calls `generate_personality()` at line 92-93

**Frontend Display:**
- `frontend/src/app/shared/services/weather-store.service.ts` — Stores headlines/subtitles (line 37-42)
- `frontend/src/app/features/weather/hero-section/hero-section.ts` — Displays headlines (lines 19-20)
- `frontend/src/app/features/weather/advisory-bar/advisory-bar.ts` — Displays subtitle (line 15)

**Shared Models:**
- `frontend/src/app/shared/models/weather.model.ts` — `CurrentWeather` has `personality_headline` and `personality_subtitle` fields

## Data Flow

```
OpenWeatherMap Current Weather API
  ↓
backend/weather_api.rs: fetch_current()
  ↓
Extract: condition (WeatherCondition), temp (f64), is_daytime (bool)
  ↓
Call: generate_personality(&condition, temp, is_daytime)
  ↓ (personality.rs)
Match condition + temp range → get PersonalitySet
  ↓
Randomly select headline from set
Randomly select subtitle from set
  ↓
Return (headline, subtitle) tuple
  ↓
Embed in CurrentWeatherResponse
  ↓
Frontend receives and stores in currentWeather signal
  ↓
Display in hero-section and advisory-bar
```

## Personality Sets

**CLEAR_HOT** (temp ≥ 28°C, daytime):
- Headlines: "Fucking love this.\nin the sun.", "It's gorgeous.\noutside.", "Sun's out.\nno complaints."
- Subtitles: "Expect changes throughout the day", "Sunscreen. seriously.", "Peak outdoor hours. go."

**CLEAR_MILD** (5°C < temp < 28°C, clear, daytime):
- Headlines: "It's nice.\noutside.", "Pretty decent.\nout there.", "Can't complain.\nnot today."
- Subtitles: "Enjoy it while it lasts.", "A light jacket wouldn't hurt.", "Good day to exist outdoors."

**CLEAR_COLD** (temp ≤ 5°C, clear):
- Headlines: "Clear but\nfreezing.", "Sunny and\ncold as hell.", "Beautiful.\nbut brutal."
- Subtitles: "The sun is lying to you.", "Looks warm. it's not.", "Layer up despite the sunshine."

**CLEAR_NIGHT** (clear, nighttime):
- Headlines: "Clear skies.\ntonight.", "Stars are out.\nif you care.", "Nice night.\nout there."
- Subtitles: "Good sleeping weather.", "Temperature's dropping.", "Grab a jacket if you're heading out."

**CLOUDY**:
- Headlines: "Meh.\nit's cloudy.", "Overcast.\nagain.", "Grey skies.\nall day."
- Subtitles: "Not great, not terrible.", "The sun exists. somewhere.", "At least it's not raining. yet."

**RAIN**:
- Headlines: "It's fucking\nraining.\nnow.", "Rain.\njust rain.", "Wet out there.\nobviously."
- Subtitles: "You can look outside to get more information.", "Umbrella or regret. your choice.", "Indoor plans seem wise."

**DRIZZLE**:
- Headlines: "It's drizzling.\na bit.", "Light rain.\nbarely there.", "Sprinkling.\nout there."
- Subtitles: "Umbrella optional. your call.", "Not enough to cancel plans.", "Just enough to be annoying."

**THUNDERSTORM**:
- Headlines: "Oh hell.\nit's storming.", "Thunder.\nand lightning.", "Stay inside.\nseriously."
- Subtitles: "Maybe don't go outside.", "Nature is angry today.", "Good day for movies and blankets."

**SNOW**:
- Headlines: "It's freezing.\nabsolutely\nfreezing.", "Snow.\neverywhere.", "White out.\nthere."
- Subtitles: "Layer up or stay inside. your call.", "Roads are questionable.", "Hot chocolate weather."

**FOG** (also: mist, haze):
- Headlines: "Can't see shit.\nit's foggy.", "Fog.\neverywhere.", "Visibility?\nnone."
- Subtitles: "Drive slow or don't drive at all.", "Silent Hill vibes.", "The world has loading issues."

**DUST**:
- Headlines: "Dusty.\nout there.", "Air quality?\nterrible.", "Dust storm.\ngreat."
- Subtitles: "Maybe keep the windows shut.", "Breathing is overrated anyway.", "Stay inside if you can."

**TORNADO**:
- Headlines: "Tornado.\nget safe.\nnow.", "Take cover.\nimmediately.", "This is\nnot a drill."
- Subtitles: "Seek shelter immediately.", "Basement. now.", "Safety first. everything else later."

## Models / Types

**PersonalitySet** (Rust struct):
```rust
struct PersonalitySet {
    headlines: &'static [&'static str],
    subtitles: &'static [&'static str],
}
```

**Generation Function:**
```rust
pub fn generate_personality(
    condition: &WeatherCondition,
    temp: f64,              // Celsius
    is_daytime: bool,
) -> (String, String)       // (headline, subtitle)
```

## Entry Points

**Generation:**
- Triggered in `backend/weather_api.rs` line 92-93 (fetch_current)
- `let (headline, subtitle) = generate_personality(&condition, owm.main.temp, is_daytime);`

**Display - Frontend:**
- Hero Section (lines 19-20): `headlineText` and `subtitleText` computed signals
- Advisory Bar (line 15): `subtitleText` computed signal
- Split headline by `\n` for multi-line display (hero-section.ts, lines 22-25)

**Randomization:**
- Uses `rand::rng()` to randomly select from headline/subtitle arrays
- New selection on each weather fetch (every 10 min)
- Adds personality variation without user action

## Selection Logic (get_personality)

Temperature-based branches for clear skies:
1. **Not daytime and clear** → CLEAR_NIGHT
2. **Daytime and temp ≥ 28°C** → CLEAR_HOT
3. **Daytime and temp ≤ 5°C** → CLEAR_COLD
4. **Otherwise (mild day)** → CLEAR_MILD

Condition-based branches:
- clouds → CLOUDY
- rain → RAIN
- drizzle → DRIZZLE
- thunderstorm → THUNDERSTORM
- snow → SNOW
- mist/fog/haze → FOG
- dust → DUST
- tornado → TORNADO
- default → CLEAR_MILD

## Related Features

- **Current Weather** — Provides condition, temperature, daytime flag
- **Theming** — Works alongside visual feedback for immersive experience
- **Hero Section** — Displays headline/subtitle prominently
- **Advisory Bar** — Displays subtitle as actionable guidance
