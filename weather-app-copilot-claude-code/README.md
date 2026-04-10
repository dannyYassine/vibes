# Weather App

A modern, cross-platform desktop weather application built with [Tauri](https://tauri.app/), [Angular](https://angular.io/), and [Rust](https://www.rust-lang.org/). Get real-time weather information with hourly and daily forecasts for any location.

## Screenshots & Demo

<div style="display: flex; gap: 10px; margin-bottom: 20px;">
  <img src="./hero_1.png" alt="Weather App Hero 1" width="300">
  <img src="./hero_2.png" alt="Weather App Hero 2" width="300">
  <img src="./hero_3.png" alt="Weather App Hero 3" width="300">
</div>

**Demo Video:**

[![Watch the video](https://github.com/user-attachments/assets/58ba598e-5d4c-4d00-ae9f-4b5d0c4aebbf)](https://github.com/user-attachments/assets/58ba598e-5d4c-4d00-ae9f-4b5d0c4aebbf)


## Features

- **macOS Menu Bar Icon** - Persistent tray icon showing live temperature and weather emoji (e.g. `14° ☁️`), updated after every fetch
- **Tray Popup** - Click the tray icon to open a compact weather dropdown (hero + hourly scroll); click again or click away to dismiss
- **Open Full App** - Expand button in the popup opens the main window
- **Current Weather Display** - Real-time temperature, humidity, pressure, wind speed, and conditions
- **Hourly Forecast** - 24-hour weather predictions with precipitation probability
- **Daily Forecast** - Extended forecast for upcoming days
- **Location Search** - Find weather for any location worldwide
- **Responsive Design** - Optimized UI that adapts to different screen sizes
- **Modern Animations** - Smooth scroll reveals and transitions
- **Personality Headlines** - Contextual weather descriptions based on current conditions
- **Theme Support** - Themed UI that adapts to weather conditions

## Technology Stack

### Frontend
- **Framework**: Angular 21.2
- **Language**: TypeScript
- **Build Tool**: Angular CLI
- **Styling**: SCSS

### Desktop Shell
- **Runtime**: Tauri 2.10.3
- **Language**: Rust
- **Logging**: tauri-plugin-log
- **Tray**: Native macOS menu bar integration (`tray-icon` feature)

### Backend API
- **Framework**: Axum 0.8
- **Runtime**: Tokio 1.x with full features
- **Language**: Rust
- **HTTP Client**: Reqwest 0.12 with JSON support
- **Data Handling**: Serde 1.0 for JSON serialization
- **Middleware**: Tower-HTTP 0.6 with CORS support
- **Logging**: Tracing & Tracing-Subscriber
- **Port**: 3001

### Desktop
- **Platform**: Tauri (macOS, Windows, Linux compatible)

## Component Documentation

For detailed information about specific parts of the project, see:

- **[Frontend Documentation](./frontend/README.md)** - Angular application, components, services, and development setup
- **[Tauri Backend Documentation](./src-tauri/README.md)** - Tauri framework, Rust code, and desktop app configuration
- **[Backend API Documentation](./backend/README.md)** - REST API endpoints, services, and server logic

## Project Structure

```
weather-app-copilot-claude-code/
├── frontend/                      # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/         # Feature modules (weather, etc.)
│   │   │   │   └── weather/
│   │   │   │       ├── hero-section/
│   │   │   │       ├── hourly-forecast/
│   │   │   │       ├── daily-forecast/
│   │   │   │       ├── data-cards/
│   │   │   │       ├── advisory-bar/
│   │   │   │       └── loading-overlay/
│   │   │   ├── features/
│   │   │   │   ├── weather/          # Full weather view
│   │   │   │   └── popup/            # Tray popup (hero + hourly strip)
│   │   │   ├── shared/           # Shared services and components
│   │   │   │   ├── services/
│   │   │   │   │   ├── weather.service.ts
│   │   │   │   │   ├── location.service.ts
│   │   │   │   │   ├── weather-store.service.ts
│   │   │   │   │   └── tray.service.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── weather.model.ts
│   │   │   │   │   └── theme.model.ts
│   │   │   │   ├── components/
│   │   │   │   ├── pipes/
│   │   │   │   └── directives/
│   │   │   ├── app.ts            # Root component
│   │   │   └── app.config.ts     # App configuration
│   │   └── main.ts               # Bootstrap entry point
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # REST API server (Rust + Axum)
│   ├── src/
│   │   ├── main.rs               # Application entry point
│   │   ├── models/               # Data structures
│   │   │   ├── weather.rs        # Weather models
│   │   │   └── forecast.rs       # Forecast models
│   │   ├── routes/               # API endpoints
│   │   │   ├── weather.rs        # /api/weather endpoint
│   │   │   ├── forecast.rs       # /api/forecast endpoint
│   │   │   └── geocode.rs        # /api/geocode endpoint
│   │   └── services/             # Business logic
│   │       ├── weather_api.rs    # OpenWeather API client
│   │       ├── cache.rs          # Response caching
│   │       └── personality.rs    # Weather descriptions
│   ├── Cargo.toml                # Rust dependencies
│   └── .env                      # Environment variables
│
├── src-tauri/                     # Tauri desktop shell
│   ├── src/
│   │   ├── main.rs               # Application entry point
│   │   └── lib.rs                # Core library logic
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
└── README.md                      # This file
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm 11.8.0+
- **Rust** 1.70+ ([Install Rust](https://rustup.rs/)) - Required for backend and Tauri
- **Cargo** - Rust package manager (included with Rust)
- **Tauri CLI** (installed via npm)
- **OpenWeather API Key** - Get from [OpenWeather](https://openweathermap.org/api) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weather-app-copilot-claude-code
   ```

2. **Setup backend environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your OpenWeather API key
   cd ..
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Install Tauri dependencies**
   ```bash
   npm install -g @tauri-apps/cli
   ```

### Development

**Run the complete application (recommended):**

1. **Start the backend server** (in one terminal):
   ```bash
   cd backend
   cargo run
   ```
   Server runs on `http://127.0.0.1:3001`

2. **Start the desktop app** (in another terminal):
   ```bash
   npm run tauri dev
   ```
   This starts the Angular dev server on `http://localhost:4200` and runs Tauri with hot reload.

**Frontend only (web development):**
```bash
cd frontend
npm run start
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any source files.

**Backend only:**
```bash
cd backend
cargo run
```
Test endpoints with curl:
```bash
curl http://127.0.0.1:3001/api/health
curl "http://127.0.0.1:3001/api/weather?latitude=40.7128&longitude=-74.0060"
```

### Build for Production

**Build the native application:**
```bash
npm run tauri build
```

This creates a distributable executable for your platform:
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` installer and portable executable
- **Linux**: AppImage and other formats

**Build frontend only:**
```bash
cd frontend
npm run build
```

## Available Scripts

### Backend
- `cargo run` - Start development server (port 3001)
- `cargo build --release` - Create production binary
- `cargo test` - Run tests
- `cargo fmt` - Format code
- `cargo clippy` - Lint code

### Frontend
- `npm run start` - Start Angular dev server
- `npm run build` - Build for production
- `npm run watch` - Watch for changes and rebuild
- `npm run test` - Run tests

### Development
- `npm run tauri dev` - Run desktop app in development with hot reload
- `npm run tauri build` - Create production desktop binary

## Configuration

### Window Settings
Edit `src-tauri/tauri.conf.json` to customize:
- **Main window** dimensions (default: 600×900, starts hidden — opened via popup expand button)
- Minimum size (500×750)
- Application title and identifier
- Bundle icons and targets

The **popup window** (320×300) is created programmatically in `src-tauri/src/lib.rs` and cannot be configured via `tauri.conf.json`.

### Backend Server
The backend is a high-performance REST API built with Rust, Axum, and Tokio that handles:
- **Weather Data**: Fetches current weather conditions via OpenWeather API
- **Forecasts**: Provides hourly and daily weather predictions
- **Geocoding**: Converts location names to coordinates for weather lookup
- **Caching**: Intelligent response caching to minimize external API calls
- **Personality**: Context-aware weather descriptions based on conditions

**Endpoints** (runs on port 3001):
- `GET /api/health` - Server health check
- `GET /api/weather?latitude=0.0&longitude=0.0` - Current weather
- `GET /api/forecast?latitude=0.0&longitude=0.0` - Forecast data
- `GET /api/geocode?query=London` - Location search

See **[Backend Documentation](./backend/README.md)** for detailed API specs and architecture.

### Frontend API Integration
Weather data flows through services in `frontend/src/app/shared/services/`:
- `weather.service.ts` - Calls backend weather endpoints
- `location.service.ts` - Manages location/geocoding via backend
- `weather-store.service.ts` - Central state management; calls `TrayService.updateTray()` after every successful fetch
- `tray.service.ts` - Invokes the `update_tray_title` Tauri command to update the menu bar label

## Key Components

### Hero Section
Displays current weather prominently with temperature, condition, and location.

### Data Cards
Shows detailed metrics: humidity, pressure, wind speed, wind direction, and more.

### Hourly Forecast
Scrollable 24-hour forecast with time, temperature, condition, and precipitation probability.

### Daily Forecast
Extended forecast showing daily highs/lows and conditions.

### Advisory Bar
Displays weather alerts or important information.

## Models & Types

### Weather Data
- `CurrentWeather` - Current conditions with metadata
- `HourlyForecast` - Hourly predictions
- `DailyForecast` - Daily predictions
- `GeoLocation` - Location information

### Supported Conditions
- Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow, Mist, Fog, Haze, Dust, Tornado

## Performance

- **Lazy loading** of feature modules
- **Scroll reveal animations** for enhanced UX
- **Efficient state management** with weather-store service
- **Optimized bundle size** with tree-shaking and minification

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Troubleshooting

### Port Already in Use
If port 4200 is in use:
```bash
ng serve --port 4201
```

### Tauri Build Errors
Ensure Rust is properly installed:
```bash
rustup update
```

### Node Modules Issues
Clear and reinstall dependencies:
```bash
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install
```

## License

[Add your license here]

## Support

For issues, feature requests, or questions, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ using Tauri, Angular, and Rust**
