import type { Container } from '@/infra/container/Container';
import { WebAudioGateway } from './data/WebAudioGateway';
import { LocalStoragePatchGateway } from './data/PatchGateway';
import { GrooveboxService } from './domain/GrooveboxService';
import { GrooveboxPresenter } from './presentation/GrooveboxPresenter';

export function registerGrooveboxModule(container: Container): void {
  container.register('patchGateway', () => new LocalStoragePatchGateway());
  container.register('audioGateway', () => new WebAudioGateway());

  container.register(
    'grooveboxService',
    (c) => new GrooveboxService(c.resolve('patchGateway'), c.resolve('audioGateway')),
  );

  container.register(
    'grooveboxPresenter',
    (c) => new GrooveboxPresenter(c.resolve('grooveboxService')),
    false,
  );
}
