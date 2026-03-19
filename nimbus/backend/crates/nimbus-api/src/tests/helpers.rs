use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use tokio::sync::Mutex;
use uuid::Uuid;

use nimbus_domain::entities::diagram::{Diagram, DiagramListItem, Viewport};
use nimbus_domain::entities::node::*;
use nimbus_domain::errors::DomainError;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_domain::ports::diagram_repository::DiagramRepository;
use nimbus_shared::events::{GenerateEvent, GenerateEventType};

use nimbus_app::use_cases::add_diagram_edge::AddDiagramEdge;
use nimbus_app::use_cases::add_diagram_node::AddDiagramNode;
use nimbus_app::use_cases::create_diagram::CreateDiagram;
use nimbus_app::use_cases::delete_diagram::DeleteDiagram;
use nimbus_app::use_cases::delete_diagram_edge::DeleteDiagramEdge;
use nimbus_app::use_cases::delete_diagram_node::DeleteDiagramNode;
use nimbus_app::use_cases::export_diagram_json::ExportDiagramJson;
use nimbus_app::use_cases::export_docker_compose::ExportDockerCompose;
use nimbus_app::use_cases::export_terraform::ExportTerraform;
use nimbus_app::use_cases::fix_diagram::FixDiagram;
use nimbus_app::use_cases::generate_diagram::GenerateDiagram;
use nimbus_app::use_cases::get_diagram::GetDiagram;
use nimbus_app::use_cases::list_diagrams::ListDiagrams;
use nimbus_app::use_cases::modify_diagram::ModifyDiagram;
use nimbus_app::use_cases::patch_diagram_edge::PatchDiagramEdge;
use nimbus_app::use_cases::patch_diagram_node::PatchDiagramNode;
use nimbus_app::use_cases::translate_diagram::TranslateDiagram;
use nimbus_app::use_cases::update_diagram::UpdateDiagram;
use nimbus_app::use_cases::validate_diagram::ValidateDiagram;

use crate::routes::create_router;
use crate::state::AppState;

pub struct MockDiagramRepository {
    diagrams: Mutex<Vec<Diagram>>,
}

impl MockDiagramRepository {
    pub fn new() -> Self {
        Self {
            diagrams: Mutex::new(Vec::new()),
        }
    }
}

#[async_trait]
impl DiagramRepository for MockDiagramRepository {
    async fn list(&self) -> Result<Vec<DiagramListItem>, DomainError> {
        let diagrams = self.diagrams.lock().await;
        Ok(diagrams
            .iter()
            .map(|d| DiagramListItem {
                id: d.id,
                name: d.name.clone(),
                description: d.description.clone(),
                node_count: d.nodes.len() as i64,
                active_provider: d.active_provider,
                updated_at: d.updated_at,
            })
            .collect())
    }

    async fn get(&self, id: Uuid) -> Result<Diagram, DomainError> {
        let diagrams = self.diagrams.lock().await;
        diagrams
            .iter()
            .find(|d| d.id == id)
            .cloned()
            .ok_or_else(|| DomainError::NotFound(format!("Diagram {} not found", id)))
    }

