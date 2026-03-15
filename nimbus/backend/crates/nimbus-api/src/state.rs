use std::sync::Arc;

use nimbus_domain::ports::diagram_repository::DiagramRepository;

pub struct AppState {
    pub diagram_repo: Arc<dyn DiagramRepository>,
}
