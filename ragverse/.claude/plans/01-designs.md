# RagVerse — Design System

## Design Philosophy

Minimalist, clean, functional. Inspired by modern AI chat interfaces (see `inspirations/inspo_1.png` and `inspo_2.png`).

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6B4EFF` (deep purple) | Buttons, links, active states, accent |
| Background | `#FAFAFA` | Page background |
| Surface | `#FFFFFF` | Cards, panels, input fields |
| Text Primary | `#1A1A1A` | Headings, body text |
| Text Secondary | `#6B7280` | Labels, timestamps, hints |
| Border | `#E5E7EB` | Dividers, card borders |
| Success | `#22C55E` | Completed status |
| Warning | `#F59E0B` | Processing status |
| Error | `#EF4444` | Failed status, error messages |
| User Bubble | `#F3F0FF` | User message background (light purple) |
| Assistant Bubble | `#F9FAFB` | Assistant message background (light grey) |

## Typography

- Font family: `Inter` (or system font stack as fallback)
- Headings: 600 weight
- Body: 400 weight
- Monospace (code blocks): `JetBrains Mono` or `Fira Code`

## Angular Material Theme

Custom minimal theme using Angular Material's theming system:
- Use `mat-light-theme` with the purple primary
- Override density to `-1` for compact components
- Minimal use of elevation (flat design, subtle borders instead of shadows)

## Layout

### Overall
- Top navbar: 56px height, white background, subtle bottom border
- Content area: max-width 1200px, centered
- Responsive: collapses sidebar on mobile

### Documents Page
- Full-width content area
- Upload zone: dashed border, centered icon + text, 200px height
- Document list: clean table with hover states

### Chat Page — 3-Column Layout
```
┌────────────────────────────────────────────────────────────┐
│  Navbar                                                     │
├──────────┬─────────────────────────────┬───────────────────┤
│ Convo    │                             │ Source Panel      │
│ Sidebar  │     Chat Messages Area      │ (collapsible)    │
│ 260px    │     (flex-grow)             │ 320px            │
│          │                             │                   │
│ - List   │  ┌─────────────────────┐   │ - Source card 1   │
│ - New    │  │  Assistant message  │   │ - Source card 2   │
│   btn    │  │  with [1] citations │   │ - Source card 3   │
│          │  └─────────────────────┘   │                   │
│          │        ┌───────────────┐   │                   │
│          │        │ User message  │   │                   │
│          │        └───────────────┘   │                   │
│          │                             │                   │
│          │  ┌─────────────────────────┐│                   │
│          │  │ Input bar         [Send]││                   │
│          │  └─────────────────────────┘│                   │
├──────────┴─────────────────────────────┴───────────────────┤
```

### Empty Conversation State (inspired by inspo_1.png)
```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│          Hi there, Danny                                    │
│          What would you like to know?                       │
│                                                             │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│   │ Prompt 1 │ │ Prompt 2 │ │ Prompt 3 │ │ Prompt 4 │    │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                             │
│   ┌──────────────────────────────────────────────────┐    │
│   │ Ask whatever you want...                    [▶]  │    │
│   └──────────────────────────────────────────────────┘    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Component Styling Guidelines

- **Buttons**: Flat/stroked for secondary, filled for primary. Rounded corners (8px).
- **Cards**: White background, 1px border (#E5E7EB), 8px border-radius, no shadow.
- **Inputs**: Outlined style, rounded, subtle focus ring in primary color.
- **Message bubbles**: Rounded corners (12px), max-width 70% of chat area.
- **Citations**: Small chip/badge style, primary color, clickable with hover effect.
- **Status chips**: Rounded pill shape with colored background matching status.
- **Spacing**: 8px grid system (8, 16, 24, 32, 48).
- **Transitions**: 200ms ease for hover/focus states.
