import { Container } from "@/infra/container/Container";
import { IGrooveboxGateway } from "@/features/groovebox/data/GrooveboxGateway";
import { IGrooveboxAudioGateway } from "@/features/groovebox/data/GrooveboxAudioGateway";
import { GrooveboxService } from "@/features/groovebox/domain/GrooveboxService";
import { GrooveboxStore } from "@/features/groovebox/state/GrooveboxStore";
import { FakeGrooveboxGateway } from "@/features/groovebox/__tests__/fakes/FakeGrooveboxGateway";
import { FakeGrooveboxAudioGateway } from "@/features/groovebox/__tests__/fakes/FakeGrooveboxAudioGateway";

export function createTestContainer() {
  const container = new Container();
  const fakes = {
    patch: new FakeGrooveboxGateway(),
    audio: new FakeGrooveboxAudioGateway(),
  };
  container.register(IGrooveboxGateway, () => fakes.patch);
  container.register(IGrooveboxAudioGateway, () => fakes.audio);
  container.register(GrooveboxStore, () => new GrooveboxStore());
  container.register(
    GrooveboxService,
    (context) => new GrooveboxService(
      context.resolve(IGrooveboxGateway),
      context.resolve(IGrooveboxAudioGateway),
      context.resolve(GrooveboxStore),
    ),
  );
  return { container, fakes };
}

export type TestContainerSetup = ReturnType<typeof createTestContainer>;
