# System Tray Feature

## Summary

Integrates weather data into the macOS system tray (menu bar). Shows current temperature + weather emoji as the tray title. Clicking toggles the popup window visibility and positions it below the tray icon.

## Key Files

**Frontend Service:**
- `frontend/src/app/shared/services/tray.service.ts` — Updates tray title; detects Tauri environment (lines 3-46)

**Tauri Commands & Setup:**
- `src-tauri/src/lib.rs` — 
  - `update_tray_title()` command (lines 9-14)
  - Tray icon setup (lines 59-96)
  - Click handler for show/hide/position popup (lines 64-95)
  - Other commands: `hide_popup`, `open_main_window`

**Integration:**
- `frontend/src/app/shared/services/weather-store.service.ts` — Calls `trayService.updateTray()` (line 102)

## Data Flow

```
Current weather fetched
  ↓ (fetchWeather in store)
Calls trayService.updateTray(temperature, condition)
  ↓
Detects Tauri environment (__TAURI_INTERNALS__ or __TAURI__)
  ↓
Dynamic imports @tauri-apps/api/core: invoke()
  ↓
Calls Tauri command 'update_tray_title'
  ↓
Rust handler: update_tray_title(state, title)
  ↓
Updates TrayIcon.set_title(Some(title))
  ↓
Tray displays: "23° ☀️"
```

## Models / Types

**Condition to Emoji Map** (tray.service.ts, lines 24-28):
```typescript
const CONDITION_EMOJI: Record<string, string> = {
  clear: '☀️', clouds: '☁️', rain: '🌧', drizzle: '🌦',
  thunderstorm: '⛈', snow: '❄️', mist: '🌫', fog: '🌫',
  haze: '🌫', dust: '💨', tornado: '🌪',
};
```
- Fallback emoji: `'🌡'` (thermometer) for unknown conditions

**Tray Title Format:**
- `Math.round(temperature)° emoji`
- Example: `"21° ☁️"`

## Tauri Setup (src-tauri/src/lib.rs)

**Popup Window Configuration** (lines 46-55):
- Label: `"popup"`
- Size: 320×300 px
- Decorations: false (borderless)
- Always on top: true
- Skip taskbar: true
- Visible: false (initially hidden)
- Resizable: false
- Shadow: true

**Tray Icon Configuration** (lines 59-96):
- Icon: 1×1 transparent (line 57)
- As template: true (macOS system icon style)
- Initial title: `"--°"` (placeholder)
- Tooltip: `"Weather"`
- Click handler (left click, up state):
  - If popup visible → hide
  - If hidden → position and show
    - Position: centered below tray icon (lines 77-89)
    - Accounts for scale factor on retina displays

**TrayState** (line 7):
- Wrapped in `Mutex<tauri::tray::TrayIcon>` for safe mutation

## Entry Points

**Update Trigger:**
- `WeatherStore.fetchWeather()` (line 79-115 in weather-store.service.ts)
- Calls `trayService.updateTray(weather.temperature, weather.condition)` (line 102)
- Logged: `console.log('[WeatherStore] calling updateTray', ...)`

**Click Handler:**
- Tray icon click (left mouse button, released)
- Auto-positions popup below tray, toggles visibility
- Handles different DPI scales

**Window Management Commands:**
- `update_tray_title(title)` — Update tray display
- `hide_popup()` — Force hide popup
- `open_main_window()` — Show main window, hide popup

## Environment Detection

**Tauri Check** (tray.service.ts, lines 8-10):
```typescript
const isTauri = typeof window !== 'undefined' && (
  '__TAURI_INTERNALS__' in window || '__TAURI__' in window
);
```
- If not Tauri, no-op (logs warning, continues)
- Allows dev/browser testing without tray

## Related Features

- **Current Weather** — Data source for tray title
- **Popup Window** — Window toggled by tray click
- **App Shell** (src-tauri) — Core Tauri app setup
