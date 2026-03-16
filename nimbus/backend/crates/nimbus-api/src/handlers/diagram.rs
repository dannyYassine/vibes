use std::convert::Infallible;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::Json;
use futures_util::{Stream, StreamExt};
use uuid::Uuid;

use nimbus_app::use_cases::patch_diagram_edge::PatchEdgeInput;
use nimbus_app::use_cases::patch_diagram_node::PatchNodeInput;
use nimbus_app::use_cases::update_diagram::UpdateDiagramInput;
use nimbus_domain::entities::diagram::{Diagram, DiagramListItem};
use nimbus_domain::entities::edge::Edge;
use nimbus_domain::entities::node::Node;
use nimbus_domain::entities::validation::ValidationResult;
use nimbus_shared::events::GenerateEvent;

use crate::dto::diagram::{
    AddEdgeRequest, AddNodeRequest, CreateDiagramRequest, FixDiagramRequest,
    GenerateDiagramRequest, ModifyDiagramRequest, PatchEdgeRequest, PatchNodeRequest,
    UpdateDiagramRequest,
};
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

fn stream_to_sse(
    stream: Pin<Box<dyn Stream<Item = GenerateEvent> + Send>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let event_stream = stream.map(|event| {
        let sse_event = Event::default()
            .event(event.event_type.as_str())
            .json_data(&event.data)
            .unwrap_or_else(|_| Event::default().event("error").data("serialization error"));
        Ok::<_, Infallible>(sse_event)
    });

    Sse::new(event_stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}

pub async fn generate_diagram(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GenerateDiagramRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let stream = state.generate_diagram.execute(&req.prompt).await?;
    Ok(stream_to_sse(stream))
}

pub async fn modify_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<ModifyDiagramRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let stream = state
        .modify_diagram
        .execute(id, &req.prompt, &req.selected_node_ids)
        .await?;
    Ok(stream_to_sse(stream))
}

pub async fn validate_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ValidationResult>, AppError> {
    let result = state.validate_diagram.execute(id).await?;
    Ok(Json(result))
}

pub async fn fix_diagram(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<FixDiagramRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let stream = state
        .fix_diagram
        .execute(id, &req.rule, &req.message)
        .await?;
    Ok(stream_to_sse(stream))
}

pub async fn add_node(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddNodeRequest>,
) -> Result<(StatusCode, Json<Node>), AppError> {
    let node = state.add_diagram_node.execute(id, req.node).await?;
    Ok((StatusCode::CREATED, Json(node)))
}

pub async fn patch_node(
    State(state): State<Arc<AppState>>,
    Path((id, node_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<PatchNodeRequest>,
) -> Result<Json<Node>, AppError> {
    let input = PatchNodeInput {
        label: req.label,
        node_type: req.node_type,
        position: req.position,
        size: req.size,
        properties: req.properties,
        parent_id: req.parent_id,
    };
    let node = state
        .patch_diagram_node
        .execute(id, node_id, input)
        .await?;
    Ok(Json(node))
}

pub async fn delete_node(
    State(state): State<Arc<AppState>>,
    Path((id, node_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, AppError> {
    state.delete_diagram_node.execute(id, node_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn add_edge(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddEdgeRequest>,
) -> Result<(StatusCode, Json<Edge>), AppError> {
    let edge = state.add_diagram_edge.execute(id, req.edge).await?;
    Ok((StatusCode::CREATED, Json(edge)))
}

pub async fn patch_edge(
    State(state): State<Arc<AppState>>,
    Path((id, edge_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<PatchEdgeRequest>,
) -> Result<Json<Edge>, AppError> {
    let input = PatchEdgeInput {
        edge_type: req.edge_type,
        label: req.label,
        properties: req.properties,
    };
    let edge = state
        .patch_diagram_edge
        .execute(id, edge_id, input)
        .await?;
    Ok(Json(edge))
}

pub async fn delete_edge(
    State(state): State<Arc<AppState>>,
    Path((id, edge_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, AppError> {
    state.delete_diagram_edge.execute(id, edge_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
