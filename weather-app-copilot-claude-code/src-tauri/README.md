# Tauri Desktop Application

The desktop wrapper and shell for the Weather App. Built with Tauri 2, this application bridges the Angular frontend with a lightweight Rust-based desktop environment, providing native system integration, efficient bundling, and cross-platform distribution.

## Overview

Tauri is a modern framework that creates lightweight native applications by combining a Rust backend with web technologies (HTML, CSS, JavaScript). This project serves as the desktop application container, handling window management, application lifecycle, and system integration.

**Current Version**: 0.1.0
**Tauri Version**: 2.10.3
**Rust Version**: 1.77.2+
**Edition**: 2021

## Technology Stack

### Tauri Framework
- **Tauri**: 2.10.3 - Desktop application framework (with `tray-icon` feature)
- **tauri-build**: 2.5.6 - Build tooling for Tauri
- **tauri-plugin-log**: 2 - Logging plugin

### Rust Runtime
- **Language**: Rust (Edition 2021)
- **Standard Library Features**: Core, async, system APIs

### Serialization
- **serde**: 1.0 with derive feature
- **serde_json**: 1.0 - JSON handling

### Logging
- **log**: 0.4 - Logging facade

## Project Structure

```
src-tauri/
├── src/
│   ├── main.rs                    # Application entry point (desktop)
│   └── lib.rs                     # Core Tauri application logic
│
├── Cargo.toml                     # Rust dependencies and package metadata
├── Cargo.lock                     # Locked dependency versions
├── build.rs                       # Build script
├── tauri.conf.json               # Tauri configuration
│
├── icons/                        # Application icons
│   ├── 32x32.png
│   ├── 128x128.png
│   ├── 128x128@2x.png
│   ├── icon.icns                 # macOS icon
│   └── icon.ico                  # Windows icon
│
├── capabilities/                 # Tauri capabilities (security policy)
├── gen/                          # Generated Tauri files
└── target/                       # Build output directory
```

## Files and Directories

### Source Code

#### `src/main.rs`
The desktop application entry point:
- Prevents additional console window on Windows in release builds
- Delegates to `app_lib::run()` function in lib.rs
- Minimal - acts as entry point only

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  app_lib::run();
}
```

#### `src/lib.rs`
Core Tauri application logic:
- `run()` function - Main application setup and initialization
- Tauri builder configuration
- Plugin setup (logging)
- Window and tray creation
- IPC command registration
- Error handling

Key setup:
- Initializes Tauri builder
- Registers plugins (tauri-plugin-log in debug mode)
- Creates the **popup window** (320×300, no decorations, always on top, hidden)
- Creates the **tray icon** with a 1×1 transparent pixel icon (text-only in menu bar)
- Tray left-click positions and shows the popup below the tray icon, or hides it if already visible
- Manages `TrayState` for cross-command tray access

#### IPC Commands

| Command | Description |
|---|---|
| `update_tray_title` | Updates the menu bar label (e.g. `14° ☁️`) — called by Angular after each weather fetch |
| `hide_popup` | Hides the popup window — called by Angular on `window:blur` |
| `open_main_window` | Hides the popup and shows/focuses the main window — called by the expand button |

### Configuration

#### `tauri.conf.json`
Central Tauri configuration file:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Weather",
  "version": "0.1.0",
  "identifier": "com.weather.app",
  "build": {
    "frontendDist": "../frontend/dist/frontend/browser",
    "devUrl": "http://localhost:4200"
  },
  "app": {
    "windows": [{
      "label": "main",
      "title": "Weather",
      "width": 600,
      "height": 900,
      "minWidth": 500,
      "minHeight": 750,
      "resizable": true,
      "fullscreen": false,
      "decorations": true,
      "visible": false
    }],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Key Settings**:
- `productName`: "Weather" - Application name
- `identifier`: "com.weather.app" - Unique app identifier (reverse domain notation)
- `version`: "0.1.0" - Application version
- `frontendDist`: Path to built Angular frontend
- `devUrl`: Development server URL (Angular dev server)
- Main window (`label: "main"`): 600×900 pixels, starts hidden (`visible: false`) — opened via popup expand button
- Minimum size: 500×750 pixels
- The **popup window** (320×300, no decorations) is created programmatically in `lib.rs`
- Bundle targets: all platforms (macOS, Windows, Linux)

#### `Cargo.toml`
Rust package manifest:

```toml
[package]
name = "app"
version = "0.1.0"
description = "A Tauri App"
edition = "2021"
rust-version = "1.77.2"

