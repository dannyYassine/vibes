use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;

mod delivery;
mod router;
mod dtos;
mod models;
mod repositories;
mod services;
mod usecases;

use delivery::app_state::AppState;
use repositories::todo_repository::SqlTodoRepository;
use services::todo::TodoService;
use usecases::complete_todo::CompleteTodoUseCase;
use usecases::create_todo::CreateTodoUseCase;
use usecases::delete_todo::DeleteTodoUseCase;
use usecases::get_all_todos::GetAllTodosUseCase;
use usecases::get_todo_by_id::GetTodoByIdUseCase;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/todo".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::query(include_str!("../migrations/001_create_todos.sql"))
        .execute(&pool)
        .await?;

    let repository: Arc<dyn repositories::todo_repository::TodoRepository> =
        Arc::new(SqlTodoRepository::new(pool));

    let service = Arc::new(TodoService::new(repository));

    let state = Arc::new(AppState {
        create_todo_usecase: Arc::new(CreateTodoUseCase::new(service.clone())),
        get_all_todos_usecase: Arc::new(GetAllTodosUseCase::new(service.clone())),
        get_todo_by_id_usecase: Arc::new(GetTodoByIdUseCase::new(service.clone())),
        complete_todo_usecase: Arc::new(CompleteTodoUseCase::new(service.clone())),
        delete_todo_usecase: Arc::new(DeleteTodoUseCase::new(service.clone())),
    });

    let app = router::create_router(state);

    let addr = std::env::var("BIND_ADDRESS").unwrap_or_else(|_| "127.0.0.1:3000".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("🚀 Server listening on http://{addr}");
    println!("   POST   /api/todos");
    println!("   GET    /api/todos");
    println!("   GET    /api/todos/:id");
    println!("   PATCH  /api/todos/:id/complete");
    println!("   DELETE /api/todos/:id");
    axum::serve(listener, app).await?;

    Ok(())
}