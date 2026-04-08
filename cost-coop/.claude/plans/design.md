# CostCoop - Design System

## Design Philosophy

Clean, minimal aesthetic inspired by Apple and Stripe. Prioritize clarity, whitespace, and intuitive interactions. The app should feel trustworthy and simple — ordering food from Costco through a stranger should feel as safe as ordering through any major delivery app.

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#1A1A2E` | Headers, primary text, key actions |
| Primary Light | `#16213E` | Secondary backgrounds, cards |
| Accent | `#E94560` | CTA buttons, badges, notifications |
| Accent Light | `#FF6B6B` | Hover/active states, highlights |

### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Backgrounds, cards |
| Gray 50 | `#F9FAFB` | Page backgrounds |
| Gray 100 | `#F3F4F6` | Input backgrounds, dividers |
| Gray 300 | `#D1D5DB` | Borders, disabled states |
| Gray 500 | `#6B7280` | Secondary text, placeholders |
| Gray 700 | `#374151` | Body text |
| Gray 900 | `#111827` | Headings, primary text |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10B981` | Delivered, completed, available |
| Warning | `#F59E0B` | Pending, in-progress |
| Error | `#EF4444` | Cancelled, errors, declined |
| Info | `#3B82F6` | Informational banners |

---

## Typography

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| H1 | System (SF Pro / Roboto) | 28px | Bold (700) | Screen titles |
| H2 | System | 22px | Semibold (600) | Section headers |
| H3 | System | 18px | Semibold (600) | Card titles, item names |
| Body | System | 16px | Regular (400) | General text |
| Body Small | System | 14px | Regular (400) | Secondary info, timestamps |
| Caption | System | 12px | Medium (500) | Labels, badges, hints |
| Price | System (monospace variant) | 18px | Bold (700) | Prices, totals |

Use system fonts for platform-native feel (SF Pro on iOS, Roboto on Android). React Native's default font handling maps to system fonts automatically.

---

## Spacing Scale

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, inline elements |
| sm | 8px | Between related elements |
| md | 16px | Standard padding, component gaps |
| lg | 24px | Section spacing |
| xl | 32px | Major section gaps |
| 2xl | 48px | Page-level padding top/bottom |

---

## Component Styles

### Buttons
- **Primary**: Accent color background (`#E94560`), white text, 12px border-radius, 48px height
- **Secondary**: White background, gray border, dark text, 12px border-radius, 48px height
- **Ghost**: No background/border, accent color text
- **Disabled**: Gray 300 background, gray 500 text, no interaction

### Cards
- White background
- 1px border (`#F3F4F6`)
- 12px border-radius
- 16px padding
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.08)`

### Inputs
- 48px height
- Gray 100 background (`#F3F4F6`)
- 8px border-radius
- 12px horizontal padding
- Gray 500 placeholder text
- Accent border on focus

### Bottom Navigation
- White background with top border
- 4 tabs: Home, Orders, Runner, Profile
- Active tab: accent color icon + label
- Inactive tab: gray 500 icon + label
- 56px height

---

## Key Screen Layouts

### Home Screen
```
┌──────────────────────────┐
│ ● CostCoop         [👤]  │  Header
├──────────────────────────┤
│ 📍 Select Costco Store ▼ │  Store selector
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 🔥 Active Order      │ │  Active order banner
│ │ 3 items • Accepted   │ │  (shown if exists)
│ └──────────────────────┘ │
├──────────────────────────┤
│ Popular Items            │
│ ┌────┐ ┌────┐ ┌────┐    │  Horizontal scroll
│ │ 🌭 │ │ 🍕 │ │ 🥤 │    │  menu cards
│ └────┘ └────┘ └────┘    │
├──────────────────────────┤
│ Full Menu →              │
│ Hot Food | Pizza | Drinks│  Category tabs
│ ┌──────────────────────┐ │
│ │ Hot Dog Combo  $1.50 │ │  Menu item rows
│ │ Chicken Bake   $3.99 │ │
│ │ ...                  │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 🏠  📋  🏃  👤          │  Bottom nav
└──────────────────────────┘
```

### Runner Dashboard
```
┌──────────────────────────┐
│ Runner Mode        [●ON] │  Header + toggle
├──────────────────────────┤
│ 📍 Costco Brossard  ▼   │  Store filter
├──────────────────────────┤
│ Available Orders (3)     │
│ ┌──────────────────────┐ │
│ │ 4 items • $12.50     │ │
│ │ 📍 2.3 km away       │ │  Order card
│ │ Tip: $3.00           │ │
│ │ [    Accept    ]     │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 2 items • $7.00      │ │
│ │ 📍 1.1 km away       │ │
│ │ Tip: $5.00           │ │
│ │ [    Accept    ]     │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 🏠  📋  🏃  👤          │
└──────────────────────────┘
```

### Order Status
```
┌──────────────────────────┐
│ ← Order Status           │
├──────────────────────────┤
│                          │
│  ✅ Order Placed         │
│  │                       │  Status timeline
│  ✅ Runner Accepted      │
│  │  Danny Y. ★ 4.8      │
│  │                       │
│  ⏳ Purchasing...        │
│  │                       │
│  ○ In Transit            │
│  │                       │
│  ○ Delivered             │
│                          │
├──────────────────────────┤
│ Order Details            │
│ 2x Hot Dog Combo         │
│ 1x Pepperoni Pizza       │
│                          │
│ Subtotal     $6.99       │
│ Service Fee  $3.99       │
│ Tip          $3.00       │
│ ─────────────────        │
│ Total        $13.98      │
├──────────────────────────┤
│ 🏠  📋  🏃  👤          │
└──────────────────────────┘
```

---

## Iconography

- Use SF Symbols (iOS) and Material Icons (Android) for platform-native icons
- Consistent 24px icon size in navigation and list items
- 20px for inline/secondary icons

## Animation & Transitions

- Screen transitions: React Navigation defaults (platform-native push/pop)
- Bottom sheet: `@gorhom/bottom-sheet` for cross-platform bottom sheets
- Status changes: subtle scale + fade via `react-native-reanimated`
- Loading: skeleton screens preferred over spinners for content areas
- Keep animations under 300ms for responsiveness
- Use `react-native-reanimated` for performant, native-driven animations
