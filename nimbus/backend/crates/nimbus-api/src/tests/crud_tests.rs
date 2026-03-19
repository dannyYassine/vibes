use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use super::helpers::build_test_app;

#[tokio::test]
async fn create_diagram_returns_201() {
    let app = build_test_app();
    let req = Request::builder()
        .method("POST")
        .uri("/api/diagrams")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"Test Diagram"}"#))
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let diagram: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(diagram["name"], "Test Diagram");
    assert!(diagram["id"].is_string());
}

#[tokio::test]
async fn list_diagrams_returns_200() {
    let app = build_test_app();

    // Create a diagram first
    let create_req = Request::builder()
        .method("POST")
        .uri("/api/diagrams")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"Listed"}"#))
        .unwrap();
    let app2 = app.clone();
    app.oneshot(create_req).await.unwrap();

    let req = Request::builder()
        .uri("/api/diagrams")
        .body(Body::empty())
        .unwrap();
    let res = app2.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let list: Vec<serde_json::Value> = serde_json::from_slice(&body).unwrap();
    assert!(!list.is_empty());
}

#[tokio::test]
async fn get_diagram_returns_200() {
    let app = build_test_app();

    // Create first
    let create_req = Request::builder()
        .method("POST")
        .uri("/api/diagrams")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"GetMe"}"#))
        .unwrap();
    let app2 = app.clone();
    let res = app.oneshot(create_req).await.unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    let req = Request::builder()
        .uri(format!("/api/diagrams/{}", id))
        .body(Body::empty())
        .unwrap();
    let res = app2.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let diagram: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(diagram["name"], "GetMe");
}

#[tokio::test]
async fn get_nonexistent_returns_404() {
    let app = build_test_app();
    let req = Request::builder()
        .uri(format!("/api/diagrams/{}", uuid::Uuid::new_v4()))
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn update_diagram_returns_200() {
    let app = build_test_app();

    let create_req = Request::builder()
        .method("POST")
        .uri("/api/diagrams")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"Original"}"#))
        .unwrap();
    let app2 = app.clone();
    let res = app.oneshot(create_req).await.unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/diagrams/{}", id))
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"Updated"}"#))
        .unwrap();
    let res = app2.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let diagram: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(diagram["name"], "Updated");
}

#[tokio::test]
async fn delete_diagram_returns_204() {
    let app = build_test_app();

    let create_req = Request::builder()
        .method("POST")
        .uri("/api/diagrams")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"name":"DeleteMe"}"#))
        .unwrap();
    let app2 = app.clone();
    let res = app.oneshot(create_req).await.unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    let req = Request::builder()
        .method("DELETE")
        .uri(format!("/api/diagrams/{}", id))
        .body(Body::empty())
        .unwrap();
    let res = app2.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);
}
