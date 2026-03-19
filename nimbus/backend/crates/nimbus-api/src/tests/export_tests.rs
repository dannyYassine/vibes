use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use super::helpers::{build_test_app, make_test_node};

async fn create_translated_diagram(app: &axum::Router) -> String {
    // Create diagram
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Export Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap().to_string();

    // Add a node
    let node = make_test_node();
    let node_json = serde_json::to_string(&serde_json::json!({"node": node})).unwrap();
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/diagrams/{}/nodes", id))
                .header("content-type", "application/json")
                .body(Body::from(node_json))
                .unwrap(),
        )
        .await
        .unwrap();

    // Translate to AWS
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/diagrams/{}/translate", id))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"provider":"Aws"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    id
}

#[tokio::test]
async fn export_terraform_returns_200() {
    let app = build_test_app();
    let id = create_translated_diagram(&app).await;

    let res = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/diagrams/{}/export/terraform", id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let files: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(files["providers_tf"].is_string());
    assert!(files["main_tf"].is_string());
}

#[tokio::test]
async fn export_terraform_without_provider_errors() {
    let app = build_test_app();

    // Create without translating
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"No Provider"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    let res = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/diagrams/{}/export/terraform", id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn export_docker_compose_returns_200() {
    let app = build_test_app();

    // Create diagram with a node (no translation needed for docker-compose)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Docker Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    // Add a node
    let node = make_test_node();
    let node_json = serde_json::to_string(&serde_json::json!({"node": node})).unwrap();
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/diagrams/{}/nodes", id))
                .header("content-type", "application/json")
                .body(Body::from(node_json))
                .unwrap(),
        )
        .await
        .unwrap();

    let res = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/diagrams/{}/export/docker-compose", id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(content_type.contains("yaml"));
}

#[tokio::test]
async fn export_json_returns_200() {
    let app = build_test_app();

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"JSON Export Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    let res = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/diagrams/{}/export/json", id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(content_type.contains("application/json"));
}
