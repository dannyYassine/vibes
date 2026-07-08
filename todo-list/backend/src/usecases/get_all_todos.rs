use std::sync::Arc;

use crate::dtos::todo::TodoResponse;
use crate::services::todo::TodoService;

pub struct GetAllTodosUseCase {
    service: Arc<TodoService>,
}

impl GetAllTodosUseCase {
    pub fn new(service: Arc<TodoService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self) -> Vec<TodoResponse> {
        self.service
            .get_all()
            .await
            .into_iter()
            .map(|todo| TodoResponse {
                id: todo.id,
                title: todo.title,
                completed: todo.completed,
                created_at: todo.created_at,
            })
            .collect()
    }
}
