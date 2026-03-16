import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ValidationProvider } from '../../domain/interfaces/validation-provider.interface';
import { ValidationResult } from '../../domain/models/validation.model';
import { environment } from '../../../environments/environment';

@Injectable()
export class ValidationGateway implements ValidationProvider {
  private baseUrl = `${environment.apiBaseUrl}/api/diagrams`;

  constructor(private http: HttpClient) {}

  async validate(diagramId: string): Promise<ValidationResult> {
    return firstValueFrom(
      this.http.post<ValidationResult>(`${this.baseUrl}/${diagramId}/validate`, {})
    );
  }
}
