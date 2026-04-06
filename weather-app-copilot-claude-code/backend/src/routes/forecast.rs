use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;
use std::time::Duration;

use crate::error::AppError;
use crate::models::forecast::ForecastResponse;
use crate::AppState;
use crate::services::cache::Cache;

#[derive(Deserialize)]
pub struct ForecastQuery {
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

pub async fn get_forecast(
    State(state): State<AppState>,
    Query(params): Query<ForecastQuery>,
) -> Result<Json<ForecastResponse>, AppError> {
    let lat = params
        .lat
        .ok_or_else(|| AppError::BadRequest("lat is required".into()))?;
    let lon = params
        .lon
        .ok_or_else(|| AppError::BadRequest("lon is required".into()))?;

    let cache_key = Cache::forecast_key(lat, lon);

    // Check cache first
    if let Some(cached) = state.cache.get(&cache_key).await {
        if let Ok(data) = serde_json::from_value(cached) {
            return Ok(Json(data));
        }
    }

    let result = state.weather_api.fetch_forecast(lat, lon).await?;

    // Cache for 30 minutes
    if let Ok(value) = serde_json::to_value(&result) {
        state
            .cache
            .set(cache_key, value, Duration::from_secs(1800))
            .await;
    }

    Ok(Json(result))
}
