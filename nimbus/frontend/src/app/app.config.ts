import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { DIAGRAM_REPOSITORY, AI_PROVIDER, TRANSLATION_PROVIDER, VALIDATION_PROVIDER } from './application/tokens';
import { ApiGateway } from './infrastructure/gateways/api.gateway';
import { AiGateway } from './infrastructure/gateways/ai.gateway';
import { TranslationGateway } from './infrastructure/gateways/translation.gateway';
import { ValidationGateway } from './infrastructure/gateways/validation.gateway';
import { errorInterceptor } from './infrastructure/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
    { provide: DIAGRAM_REPOSITORY, useClass: ApiGateway },
    { provide: AI_PROVIDER, useClass: AiGateway },
    { provide: TRANSLATION_PROVIDER, useClass: TranslationGateway },
    { provide: VALIDATION_PROVIDER, useClass: ValidationGateway },
  ],
};
