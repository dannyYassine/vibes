use async_trait::async_trait;
use sqlx::PgPool;

use crate::models::todo::Todo;

#[async_trait]
pub trait TodoRepository: Send + Sync {
    async fn find_all(&self) -> Vec<Todo>;
    async fn find_by_id(&self, id: &str) -> Option<Todo>;
    async fn save(&self, todo: &Todo) -> Result<(), sqlx::Error>;
    async fn update(&self, todo: &Todo) -> Result<(), sqlx::Error>;
    async fn delete(&self, id: &str) -> Result<(), sqlx::Error>;
}

pub struct SqlTodoRepository {
    pool: PgPool,
}

impl SqlTodoRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TodoRepository for SqlTodoRepository {
    async fn find_all(&self) -> Vec<Todo> {
        let rows = sqlx::query("SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await
            .unwrap_or_default();

        rows.iter().map(|row| Todo::from_row(row)).collect()
    }

    async fn find_by_id(&self, id: &str) -> Option<Todo> {
        sqlx::query("SELECT id, title, completed, created_at FROM todos WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten()
            .map(|row| Todo::from_row(&row))
    }

    async fn save(&self, todo: &Todo) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO todos (id, title, completed, created_at) VALUES ($1, $2, $3, $4)")
            .bind(&todo.id)
            .bind(&todo.title)
            .bind(todo.completed)
            .bind(&todo.created_at)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update(&self, todo: &Todo) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE todos SET title = $1, completed = $2 WHERE id = $3")
            .bind(&todo.title)
            .bind(todo.completed)
            .bind(&todo.id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM todos WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
