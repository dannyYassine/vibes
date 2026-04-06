use serde::{Deserialize, Serialize};

use super::weather::WeatherCondition;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForecastResponse {
    pub hourly: Vec<HourlyForecast>,
    pub daily: Vec<DailyForecast>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyForecast {
    pub time: String,
    pub temperature: f64,
    pub condition: WeatherCondition,
    pub icon_code: String,
    pub precipitation_probability: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyForecast {
    pub date: String,
    pub temp_high: f64,
    pub temp_low: f64,
    pub condition: WeatherCondition,
    pub condition_label: String,
    pub icon_code: String,
}

/// Raw response structs for OpenWeatherMap 5-day/3-hour forecast
#[derive(Debug, Deserialize)]
pub struct OwmForecastResponse {
    pub list: Vec<OwmForecastEntry>,
}

#[derive(Debug, Deserialize)]
pub struct OwmForecastEntry {
    pub dt: i64,
    pub main: OwmForecastMain,
    pub weather: Vec<OwmForecastWeather>,
    #[serde(default)]
    pub pop: f64,
}

#[derive(Debug, Deserialize)]
pub struct OwmForecastMain {
    pub temp: f64,
    pub temp_min: f64,
    pub temp_max: f64,
}

#[derive(Debug, Deserialize)]
pub struct OwmForecastWeather {
    pub main: String,
    pub description: String,
    pub icon: String,
}

/// Raw response for OpenWeatherMap geocoding
#[derive(Debug, Deserialize)]
pub struct OwmGeoResult {
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoLocation {
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub country: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}
