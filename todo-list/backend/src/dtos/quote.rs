use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QuoteResponse {
    pub content: String,
    pub author: String,
}