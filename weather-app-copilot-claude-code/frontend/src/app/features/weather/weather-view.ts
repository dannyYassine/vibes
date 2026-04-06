import { Component, inject, OnInit } from '@angular/core';
import { WeatherStore } from '../../shared/services/weather-store.service';
import { HeroSectionComponent } from './hero-section/hero-section';
import { DataCardsComponent } from './data-cards/data-cards';
import { HourlyForecastComponent } from './hourly-forecast/hourly-forecast';
import { DailyForecastComponent } from './daily-forecast/daily-forecast';
import { AdvisoryBarComponent } from './advisory-bar/advisory-bar';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay';

@Component({
  selector: 'app-weather-view',
  standalone: true,
  imports: [
    HeroSectionComponent,
    DataCardsComponent,
    HourlyForecastComponent,
    DailyForecastComponent,
    AdvisoryBarComponent,
    LoadingOverlayComponent,
  ],
  templateUrl: './weather-view.html',
  styleUrls: ['./weather-view.scss'],
})
export class WeatherViewComponent implements OnInit {
  protected readonly store = inject(WeatherStore);

  ngOnInit(): void {
    this.store.initialize();
  }
}
