use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;

use crate::delivery::app_state::AppState;
use crate::dtos::todo::{CompleteTodoDto, CreateTodoDto, TodoResponse};
use crate::dtos::quote::QuoteResponse;

pub async fn get_quote(
    State(state): State<Arc<AppState>>,
) -> Result<Json<QuoteResponse>, StatusCode> {
    match state.get_quote_usecase.execute().await {
        Ok(quote) => Ok(Json(quote)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn create_todo(
    State(state): State<Arc<AppState>>,
    Json(dto): Json<CreateTodoDto>,
) -> Result<(StatusCode, Json<TodoResponse>), StatusCode> {
    match state.create_todo_usecase.execute(dto).await {
        Ok(todo) => Ok((StatusCode::CREATED, Json(todo))),
        Err(_) => Err(StatusCode::UNPROCESSABLE_ENTITY),
    }
}

pub async fn get_all_todos(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<TodoResponse>> {
    let todos = state.get_all_todos_usecase.execute().await;
    Json(todos)
}

pub async fn complete_todo(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(dto): Json<CompleteTodoDto>,
) -> Result<Json<TodoResponse>, StatusCode> {
    match state.complete_todo_usecase.execute(id, dto).await {
        Ok(todo) => Ok(Json(todo)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn delete_todo(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> StatusCode {
    match state.delete_todo_usecase.execute(id).await {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::NOT_FOUND,
    }
}

pub async fn get_todo_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<TodoResponse>, StatusCode> {
    match state.get_todo_by_id_usecase.execute(id).await {
        Ok(todo) => Ok(Json(todo)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::body::Body;
    use axum::http::{Method, Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use sqlx::postgres::PgPoolOptions;
    use tower::ServiceExt;

    use crate::delivery::app_state::AppState;
    use crate::models::todo::Todo;
    use crate::repositories::todo_repository::SqlTodoRepository;
    use crate::repositories::quote_repository::QuoteRepository;
    use crate::services::todo::TodoService;
    use crate::services::quote::QuoteService;
    use crate::usecases::complete_todo::CompleteTodoUseCase;
    use crate::usecases::create_todo::CreateTodoUseCase;
    use crate::usecases::delete_todo::DeleteTodoUseCase;
    use crate::usecases::get_all_todos::GetAllTodosUseCase;
    use crate::usecases::get_todo_by_id::GetTodoByIdUseCase;
    use crate::usecases::get_quote::GetQuoteUseCase;

    struct StubQuoteRepository;

    #[async_trait::async_trait]
    impl QuoteRepository for StubQuoteRepository {
        async fn get_random(&self) -> Result<crate::models::quote::Quote, String> {
            Err("stub".into())
        }
    }

    fn test_db_url() -> String {
        std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/todo".to_string())
    }

    async fn build_app(pool: sqlx::PgPool) -> Router {
        let repository = Arc::new(SqlTodoRepository::new(pool));
        let service = Arc::new(TodoService::new(repository));

        let quote_repository: Arc<dyn QuoteRepository> = Arc::new(StubQuoteRepository);
        let quote_service = Arc::new(QuoteService::new(quote_repository));

        let state = Arc::new(AppState {
            create_todo_usecase: Arc::new(CreateTodoUseCase::new(service.clone())),
            get_all_todos_usecase: Arc::new(GetAllTodosUseCase::new(service.clone())),
            get_todo_by_id_usecase: Arc::new(GetTodoByIdUseCase::new(service.clone())),
            complete_todo_usecase: Arc::new(CompleteTodoUseCase::new(service.clone())),
            delete_todo_usecase: Arc::new(DeleteTodoUseCase::new(service.clone())),
            get_quote_usecase: Arc::new(GetQuoteUseCase::new(quote_service)),
        });

        Router::new()
            .route("/api/todos/:id", get(super::get_todo_by_id))
            .with_state(state)
    }

    async fn setup_db() -> sqlx::PgPool {
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&test_db_url())
            .await
            .expect("Failed to connect to PostgreSQL");

        sqlx::query("DROP TABLE IF EXISTS todos")
            .execute(&pool)
            .await
            .expect("Failed to drop table");

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .expect("Failed to run migration");

        pool
    }

    async fn insert_todo(pool: &sqlx::PgPool, id: &str, title: &str) {
        let todo = Todo::new(id.to_string(), title.to_string());
        sqlx::query("INSERT INTO todos (id, title, completed, created_at) VALUES ($1, $2, $3, $4)")
            .bind(&todo.id)
            .bind(&todo.title)
            .bind(todo.completed)
            .bind(&todo.created_at)
            .execute(pool)
            .await
            .expect("Failed to insert test todo");
    }

    #[tokio::test]
    async fn get_todo_by_id_returns_ok_for_existing_todo() {
        let pool = setup_db().await;
        let app = build_app(pool.clone()).await;
        insert_todo(&pool, "abc-123", "Buy groceries").await;

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/todos/abc-123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let todo: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(todo["id"], "abc-123");
        assert_eq!(todo["title"], "Buy groceries");
        assert_eq!(todo["completed"], false);
    }

    #[tokio::test]
    async fn get_todo_by_id_returns_404_for_non_existent_todo() {
        let pool = setup_db().await;
        let app = build_app(pool).await;

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/todos/nonexistent")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
