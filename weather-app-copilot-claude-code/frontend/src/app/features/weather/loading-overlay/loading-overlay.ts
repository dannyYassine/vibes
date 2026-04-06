import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.html',
  styleUrls: ['./loading-overlay.scss'],
})
export class LoadingOverlayComponent {
  loading = input.required<boolean>();
}
