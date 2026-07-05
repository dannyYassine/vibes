use async_trait::async_trait;
use reqwest::Client;

use crate::dtos::quote::QuoteResponse;
use crate::models::quote::Quote;

#[async_trait]
pub trait QuoteRepository: Send + Sync {
    async fn get_random(&self) -> Result<Quote, String>;
}

pub struct ExternalQuoteRepository {
    client: Client,
}

impl ExternalQuoteRepository {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

#[async_trait]
impl QuoteRepository for ExternalQuoteRepository {
    async fn get_random(&self) -> Result<Quote, String> {
        let response: QuoteResponse = self
            .client
            .get("https://api.quotable.io/random")
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {e}"))?;

        Ok(Quote {
            content: response.content,
            author: response.author,
        })
    }
}