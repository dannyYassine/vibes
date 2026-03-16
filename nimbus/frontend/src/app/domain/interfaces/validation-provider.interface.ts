import { ValidationResult } from '../models/validation.model';

export interface ValidationProvider {
  validate(diagramId: string): Promise<ValidationResult>;
}
