use std::sync::Arc;

use axum::routing::{delete, get, patch, post};
use axum::Router;
use tower_http::cors::{Any, CorsLayer};

use crate::delivery::app_state::AppState;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/todos", post(crate::delivery::handlers::create_todo))
        .route("/api/todos", get(crate::delivery::handlers::get_all_todos))
        .route("/api/todos/:id", get(crate::delivery::handlers::get_todo_by_id))
        .route("/api/todos/:id/complete", patch(crate::delivery::handlers::complete_todo))
        .route("/api/todos/:id", delete(crate::delivery::handlers::delete_todo))
        .route("/api/quote", get(crate::delivery::handlers::get_quote))
        .layer(cors)
        .with_state(state)
}
