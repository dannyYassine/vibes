# Weather App Frontend

A modern, responsive Angular weather application featuring real-time weather data, hourly and daily forecasts, and beautiful animated UI components. Built with Angular 21, TypeScript, and SCSS.

## Overview

The frontend is a standalone Angular application that provides an interactive weather interface. It displays current weather conditions, hourly forecasts, daily predictions, and location-based weather data. The application features smooth animations, responsive design optimized for mobile-first development, and efficient state management.

**Current Version**: 0.0.0
**Node.js Requirement**: 18+
**npm Requirement**: 11.8.0+
**Angular Version**: 21.2.0
**TypeScript Version**: 5.9.2

## Technology Stack

### Core Framework
- **Angular**: 21.2.0 - Modern web framework
- **TypeScript**: 5.9.2 - Strongly typed JavaScript
- **RxJS**: 7.8.0 - Reactive programming library

### Build & Development
- **Angular CLI**: 21.2.6 - Command-line interface for Angular
- **Angular Compiler**: 21.2.0 - AOT compilation
- **Angular Build**: 21.2.6 - Build system

### Styling
- **SCSS** - CSS preprocessor with variables, mixins, and nesting
- **CSS Grid & Flexbox** - Responsive layout system

### Code Quality
- **Prettier**: 3.8.1 - Code formatter
- **TypeScript Strict Mode** - Enabled for better type safety

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── features/                    # Feature modules
│   │   │   ├── weather/                # Full weather view
│   │   │   │   ├── weather-view.ts     # Main weather view component
│   │   │   │   ├── hero-section/       # Current weather display
│   │   │   │   │   ├── hero-section.ts
│   │   │   │   │   └── hero-section.scss
│   │   │   │   ├── hourly-forecast/    # 24-hour forecast
│   │   │   │   │   ├── hourly-forecast.ts
│   │   │   │   │   ├── hourly-item/    # Individual hourly item
│   │   │   │   │   │   ├── hourly-item.ts
│   │   │   │   │   │   └── hourly-item.scss
│   │   │   │   │   └── hourly-forecast.scss
│   │   │   │   ├── daily-forecast/     # Extended forecast
│   │   │   │   │   ├── daily-forecast.ts
│   │   │   │   │   ├── daily-row/      # Individual daily row
│   │   │   │   │   │   ├── daily-row.ts
│   │   │   │   │   │   └── daily-row.scss
│   │   │   │   │   └── daily-forecast.scss
│   │   │   │   ├── data-cards/         # Weather metrics cards
│   │   │   │   │   ├── data-cards.ts
│   │   │   │   │   ├── data-card/      # Individual metric card
│   │   │   │   │   │   ├── data-card.ts
│   │   │   │   │   │   └── data-card.scss
│   │   │   │   │   └── data-cards.scss
│   │   │   │   ├── advisory-bar/       # Weather alerts
│   │   │   │   │   ├── advisory-bar.ts
│   │   │   │   │   └── advisory-bar.scss
│   │   │   │   ├── loading-overlay/    # Loading spinner
│   │   │   │   │   ├── loading-overlay.ts
│   │   │   │   │   └── loading-overlay.scss
│   │   │   │   └── weather-view.scss
│   │   │   │
│   │   │   └── popup/                  # Tray popup window
│   │   │       ├── popup.ts            # Popup component
│   │   │       ├── popup.html          # Hero + hourly strip template
│   │   │       └── popup.scss          # Compact popup styles
│   │   │
│   │   ├── shared/                     # Shared utilities and components
│   │   │   ├── services/               # Core services
│   │   │   │   ├── weather.service.ts         # Weather API calls
│   │   │   │   ├── location.service.ts        # Location/search functionality
│   │   │   │   ├── weather-store.service.ts   # State management
│   │   │   │   └── tray.service.ts            # macOS menu bar tray updates
│   │   │   ├── models/                 # TypeScript interfaces/types
│   │   │   │   ├── weather.model.ts    # Weather data structures
│   │   │   │   └── theme.model.ts      # Theme configuration
│   │   │   ├── components/             # Reusable components
│   │   │   │   ├── weather-icon/       # Weather condition icons
│   │   │   │   │   ├── weather-icon.ts
│   │   │   │   │   └── weather-icon.scss
│   │   │   │   └── frosted-card/       # Frosted glass card component
│   │   │   ├── pipes/                  # Custom Angular pipes
│   │   │   │   └── temperature.pipe.ts # Temperature unit conversion
│   │   │   └── directives/             # Custom directives
│   │   │       └── scroll-reveal.directive.ts # Scroll animation
│   │   │
│   │   ├── app.ts                      # Root component
│   │   ├── app.scss                    # Root styles
│   │   ├── app.config.ts               # App configuration & providers
│   │   └── app.routes.ts               # Application routing (if applicable)
│   │
│   ├── styles/                         # Global styles
│   │   ├── styles.scss                 # Main stylesheet
│   │   ├── _variables.scss             # CSS variables and theme
│   │   ├── _typography.scss            # Font and text styles
│   │   └── _animations.scss            # Keyframe animations
│   │
│   ├── main.ts                         # Application bootstrap entry point
│   └── index.html                      # HTML entry point
│
├── public/                             # Static assets
├── dist/                               # Build output (generated)
├── angular.json                        # Angular CLI configuration
├── tsconfig.json                       # Root TypeScript configuration
├── tsconfig.app.json                   # Application TypeScript configuration
├── tsconfig.spec.json                  # Test TypeScript configuration
├── package.json                        # npm dependencies and scripts
└── .prettierrc                         # Prettier formatting rules
```

## Components Overview

### Feature Components

#### Weather View (`features/weather/weather-view.ts`)
Main container component that orchestrates all weather display sections. Handles data loading and layout composition.

#### Popup (`features/popup/popup.ts`)
Compact tray popup window shown when the user clicks the macOS menu bar icon:
- Gradient background matching current weather condition
- Icon, condition label, large temperature, location, feels like
- Horizontal scrollable hourly forecast strip at the bottom
- Expand button (top-right) to open the full main window
- Auto-hides on window blur via `hide_popup` Tauri command

#### Hero Section (`features/weather/hero-section/`)
Displays prominent current weather information:
- Current temperature
- Weather condition (with icon)
- Location name
- "Feels like" temperature
- Contextual personality headline

#### Hourly Forecast (`features/weather/hourly-forecast/`)
Horizontally scrollable 24-hour forecast showing:
- Hour timestamps (12/24 hour format)
- Temperature predictions
- Weather condition icons
- Precipitation probability
- Animated reveal on scroll

#### Daily Forecast (`features/weather/daily-forecast/`)
Extended forecast display with:
- Daily high/low temperatures
- Weather condition icons
- Day of week labels
- Weather descriptions

#### Data Cards (`features/weather/data-cards/`)
Grid of detailed weather metrics:
- Humidity percentage
- Atmospheric pressure
- Wind speed and direction
- UV index
- Visibility
- Dew point

#### Advisory Bar (`features/weather/advisory-bar/`)
Displays weather alerts or important advisories when applicable.

#### Loading Overlay (`features/weather/loading-overlay/`)
Animated loading spinner shown during data fetch operations.

### Shared Components

#### Weather Icon (`shared/components/weather-icon/`)
Reusable component for displaying weather condition icons based on:
- Weather code (from API)
- Current day/night state
- Icon size variations

#### Frosted Card (`shared/components/frosted-card/`)
Frosted glass effect card component used throughout the UI for visual consistency.

## Services

### Weather Service (`shared/services/weather.service.ts`)
Handles all API communications for weather data:
- Current weather requests
- Forecast data fetching
- Error handling and retry logic
- API response transformation

### Location Service (`shared/services/location.service.ts`)
Manages location and search functionality:
- Geolocation API integration
- Location search by city name
- Location validation
- Coordinates handling

### Weather Store Service (`shared/services/weather-store.service.ts`)
Central state management using Angular signals:
- Current weather state
- Forecast data caching
- Loading and error states
- Calls `TrayService.updateTray()` after every successful weather fetch
- Auto-refresh every 10 minutes

### Tray Service (`shared/services/tray.service.ts`)
Bridges Angular weather data to the macOS menu bar:
- Lazily loads `@tauri-apps/api/core` only when running inside Tauri
- Maps weather conditions to emojis (e.g. `clouds` → `☁️`)
- Invokes the `update_tray_title` Rust command with a formatted string like `14° ☁️`
- No-op when running in a browser (outside Tauri)

## Models & Types

### Weather Model (`shared/models/weather.model.ts`)
TypeScript interfaces for weather data:
- `CurrentWeather` - Current conditions
- `HourlyForecast` - Hourly prediction data
- `DailyForecast` - Daily forecast data
- `GeoLocation` - Location information
- Weather condition enums

### Theme Model (`shared/models/theme.model.ts`)
Application theme configuration and color schemes.

## Pipes

### Temperature Pipe (`shared/pipes/temperature.pipe.ts`)
Custom pipe for temperature unit conversion:
- Celsius to Fahrenheit
- Formatting with precision
- Usage: `{{ tempValue | temperature:'C' }}`

## Directives

### Scroll Reveal Directive (`shared/directives/scroll-reveal.directive.ts`)
Animates elements when they come into view:
- Triggers animations on scroll
- Fade-in and slide effects
- Performance optimized with IntersectionObserver

## Styling Architecture

### Global Styles

#### `styles/styles.scss`
Main stylesheet that imports all partial stylesheets and applies global styles.

#### `styles/_variables.scss`
CSS custom properties and SCSS variables:
- Color palette (primary, secondary, backgrounds)
- Spacing scale
- Typography scale
- Border radius values
- Shadow definitions
- Breakpoints for responsive design

#### `styles/_typography.scss`
Font definitions and text styles:
- Font-family declarations
- Heading styles (h1-h6)
- Body text sizing
- Line heights
- Font weights

#### `styles/_animations.scss`
Keyframe animation definitions:
- Fade animations
- Slide animations
- Bounce effects
- Scroll reveal animations

### Component Styles

Each component has its own `.scss` file with scoped styles using Angular's view encapsulation. SCSS features used:
- Variables (via CSS custom properties)
- Mixins for responsive design
- Nesting for organization
- Media queries for breakpoints

## TypeScript Configuration

### Strict Mode
All strict compiler options enabled in `tsconfig.json`:
- `strict: true` - Enables all strict type-checking options
- `noImplicitAny` - Error on expressions with inferred 'any' type
- `strictNullChecks` - Null/undefined type checking
- `strictFunctionTypes` - Strict function type checking
- `noImplicitThis` - Error on 'this' with an inferred type
- `alwaysStrict` - Parse files in ECMAScript strict mode

### Additional Options
- `target: ES2022` - Compile to modern JavaScript
- `module: preserve` - Preserve ES modules
- `experimentalDecorators: true` - Enable decorators for Angular
- `skipLibCheck: true` - Skip type checking of declaration files
- `isolatedModules: true` - Compile each file independently

### Angular-Specific Options
- `enableI18nLegacyMessageIdFormat: false`
- `strictInjectionParameters: true` - Strict DI parameter checking
- `strictInputAccessModifiers: true` - Strict input binding
- `strictTemplates: true` - Strict template type checking

## Development Commands

### Start Development Server
```bash
npm run start
# or
ng serve
```
Starts the Angular development server on `http://localhost:4200` with automatic reload on file changes.

