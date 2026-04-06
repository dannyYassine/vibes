# Weather App - Design Decisions

## Inspiration Analysis

### Inspiration A (Screenshots 1 & 2) - "Expressive Typography"
- Oversized bold black text, weather condition as the focal point
- Weather keyword rendered with CSS text-stroke (outlined/hollow)
- Weather-reactive gradient backgrounds: warm peach/orange (sunny), cool blue/silver (rain), purple/lavender (freezing)
- Single line-art weather icon top-left
- Witty subtitle: "You can look outside to get more information."
- Bottom advisory bar with forecast note + current time
- Subtle noise/grain texture overlay on gradient

### Inspiration B (Screenshots 3 & 4) - "Illustrated Data"
- Scenic illustrated landscape header (changes with weather/season)
- Large temperature overlay on scene, ultra-thin font weight
- "Real feel" temperature label
- Location name + arrow icon (bottom-right of scene)
- Three data cards in a row: Wind, Pressure, Humidity (gradient-filled, rounded)
- Horizontal hourly forecast strip with "NOW" label
- Dark-themed 10-day forecast list: date | icon | high | low | description
- Bottom tab bar with icons

## Design Direction: Blended Approach

Take the **personality and gradient hero** from Inspiration A and the **structured data presentation** from Inspiration B. No illustrated landscapes — keep it clean and minimal (Apple iOS aesthetic).

---

## Color System

### Weather-Reactive Hero Gradients

| Condition     | Stops                                        | Direction | Text Color |
|---------------|----------------------------------------------|-----------|------------|
| Clear/Sunny   | `#F9D976` `#F39F86` `#E8837C`               | 135deg    | `#1A1A1A`  |
| Cloudy        | `#D4D3DD` `#B8C6DB` `#A0AAB8`               | 135deg    | `#1A1A1A`  |
| Rain          | `#B0C4DE` `#8AACC8` `#6B8DB2` `#C8B6D4`    | 135deg    | `#1A1A1A`  |
| Drizzle       | `#C5CAE9` `#B0C4DE` `#A0AAB8`               | 135deg    | `#1A1A1A`  |
| Snow          | `#E8EAF6` `#C5CAE9` `#9FA8DA` `#B39DDB`    | 135deg    | `#1A1A1A`  |
| Thunderstorm  | `#4A4458` `#37474F` `#263238`                | 135deg    | `#FFFFFF`  |
| Fog/Mist/Haze | `#CFD8DC` `#B0BEC5` `#90A4AE`               | 135deg    | `#1A1A1A`  |
| Night Clear   | `#1A1A2E` `#16213E` `#0F3460`               | 135deg    | `#FFFFFF`  |
| Night Cloudy  | `#2C2C54` `#474787` `#3B3B6D`               | 135deg    | `#FFFFFF`  |

### Data Zone (below hero)
- Background: `#1C1C2E`
- Primary text: `#EAEAEA`
- Secondary/muted text: `#8E8E93`
- Card background: `rgba(255, 255, 255, 0.10)`
- Card border: `rgba(255, 255, 255, 0.15)`

### Frosted Glass Cards
```scss
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 16px;
```

---

## Typography

### Font
**Inter** — open-source alternative to SF Pro. Loaded locally.
Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scale

| Element             | Weight | Size     | Notes                              |
|---------------------|--------|----------|------------------------------------|
| Hero headline       | 900    | 72-96px  | Black weight, tight letter-spacing |
| Hero weather word   | 900    | 72-96px  | CSS `text-stroke` outlined effect  |
| Hero subtitle       | 400    | 16px     | opacity: 0.6                       |
| Temperature         | 200    | 120px    | Ultra-thin                         |
| Feels-like label    | 400    | 14px     | opacity: 0.7                       |
| Data card value     | 600    | 24px     | Semi-bold                          |
| Data card label     | 400    | 13px     | Muted color                        |
| Hourly time         | 500    | 12px     | Medium                             |
| Hourly temp         | 600    | 16px     | Semi-bold                          |
| Forecast date       | 400    | 15px     | Regular                            |
| Forecast high       | 700    | 18px     | Bold                               |
| Forecast low        | 400    | 15px     | Muted color                        |
| Forecast label      | 400    | 14px     | Muted color                        |
| Advisory bar        | 500    | 13px     | Medium                             |

---

## Layout

Single scrollable view, 5 stacked zones:

```
+--------------------------------------------------+
|  ZONE 1: HERO (100vh)                            |
|                                                   |
|  [weather-icon]                    (top-left)     |
|                                                   |
|                                                   |
|  It's                                             |
|  fucking                                          |
|  raining.     <-- outlined text         22°       |
|  now.                               Feels 18°    |
|                                                   |
|  You can look outside...    Montreal, QC ↗       |
+--------------------------------------------------+
|  ZONE 2: DATA CARDS                               |
|  [ Wind    ] [ Pressure ] [ Humidity ]            |
|  [ 12 km/h ] [ 1013 hPa ] [ 65%     ]            |
+--------------------------------------------------+
|  ZONE 3: HOURLY FORECAST (scroll-x)               |
|  NOW   2PM   3PM   4PM   5PM   6PM ...           |
|  rain  rain  cloud cloud sun   sun               |
|  18°   17°   19°   20°   22°   21°              |
+--------------------------------------------------+
|  ZONE 4: 10-DAY FORECAST                          |
|  Mon   rain  21°  ——  15°   Rain                 |
|  Tue   cloud 24°  ——  18°   Partly cloudy        |
|  Wed   sun   28°  ——  20°   Clear                |
|  ...                                              |
+--------------------------------------------------+
|  ZONE 5: ADVISORY BAR                             |
|  Be prepared for the weather  |  Last updated 4PM |
+--------------------------------------------------+
```

