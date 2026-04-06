import { Component } from '@angular/core';
import { WeatherViewComponent } from './features/weather/weather-view';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WeatherViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
