use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Quote {
    pub content: String,
    pub author: String,
}