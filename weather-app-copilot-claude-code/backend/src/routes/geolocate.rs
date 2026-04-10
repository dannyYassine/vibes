use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Deserialize)]
struct IpApiResponse {
    lat: f64,
    lon: f64,
    city: String,
    country: String,
}

#[derive(Serialize)]
pub struct GeolocateResponse {
    pub lat: f64,
    pub lon: f64,
    pub city: String,
    pub country: String,
}

pub async fn get_geolocate() -> Result<Json<GeolocateResponse>, AppError> {
    let client = reqwest::Client::new();
    let resp: IpApiResponse = client
        .get("http://ip-api.com/json/?fields=lat,lon,city,country")
        .send()
        .await?
        .json()
        .await?;

    Ok(Json(GeolocateResponse {
        lat: resp.lat,
        lon: resp.lon,
        city: resp.city,
        country: resp.country,
    }))
}
