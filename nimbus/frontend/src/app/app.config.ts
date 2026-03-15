import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { DIAGRAM_REPOSITORY } from './application/tokens';
import { ApiGateway } from './infrastructure/gateways/api.gateway';
import { errorInterceptor } from './infrastructure/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
    { provide: DIAGRAM_REPOSITORY, useClass: ApiGateway },
  ],
};
