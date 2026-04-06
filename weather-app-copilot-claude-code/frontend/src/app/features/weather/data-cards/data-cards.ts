import { Component, computed, inject } from '@angular/core';
import { WeatherStore } from '../../../shared/services/weather-store.service';
import { DataCardComponent } from './data-card/data-card';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-data-cards',
  standalone: true,
  imports: [DataCardComponent, ScrollRevealDirective],
  templateUrl: './data-cards.html',
  styleUrls: ['./data-cards.scss'],
})
export class DataCardsComponent {
  protected readonly store = inject(WeatherStore);
  protected readonly currentWeather = this.store.currentWeather;

  protected readonly windSpeed = computed(() => {
    const weather = this.currentWeather();
    if (!weather) return '--';
    return `${Math.round(weather.wind_speed * 3.6)} km/h`;
  });

  protected readonly pressure = computed(() => {
    const weather = this.currentWeather();
    if (!weather) return '--';
    return `${weather.pressure} hPa`;
  });

  protected readonly humidity = computed(() => {
    const weather = this.currentWeather();
    if (!weather) return '--';
    return `${weather.humidity}%`;
  });

  protected readonly windIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`;

  protected readonly pressureIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>`;

  protected readonly humidityIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
}
