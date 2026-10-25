import type { Container } from "@/infra/container/Container";
import { DefaultGrooveboxGateway, IGrooveboxGateway } from "./data/GrooveboxGateway";
import { IGrooveboxAudioGateway, WebAudioGrooveboxAudioGateway } from "./data/GrooveboxAudioGateway";
import { GrooveboxService } from "./domain/GrooveboxService";
import { GrooveboxPresenter } from "./presentation/GrooveboxPresenter";
import { GrooveboxStore } from "./state/GrooveboxStore";

export function registerGrooveboxModule(container: Container): void {
  container.register(IGrooveboxGateway, () => new DefaultGrooveboxGateway());
  container.register(IGrooveboxAudioGateway, () => new WebAudioGrooveboxAudioGateway());
  container.register(GrooveboxStore, () => new GrooveboxStore());
  container.register(
    GrooveboxService,
    (context) => new GrooveboxService(
      context.resolve(IGrooveboxGateway),
      context.resolve(IGrooveboxAudioGateway),
      context.resolve(GrooveboxStore),
    ),
  );
  container.register(
    GrooveboxPresenter,
    (context) => new GrooveboxPresenter(context.resolve(GrooveboxService)),
    "transient",
  );
}
