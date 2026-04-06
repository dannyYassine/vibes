import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WeatherStore } from '../../../shared/services/weather-store.service';

@Component({
  selector: 'app-advisory-bar',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './advisory-bar.html',
  styleUrls: ['./advisory-bar.scss'],
})
export class AdvisoryBarComponent {
  protected readonly store = inject(WeatherStore);
  protected readonly currentWeather = this.store.currentWeather;
  protected readonly subtitleText = this.store.subtitleText;

  protected readonly updatedAt = computed(
    () => this.currentWeather()?.updated_at ?? null
  );
}
