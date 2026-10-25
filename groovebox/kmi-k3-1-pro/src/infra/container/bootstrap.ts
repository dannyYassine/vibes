import { registerGrooveboxModule } from "@/features/groovebox/grooveboxModule";
import { Container } from "./Container";

export function bootstrapContainer(): Container {
  const container = new Container();
  registerGrooveboxModule(container);
  return container;
}
