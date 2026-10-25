import { createDefaultPatchApiModels } from "../../data/defaultPatches";
import { IGrooveboxGateway, type GrooveboxApiModel } from "../../data/GrooveboxGateway";

export class FakeGrooveboxGateway extends IGrooveboxGateway {
  private models: GrooveboxApiModel[] = createDefaultPatchApiModels();
  loadCount = 0;

  loadPatches(): GrooveboxApiModel[] {
    this.loadCount += 1;
    return structuredClone(this.models);
  }

  seed(models: GrooveboxApiModel[]): void {
    this.models = structuredClone(models);
  }
}
