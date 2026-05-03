mod error;
mod models;
mod routes;
mod services;

use axum::Router;
use axum::routing::get;
use services::cache::Cache;
use services::weather_api::WeatherApiClient;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub weather_api: Arc<WeatherApiClient>,
    pub cache: Cache,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Load .env file if present
    let _ = dotenvy::dotenv();

    let api_key = std::env::var("OPENWEATHER_API_KEY").expect("OPENWEATHER_API_KEY must be set");

    let state = AppState {
        weather_api: Arc::new(WeatherApiClient::new(api_key)),
        cache: Cache::new(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/weather", get(routes::weather::get_weather))
        .route("/api/forecast", get(routes::forecast::get_forecast))
        .route("/api/geocode", get(routes::geocode::get_geocode))
        .route("/api/geolocate", get(routes::geolocate::get_geolocate))
        .layer(cors)
        .with_state(state);

    let addr = "127.0.0.1:3001";
    tracing::info!("Backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "status": "ok" }))
}
