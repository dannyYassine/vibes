use serde::{Deserialize, Serialize};
use super::condition::WeatherCondition;

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
