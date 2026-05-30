use std::sync::Arc;

use crate::models::todo::Todo;
use crate::repositories::todo_repository::TodoRepository;

pub struct TodoService {
    repository: Arc<dyn TodoRepository>,
}

impl TodoService {
    pub fn new(repository: Arc<dyn TodoRepository>) -> Self {
        Self { repository }
    }

    pub async fn get_all(&self) -> Vec<Todo> {
        self.repository.find_all().await
    }

    pub async fn get_by_id(&self, id: &str) -> Option<Todo> {
        self.repository.find_by_id(id).await
    }

    pub async fn create(&self, title: String) -> Result<Todo, String> {
        if title.trim().is_empty() {
            return Err("Title cannot be empty".to_string());
        }

        let id = uuid::Uuid::new_v4().to_string();
        let todo = Todo::new(id, title.trim().to_string());
        self.repository.save(&todo).await.map_err(|e| e.to_string())?;
        Ok(todo)
    }

    pub async fn complete(&self, id: &str) -> Result<Todo, String> {
        let mut todo = self.repository.find_by_id(id).await.ok_or("Todo not found")?;
        todo.complete();
        self.repository.update(&todo).await.map_err(|e| e.to_string())?;
        Ok(todo)
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
        self.repository.find_by_id(id).await.ok_or("Todo not found")?;
        self.repository.delete(id).await.map_err(|e| e.to_string())
    }
}