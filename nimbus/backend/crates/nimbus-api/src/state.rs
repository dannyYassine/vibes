use std::sync::Arc;

use nimbus_app::use_cases::add_diagram_edge::AddDiagramEdge;
use nimbus_app::use_cases::add_diagram_node::AddDiagramNode;
use nimbus_app::use_cases::create_diagram::CreateDiagram;
use nimbus_app::use_cases::delete_diagram::DeleteDiagram;
use nimbus_app::use_cases::export_diagram_json::ExportDiagramJson;
use nimbus_app::use_cases::delete_diagram_edge::DeleteDiagramEdge;
use nimbus_app::use_cases::delete_diagram_node::DeleteDiagramNode;
use nimbus_app::use_cases::fix_diagram::FixDiagram;
use nimbus_app::use_cases::generate_diagram::GenerateDiagram;
use nimbus_app::use_cases::get_diagram::GetDiagram;
use nimbus_app::use_cases::list_diagrams::ListDiagrams;
use nimbus_app::use_cases::modify_diagram::ModifyDiagram;
use nimbus_app::use_cases::patch_diagram_edge::PatchDiagramEdge;
use nimbus_app::use_cases::patch_diagram_node::PatchDiagramNode;
use nimbus_app::use_cases::update_diagram::UpdateDiagram;
use nimbus_app::use_cases::validate_diagram::ValidateDiagram;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct AppState {
    pub diagram_repo: Arc<dyn DiagramRepository>,
    pub create_diagram: CreateDiagram,
    pub get_diagram: GetDiagram,
    pub list_diagrams: ListDiagrams,
    pub update_diagram: UpdateDiagram,
    pub delete_diagram: DeleteDiagram,
    pub export_diagram_json: ExportDiagramJson,
    pub generate_diagram: GenerateDiagram,
    pub modify_diagram: ModifyDiagram,
    pub validate_diagram: ValidateDiagram,
    pub fix_diagram: FixDiagram,
    pub add_diagram_node: AddDiagramNode,
    pub patch_diagram_node: PatchDiagramNode,
    pub delete_diagram_node: DeleteDiagramNode,
    pub add_diagram_edge: AddDiagramEdge,
    pub patch_diagram_edge: PatchDiagramEdge,
    pub delete_diagram_edge: DeleteDiagramEdge,
}
