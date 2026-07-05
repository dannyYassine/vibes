use std::sync::Arc;

use crate::models::quote::Quote;
use crate::repositories::quote_repository::QuoteRepository;

pub struct QuoteService {
    repository: Arc<dyn QuoteRepository>,
}

impl QuoteService {
    pub fn new(repository: Arc<dyn QuoteRepository>) -> Self {
        Self { repository }
    }

    pub async fn get_random(&self) -> Result<Quote, String> {
        self.repository.get_random().await
    }
}