use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use nimbus_domain::errors::DomainError;

pub struct AppError(pub DomainError);

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        Self(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match &self.0 {
            DomainError::NotFound(_) => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            DomainError::Validation(_) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR"),
            DomainError::AiError(_) => (StatusCode::BAD_GATEWAY, "AI_ERROR"),
            DomainError::PersistenceError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR")
            }
        };

        let body = json!({
            "error": self.0.to_string(),
            "code": code,
        });

        (status, Json(body)).into_response()
    }
}
