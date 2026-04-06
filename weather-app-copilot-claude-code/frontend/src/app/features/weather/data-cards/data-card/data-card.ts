import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-card',
  standalone: true,
  templateUrl: './data-card.html',
  styleUrls: ['./data-card.scss'],
})
export class DataCardComponent {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<string>();
}
