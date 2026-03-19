use axum::body::Body;
use axum::http::Request;
use http_body_util::BodyExt;
use tower::ServiceExt;

use super::helpers::build_test_app;

#[tokio::test]
async fn generate_returns_sse_stream() {
    let app = build_test_app();
    let req = Request::builder()
        .method("POST")
        .uri("/api/diagrams/generate")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"prompt":"Create a web application"}"#))
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), axum::http::StatusCode::OK);

    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        content_type.contains("text/event-stream"),
        "Expected text/event-stream, got: {}",
        content_type
    );

    // Collect body to verify it contains SSE data
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let body_str = String::from_utf8_lossy(&body);
    // SSE events should contain "event:" lines
    assert!(
        body_str.contains("event:") || body_str.contains("data:"),
        "Expected SSE events in body, got: {}",
        body_str
    );
}
