# Project Plan: Weather Backend (Rust & Clean Architecture)

## 🎯 Goal
Develop a robust and maintainable backend service in Rust capable of fetching current weather data for a given location using the OpenWeatherMap API. The architecture must follow Clean Architecture principles to ensure separation of concerns, testability, and independence from external frameworks/details.

## 🏗️ Architectural Overview (Clean Architecture)
The system will be divided into four main layers:

1.  **Domain Layer:** Contains core business rules and entities (e.g., `Weather`, `Location`). This layer knows nothing about Rust web frameworks or HTTP calls.
2.  **Application Layer:** Orchestrates the use cases (e.g., `GetWeatherUseCase`). It uses interfaces defined in the Domain layer to interact with external services.
3.  **Infrastructure Layer:** Implements the external dependencies, such as API clients (`OpenWeatherMapClient`) and database connections (if needed). This is where HTTP calls happen.
4.  **Presentation/API Layer:** Handles incoming requests (e.g., using Actix-web or Axum) and translates them into use cases.

## ⚙️ Step-by-Step Implementation Plan

### Phase 1: Setup & Domain Modeling
*   **Action:** Define core data structures in the `domain` module.
*   **Details:** Create a `Weather` struct (containing temperature, description, etc.) and a `Location` struct.
*   **Output:** A clear definition of what "weather" means to our application, independent of JSON structure.

### Phase 2: Infrastructure - API Client Implementation
*   **Action:** Implement the external dependency interface in the `infrastructure` module.
*   **Details:** Define a trait (e.g., `WeatherApi`) in the Domain/Application layer that specifies a method like `fetch_weather(location: &str) -> Result<Weather, ApiError>`. Then, implement this trait using an HTTP client (like `reqwest`) to call OpenWeatherMap API (`https://api.openweathermap.org/data/2.5/weather?q={location}&appid={API_KEY}`).
*   **Key Focus:** Handling API keys and rate limiting errors gracefully.

### Phase 3: Application Logic - Use Case Definition
*   **Action:** Create the core business logic in the `application` module.
*   **Details:** Implement a use case struct/function (e.g., `GetWeatherUseCase`). This function takes the API client trait object and coordinates the call, performing any necessary data validation or transformation before returning the clean Domain model.

### Phase 4: Presentation Layer - Web Endpoint Setup
*   **Action:** Set up the web server framework (e.g., Actix-web).
*   **Details:** Create a handler function that accepts a location query parameter. This handler calls the `GetWeatherUseCase` from the Application layer, handles potential errors, and serializes the resulting Domain model into an HTTP response (JSON).

## ✅ Testing Strategy
1.  **Unit Tests (Domain/Application):** Test business logic in isolation without making network calls. Mock the API client trait.
2.  **Integration Tests (Infrastructure):** Test the actual `reqwest` implementation against a sandbox or mock OpenWeatherMap endpoint to ensure correct HTTP handling and JSON parsing.
3.  **End-to-End Tests:** Test the full request flow from the web handler through the use case to verify the entire stack works correctly.

## 🚀 Next Steps
1. Initialize Rust project structure (`cargo new`).
2. Implement Domain models first.
3. Build the API client trait and its concrete implementation.
4. Write the main application logic/use case.
5. Wire up the web server endpoint.