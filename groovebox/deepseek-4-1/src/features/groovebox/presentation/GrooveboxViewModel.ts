export type UnitId = 'drums' | 'bass' | 'pads' | 'lead';
export type DrumVoiceId = 'kick' | 'snare' | 'hat' | 'perc';
export type ChordName = 'min7' | 'min9' | 'min11' | 'maj7' | 'sus2';

export type UnitKind = 'drums' | 'melodic';

export interface PatchSummaryViewModel {
  id: string;
  name: string;
  tagline: string;
  bpm: number;
}

export interface ControlViewModel {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  origin: number;
  valueLabel: string;
}

export interface MelodicStepViewModel {
  on: boolean;
  velocity: number;
  note: number;
  noteLabel: string;
}

export interface DrumStepViewModel {
  on: boolean;
  velocity: number;
}

export interface DrumLaneViewModel {
  id: DrumVoiceId;
  label: string;
  steps: DrumStepViewModel[];
}

export interface UnitViewModel {
  id: UnitId;
  index: string;
  name: string;
  subtitle: string;
  kind: UnitKind;
  muted: boolean;
  steps: MelodicStepViewModel[];
  lanes: DrumLaneViewModel[];
  controls: ControlViewModel[];
  displayLine1: string;
  displayLine2: string;
  chord: ChordName | null;
}

export class GrooveboxViewModel {
  patchId = '';
  patchName = '';
  patchTagline = '';
  patchIndex = 0;
  patches: PatchSummaryViewModel[] = [];
  bpm = 120;
  swing = 0.12;
  masterVolume = 0.8;
  playing = false;
  currentStep = -1;
  message = '';
  units: UnitViewModel[] = [];

  get tempoLabel(): string {
    return `${Math.round(this.bpm)}`;
  }

  get swingLabel(): string {
    return `${Math.round(this.swing * 100)}%`;
  }

  get masterLabel(): string {
    return `${Math.round(this.masterVolume * 100)}%`;
  }

  get stepLabel(): string {
    if (this.currentStep < 0) return '--';
    return String(this.currentStep + 1).padStart(2, '0');
  }

  get transportLabel(): string {
    return this.playing ? 'PLAYING' : 'STANDBY';
  }

  get positionLabel(): string {
    if (this.currentStep < 0) return 'BAR 1 · STEP --';
    return `BAR 1 · STEP ${this.stepLabel}`;
  }
}
