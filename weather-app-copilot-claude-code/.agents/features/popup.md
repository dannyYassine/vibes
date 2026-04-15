# Popup Window Feature

## Summary

A compact tray-anchored popup window (320×300 px) that displays current weather summary. Appears below the system tray icon when clicked; auto-hides on blur. Allows quick access to weather without opening the main window.

## Key Files

**Frontend Component:**
- `frontend/src/app/features/popup/popup.ts` — Popup component (lines 1-36)

**App Router:**
- `frontend/src/app/app.ts` — Determines if running in `'popup'` or `'main'` window (lines 1-25)

**Tauri Shell:**
- `src-tauri/src/lib.rs` — Popup window setup (lines 46-55) and positioning logic (lines 64-95)

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — State, auto-refresh

## Data Flow

### Window Type Detection (app.ts)

```
App.ngOnInit()
  ↓ (if not Tauri)
Set windowType = 'main'
  ↓ (if Tauri)
Import @tauri-apps/api/webviewWindow
  ↓
Get current window label
  ↓
If label === 'popup' → set 'popup', else 'main'
  ↓
Template conditionally renders PopupComponent or WeatherViewComponent
```

### Popup Display

```
Tray click
  ↓ (Tauri handler)
Check if popup visible
  ↓ (if hidden)
Calculate position relative to tray icon rect
  ↓
Set popup position (centered below icon, accounts for scale)
  ↓
Show popup window
  ↓ (on blur)
PopupComponent.onBlur() handler
  ↓
Calls Tauri 'hide_popup' command
  ↓
Popup hides
```

### Weather Fetch

```
PopupComponent.ngOnInit()
  ↓
Calls store.initialize()
  ↓
Fetches current weather
  ↓
Displays via popup.html template
```

## Models / Types

**Window Type** (app.ts):
- `'loading'` — Initial state
- `'main'` — Full application window
- `'popup'` — Tray popup window

## Files Involved

**PopupComponent** (popup.ts):
- Renders popup.html and popup.scss
- Imports: `WeatherIconComponent`, `TemperaturePipe`, `DatePipe`
- Injects `WeatherStore`
- On init: calls `store.initialize()` (line 18)
- On blur: calls Tauri `hide_popup` command (line 31-33)
- Click handler: `openMain()` → calls `open_main_window` Tauri command (line 22-26)

**App Component** (app.ts):
- Central router
- Sets `windowType` signal based on Tauri window label
- Template: `<app-weather-view>` if windowType === 'main', else `<app-popup>`

**Popup Window Config** (src-tauri/lib.rs):
- Size: 320×300 px (line 48)
- Always on top (line 50)
- Borderless, no taskbar entry (lines 49, 51)
- Starts hidden (line 52)
- Non-resizable (line 53)

## Entry Points

**Window Creation:**
- Tauri app setup (src-tauri/lib.rs, line 46)
- Runs once; reused for show/hide

**First Display:**
- User clicks tray icon
- Tauri handler (lines 64-95) calculates position and calls `popup.show()`

**Auto-hide:**
- `PopupComponent.onBlur()` (lines 28-34)
- Fires when popup loses focus
- Calls Tauri `hide_popup` command

**Quick Open Main:**
- `PopupComponent.openMain()` (lines 21-26)
- Button click in popup
- Calls Tauri `open_main_window` command
- Hides popup, shows main window

## Positioning Logic

**Dynamic Position** (lib.rs, lines 77-89):
```rust
let scale = popup.scale_factor().unwrap_or(1.0);
let (ix, iy) = match rect.position { ... } // tray icon position
let (iw, ih) = match rect.size { ... }     // tray icon size
let popup_w = 320.0 * scale;
let x = ix + iw / 2.0 - popup_w / 2.0;     // center horizontally
let y = iy + ih;                            // below icon
popup.set_position(PhysicalPosition::new(x, y));
```
- Centers popup horizontally relative to tray icon
- Places it directly below the icon
- Scales for retina/high-DPI displays

## Related Features

- **Current Weather** — Data displayed in popup
- **System Tray** — Parent UI element; clicking tray opens popup
- **App Shell** — Popup window managed by Tauri
