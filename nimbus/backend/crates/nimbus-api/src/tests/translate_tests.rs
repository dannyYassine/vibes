use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use super::helpers::{build_test_app, make_test_node};

#[tokio::test]
async fn translate_returns_200_with_mappings() {
    let app = build_test_app();

    // Create diagram
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Translate Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    // Add a node so translation has something to translate
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

    // Translate
    let res = app
        .clone()
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
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let diagram: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(diagram["activeProvider"], "Aws");
    // Check that provider mappings exist on the node
    let node = &diagram["nodes"][0];
    assert!(node["providerMappings"]["aws"].is_object());
}

#[tokio::test]
async fn clear_translation_returns_200() {
    let app = build_test_app();

    // Create, translate, then clear
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/diagrams")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Clear Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let id = created["id"].as_str().unwrap();

    // Clear translation
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/diagrams/{}/translate", id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let diagram: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(diagram["activeProvider"].is_null());
}
