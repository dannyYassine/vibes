use crate::models::forecast::{
    DailyForecast, ForecastResponse, GeoLocation, HourlyForecast, OwmForecastResponse,
    OwmGeoResult,
};
use crate::models::weather::{CurrentWeatherResponse, OwmCurrentResponse, WeatherCondition};
use crate::services::personality::generate_personality;
use chrono::{DateTime, Utc};

#[derive(Debug)]
pub enum ApiClientError {
    Request(reqwest::Error),
    OwmError { cod: String, message: String },
}

impl std::fmt::Display for ApiClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiClientError::Request(e) => write!(f, "{}", e),
            ApiClientError::OwmError { cod, message } => {
                write!(f, "OpenWeatherMap error ({}): {}", cod, message)
            }
        }
    }
}

impl From<reqwest::Error> for ApiClientError {
    fn from(e: reqwest::Error) -> Self {
        ApiClientError::Request(e)
    }
}

pub struct WeatherApiClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl WeatherApiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openweathermap.org".to_string(),
        }
    }

    pub async fn fetch_current(
        &self,
        lat: f64,
        lon: f64,
    ) -> Result<CurrentWeatherResponse, ApiClientError> {
        let url = format!(
            "{}/data/2.5/weather?lat={}&lon={}&units=metric&appid={}",
            self.base_url, lat, lon, self.api_key
        );

        let response = self.client.get(&url).send().await?;
        let body = response.text().await?;

        // Check for OWM error response first
        if let Ok(err) = serde_json::from_str::<serde_json::Value>(&body) {
            if let Some(cod) = err.get("cod") {
                let cod_str = cod.as_str().map(|s| s.to_string())
                    .unwrap_or_else(|| cod.to_string());
                if cod_str != "200" {
                    let message = err.get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Unknown error")
                        .to_string();
                    tracing::error!("OWM API error: cod={}, message={}", cod_str, message);
                    return Err(ApiClientError::OwmError { cod: cod_str, message });
                }
            }
        }

        let owm: OwmCurrentResponse = serde_json::from_str(&body).map_err(|e| {
            tracing::error!("Failed to deserialize OWM response: {}", e);
            tracing::error!("Response body: {}", body);
            ApiClientError::OwmError {
                cod: "parse_error".to_string(),
                message: format!("Failed to parse response: {}", e),
            }
        })?;

        let weather_entry = &owm.weather[0];
        let condition = WeatherCondition::from_owm_main(&weather_entry.main);
        let icon_code = &weather_entry.icon;

        // Daytime: icon codes ending in 'd' are day, 'n' are night
        let is_daytime = icon_code.ends_with('d');

        let (headline, subtitle) =
            generate_personality(&condition, owm.main.temp, is_daytime);

        let now: DateTime<Utc> = Utc::now();

        Ok(CurrentWeatherResponse {
            temperature: owm.main.temp,
            feels_like: owm.main.feels_like,
            humidity: owm.main.humidity,
            pressure: owm.main.pressure,
            wind_speed: owm.wind.speed,
            wind_direction: owm.wind.deg,
            condition,
            condition_description: weather_entry.description.clone(),
            icon_code: icon_code.clone(),
            is_daytime,
            personality_headline: headline,
            personality_subtitle: subtitle,
            location_name: format!(
                "{}, {}",
                owm.name,
                owm.sys.country.as_deref().unwrap_or("")
            ),
            updated_at: now.to_rfc3339(),
        })
    }

    pub async fn fetch_forecast(
        &self,
        lat: f64,
        lon: f64,
    ) -> Result<ForecastResponse, ApiClientError> {
        let url = format!(
            "{}/data/2.5/forecast?lat={}&lon={}&units=metric&appid={}",
            self.base_url, lat, lon, self.api_key
        );

        let response = self.client.get(&url).send().await?;
        let body = response.text().await?;

        // Check for OWM error response first
        if let Ok(err) = serde_json::from_str::<serde_json::Value>(&body) {
            if let Some(cod) = err.get("cod") {
                let cod_str = cod.as_str().map(|s| s.to_string())
                    .unwrap_or_else(|| cod.to_string());
                if cod_str != "200" {
                    let message = err.get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Unknown error")
                        .to_string();
                    tracing::error!("OWM forecast API error: cod={}, message={}", cod_str, message);
                    return Err(ApiClientError::OwmError { cod: cod_str, message });
                }
            }
        }

        let owm: OwmForecastResponse = serde_json::from_str(&body).map_err(|e| {
            tracing::error!("Failed to deserialize OWM forecast response: {}", e);
            tracing::error!("Response body: {}", body);
            ApiClientError::OwmError {
                cod: "parse_error".to_string(),
                message: format!("Failed to parse forecast response: {}", e),
            }
        })?;

        // Build hourly forecast from 3-hour intervals (up to 48 hours = 16 entries)
        let hourly: Vec<HourlyForecast> = owm
            .list
            .iter()
            .take(16)
            .map(|entry| {
                let weather = &entry.weather[0];
                let dt = DateTime::from_timestamp(entry.dt, 0)
                    .unwrap_or_else(|| Utc::now());
                HourlyForecast {
                    time: dt.to_rfc3339(),
                    temperature: entry.main.temp,
                    condition: WeatherCondition::from_owm_main(&weather.main),
                    icon_code: weather.icon.clone(),
                    precipitation_probability: (entry.pop * 100.0) as u32,
                }
            })
            .collect();

        // Build daily forecast by grouping entries by date
        let mut daily_map: std::collections::BTreeMap<
            String,
            (f64, f64, String, String, String),
        > = std::collections::BTreeMap::new();

        for entry in &owm.list {
            let dt = DateTime::from_timestamp(entry.dt, 0)
                .unwrap_or_else(|| Utc::now());
            let date_key = dt.format("%Y-%m-%d").to_string();
            let weather = &entry.weather[0];

            let record = daily_map
                .entry(date_key)
                .or_insert((
                    entry.main.temp_max,
                    entry.main.temp_min,
                    weather.main.clone(),
                    weather.description.clone(),
                    weather.icon.clone(),
                ));

            if entry.main.temp_max > record.0 {
                record.0 = entry.main.temp_max;
            }
            if entry.main.temp_min < record.1 {
                record.1 = entry.main.temp_min;
            }
        }

        let daily: Vec<DailyForecast> = daily_map
            .into_iter()
            .take(10)
            .map(|(date, (high, low, main, desc, icon))| {
                let condition = WeatherCondition::from_owm_main(&main);
                // Capitalize first letter of description
                let label = if let Some(first) = desc.chars().next() {
                    format!("{}{}", first.to_uppercase(), &desc[first.len_utf8()..])
                } else {
                    desc
                };
                DailyForecast {
                    date,
                    temp_high: high,
                    temp_low: low,
                    condition,
                    condition_label: label,
                    icon_code: icon,
                }
            })
            .collect();

        Ok(ForecastResponse { hourly, daily })
    }

    pub async fn geocode(&self, query: &str) -> Result<Vec<GeoLocation>, ApiClientError> {
        let url = format!(
            "{}/geo/1.0/direct?q={}&limit=5&appid={}",
            self.base_url, query, self.api_key
        );

        let response = self.client.get(&url).send().await?;
        let body = response.text().await?;

        let results: Vec<OwmGeoResult> = serde_json::from_str(&body).map_err(|e| {
            tracing::error!("Failed to deserialize geocode response: {}", e);
            tracing::error!("Response body: {}", body);
            ApiClientError::OwmError {
                cod: "parse_error".to_string(),
                message: format!("Failed to parse geocode response: {}", e),
            }
        })?;

        Ok(results
            .into_iter()
            .map(|r| GeoLocation {
                name: r.name,
                lat: r.lat,
                lon: r.lon,
                country: r.country.unwrap_or_default(),
                state: r.state,
            })
            .collect())
    }
}
