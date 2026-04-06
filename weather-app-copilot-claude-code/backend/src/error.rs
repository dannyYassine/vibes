use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

use crate::services::weather_api::ApiClientError;

#[derive(Debug)]
pub enum AppError {
    WeatherApi(reqwest::Error),
    ApiClient(ApiClientError),
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::WeatherApi(e) => {
                (StatusCode::BAD_GATEWAY, format!("Weather API error: {}", e))
            }
            AppError::ApiClient(e) => {
                (StatusCode::BAD_GATEWAY, format!("{}", e))
            }
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
        };

        (status, axum::Json(serde_json::json!({ "error": message }))).into_response()
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::WeatherApi(e)
    }
}

impl From<ApiClientError> for AppError {
    fn from(e: ApiClientError) -> Self {
        AppError::ApiClient(e)
    }
}
