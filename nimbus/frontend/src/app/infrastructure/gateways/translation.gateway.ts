import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TranslationProvider, TerraformExportResponse } from '../../domain/interfaces/translation-provider.interface';
import { CloudProvider, Diagram } from '../../domain/models/diagram.model';
import { environment } from '../../../environments/environment';

@Injectable()
export class TranslationGateway implements TranslationProvider {
  private baseUrl = `${environment.apiBaseUrl}/api/diagrams`;

  constructor(private http: HttpClient) {}

  async translate(diagramId: string, provider: CloudProvider): Promise<Diagram> {
    return firstValueFrom(
      this.http.post<Diagram>(`${this.baseUrl}/${diagramId}/translate`, { provider })
    );
  }

  async clearTranslation(diagramId: string): Promise<Diagram> {
    return firstValueFrom(
      this.http.delete<Diagram>(`${this.baseUrl}/${diagramId}/translate`)
    );
  }

  async exportTerraform(_diagramId: string): Promise<TerraformExportResponse> {
    throw new Error('Not yet implemented');
  }
}
