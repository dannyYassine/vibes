import { createDefaultPatchApiModels } from "./defaultPatches";

export type StepApiModel = {
  active: boolean;
  note: number;
  velocity: number;
  length: number;
};

export type ControlApiModel = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
};

export type UnitApiModel = {
  unit_id: string;
  name: string;
  voice: string;
  muted: boolean;
  root_note: number;
  controls: ControlApiModel[];
  patterns: StepApiModel[][];
};

export type GrooveboxApiModel = {
  patch_id: string;
  name: string;
  subtitle: string;
  tempo: number;
  swing: number;
  master_volume: number;
  units: UnitApiModel[];
};

export abstract class IGrooveboxGateway {
  abstract loadPatches(): GrooveboxApiModel[];
}

export class DefaultGrooveboxGateway extends IGrooveboxGateway {
  loadPatches(): GrooveboxApiModel[] {
    return structuredClone(createDefaultPatchApiModels());
  }
}
