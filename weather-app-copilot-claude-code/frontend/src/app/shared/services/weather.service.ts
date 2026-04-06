import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CurrentWeather, ForecastData, GeoLocation } from '../models/weather.model';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = 'http://127.0.0.1:3001/api';

  constructor(private http: HttpClient) {}

  getCurrentWeather(lat: number, lon: number): Observable<CurrentWeather> {
    return this.http.get<CurrentWeather>(
      `${this.baseUrl}/weather`,
      { params: { lat: lat.toString(), lon: lon.toString() } }
    );
  }

  getForecast(lat: number, lon: number): Observable<ForecastData> {
    return this.http.get<ForecastData>(
      `${this.baseUrl}/forecast`,
      { params: { lat: lat.toString(), lon: lon.toString() } }
    );
  }

  geocode(query: string): Observable<GeoLocation[]> {
    return this.http.get<GeoLocation[]>(
      `${this.baseUrl}/geocode`,
      { params: { q: query } }
    );
  }
}
