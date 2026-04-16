---
type: community
cohesion: 0.21
members: 13
---

# Weather App Architecture

**Cohesion:** 0.21 - loosely connected
**Members:** 13 nodes

## Members
- [[Axum REST API Server]] - code - backend/README.md
- [[Daily Forecast Component]] - code - frontend/README.md
- [[Data Cards Component]] - code - frontend/README.md
- [[Hero Section Component]] - code - frontend/README.md
- [[Hourly Forecast Component]] - code - frontend/README.md
- [[Main Window]] - code - src-tauri/README.md
- [[Popup Window]] - code - src-tauri/README.md
- [[Tauri Desktop Shell]] - code - src-tauri/README.md
- [[Weather App]] - document - README.md
- [[Weather App UI - Dark Theme with Data Cards and Forecast]] - image - hero_2.png
- [[Weather App UI - Sunny Day Screen]] - image - hero_1.png
- [[Weather App UI - Tray Popup Window]] - image - hero_3.png
- [[macOS Menu Bar Tray Icon]] - code - src-tauri/README.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Weather_App_Architecture
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Design Documentation]]

## Top bridge nodes
- [[Weather App]] - degree 3, connects to 1 community
- [[macOS Menu Bar Tray Icon]] - degree 2, connects to 1 community