    async fn create(&self, name: &str, description: Option<&str>) -> Result<Diagram, DomainError> {
        let diagram = Diagram {
            id: Uuid::new_v4(),
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            nodes: vec![],
            edges: vec![],
            viewport: Viewport {
                x: 0.0,
                y: 0.0,
                zoom: 1.0,
            },
            active_provider: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let mut diagrams = self.diagrams.lock().await;
        diagrams.push(diagram.clone());
        Ok(diagram)
    }

    async fn update(&self, id: Uuid, diagram: &Diagram) -> Result<Diagram, DomainError> {
        let mut diagrams = self.diagrams.lock().await;
        let idx = diagrams
            .iter()
            .position(|d| d.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Diagram {} not found", id)))?;
        let mut updated = diagram.clone();
        updated.updated_at = Utc::now();
        diagrams[idx] = updated.clone();
        Ok(updated)
    }

    async fn delete(&self, id: Uuid) -> Result<(), DomainError> {
        let mut diagrams = self.diagrams.lock().await;
        let idx = diagrams
            .iter()
            .position(|d| d.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Diagram {} not found", id)))?;
        diagrams.remove(idx);
        Ok(())
    }
}

pub struct MockAiProvider;

#[async_trait]
impl AiProvider for MockAiProvider {
    async fn generate(
        &self,
        _prompt: &str,
    ) -> Result<Pin<Box<dyn futures_util::Stream<Item = GenerateEvent> + Send>>, DomainError> {
        let events = vec![
            GenerateEvent {
                event_type: GenerateEventType::NodeAdded,
                data: serde_json::json!({"id": Uuid::new_v4(), "label": "Web Server"}),
            },
            GenerateEvent {
                event_type: GenerateEventType::Complete,
                data: serde_json::json!({
                    "name": "Generated Diagram",
                    "nodes": [{
                        "id": Uuid::new_v4(),
                        "nodeType": {"category": "Compute", "component": "ApplicationServer"},
                        "label": "Web Server",
                        "position": {"x": 0.0, "y": 0.0},
                        "size": {"width": 180.0, "height": 48.0},
                        "properties": {"config": {}},
                        "parentId": null,
                        "providerMappings": null
                    }],
                    "edges": []
                }),
            },
        ];
        Ok(Box::pin(tokio_stream::iter(events)))
    }

    async fn modify(
        &self,
        _prompt: &str,
        _existing_diagram: &Diagram,
        _selected_node_ids: &[Uuid],
    ) -> Result<Pin<Box<dyn futures_util::Stream<Item = GenerateEvent> + Send>>, DomainError> {
        Ok(Box::pin(tokio_stream::iter(vec![])))
    }

    async fn fix(
        &self,
        _existing_diagram: &Diagram,
        _warning_rule: &str,
        _warning_message: &str,
    ) -> Result<Pin<Box<dyn futures_util::Stream<Item = GenerateEvent> + Send>>, DomainError> {
        Ok(Box::pin(tokio_stream::iter(vec![])))
    }
}

pub fn build_test_app() -> axum::Router {
    let repo: Arc<dyn DiagramRepository> = Arc::new(MockDiagramRepository::new());
    let ai: Arc<dyn AiProvider> = Arc::new(MockAiProvider);

    let state = Arc::new(AppState {
        diagram_repo: repo.clone(),
        create_diagram: CreateDiagram::new(repo.clone()),
        get_diagram: GetDiagram::new(repo.clone()),
        list_diagrams: ListDiagrams::new(repo.clone()),
        update_diagram: UpdateDiagram::new(repo.clone()),
        delete_diagram: DeleteDiagram::new(repo.clone()),
        export_diagram_json: ExportDiagramJson::new(repo.clone()),
        generate_diagram: GenerateDiagram::new(ai.clone(), repo.clone()),
        modify_diagram: ModifyDiagram::new(ai.clone(), repo.clone()),
        validate_diagram: ValidateDiagram::new(repo.clone()),
        fix_diagram: FixDiagram::new(ai.clone(), repo.clone()),
        add_diagram_node: AddDiagramNode::new(repo.clone()),
        patch_diagram_node: PatchDiagramNode::new(repo.clone()),
        delete_diagram_node: DeleteDiagramNode::new(repo.clone()),
        add_diagram_edge: AddDiagramEdge::new(repo.clone()),
        patch_diagram_edge: PatchDiagramEdge::new(repo.clone()),
        delete_diagram_edge: DeleteDiagramEdge::new(repo.clone()),
        translate_diagram: TranslateDiagram::new(repo.clone()),
        export_terraform: ExportTerraform::new(repo.clone()),
        export_docker_compose: ExportDockerCompose::new(repo.clone()),
    });

    create_router(state)
}

pub fn make_test_node() -> Node {
    Node {
        id: Uuid::new_v4(),
        node_type: NodeType::Compute(ComputeComponent::ApplicationServer),
        label: "Web Server".to_string(),
        position: Position { x: 0.0, y: 0.0 },
        size: Size { width: 180.0, height: 48.0 },
        properties: NodeProperties {
            config: serde_json::json!({}),
            style: None,
        },
        parent_id: None,
        provider_mappings: None,
    }
}
