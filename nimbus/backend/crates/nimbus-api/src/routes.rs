use std::sync::Arc;

use axum::routing::get;
use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::handlers;
use crate::state::AppState;

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route(
            "/api/diagrams",
            get(handlers::diagram::list_diagrams).post(handlers::diagram::create_diagram),
        )
        .route(
            "/api/diagrams/{id}",
            get(handlers::diagram::get_diagram)
                .patch(handlers::diagram::update_diagram)
                .delete(handlers::diagram::delete_diagram),
        )
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
