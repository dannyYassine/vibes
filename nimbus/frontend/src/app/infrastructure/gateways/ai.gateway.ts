import { Injectable } from '@angular/core';
import { AiProvider, GenerateEvent } from '../../domain/interfaces/ai-provider.interface';
import { SseClient } from '../clients/sse.client';
import { environment } from '../../../environments/environment';

@Injectable()
export class AiGateway implements AiProvider {
  private baseUrl = `${environment.apiBaseUrl}/api/diagrams`;

  constructor(private sse: SseClient) {}

  async *generate(prompt: string): AsyncIterable<GenerateEvent> {
    yield* this.sse.post(`${this.baseUrl}/generate`, { prompt });
  }

  async *modify(diagramId: string, prompt: string, selectedNodeIds: string[]): AsyncIterable<GenerateEvent> {
    yield* this.sse.post(`${this.baseUrl}/${diagramId}/modify`, {
      prompt,
      selected_node_ids: selectedNodeIds,
    });
  }

  async *fix(diagramId: string, warningId: string, rule: string, message: string): AsyncIterable<GenerateEvent> {
    yield* this.sse.post(`${this.baseUrl}/${diagramId}/fix`, {
      warning_id: warningId,
      rule,
      message,
    });
  }
}
