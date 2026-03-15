import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AiProvider, GenerateEvent } from '../../domain/interfaces/ai-provider.interface';
import { Diagram } from '../../domain/models/diagram.model';
import { environment } from '../../../environments/environment';

@Injectable()
export class AiGateway implements AiProvider {
  private baseUrl = `${environment.apiBaseUrl}/api/diagrams`;

  constructor(private http: HttpClient) {}

  async *generate(prompt: string): AsyncIterable<GenerateEvent> {
    const diagram = await firstValueFrom(
      this.http.post<Diagram>(`${this.baseUrl}/generate`, { prompt })
    );
    yield { eventType: 'Complete', data: diagram };
  }

  async *modify(diagramId: string, prompt: string, selectedNodeIds: string[]): AsyncIterable<GenerateEvent> {
    throw new Error('Not implemented');
  }
}
