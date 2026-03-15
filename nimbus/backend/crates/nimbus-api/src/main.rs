use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use nimbus_api::config::AppConfig;
use nimbus_api::routes::create_router;
use nimbus_api::state::AppState;
use nimbus_infra::persistence::{create_pool, PostgresDiagramRepo};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = AppConfig::from_env();

    let pool = create_pool(&config.database_url).await;

    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Migrations applied successfully");

    let diagram_repo = Arc::new(PostgresDiagramRepo::new(pool));

    let state = Arc::new(AppState {
        diagram_repo,
    });

    let app = create_router(state);

    let addr = config.bind_addr();
    tracing::info!("Starting server on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
