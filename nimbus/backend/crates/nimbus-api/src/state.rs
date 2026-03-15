use std::sync::Arc;

use nimbus_app::use_cases::create_diagram::CreateDiagram;
use nimbus_app::use_cases::delete_diagram::DeleteDiagram;
use nimbus_app::use_cases::generate_diagram::GenerateDiagram;
use nimbus_app::use_cases::get_diagram::GetDiagram;
use nimbus_app::use_cases::list_diagrams::ListDiagrams;
use nimbus_app::use_cases::update_diagram::UpdateDiagram;
use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct AppState {
    pub diagram_repo: Arc<dyn DiagramRepository>,
    pub create_diagram: CreateDiagram,
    pub get_diagram: GetDiagram,
    pub list_diagrams: ListDiagrams,
    pub update_diagram: UpdateDiagram,
    pub delete_diagram: DeleteDiagram,
    pub generate_diagram: GenerateDiagram,
}
