import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { TranslationFacade } from '../../application/facades/translation.facade';
import { CloudProvider } from '../../domain/models/diagram.model';

@Component({
  selector: 'app-provider-selector',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <select
      class="provider-select"
      [value]="(translationFacade.activeProvider$ | async) ?? ''"
      (change)="onProviderChange($event)"
      [disabled]="!(diagramFacade.diagram$ | async) || (translationFacade.translating$ | async)"
    >
      <option value="">Generic</option>
      <option value="Aws">AWS</option>
      <option value="Gcp">GCP</option>
      <option value="Azure">Azure</option>
    </select>
  `,
  styles: [`
    .provider-select {
      padding: 6px 8px;
      border: 1px solid #cba6f7;
      border-radius: 4px;
      background: #313244;
      color: #cba6f7;
      cursor: pointer;
      font-size: 13px;
    }
    .provider-select:hover:not(:disabled) { background: rgba(203, 166, 247, 0.15); }
    .provider-select:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ProviderSelectorComponent {
  constructor(
    public diagramFacade: DiagramFacade,
    public translationFacade: TranslationFacade,
  ) {}

  onProviderChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const diagramId = this.diagramFacade.getCurrentDiagramId();
    if (!diagramId) return;

    if (value === '') {
      this.translationFacade.clearTranslation(diagramId);
    } else {
      this.translationFacade.translate(diagramId, value as CloudProvider);
    }
  }
}