[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.5.6", features = [] }

[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.10.3", features = ["tray-icon"] }
tauri-plugin-log = "2"
```

**Dependencies**:
- `tauri` - Core framework (`tray-icon` feature enables macOS menu bar integration)
- `tauri-plugin-log` - Logging plugin
- `serde`/`serde_json` - Serialization for API communication
- `log` - Logging abstraction

#### `build.rs`
Build script for Tauri application. Executed before compilation to:
- Generate Tauri context
- Prepare build environment
- Validate configuration

### Icons

Application icons in multiple formats:
- **32x32.png** - Taskbar/menu icon
- **128x128.png** - Standard application icon
- **128x128@2x.png** - High-DPI icon
- **icon.icns** - macOS application icon
- **icon.ico** - Windows application icon

Icons should be provided in all formats for proper bundling on each platform.

### Capabilities

The `capabilities/` directory contains security policy definitions for Tauri. Defines what the application is allowed to do (IPC commands, filesystem access, etc.).

### Generated Files

The `gen/` directory contains auto-generated Tauri files from configuration. Should not be manually edited.

## Development Workflow

### Prerequisites

- Rust 1.77.2+ ([Install Rustup](https://rustup.rs/))
- Node.js 18+ for frontend development
- Platform-specific build tools:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual C++ Build Tools
  - **Linux**: GCC and development libraries

### Development Mode

From project root:
```bash
npm run tauri dev
```

This:
1. Starts the Angular dev server on `http://localhost:4200`
2. Builds the Tauri application in debug mode
3. Launches the desktop window
4. Enables hot-reload of the Angular frontend
5. Activates Rust logging

The application connects to `http://localhost:4200` as configured in `tauri.conf.json`.

### Building for Production

```bash
npm run tauri build
```

Creates platform-specific distributables:

#### macOS
- `.app` bundle - Direct application
- `.dmg` installer - Standard macOS installer with drag-and-drop

#### Windows
- `.msi` - Windows Installer executable
- `.exe` - Portable executable
- Updater support (if configured)

#### Linux
- `.AppImage` - Universal Linux package
- `.deb` - Debian package
- `.rpm` - Red Hat package
- Arch PKGBUILD files

Binaries are output in `target/release/bundle/` organized by platform.

## macOS Menu Bar (Tray)

The app runs as a menu bar application — no Dock icon, no visible window on launch.

### Tray Icon
A 1×1 transparent pixel with `icon_as_template: true` is used so only the title text appears in the menu bar. The title is initialized to `--°` and updated to e.g. `14° ☁️` after the first weather fetch.

### Popup Window
A second Tauri webview window (`label: "popup"`) is created at startup:

| Property | Value |
|---|---|
| Size | 320×300 logical pixels |
| Decorations | None |
| Always on top | Yes |
| Skip taskbar | Yes |
| Initial visibility | Hidden |
| Shadow | Yes |

On tray left-click, the popup is positioned centered below the tray icon using the click `rect` physical coordinates, then shown and focused. Clicking again hides it. Clicking outside (window blur) triggers the Angular popup component to call `hide_popup`.

### Data Flow
```
WeatherStore.fetchWeather()
  └─► TrayService.updateTray(temp, condition)
        └─► invoke('update_tray_title', { title: '14° ☁️' })
              └─► TrayState.icon.set_title(Some(title))

Popup expand button
  └─► invoke('open_main_window')
        └─► popup.hide() + main.show() + main.set_focus()
```

## Window Configuration

The application window is configured in `tauri.conf.json`:

### Main Window (`label: "main"`)
- **Default**: 600×900 pixels
- **Minimum**: 500×750 pixels
- **Resizable**: Yes
- **Visible on launch**: No — opened via the popup's expand button
- **Decorations**: Enabled (native window chrome)

### Popup Window (`label: "popup"`)
- **Size**: 320×300 pixels (fixed, created in `lib.rs`)
- **Decorations**: None
- **Visible on launch**: No — shown on tray click

### Security
- **CSP** (Content Security Policy): null (not configured)

Modify window config by editing the `app.windows[0]` object in `tauri.conf.json`.

## Build System

### Tauri Build
- **Builder**: `@tauri-apps/cli`
- **Frontend Integration**: Tauri builds the Angular app, then embeds it
- **Code Signing**: Optional (for distribution)

### Rust Compilation
- **Profile**: Debug for dev, Release for production
- **Optimization**: Enabled in release builds
- **Platform Targets**: Native compilation for each platform

### Output Structure
```
target/release/bundle/
├── macos/               # macOS bundles
│   ├── Weather.app/
│   └── Weather.dmg
├── msi/                 # Windows installer
│   └── Weather_*.msi
├── nsis/               # Windows NSIS installer
│   └── Weather Setup *.exe
└── appimage/           # Linux AppImage
    └── weather_*.AppImage
```

## Dependencies

### Tauri
- Core framework for desktop integration
- Window management
- File system access
- System dialogs

### Plugins
- **tauri-plugin-log** - Native logging with file output capability
  - Log level: Info (debug), Debug (development)
  - Disabled in production builds

### Serialization
- **serde** - Serialization framework
- **serde_json** - JSON serialization for app state/configuration

### Logging
- **log** - Logging facade compatible with various loggers
  - Integrated with tauri-plugin-log

## Security Considerations

### Content Security Policy
Currently null/disabled in development. Should be configured for production with specific origins.

### Capabilities
The `capabilities/` directory defines what the application can do:
- IPC command allowlists
- File system access restrictions
- Plugin permissions

### Best Practices
- Keep Rust dependencies updated for security patches
- Validate all frontend inputs before processing
- Use Tauri's built-in security features for file/process access
- Don't expose sensitive APIs to frontend without proper checks

## Bundling and Distribution

### Configuration in `tauri.conf.json`
```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": ["icons/32x32.png", "icons/128x128.png", ...]
}
```

### Platform-Specific Bundling
- **macOS**: Creates `.app` bundle and `.dmg` installer
- **Windows**: Creates `.msi` and `.exe` installers
- **Linux**: Creates `.AppImage` and distribution packages

### Updater (Optional)
Tauri supports automatic updates:
- Can be configured in `tauri.conf.json`
- Requires signing and update server
- Provides delta updates for smaller downloads

## Development Commands

### Build & Run Development
```bash
npm run tauri dev
```
Runs the application in development mode with hot reload.

### Build for Production
```bash
npm run tauri build
```
Creates platform-specific distributables in `target/release/bundle/`.

### Build Only (No Run)
```bash
npm run tauri build -- --bundle none
```

### Rebuild from Clean State
```bash
npm run tauri build --force
```

## Debugging

### Logs
In development, logs are displayed in the console where you ran `npm run tauri dev`.

Log levels configurable in `src/lib.rs`:
- Debug
- Info
- Warn
- Error

### DevTools
Can be enabled in development for frontend debugging:
- Right-click context menu access
- Browser dev tools console
- Network inspector

### Profiling
Use platform-native tools:
- **macOS**: Instruments, Activity Monitor
- **Windows**: Task Manager, Windows Performance Analyzer
- **Linux**: top, htop, perf

## Platform-Specific Notes

### macOS
- Requires Xcode Command Line Tools
- Creates `.app` bundle in standard macOS format
- `.dmg` draggable installer included
- Code signing optional but recommended for distribution

### Windows
- Requires Visual C++ Build Tools
- Creates MSI installer (recommended for enterprise)
- Creates EXE installer (standard for consumer)
- Updates via Microsoft Installer mechanism

### Linux
- GCC and openssl development libraries required
- Creates AppImage (universal, works on any distro)
- Can also create `.deb` and `.rpm` packages
- Desktop entry file auto-generated for app launcher integration

## Frontend Integration

The Tauri app serves the Angular frontend:

1. **Development**: Angular dev server runs on `localhost:4200`
   - `tauri.conf.json` `devUrl` points to `http://localhost:4200`
   - Angular files served from dev server

2. **Production**: Angular production build embedded
   - `tauri.conf.json` `frontendDist` points to `../frontend/dist/frontend/browser`
   - Built Angular files embedded in binary
   - No external server needed

## Configuration Examples

### Changing Window Size
In `tauri.conf.json`:
```json
"windows": [{
  "width": 600,
  "height": 800,
  "minWidth": 400,
  "minHeight": 300
}]
```

### Changing App Identifier
In `tauri.conf.json`:
```json
"identifier": "com.mycompany.weatherapp"
```

### Adding IPC Commands
In `src/lib.rs`:
```rust
#[tauri::command]
async fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// In builder setup:
.invoke_handler(tauri::generate_handler![greet])
```

## Troubleshooting

### Build Errors
1. Update Rust: `rustup update`
2. Clean build: `cargo clean` then `npm run tauri build`
3. Check Rust version: Must be 1.77.2+

### Frontend Not Loading
- Ensure Angular build output path matches `frontendDist` in config
- Check `devUrl` points to correct dev server in development
- Verify `dist/` directory exists with `index.html`

### Plugin Issues
- Tauri plugins require specific versions
- Check compatibility with Tauri version
- Rebuild after updating: `npm run tauri build -- --force`

### Windows Build Fails
- Install Visual C++ Build Tools
- Ensure Rust MSVC toolchain: `rustup default stable-msvc`
- Run in Command Prompt or PowerShell as administrator

### macOS Code Signing Issues
- Install Xcode Command Line Tools: `xcode-select --install`
- For distribution, configure signing in `tauri.conf.json`

## Resources

- [Tauri Official Documentation](https://tauri.app/)
- [Tauri Configuration Schema](https://schema.tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Tauri Plugin Directory](https://tauri.app/en/plugin)
- [Community Discord](https://discord.gg/tauri)

## Development Notes

### Architecture
- **Frontend**: Angular (web technologies)
- **Bridge**: Tauri IPC (Rust-to-JavaScript communication)
- **Backend**: Rust (system integration, business logic)

### Best Practices
1. Keep Rust code minimal and focused on system integration
2. Handle errors gracefully with proper messages
3. Use async/await for non-blocking operations
4. Cache compiled Rust code to speed up rebuilds

## Contributing

1. Keep Tauri and Rust dependencies updated
2. Test on all target platforms before releasing
3. Update icons if changing branding
4. Follow Rust naming conventions (snake_case)
5. Document any new IPC commands or Rust functions

---

**Part of the Weather App project** - Built with Tauri and Rust for Cross-Platform Desktop Excellence
