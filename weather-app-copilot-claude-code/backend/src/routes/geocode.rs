use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppError;
use crate::models::forecast::GeoLocation;
use crate::AppState;

#[derive(Deserialize)]
pub struct GeocodeQuery {
    pub q: Option<String>,
}

pub async fn get_geocode(
    State(state): State<AppState>,
    Query(params): Query<GeocodeQuery>,
) -> Result<Json<Vec<GeoLocation>>, AppError> {
    let query = params
        .q
        .ok_or_else(|| AppError::BadRequest("q is required".into()))?;

    let results = state.weather_api.geocode(&query).await?;

    Ok(Json(results))
}
