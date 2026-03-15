import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AiProvider } from '../../domain/interfaces/ai-provider.interface';
import { Diagram } from '../../domain/models/diagram.model';
import { DiagramFacade } from './diagram.facade';
import { AI_PROVIDER } from '../tokens';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiFacade {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  readonly error$ = this.errorSubject.asObservable();

  constructor(
    @Inject(AI_PROVIDER) private aiProvider: AiProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  async generateDiagram(prompt: string): Promise<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, { role: 'user', content: prompt }]);

    try {
      for await (const event of this.aiProvider.generate(prompt)) {
        if (event.eventType === 'Complete') {
          const diagram = event.data as Diagram;
          this.diagramFacade.loadDiagramFromData(diagram);

          const updated = this.messagesSubject.value;
          this.messagesSubject.next([
            ...updated,
            { role: 'assistant', content: `Created diagram: "${diagram.name}"` },
          ]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      this.errorSubject.next(message);

      const updated = this.messagesSubject.value;
      this.messagesSubject.next([
        ...updated,
        { role: 'assistant', content: `Error: ${message}` },
      ]);
    } finally {
      this.loadingSubject.next(false);
    }
  }
}
