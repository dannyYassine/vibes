---
type: community
cohesion: 0.25
members: 9
---

# Weather API Client

**Cohesion:** 0.25 - loosely connected
**Members:** 9 nodes

## Members
- [[.fetch_current()]] - code - backend/src/services/weather_api.rs
- [[.fetch_forecast()]] - code - backend/src/services/weather_api.rs
- [[.fmt()]] - code - backend/src/services/weather_api.rs
- [[.from()_1]] - code - backend/src/services/weather_api.rs
- [[.geocode()_1]] - code - backend/src/services/weather_api.rs
- [[.new()_1]] - code - backend/src/services/weather_api.rs
- [[ApiClientError]] - code - backend/src/services/weather_api.rs
- [[WeatherApiClient]] - code - backend/src/services/weather_api.rs
- [[weather_api.rs]] - code - backend/src/services/weather_api.rs

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Weather_API_Client
SORT file.name ASC
```
