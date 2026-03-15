import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Diagram, DiagramListItem } from '../../domain/models/diagram.model';
import { DiagramRepository } from '../../domain/interfaces/diagram-repository.interface';
import { DiagramMapper } from '../../application/mappers/diagram.mapper';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiGateway implements DiagramRepository {
  private baseUrl = `${environment.apiBaseUrl}/api/diagrams`;

  constructor(private http: HttpClient) {}

  async list(): Promise<DiagramListItem[]> {
    return firstValueFrom(this.http.get<DiagramListItem[]>(this.baseUrl));
  }

  async get(id: string): Promise<Diagram> {
    const dto = await firstValueFrom(
      this.http.get<Record<string, unknown>>(`${this.baseUrl}/${id}`)
    );
    return DiagramMapper.fromApi(dto);
  }

  async create(name: string, description?: string): Promise<Diagram> {
    const dto = await firstValueFrom(
      this.http.post<Record<string, unknown>>(this.baseUrl, { name, description })
    );
    return DiagramMapper.fromApi(dto);
  }

  async update(id: string, changes: Partial<Diagram>): Promise<Diagram> {
    const dto = await firstValueFrom(
      this.http.patch<Record<string, unknown>>(`${this.baseUrl}/${id}`, changes)
    );
    return DiagramMapper.fromApi(dto);
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
