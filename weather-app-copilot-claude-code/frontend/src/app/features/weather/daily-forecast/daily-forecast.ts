import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../../shared/services/weather-store.service';
import { DailyRowComponent } from './daily-row/daily-row';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-daily-forecast',
  standalone: true,
  imports: [DailyRowComponent, ScrollRevealDirective],
  templateUrl: './daily-forecast.html',
  styleUrls: ['./daily-forecast.scss'],
})
export class DailyForecastComponent {
  protected readonly store = inject(WeatherStore);
  protected readonly dailyForecast = this.store.dailyForecast;
}
