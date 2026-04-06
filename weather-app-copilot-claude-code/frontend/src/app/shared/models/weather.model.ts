export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fog'
  | 'haze'
  | 'dust'
  | 'tornado';

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  condition: WeatherCondition;
  condition_description: string;
  icon_code: string;
  is_daytime: boolean;
  personality_headline: string;
  personality_subtitle: string;
  location_name: string;
  updated_at: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: WeatherCondition;
  icon_code: string;
  precipitation_probability: number;
}

export interface DailyForecast {
  date: string;
  temp_high: number;
  temp_low: number;
  condition: WeatherCondition;
  condition_label: string;
  icon_code: string;
}

export interface ForecastData {
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}