### Build for Production
```bash
npm run build
```
Creates an optimized production build in the `dist/` directory with:
- AOT compilation
- Tree-shaking
- Minification
- Source maps for debugging

### Watch Mode
```bash
npm run watch
```
Continuous build in watch mode with configuration set for development:
- Faster rebuilds
- Source maps included
- No minification

### Run Tests
```bash
npm run test
```
Execute unit tests using the Angular test runner (Vitest):
- Tests in `*.spec.ts` files
- Watch mode by default
- Coverage reports available with flags

## Angular Features Used

### Standalone Components
The application uses Angular's modern standalone components (new since Angular 14):
- No NgModule declarations required
- Direct component imports
- Simplified dependency injection

### Signals (Angular 17+)
Modern reactive state management primitive for simpler reactivity than RxJS in some cases.

### Directives
- `*ngIf` - Conditional rendering
- `*ngFor` - List rendering
- `(click)` - Event binding
- `[ngClass]` - Dynamic CSS classes
- `[ngStyle]` - Dynamic inline styles

### Two-Way Binding
- `[(ngModel)]` - Two-way property binding (with FormsModule)

### Dependency Injection
- Service injection via constructor parameters
- Singleton services via providedIn: 'root'

## Performance Optimizations

### Bundle Size
- Tree-shaking removes unused code
- Production build minification
- Lazy loading of feature modules (if implemented)

