---
type: community
cohesion: 0.33
members: 6
---

# OpenWeatherMap Integration

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[OwmCurrentResponse]] - code - backend/src/models/weather/owm.rs
- [[OwmMain]] - code - backend/src/models/weather/owm.rs
- [[OwmSys]] - code - backend/src/models/weather/owm.rs
- [[OwmWeatherEntry]] - code - backend/src/models/weather/owm.rs
- [[OwmWind]] - code - backend/src/models/weather/owm.rs
- [[owm.rs]] - code - backend/src/models/weather/owm.rs

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/OpenWeatherMap_Integration
SORT file.name ASC
```
