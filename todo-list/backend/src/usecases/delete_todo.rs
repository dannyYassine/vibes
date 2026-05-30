use std::sync::Arc;

use crate::services::todo::TodoService;

pub struct DeleteTodoUseCase {
    service: Arc<TodoService>,
}

impl DeleteTodoUseCase {
    pub fn new(service: Arc<TodoService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self, id: String) -> Result<(), String> {
        self.service.delete(&id).await
    }
}