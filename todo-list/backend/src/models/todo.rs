use chrono::NaiveDateTime;
use sqlx::postgres::PgRow;
use sqlx::Row;

pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: NaiveDateTime,
}

impl Todo {
    pub fn new(id: String, title: String) -> Self {
        Self {
            id,
            title,
            completed: false,
            created_at: chrono::Utc::now().naive_utc(),
        }
    }

    pub fn from_row(row: &PgRow) -> Self {
        Self {
            id: row.get("id"),
            title: row.get("title"),
            completed: row.get("completed"),
            created_at: row.get("created_at"),
        }
    }

    pub fn complete(&mut self) {
        self.completed = true;
    }
}