### Change Detection
- OnPush change detection strategy where applicable
- Async pipe with RxJS streams

### Rendering
- Scroll reveal animations use IntersectionObserver
- Virtual scrolling for large lists (if needed)
- CSS animations over JavaScript for performance

## Code Quality & Formatting

### Prettier Configuration
Automatic code formatting with consistent style:
- 2-space indentation
- Semicolons enabled
- Single quotes where appropriate
- Arrow parens configuration

Format code:
```bash
npx prettier --write src/
```

## Dependencies

### Production Dependencies
- `@angular/common` - Angular common utilities
- `@angular/compiler` - Angular template compiler
- `@angular/core` - Angular core framework
- `@angular/forms` - Forms and validation (FormsModule)
- `@angular/platform-browser` - DOM rendering
- `@angular/router` - Client-side routing
- `rxjs` - Reactive Extensions library
- `tslib` - Runtime utility library

### Development Dependencies
- `@angular/build` - Angular build system
- `@angular/cli` - Command-line interface
- `@angular/compiler-cli` - Ahead-of-time compiler
- `typescript` - TypeScript compiler
- `prettier` - Code formatter

## Browser Support

The application targets modern browsers via ES2022 compilation:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Configuration Files

### `angular.json`
Angular CLI configuration:
- Project setup and builder options
- Build configurations (development, production)
- Style language set to SCSS
- Asset inclusion
- Development server settings

