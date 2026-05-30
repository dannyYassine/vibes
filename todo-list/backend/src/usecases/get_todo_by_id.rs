use std::sync::Arc;

use crate::dtos::todo::TodoResponse;
use crate::services::todo::TodoService;

pub struct GetTodoByIdUseCase {
    service: Arc<TodoService>,
}

impl GetTodoByIdUseCase {
    pub fn new(service: Arc<TodoService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self, id: String) -> Result<TodoResponse, String> {
        let todo = self.service.get_by_id(&id).await.ok_or("Todo not found")?;
        Ok(TodoResponse {
            id: todo.id,
            title: todo.title,
            completed: todo.completed,
            created_at: todo.created_at,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use sqlx::postgres::PgPoolOptions;

    use crate::models::todo::Todo;
    use crate::repositories::todo_repository::SqlTodoRepository;
    use crate::services::todo::TodoService;
    use crate::usecases::get_todo_by_id::GetTodoByIdUseCase;

    fn test_db_url() -> String {
        std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/todo".to_string())
    }

    async fn setup_test_db() -> sqlx::PgPool {
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

    async fn create_use_case(pool: sqlx::PgPool) -> GetTodoByIdUseCase {
        let repository = Arc::new(SqlTodoRepository::new(pool));
        let service = Arc::new(TodoService::new(repository));
        GetTodoByIdUseCase::new(service)
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
    async fn get_todo_by_id_returns_todo_when_found() {
        let pool = setup_test_db().await;
        insert_todo(&pool, "abc-123", "Buy groceries").await;

        let usecase = create_use_case(pool).await;

        let result = usecase.execute("abc-123".to_string()).await;

        assert!(result.is_ok(), "Expected Ok, got {:?}", result);
        let todo = result.unwrap();
        assert_eq!(todo.id, "abc-123");
        assert_eq!(todo.title, "Buy groceries");
        assert!(!todo.completed);
    }

    #[tokio::test]
    async fn get_todo_by_id_returns_error_when_not_found() {
        let pool = setup_test_db().await;
        let usecase = create_use_case(pool).await;

        let result = usecase.execute("nonexistent".to_string()).await;

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Todo not found");
    }
}
