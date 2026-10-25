export type UnitId = 'drums' | 'bass' | 'pads' | 'lead';
export type DrumVoice = 'kick' | 'snare' | 'hat' | 'perc';
export type ChordName = 'min7' | 'min9' | 'min11' | 'maj7' | 'sus2';

export interface Step {
  on: boolean;
  /** 0..1, used for accents and LED intensity. */
  velocity: number;
}

export interface MelodicStep extends Step {
  /** MIDI note number. */
  note: number;
}

export type DrumPattern = Record<DrumVoice, Step[]>;

export interface DrumParams {
  tune: number;
  decay: number;
  tone: number;
  drive: number;
  volume: number;
  reverb: number;
}

export interface BassParams {
  cutoff: number;
  resonance: number;
  decay: number;
  drive: number;
  volume: number;
  reverb: number;
}

export interface PadsParams {
  cutoff: number;
  attack: number;
  release: number;
  space: number;
  volume: number;
}

export interface LeadParams {
  cutoff: number;
  resonance: number;
  decay: number;
  delay: number;
  volume: number;
  reverb: number;
}

export interface DrumsPatch {
  params: DrumParams;
  pattern: DrumPattern;
}

export interface BassPatch {
  params: BassParams;
  steps: MelodicStep[];
  scale: number[];
  root: number;
}

export interface PadsPatch {
  params: PadsParams;
  steps: MelodicStep[];
  scale: number[];
  root: number;
  chord: ChordName;
}

export interface LeadPatch {
  params: LeadParams;
  steps: MelodicStep[];
  scale: number[];
  root: number;
}

export interface Patch {
  id: string;
  name: string;
  tagline: string;
  bpm: number;
  swing: number;
  masterVolume: number;
  drums: DrumsPatch;
  bass: BassPatch;
  pads: PadsPatch;
  lead: LeadPatch;
}

export type ParamValues = DrumParams | BassParams | PadsParams | LeadParams;
