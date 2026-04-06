use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WeatherCondition {
    Clear,
    Clouds,
    Rain,
    Drizzle,
    Thunderstorm,
    Snow,
    Mist,
    Fog,
    Haze,
    Dust,
    Tornado,
}

impl WeatherCondition {
    pub fn from_owm_main(main: &str) -> Self {
        match main {
            "Clear" => Self::Clear,
            "Clouds" => Self::Clouds,
            "Rain" => Self::Rain,
            "Drizzle" => Self::Drizzle,
            "Thunderstorm" => Self::Thunderstorm,
            "Snow" => Self::Snow,
            "Mist" => Self::Mist,
            "Fog" => Self::Fog,
            "Haze" => Self::Haze,
            "Dust" | "Sand" | "Ash" => Self::Dust,
            "Tornado" | "Squall" => Self::Tornado,
            _ => Self::Clear,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentWeatherResponse {
    pub temperature: f64,
    pub feels_like: f64,
    pub humidity: u32,
    pub pressure: u32,
    pub wind_speed: f64,
    pub wind_direction: u32,
    pub condition: WeatherCondition,
    pub condition_description: String,
    pub icon_code: String,
    pub is_daytime: bool,
    pub personality_headline: String,
    pub personality_subtitle: String,
    pub location_name: String,
    pub updated_at: String,
}

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
