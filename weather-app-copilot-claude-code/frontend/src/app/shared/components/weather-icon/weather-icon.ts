import { Component, input } from '@angular/core';

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  templateUrl: './weather-icon.html',
  styleUrls: ['./weather-icon.scss'],
  host: {
    '[style.--icon-size.px]': 'size()',
  },
})
export class WeatherIconComponent {
  iconCode = input.required<string>();
  size = input<number>(48);

  get normalizedCode(): string {
    const code = this.iconCode();
    switch (code) {
      case '01d':
        return 'clear-day';
      case '01n':
        return 'clear-night';
      case '02d':
      case '02n':
        return 'few-clouds';
      case '03d':
      case '03n':
        return 'scattered-clouds';
      case '04d':
      case '04n':
        return 'broken-clouds';
      case '09d':
      case '09n':
      case '10d':
      case '10n':
        return 'rain';
      case '11d':
      case '11n':
        return 'thunderstorm';
      case '13d':
      case '13n':
        return 'snow';
      case '50d':
      case '50n':
        return 'mist';
      default:
        return 'clear-day';
    }
  }
}
