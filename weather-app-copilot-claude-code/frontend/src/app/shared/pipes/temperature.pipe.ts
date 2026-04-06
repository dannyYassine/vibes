import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'temperature', standalone: true })
export class TemperaturePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '--';
    return `${Math.round(value)}°`;
  }
}
