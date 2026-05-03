use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Build our application routes
    let app = Router::new().route("/", get(handler));

    // Run the server on localhost:3000
    let addr = SocketAddr::from(([127.0.0.1], 3000));
    println!("Listening on http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// Handler function for the root route
async fn handler() -> String {
    "Hello, Axum!".to_string()
}