### Zone 1: Hero
- Full viewport height
- Weather-reactive gradient background with subtle grain overlay
- Line-art SVG weather icon, top-left, ~64px
- Bold headline text, bottom-left aligned, stacked lines
- The weather keyword (e.g. "raining") uses `-webkit-text-stroke` for outlined effect
- Temperature displayed right side, vertically centered, ultra-thin 120px
- "Feels like" below temperature, smaller
- Location badge bottom-right with arrow icon
- Subtle witty subtitle below headline

### Zone 2: Data Cards
- 3 equal-width frosted-glass cards
- Each: icon (top), label (middle), value (bottom)
- Horizontal row with 12px gap
- Cards sit on the dark background zone

### Zone 3: Hourly Forecast
- Dark background, horizontal scroll with scroll-snap
- Each item: time label, small weather icon, temperature
- First item labeled "NOW"
- 48 hours of data

### Zone 4: 10-Day Forecast
- Dark background, vertical list
- Each row: date, weather icon, high temp (bold), temp range bar, low temp (muted), condition label
- Subtle divider between rows

### Zone 5: Advisory Bar
- Thin footer bar
- Left: advisory/forecast summary text
- Right: last update timestamp

---

## Component Architecture

```
app-root
  └── app-weather-view           (main scrollable container)
        ├── app-hero-section       (gradient bg, personality text, temp)
        │     ├── app-weather-icon   (SVG line-art icon)
        │     ├── app-headline-text  (bold + outlined keyword)
        │     ├── app-temperature-display  (large temp + feels-like)
        │     └── app-location-badge (city name + arrow)
        ├── app-data-cards         (3-card row)
        │     └── app-data-card x3   (reusable frosted card)
        ├── app-hourly-forecast    (horizontal scroll container)
        │     └── app-hourly-item xN (time + icon + temp)
        ├── app-daily-forecast     (vertical list)
        │     └── app-daily-row x10  (date + icon + temps + label)
        ├── app-advisory-bar       (footer bar)
        └── app-loading-overlay    (initial load state)
```

### Shared Components
- `app-weather-icon` — renders SVG based on condition code string
- `app-frosted-card` — reusable glass-morphism container

---

## Animations

| Trigger                 | Effect                                           | Duration |
|-------------------------|--------------------------------------------------|----------|
| Weather condition change | Hero gradient cross-fade                        | 1.5s     |
| Initial load            | Hero text staggers in word-by-word              | 100ms/word |
| Scroll into data cards  | Cards slide up + fade in (IntersectionObserver) | 300ms, staggered 100ms |
| Scroll into daily rows  | Rows slide up + fade, staggered 50ms each       | 250ms    |
| Temperature change      | Number counter animation                         | 800ms    |
| Icon change             | Cross-fade opacity                               | 400ms    |
| Hourly scroll           | CSS scroll-snap-type: x mandatory               | native   |

All animations respect `prefers-reduced-motion: reduce`.

---

## Personality Text System

Backend generates expressive headlines mapped to weather conditions:

| Condition    | Headline                             | Subtitle                                        |
|--------------|--------------------------------------|-------------------------------------------------|
| Clear (hot)  | Fucking love this. in the sun.       | Expect changes throughout the day               |
| Clear (mild) | It's nice. outside.                  | Enjoy it while it lasts.                        |
| Rain         | It's fucking raining. now.           | You can look outside to get more information.   |
| Drizzle      | It's drizzling. a bit.               | Umbrella optional. your call.                   |
| Cloudy       | Meh. it's cloudy.                    | Not great, not terrible.                        |
| Snow         | It's freezing. absolutely freezing.  | Layer up or stay inside.                        |
| Thunderstorm | Oh hell. it's storming.              | Maybe don't go outside.                         |
| Fog          | Can't see shit. it's foggy.          | Drive slow or don't drive at all.               |

The weather keyword in the headline (raining, cloudy, freezing, etc.) is rendered with the outlined text-stroke effect.

---

## Tech Decisions

| Decision              | Choice                    | Why                                              |
|-----------------------|---------------------------|--------------------------------------------------|
| State management      | Angular Signals           | Built-in, lightweight, no extra deps             |
| Backend caching       | In-memory RwLock<HashMap> | Single-user desktop app, simple is better        |
| Font                  | Inter                     | Open-source SF Pro match, excellent web support  |
| Weather API           | OpenWeatherMap One Call 3.0 | All data in one call, free tier sufficient     |
| Personality text      | Server-side (Rust)        | Cacheable, keeps frontend thin                   |
| Tauri backend         | Sidecar                   | Clean separation, independent dev/test           |
| CSS approach          | SCSS component styles     | Scoped styles + shared variables/mixins          |
| Icons                 | Custom SVG line-art set   | Matches Inspiration A minimalist icon style      |
