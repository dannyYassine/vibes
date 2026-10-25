import type { Groovebox } from "../domain/Groovebox";

export class GrooveboxStore {
  private session: Groovebox | null = null;

  set(session: Groovebox): void {
    this.session = session;
  }

  get(): Groovebox {
    if (!this.session) throw new Error("Groovebox patches have not been loaded");
    return this.session;
  }
}
