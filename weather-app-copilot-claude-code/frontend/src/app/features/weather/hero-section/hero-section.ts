import { Component, computed, inject } from '@angular/core';
import { WeatherStore } from '../../../shared/services/weather-store.service';
import { TemperaturePipe } from '../../../shared/pipes/temperature.pipe';
import { WeatherIconComponent } from '../../../shared/components/weather-icon/weather-icon';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [TemperaturePipe, WeatherIconComponent],
  templateUrl: './hero-section.html',
  styleUrls: ['./hero-section.scss'],
})
export class HeroSectionComponent {
  protected readonly store = inject(WeatherStore);

  protected readonly currentWeather = this.store.currentWeather;
  protected readonly gradientCss = this.store.gradientCss;
  protected readonly textColor = this.store.textColor;
  protected readonly headlineText = this.store.headlineText;
  protected readonly subtitleText = this.store.subtitleText;

  protected readonly headlineLines = computed(() => {
    const text = this.headlineText();
    return text ? text.split('\n') : [];
  });

  protected readonly temperature = computed(
    () => this.currentWeather()?.temperature ?? null
  );

  protected readonly feelsLike = computed(
    () => this.currentWeather()?.feels_like ?? null
  );

  protected readonly iconCode = computed(
    () => this.currentWeather()?.icon_code ?? '01d'
  );

  protected readonly locationName = computed(
    () => this.currentWeather()?.location_name ?? ''
  );

  protected readonly weatherKeyword = computed(() => {
    const condition = this.currentWeather()?.condition ?? 'clear';
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  });

  isKeywordLine(line: string): boolean {
    const keyword = this.weatherKeyword();
    return line.toLowerCase().includes(keyword.toLowerCase());
  }
}
