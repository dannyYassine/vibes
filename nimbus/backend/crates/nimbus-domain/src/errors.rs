#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Entity not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("AI provider error: {0}")]
    AiError(String),
    #[error("Persistence error: {0}")]
    PersistenceError(String),
}
