import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AiProvider, GenerateEvent } from '../../domain/interfaces/ai-provider.interface';
import { Diagram } from '../../domain/models/diagram.model';
import { DiagramNode } from '../../domain/models/node.model';
import { DiagramEdge } from '../../domain/models/edge.model';
import { DiagramFacade } from './diagram.facade';
import { AI_PROVIDER } from '../tokens';
import { NodeMapper } from '../mappers/node.mapper';

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

  private streamingSubject = new BehaviorSubject<boolean>(false);
  readonly streaming$ = this.streamingSubject.asObservable();

  constructor(
    @Inject(AI_PROVIDER) private aiProvider: AiProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  private handleStreamEvent(event: GenerateEvent): void {
    const data = event.data as Record<string, unknown>;
    switch (event.eventType) {
      case 'node_added':
        this.diagramFacade.addNode(this.mapNode(data));
        break;
      case 'edge_added':
        this.diagramFacade.addEdge(this.mapEdge(data));
        break;
      case 'node_removed':
        this.diagramFacade.removeNode(data['id'] as string);
        break;
      case 'node_updated':
        this.diagramFacade.updateNode(data['id'] as string, this.mapNode(data));
        break;
      case 'edge_removed':
        this.diagramFacade.removeEdge(data['id'] as string);
        break;
      case 'complete':
        this.diagramFacade.loadDiagramFromData(data as unknown as Diagram);
        break;
      case 'error':
        throw new Error((data['message'] as string) || 'Stream error');
    }
  }

  private mapNode(data: Record<string, unknown>): DiagramNode {
    return NodeMapper.fromApi(data);
  }

  private mapEdge(data: Record<string, unknown>): DiagramEdge {
    return {
      id: data['id'] as string,
      sourceId: (data['sourceId'] ?? data['source_id']) as string,
      targetId: (data['targetId'] ?? data['target_id']) as string,
      edgeType: (data['edgeType'] ?? data['edge_type'] ?? 'Synchronous') as DiagramEdge['edgeType'],
      label: data['label'] as string | undefined,
      properties: (data['properties'] ?? {
        bidirectional: false,
      }) as DiagramEdge['properties'],
    };
  }

  private async processStream(stream: AsyncIterable<GenerateEvent>, actionLabel: string): Promise<void> {
    this.loadingSubject.next(true);
    this.streamingSubject.next(true);
    this.errorSubject.next(null);

    try {
      this.diagramFacade.beginBatch();
      for await (const event of stream) {
        this.handleStreamEvent(event);
      }
      this.diagramFacade.endBatch();

      const updated = this.messagesSubject.value;
      this.messagesSubject.next([
        ...updated,
        { role: 'assistant', content: actionLabel },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      this.errorSubject.next(message);
      this.diagramFacade.endBatch();

      const updated = this.messagesSubject.value;
      this.messagesSubject.next([
        ...updated,
        { role: 'assistant', content: `Error: ${message}` },
      ]);
    } finally {
      this.streamingSubject.next(false);
      this.loadingSubject.next(false);
    }
  }

  async generateDiagram(prompt: string): Promise<void> {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, { role: 'user', content: prompt }]);

    this.diagramFacade.ensureDiagram();
    await this.processStream(
      this.aiProvider.generate(prompt),
      'Diagram generated successfully.',
    );
  }

  async modifyDiagram(prompt: string): Promise<void> {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, { role: 'user', content: prompt }]);

    const diagramId = this.diagramFacade.getCurrentDiagramId();
    if (!diagramId) {
      this.messagesSubject.next([
        ...this.messagesSubject.value,
        { role: 'assistant', content: 'Error: No diagram loaded to modify.' },
      ]);
      return;
    }

    // Get currently selected node IDs
    let selectedNodeIds: string[] = [];
    this.diagramFacade.selectedNodeIds$.subscribe(ids => selectedNodeIds = ids).unsubscribe();

    await this.processStream(
      this.aiProvider.modify(diagramId, prompt, selectedNodeIds),
      'Diagram modified successfully.',
    );
  }

  async fixWarning(diagramId: string, warningId: string, rule: string, message: string): Promise<void> {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([
      ...messages,
      { role: 'user', content: `Fix: ${message}` },
    ]);

    await this.processStream(
      this.aiProvider.fix(diagramId, warningId, rule, message),
      'Warning fixed successfully.',
    );
  }
}
