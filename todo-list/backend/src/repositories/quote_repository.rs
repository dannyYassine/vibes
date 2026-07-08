use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;

use crate::dtos::quote::ZenQuoteDto;
use crate::models::quote::Quote;

#[async_trait]
pub trait QuoteRepository: Send + Sync {
    async fn get_random(&self) -> Result<Quote>;
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
    async fn get_random(&self) -> Result<Quote> {
        let mut response: Vec<ZenQuoteDto> = self
            .client
            .get("https://zenquotes.io/api/random")
            .send()
            .await?
            .json()
            .await?;

        let quote = response
            .pop()
            .ok_or_else(|| anyhow::anyhow!("empty response from zenquotes.io"))?;

        Ok(Quote {
            content: quote.q,
            author: quote.a,
        })
    }
}
