use std::sync::Arc;

use crate::dtos::quote::QuoteResponse;
use crate::services::quote::QuoteService;

pub struct GetQuoteUseCase {
    service: Arc<QuoteService>,
}

impl GetQuoteUseCase {
    pub fn new(service: Arc<QuoteService>) -> Self {
        Self { service }
    }

    pub async fn execute(&self) -> Result<QuoteResponse, String> {
        let quote = self.service.get_random().await?;
        Ok(QuoteResponse {
            content: quote.content,
            author: quote.author,
        })
    }
}