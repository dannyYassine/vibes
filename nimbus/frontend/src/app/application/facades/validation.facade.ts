import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ValidationProvider } from '../../domain/interfaces/validation-provider.interface';
import { ValidationResult } from '../../domain/models/validation.model';
import { VALIDATION_PROVIDER } from '../tokens';

@Injectable({ providedIn: 'root' })
export class ValidationFacade {
  private validationResultSubject = new BehaviorSubject<ValidationResult | null>(null);
  readonly validationResult$ = this.validationResultSubject.asObservable();

  private validatingSubject = new BehaviorSubject<boolean>(false);
  readonly validating$ = this.validatingSubject.asObservable();

  readonly warningCount$ = this.validationResult$.pipe(
    map(result => result?.warnings.length ?? 0),
  );

  constructor(
    @Inject(VALIDATION_PROVIDER) private provider: ValidationProvider,
  ) {}

  async validate(diagramId: string): Promise<void> {
    this.validatingSubject.next(true);
    try {
      const result = await this.provider.validate(diagramId);
      this.validationResultSubject.next(result);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      this.validatingSubject.next(false);
    }
  }

  clearValidation(): void {
    this.validationResultSubject.next(null);
  }
}
