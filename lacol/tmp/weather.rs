// weather.rs
use std::fmt;

// =============================================================================
// 🟢 DOMAIN LAYER
// Defines core business entities and domain-specific errors.
// These structs should not know about how they are fetched (e.g., HTTP).
// =============================================================================

/// Represents a geographical location.
#[derive(Debug, Clone)]
pub struct Location {
    pub city: String,
    pub country: String,
}

/// Represents the core weather data structure.
#[derive(Debug, Clone)]
pub struct Weather {
    pub location: Location,
    pub temperature_celsius: f32,
    pub description: String,
    pub humidity_percent: u8,
}

/// Custom application error type for domain failures.
#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    ApiFailure(String),
    ParsingError(String),
    Unknown(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Domain Error: Location not found. {}", msg),
            AppError::ApiFailure(msg) => write!(f, "Infrastructure Error: API call failed. {}", msg),
            AppError::ParsingError(msg) => write!(f, "Application Error: Failed to parse response data. {}", msg),
            AppError::Unknown(msg) => write!(f, "An unknown error occurred: {}", msg),
        }
    }
}

// =============================================================================
// 🟡 INFRASTRUCTURE/APPLICATION BOUNDARY (TRAIT DEFINITION)
// Defines the contract for external services. This lives conceptually in the
// domain layer but dictates infrastructure interaction.
// =============================================================================

/// Trait defining the necessary weather fetching capability.
pub trait WeatherApi: Send + Sync {
    fn fetch_weather(&self, location: &str) -> Result<Weather, AppError>;
}


// =============================================================================
// 🔵 INFRASTRUCTURE LAYER (MOCK IMPLEMENTATION)
// Concrete implementation of the external service contract.
// This simulates network calls and JSON parsing logic.
// =============================================================================

/// A mock client simulating interaction with a third-party weather API.
pub struct MockWeatherClient;

impl WeatherApi for MockWeatherClient {
    fn fetch_weather(&self, location: &str) -> Result<Weather, AppError> {
        println!("\n[INFRASTRUCTURE] Calling external API for '{}'...", location);

        // Simulate network latency/API call logic
        match location.to_lowercase().as_str() {
            "london" => {
                // Successful mock response simulation (JSON parsing success)
                Ok(Weather {
                    location: Location { city: "London".into(), country: "UK".into() },
                    temperature_celsius: 15.5,
                    description: "Cloudy with occasional drizzle.".into(),
                    humidity_percent: 78,
                })
            }
            "tokyo" => {
                // Another successful mock response
                Ok(Weather {
                    location: Location { city: "Tokyo".into(), country: "Japan".into() },
                    temperature_celsius: 22.1,
                    description: "Sunny and pleasant.".into(),
                    humidity_percent: 65,
                })
            }
            "mars" => {
                // Simulate a specific API failure (e.g., invalid location)
                Err(AppError::NotFound("Mars is outside our supported geographical scope.".to_string()))
            }
            "" => {
                 // Simulate an internal parsing error if input is empty
                Err(AppError::ParsingError("Received empty request payload from API gateway.".to_string()))
            }
            _ => {
                // Default failure case for unknown locations
                Err(AppError::ApiFailure(format!("Could not retrieve weather data for '{}'. Check location spelling.", location)))
            }
        }
    }
}

// =============================================================================
// 🟢 APPLICATION LAYER (USE CASE)
// Orchestrates the flow, uses the trait object, and handles business logic.
// It knows nothing about MockWeatherClient; it only knows WeatherApi.
// =============================================================================

/// Use case responsible for retrieving weather data.
pub struct GetWeatherUseCase<T: WeatherApi> {
    api_client: T,
}

impl<T: WeatherApi> GetWeatherUseCase<T> {
    /// Constructor (Dependency Injection)
    pub fn new(api_client: T) -> Self {
        GetWeatherUseCase { api_client }
    }

    /// Executes the business logic flow.
    pub fn execute(&self, location: &str) -> Result<Weather, AppError> {
        println!("[APPLICATION] Starting weather retrieval use case...");
        // The Use Case delegates the external call to the injected dependency (the trait).
        let weather = self.api_client.fetch_weather(location)?;

        // Optional: Add domain-specific business logic here, e.g., checking if temp is too low.
        if weather.temperature_celsius < 0.0 {
            println!("[APPLICATION] Warning: Freezing temperatures detected!");
        }

        Ok(weather)
    }
}


// =============================================================================
// 🟣 PRESENTATION LAYER (MAIN FUNCTION / HANDLER SIMULATION)
// The entry point that sets up dependencies and calls the use case.
// =============================================================================

fn main() {
    println!("--- Weather Backend Simulation Start ---");

    // 1. Setup Dependencies (Dependency Injection Container simulation)
    let mock_client = MockWeatherClient;

    // 2. Instantiate Use Case, injecting the concrete dependency via the trait object.
    // We use a Box<dyn Trait> to allow polymorphism at runtime.
    let get_weather_use_case: GetWeatherUseCase<MockWeatherClient> = GetWeatherUseCase::new(mock_client);


    // --- Scenario 1: Successful Request (London) ---
    println!("\n=========================================");
    println!("Attempting to fetch weather for London...");
    match get_weather_use_case.execute("London") {
        Ok(weather) => {
            println!("\n✅ SUCCESS: Weather Report Received!");
            println!("   Location: {} ({})", weather.location.city, weather.location.country);
            println!("   Temperature: {:.1}°C", weather.temperature_celsius);
            println!("   Conditions: {} (Humidity: {}%)", weather.description, weather.humidity_percent);
        }
        Err(e) => {
            eprintln!("\n❌ FAILURE: Could not process request for London.");
            eprintln!("   Error Details: {}", e);
        }
    }

    // --- Scenario 2: Failure due to Domain Constraint (Mars) ---
    println!("\n=========================================");
    println!("Attempting to fetch weather for Mars...");
    match get_weather_use_case.execute("Mars") {
        Ok(weather) => {
            println!("\n✅ SUCCESS: Weather Report Received!");
            // This block should not run
        }
        Err(e) => {
            eprintln!("\n❌ FAILURE: Could not process request for Mars.");
            // The error is caught and displayed cleanly by the presentation layer.
            eprintln!("   Error Details: {}", e);
        }
    }

     // --- Scenario 3: Failure due to Infrastructure/API Error (Unknown City) ---
    println!("\n=========================================");
    println!("Attempting to fetch weather for Atlantis...");
    match get_weather_use_case.execute("Atlantis") {
        Ok(weather) => {
            // This block should not run
        }
        Err(e) => {
            eprintln!("\n❌ FAILURE: Could not process request for Atlantis.");
            eprintln!("   Error Details: {}", e);
        }
    }

    println!("\n--- Weather Backend Simulation End ---");
}