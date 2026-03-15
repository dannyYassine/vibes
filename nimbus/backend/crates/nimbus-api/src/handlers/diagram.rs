use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use nimbus_app::use_cases::update_diagram::UpdateDiagramInput;
use nimbus_domain::entities::diagram::{Diagram, DiagramListItem};

use crate::dto::diagram::{CreateDiagramRequest, GenerateDiagramRequest, UpdateDiagramRequest};
use crate::middleware::error_handler::AppError;
use crate::state::AppState;

pub async fn create_diagram(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateDiagramRequest>,
) -> Result<(StatusCode, Json<Diagram>), AppError> {
    let diagram = state
        .create_diagram
        .execute(&req.name, req.description.as_deref())
        .await?;
    Ok((StatusCode::CREATED, Json(diagram)))
}

pub async fn list_diagrams(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<DiagramListItem>>, AppError> {
    let diagrams = state.list_diagrams.execute().await?;
    Ok(Json(diagrams))
}

pub async fn get_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Diagram>, AppError> {
    let diagram = state.get_diagram.execute(id).await?;
    Ok(Json(diagram))
}

pub async fn update_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDiagramRequest>,
) -> Result<Json<Diagram>, AppError> {
    let input = UpdateDiagramInput {
        name: req.name,
        description: req.description,
        nodes: req.nodes,
        edges: req.edges,
        viewport: req.viewport,
    };
    let diagram = state.update_diagram.execute(id, input).await?;
    Ok(Json(diagram))
}

pub async fn delete_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    state.delete_diagram.execute(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn generate_diagram(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GenerateDiagramRequest>,
) -> Result<(StatusCode, Json<Diagram>), AppError> {
    let diagram = state.generate_diagram.execute(&req.prompt).await?;
    Ok((StatusCode::CREATED, Json(diagram)))
}
