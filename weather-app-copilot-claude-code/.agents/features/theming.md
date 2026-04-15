# Theming Feature

## Summary

Dynamic theming system that selects background gradients and text colors based on weather condition and day/night cycle. All UI components inherit from a computed gradient background, ensuring cohesive visual feedback for current conditions.

## Key Files

**Shared Models:**
- `frontend/src/app/shared/models/theme.model.ts` — Gradient definitions and logic (lines 1-91)

**Shared Services:**
- `frontend/src/app/shared/services/weather-store.service.ts` — Computes theme from weather (lines 26-36)

**Components Using Theme:**
- `frontend/src/app/features/weather/hero-section/hero-section.ts` — Applies gradient to hero (lines 17-18)
- All other components inherit through CSS cascade

## Data Flow

```
CurrentWeather signal (condition, is_daytime)
  ↓ (computed property)
weather-store.service.ts: weatherCondition (line 26-28)
weather-store.service.ts: isDaytime (line 29-31)
  ↓ (computed property)
weather-store.service.ts: gradientConfig (line 32-34)
  ↓
Calls theme.model.getGradientForCondition(condition, isDaytime)
  ↓ (computed property)
weather-store.service.ts: gradientCss (line 35)
  ↓
Calls theme.model.gradientToCss(config)
  ↓ (computed property)
weather-store.service.ts: textColor (line 36)
  ↓
Components read and apply via [style.background]="gradientCss()"
```

## Gradient Definitions

**GRADIENTS Map** (theme.model.ts, lines 9-65):
- `clear_day` — Yellow/orange sunrise palette (#F9D976 → #E8837C)
- `clear_night` — Deep blue/indigo palette (#1A1A2E → #0F3460)
- `clouds_day` — Light grey/blue (#D4D3DD → #A0AAB8)
- `clouds_night` — Purple/dark blue (#2C2C54 → #3B3B6D)
- `rain` — Slate blue palette (#B0C4DE → #6B8DB2)
- `drizzle` — Light indigo (#C5CAE9 → #A0AAB8)
- `thunderstorm` — Dark grey (#4A4458 → #263238)
- `snow` — Light lavender (#E8EAF6 → #B39DDB)
- `fog` — Light grey (#CFD8DC → #90A4AE)
- `dust` — Brown/tan (#D7CCC8 → #A1887F)
- `tornado` — Very dark grey (#37474F → #1A1A2E)

Each gradient has:
- `stops: string[]` — Array of hex color stops
- `direction: string` — CSS direction, e.g., "135deg"
- `textColor: string` — Hex color for optimal contrast (black or white)

## Models / Types

**GradientConfig** (TypeScript):
```typescript
interface GradientConfig {
  stops: string[];
  direction: string;
  textColor: string;
}
```

**CSS Output Format:**
```css
linear-gradient(135deg, #F9D976, #F39F86, #E8837C)
```

## Theme Selection Logic

**getGradientForCondition()** (theme.model.ts, lines 67-86):

1. **Night variants** (if not daytime and condition is clear/clouds):
   - Returns `{condition}_night` variant

2. **Day variants** (if clear or clouds):
   - Returns `{condition}_day` variant

3. **Special mapping** (for fog-like conditions):
   - mist/haze → fog palette

4. **Direct match** (for rain, snow, thunderstorm, etc.):
   - Returns exact condition gradient

5. **Fallback:**
   - Any unknown condition → clear_day

## Entry Points

**Computed in Store** (weather-store.service.ts):
- `gradientConfig` (line 32-34) — returns GradientConfig object
- `gradientCss` (line 35) — returns CSS string for inline `[style.background]`
- `textColor` (line 36) — returns hex color for text

**Consumed by Components:**
- Hero section (hero-section.ts, line 17-18):
  - `[style.background]="gradientCss()"`
  - `[style.color]="textColor()"`
- Other components inherit via global styles

## CSS Integration

**Computed Signals:**
- Components bind directly to signals: `[style.background]="store.gradientCss()"`
- Text color: `[style.color]="store.textColor()"`
- No separate CSS files for theme switching; all via signals

**Global Styling:**
- `frontend/src/styles/` contains base styles
- Theme is applied at component level (reactive)

## Related Features

- **Current Weather** — Provides condition and is_daytime
- **Hero Section** — Primary consumer of gradient/text color
- **Personality System** — Works alongside theme for complete sensory feedback

## Customization

To add/modify a gradient:
1. Edit `GRADIENTS` in `theme.model.ts`
2. Add entry: `condition_variant: { stops: [...], direction: "...", textColor: "..." }`
3. Update `getGradientForCondition()` if new condition logic needed
4. No component changes required; signals cascade automatically
