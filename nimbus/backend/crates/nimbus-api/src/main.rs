use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use nimbus_api::config::AppConfig;
use nimbus_api::routes::create_router;
use nimbus_api::state::AppState;
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
use nimbus_app::use_cases::translate_diagram::TranslateDiagram;
use nimbus_app::use_cases::update_diagram::UpdateDiagram;
use nimbus_app::use_cases::validate_diagram::ValidateDiagram;
use nimbus_domain::ports::ai_provider::AiProvider;
use nimbus_infra::ai::ClaudeAiProvider;
use nimbus_infra::persistence::{create_pool, PostgresDiagramRepo};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = AppConfig::from_env();

    let pool = create_pool(&config.database_url).await;

    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Migrations applied successfully");

    let diagram_repo = Arc::new(PostgresDiagramRepo::new(pool));

    let ai_provider: Arc<dyn AiProvider> = Arc::new(ClaudeAiProvider::new(
        config.anthropic_api_key.clone(),
        Some(config.anthropic_model.clone()),
    ));

    let state = Arc::new(AppState {
        create_diagram: CreateDiagram::new(diagram_repo.clone()),
        get_diagram: GetDiagram::new(diagram_repo.clone()),
        list_diagrams: ListDiagrams::new(diagram_repo.clone()),
        update_diagram: UpdateDiagram::new(diagram_repo.clone()),
        delete_diagram: DeleteDiagram::new(diagram_repo.clone()),
        export_diagram_json: ExportDiagramJson::new(diagram_repo.clone()),
        generate_diagram: GenerateDiagram::new(ai_provider.clone(), diagram_repo.clone()),
        modify_diagram: ModifyDiagram::new(ai_provider.clone(), diagram_repo.clone()),
        validate_diagram: ValidateDiagram::new(diagram_repo.clone()),
        fix_diagram: FixDiagram::new(ai_provider, diagram_repo.clone()),
        add_diagram_node: AddDiagramNode::new(diagram_repo.clone()),
        patch_diagram_node: PatchDiagramNode::new(diagram_repo.clone()),
        delete_diagram_node: DeleteDiagramNode::new(diagram_repo.clone()),
        add_diagram_edge: AddDiagramEdge::new(diagram_repo.clone()),
        patch_diagram_edge: PatchDiagramEdge::new(diagram_repo.clone()),
        delete_diagram_edge: DeleteDiagramEdge::new(diagram_repo.clone()),
        translate_diagram: TranslateDiagram::new(diagram_repo.clone()),
        diagram_repo,
    });

    let app = create_router(state);

    let addr = config.bind_addr();
    tracing::info!("Starting server on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
