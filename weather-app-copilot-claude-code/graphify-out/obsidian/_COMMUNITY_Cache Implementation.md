---
type: community
cohesion: 0.18
members: 14
---

# Cache Implementation

**Cohesion:** 0.18 - loosely connected
**Members:** 14 nodes

## Members
- [[.constructor()]] - code - frontend/src/app/shared/services/weather.service.ts
- [[.forecast_key()]] - code - backend/src/services/cache.rs
- [[.geocode()]] - code - frontend/src/app/shared/services/weather.service.ts
- [[.geolocate()]] - code - frontend/src/app/shared/services/weather.service.ts
- [[.get()]] - code - backend/src/services/cache.rs
- [[.getCurrentWeather()]] - code - frontend/src/app/shared/services/weather.service.ts
- [[.getForecast()]] - code - frontend/src/app/shared/services/weather.service.ts
- [[.new()]] - code - backend/src/services/cache.rs
- [[.weather_key()]] - code - backend/src/services/cache.rs
- [[Cache]] - code - backend/src/services/cache.rs
- [[CacheEntry]] - code - backend/src/services/cache.rs
- [[WeatherService]] - code - frontend/src/app/shared/services/weather.service.ts
- [[cache.rs]] - code - backend/src/services/cache.rs
- [[weather.service.ts]] - code - frontend/src/app/shared/services/weather.service.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Cache_Implementation
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Angular App Component]]

## Top bridge nodes
- [[Cache]] - degree 6, connects to 1 community