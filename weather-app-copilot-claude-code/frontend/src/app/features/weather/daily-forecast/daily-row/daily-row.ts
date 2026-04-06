import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TemperaturePipe } from '../../../../shared/pipes/temperature.pipe';
import { WeatherIconComponent } from '../../../../shared/components/weather-icon/weather-icon';

@Component({
  selector: 'app-daily-row',
  standalone: true,
  imports: [DatePipe, TemperaturePipe, WeatherIconComponent],
  templateUrl: './daily-row.html',
  styleUrls: ['./daily-row.scss'],
})
export class DailyRowComponent {
  date = input.required<string>();
  iconCode = input.required<string>();
  tempHigh = input.required<number>();
  tempLow = input.required<number>();
  conditionLabel = input.required<string>();
}
