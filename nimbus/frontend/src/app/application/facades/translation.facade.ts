import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslationProvider } from '../../domain/interfaces/translation-provider.interface';
import { CloudProvider } from '../../domain/models/diagram.model';
import { TRANSLATION_PROVIDER } from '../tokens';
import { DiagramFacade } from './diagram.facade';

@Injectable({ providedIn: 'root' })
export class TranslationFacade {
  private activeProviderSubject = new BehaviorSubject<CloudProvider | null>(null);
  readonly activeProvider$ = this.activeProviderSubject.asObservable();

  private translatingSubject = new BehaviorSubject<boolean>(false);
  readonly translating$ = this.translatingSubject.asObservable();

  constructor(
    @Inject(TRANSLATION_PROVIDER) private provider: TranslationProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  async translate(diagramId: string, cloudProvider: CloudProvider): Promise<void> {
    this.translatingSubject.next(true);
    try {
      const diagram = await this.provider.translate(diagramId, cloudProvider);
      this.diagramFacade.loadDiagramFromData(diagram);
      this.activeProviderSubject.next(cloudProvider);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      this.translatingSubject.next(false);
    }
  }

  async clearTranslation(diagramId: string): Promise<void> {
    this.translatingSubject.next(true);
    try {
      const diagram = await this.provider.clearTranslation(diagramId);
      this.diagramFacade.loadDiagramFromData(diagram);
      this.activeProviderSubject.next(null);
    } catch (err) {
      console.error('Clear translation failed:', err);
    } finally {
      this.translatingSubject.next(false);
    }
  }
}
