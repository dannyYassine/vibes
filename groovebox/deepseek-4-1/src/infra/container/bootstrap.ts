import { Container } from './Container';
import { registerGrooveboxModule } from '@/features/groovebox/grooveboxModule';

export function bootstrap(): Container {
  const container = new Container();
  registerGrooveboxModule(container);
  return container;
}
