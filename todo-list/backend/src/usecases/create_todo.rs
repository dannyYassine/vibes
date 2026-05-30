use std::sync::Arc;

use crate::dtos::todo::{CreateTodoDto, TodoResponse};
use crate::services::todo::TodoService;

pub struct CreateTodoUseCase {
    service: Arc<TodoService>,
}

impl CreateTodoUseCase {
    pub fn new(service: Arc<TodoService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self, dto: CreateTodoDto) -> Result<TodoResponse, String> {
        let todo = self.service.create(dto.title).await?;
        Ok(TodoResponse {
            id: todo.id,
            title: todo.title,
            completed: todo.completed,
            created_at: todo.created_at,
        })
    }
}