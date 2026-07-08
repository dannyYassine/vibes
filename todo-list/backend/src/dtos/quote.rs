use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QuoteResponse {
    pub content: String,
    pub author: String,
}

#[derive(Debug, Deserialize)]
pub struct ZenQuoteDto {
    pub q: String,
    pub a: String,
}