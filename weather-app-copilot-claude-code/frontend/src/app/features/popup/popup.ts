import { Component, HostListener, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WeatherStore } from '../../shared/services/weather-store.service';
import { WeatherIconComponent } from '../../shared/components/weather-icon/weather-icon';
import { TemperaturePipe } from '../../shared/pipes/temperature.pipe';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [WeatherIconComponent, TemperaturePipe, DatePipe],
  templateUrl: './popup.html',
  styleUrl: './popup.scss',
})
export class PopupComponent implements OnInit {
  readonly store = inject(WeatherStore);

  async ngOnInit() {
    await this.store.initialize();
  }

  async openMain() {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_main_window');
    }
  }

  @HostListener('window:blur')
  async onBlur() {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('hide_popup');
    }
  }
}
