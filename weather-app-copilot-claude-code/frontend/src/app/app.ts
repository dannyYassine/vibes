import { Component, OnInit, signal } from '@angular/core';
import { WeatherViewComponent } from './features/weather/weather-view';
import { PopupComponent } from './features/popup/popup';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WeatherViewComponent, PopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly windowType = signal<'loading' | 'main' | 'popup'>('loading');

  async ngOnInit() {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      this.windowType.set('main');
      return;
    }
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const label = getCurrentWebviewWindow().label;
    this.windowType.set(label === 'popup' ? 'popup' : 'main');
  }
}
