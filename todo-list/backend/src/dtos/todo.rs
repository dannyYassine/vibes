use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateTodoDto {
    pub title: String,
}

#[derive(Debug, Deserialize)]
pub struct CompleteTodoDto {
    #[allow(dead_code)]
    pub completed: bool,
}

#[derive(Debug, Serialize)]
pub struct TodoResponse {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: NaiveDateTime,
}