### `tsconfig.json`
TypeScript configuration for the entire project with references to:
- `tsconfig.app.json` - Application compilation
- `tsconfig.spec.json` - Test file compilation

### `tsconfig.app.json`
Application-specific TypeScript settings with path mapping for module resolution.

### `.prettierrc`
Prettier formatting configuration for consistent code style.

## Integration with Tauri

When running in Tauri context:
- Frontend is built to `dist/frontend/browser`
- Development server runs on `localhost:4200`
- The root `App` component detects the Tauri window label (`main` or `popup`) and renders the appropriate view
- `TrayService` uses `window.__TAURI_INTERNALS__` to detect the Tauri context before invoking commands
- Three IPC commands are used: `update_tray_title`, `hide_popup`, `open_main_window`
- `@tauri-apps/api` is dynamically imported to avoid errors in non-Tauri environments

For development within Tauri:
```bash
cd frontend
npm run start
```
Then run Tauri dev from project root.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 11.8.0 or higher

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run start
```
Navigate to `http://localhost:4200/`

### Building
```bash
npm run build
```
Output in `dist/frontend/browser/`

## Troubleshooting

### Port 4200 Already in Use
```bash
ng serve --port 4201
```

### Node Modules Issues
```bash
rm -rf node_modules
npm install
```

### TypeScript Errors
Ensure TypeScript version matches `5.9.2` and run:
```bash
npm run build
```

### SCSS Compilation Issues
Check `_variables.scss` is imported before use in components.

## Resources

- [Angular Official Documentation](https://angular.dev/)
- [Angular CLI Overview](https://angular.dev/tools/cli)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RxJS Documentation](https://rxjs.dev/)
- [SCSS Documentation](https://sass-lang.com/)

## Contributing

1. Follow the project's code style (Prettier will format automatically)
2. Use strict TypeScript mode
3. Write components as standalone where possible
4. Keep components focused and single-responsibility
5. Use descriptive service, component, and variable names

---

**Part of the Weather App project** - Built with Angular, TypeScript, and SCSS
