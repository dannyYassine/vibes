---
type: community
cohesion: 0.20
members: 10
---

# Forecast Data Models

**Cohesion:** 0.20 - loosely connected
**Members:** 10 nodes

## Members
- [[DailyForecast]] - code - backend/src/models/forecast.rs
- [[ForecastResponse]] - code - backend/src/models/forecast.rs
- [[GeoLocation]] - code - backend/src/models/forecast.rs
- [[HourlyForecast]] - code - backend/src/models/forecast.rs
- [[OwmForecastEntry]] - code - backend/src/models/forecast.rs
- [[OwmForecastMain]] - code - backend/src/models/forecast.rs
- [[OwmForecastResponse]] - code - backend/src/models/forecast.rs
- [[OwmForecastWeather]] - code - backend/src/models/forecast.rs
- [[OwmGeoResult]] - code - backend/src/models/forecast.rs
- [[forecast.rs]] - code - backend/src/models/forecast.rs

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Forecast_Data_Models
SORT file.name ASC
```
