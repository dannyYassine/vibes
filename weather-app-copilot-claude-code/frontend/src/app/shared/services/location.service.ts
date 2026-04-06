import { Injectable, signal } from '@angular/core';

export interface StoredLocation {
  lat: number;
  lon: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly STORAGE_KEY = 'weather_last_location';
  readonly permissionDenied = signal(false);

  getLastLocation(): StoredLocation | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  saveLocation(location: StoredLocation): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(location));
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.permissionDenied.set(true);
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          this.permissionDenied.set(true);
          reject(error);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  // Default fallback: New York
  getDefaultLocation(): StoredLocation {
    return { lat: 40.7128, lon: -74.006, name: 'New York, US' };
  }
}
