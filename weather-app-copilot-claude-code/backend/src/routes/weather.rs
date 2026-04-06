use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;
use std::time::Duration;

use crate::error::AppError;
use crate::models::weather::CurrentWeatherResponse;
use crate::AppState;
use crate::services::cache::Cache;

#[derive(Deserialize)]
pub struct WeatherQuery {
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

pub async fn get_weather(
    State(state): State<AppState>,
    Query(params): Query<WeatherQuery>,
) -> Result<Json<CurrentWeatherResponse>, AppError> {
    let lat = params
        .lat
        .ok_or_else(|| AppError::BadRequest("lat is required".into()))?;
    let lon = params
        .lon
        .ok_or_else(|| AppError::BadRequest("lon is required".into()))?;

    let cache_key = Cache::weather_key(lat, lon);

    // Check cache first
    if let Some(cached) = state.cache.get(&cache_key).await {
        if let Ok(data) = serde_json::from_value(cached) {
            return Ok(Json(data));
        }
    }

    let result = state.weather_api.fetch_current(lat, lon).await?;

    // Cache for 10 minutes
    if let Ok(value) = serde_json::to_value(&result) {
        state
            .cache
            .set(cache_key, value, Duration::from_secs(600))
            .await;
    }

    Ok(Json(result))
}
