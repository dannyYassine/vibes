import { Injectable, signal, computed } from '@angular/core';
import {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
} from '../models/weather.model';
import {
  GradientConfig,
  getGradientForCondition,
  gradientToCss,
} from '../models/theme.model';
import { WeatherService } from './weather.service';
import { LocationService, StoredLocation } from './location.service';
import { TrayService } from './tray.service';

@Injectable({ providedIn: 'root' })
export class WeatherStore {
  // State signals
  readonly currentWeather = signal<CurrentWeather | null>(null);
  readonly hourlyForecast = signal<HourlyForecast[]>([]);
  readonly dailyForecast = signal<DailyForecast[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Computed
  readonly weatherCondition = computed(
    () => this.currentWeather()?.condition ?? 'clear'
  );
  readonly isDaytime = computed(
    () => this.currentWeather()?.is_daytime ?? true
  );
  readonly gradientConfig = computed<GradientConfig>(() =>
    getGradientForCondition(this.weatherCondition(), this.isDaytime())
  );
  readonly gradientCss = computed(() => gradientToCss(this.gradientConfig()));
  readonly textColor = computed(() => this.gradientConfig().textColor);
  readonly headlineText = computed(
    () => this.currentWeather()?.personality_headline ?? ''
  );
  readonly subtitleText = computed(
    () => this.currentWeather()?.personality_subtitle ?? ''
  );

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private weatherService: WeatherService,
    private locationService: LocationService,
    private trayService: TrayService,
  ) {}

  async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    let location: StoredLocation;

    // Try IP-based geolocation via backend
    try {
      const geo = await new Promise<{ lat: number; lon: number; city: string; country: string }>(
        (resolve, reject) =>
          this.weatherService.geolocate().subscribe({ next: resolve, error: reject })
      );
      location = {
        lat: geo.lat,
        lon: geo.lon,
        name: `${geo.city}, ${geo.country}`,
      };
    } catch {
      // Fallback to stored location, then default
      const stored = this.locationService.getLastLocation();
      location = stored ?? this.locationService.getDefaultLocation();
    }

    await this.fetchWeather(location.lat, location.lon);
    this.startAutoRefresh(location.lat, location.lon);
  }

  async fetchWeather(lat: number, lon: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [weather, forecast] = await Promise.all([
        new Promise<CurrentWeather>((resolve, reject) =>
          this.weatherService
            .getCurrentWeather(lat, lon)
            .subscribe({ next: resolve, error: reject })
        ),
        new Promise<{ hourly: HourlyForecast[]; daily: DailyForecast[] }>(
          (resolve, reject) =>
            this.weatherService
              .getForecast(lat, lon)
              .subscribe({ next: resolve, error: reject })
        ),
      ]);

      this.currentWeather.set(weather);
      this.hourlyForecast.set(forecast.hourly);
      this.dailyForecast.set(forecast.daily);
      console.log('[WeatherStore] calling updateTray', weather.temperature, weather.condition);
      this.trayService.updateTray(weather.temperature, weather.condition);

      // Save location
      this.locationService.saveLocation({
        lat,
        lon,
        name: weather.location_name,
      });
    } catch (e) {
      this.error.set('Failed to fetch weather data');
    } finally {
      this.loading.set(false);
    }
  }

  private startAutoRefresh(lat: number, lon: number): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    // Refresh every 10 minutes
    this.refreshTimer = setInterval(
      () => this.fetchWeather(lat, lon),
      10 * 60 * 1000
    );
  }
}
