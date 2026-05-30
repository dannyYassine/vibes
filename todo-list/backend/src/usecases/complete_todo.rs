use std::sync::Arc;

use crate::dtos::todo::{CompleteTodoDto, TodoResponse};
use crate::services::todo::TodoService;

pub struct CompleteTodoUseCase {
    service: Arc<TodoService>,
}

impl CompleteTodoUseCase {
    pub fn new(service: Arc<TodoService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self, id: String, _dto: CompleteTodoDto) -> Result<TodoResponse, String> {
        let todo = self.service.complete(&id).await?;
        Ok(TodoResponse {
            id: todo.id,
            title: todo.title,
            completed: todo.completed,
            created_at: todo.created_at,
        })
    }
}