import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../../shared/services/weather-store.service';
import { HourlyItemComponent } from './hourly-item/hourly-item';

@Component({
  selector: 'app-hourly-forecast',
  standalone: true,
  imports: [HourlyItemComponent],
  templateUrl: './hourly-forecast.html',
  styleUrls: ['./hourly-forecast.scss'],
})
export class HourlyForecastComponent {
  protected readonly store = inject(WeatherStore);
  protected readonly hourlyForecast = this.store.hourlyForecast;
}
