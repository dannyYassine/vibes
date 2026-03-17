use std::sync::Arc;

use axum::routing::{get, patch, post};
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
            "/api/diagrams/generate",
            post(handlers::diagram::generate_diagram),
        )
        .route(
            "/api/diagrams/{id}",
            get(handlers::diagram::get_diagram)
                .patch(handlers::diagram::update_diagram)
                .delete(handlers::diagram::delete_diagram),
        )
        .route(
            "/api/diagrams/{id}/modify",
            post(handlers::diagram::modify_diagram),
        )
        .route(
            "/api/diagrams/{id}/validate",
            post(handlers::diagram::validate_diagram),
        )
        .route(
            "/api/diagrams/{id}/fix",
            post(handlers::diagram::fix_diagram),
        )
        .route(
            "/api/diagrams/{id}/translate",
            post(handlers::diagram::translate_diagram)
                .delete(handlers::diagram::clear_translation),
        )
        .route(
            "/api/diagrams/{id}/export/json",
            get(handlers::diagram::export_diagram_json),
        )
        .route(
            "/api/diagrams/{id}/nodes",
            post(handlers::diagram::add_node),
        )
        .route(
            "/api/diagrams/{id}/nodes/{node_id}",
            patch(handlers::diagram::patch_node).delete(handlers::diagram::delete_node),
        )
        .route(
            "/api/diagrams/{id}/edges",
            post(handlers::diagram::add_edge),
        )
        .route(
            "/api/diagrams/{id}/edges/{edge_id}",
            patch(handlers::diagram::patch_edge).delete(handlers::diagram::delete_edge),
        )
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
