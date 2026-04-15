use serde::Deserialize;

/// Raw response structs for deserializing OpenWeatherMap API
#[derive(Debug, Deserialize)]
pub struct OwmCurrentResponse {
    pub weather: Vec<OwmWeatherEntry>,
    pub main: OwmMain,
    pub wind: OwmWind,
    pub name: String,
    pub sys: OwmSys,
}

#[derive(Debug, Deserialize)]
pub struct OwmWeatherEntry {
    pub main: String,
    pub description: String,
    pub icon: String,
}

#[derive(Debug, Deserialize)]
pub struct OwmMain {
    pub temp: f64,
    pub feels_like: f64,
    pub humidity: u32,
    pub pressure: u32,
}

#[derive(Debug, Deserialize)]
pub struct OwmWind {
    pub speed: f64,
    #[serde(default)]
    pub deg: u32,
}

#[derive(Debug, Deserialize)]
pub struct OwmSys {
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub sunrise: Option<u64>,
    #[serde(default)]
    pub sunset: Option<u64>,
}
