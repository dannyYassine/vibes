import { InjectionToken } from '@angular/core';
import { DiagramRepository } from '../domain/interfaces/diagram-repository.interface';
import { AiProvider } from '../domain/interfaces/ai-provider.interface';
import { TranslationProvider } from '../domain/interfaces/translation-provider.interface';
import { ValidationProvider } from '../domain/interfaces/validation-provider.interface';

export const DIAGRAM_REPOSITORY = new InjectionToken<DiagramRepository>('DiagramRepository');
export const AI_PROVIDER = new InjectionToken<AiProvider>('AiProvider');
export const TRANSLATION_PROVIDER = new InjectionToken<TranslationProvider>('TranslationProvider');
export const VALIDATION_PROVIDER = new InjectionToken<ValidationProvider>('ValidationProvider');
