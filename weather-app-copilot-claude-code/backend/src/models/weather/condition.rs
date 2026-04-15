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
