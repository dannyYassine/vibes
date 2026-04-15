# Feature Map Index

This directory contains feature documentation files that map each domain in the weather app to its relevant code, data flow, and key types. Use these as a quick reference when iterating on specific features.

## Features

- [**Current Weather**](./current-weather.md) — Hero display with temperature, condition, personality text, and dynamic gradient backgrounds
- [**Hourly Forecast**](./hourly-forecast.md) — 3-hour interval forecast for the next 48 hours in horizontal scrollable view
- [**Daily Forecast**](./daily-forecast.md) — Multi-day forecast with high/low temps, conditions, and descriptions
- [**Data Cards**](./data-cards.md) — Wind speed, pressure, and humidity metrics displayed as cards
- [**Location & Geolocation**](./location.md) — IP-based location detection, geocoding search, localStorage persistence
- [**System Tray**](./system-tray.md) — macOS tray icon showing current temperature and weather emoji
- [**Popup Window**](./popup.md) — Compact popup window anchored to tray, shows current weather summary
- [**Theming**](./theming.md) — Dynamic gradient backgrounds based on weather condition and day/night
- [**Personality System**](./personality.md) — Randomized witty headlines and subtitles per weather condition
- [**Response Caching**](./caching.md) — In-memory TTL cache for API responses to reduce load
- [**Backend API**](./backend-api.md) — Axum server proxying OpenWeatherMap, geolocation, and geocoding APIs

## How to Use

1. Find the feature you need to work on in the list above
2. Open the corresponding file to see:
   - Which files in the codebase handle that feature
   - How data flows through the system
   - Key types and data structures
   - Where the feature is triggered/rendered
3. Use file paths as quick navigation to the relevant code

## Quick Navigation

| Layer | Location |
|-------|----------|
| Frontend (Angular) | `frontend/src/app/` |
| Shared Services | `frontend/src/app/shared/services/` |
| Shared Models | `frontend/src/app/shared/models/` |
| Tauri Shell | `src-tauri/src/` |
| Backend (Rust/Axum) | `backend/src/` |
