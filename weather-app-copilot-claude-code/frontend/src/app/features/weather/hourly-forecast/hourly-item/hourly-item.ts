import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TemperaturePipe } from '../../../../shared/pipes/temperature.pipe';
import { WeatherIconComponent } from '../../../../shared/components/weather-icon/weather-icon';

@Component({
  selector: 'app-hourly-item',
  standalone: true,
  imports: [DatePipe, TemperaturePipe, WeatherIconComponent],
  templateUrl: './hourly-item.html',
  styleUrls: ['./hourly-item.scss'],
})
export class HourlyItemComponent {
  time = input.required<string>();
  iconCode = input.required<string>();
  temperature = input.required<number>();
  isNow = input<boolean>(false);
}
