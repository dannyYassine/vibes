import type { UnitId } from './Patch';

export interface ParamRange {
  id: string;
  label: string;
  min: number;
  max: number;
  /** Visual centre for the knob arc, defaults to (min + max) / 2. */
  origin?: number;
}

export interface UnitMeta {
  id: UnitId;
  index: string;
  name: string;
  subtitle: string;
}

export const UNIT_META: Record<UnitId, UnitMeta> = {
  drums: { id: 'drums', index: '01', name: 'DRUMS', subtitle: 'RHYTHM COMPOSER' },
  bass: { id: 'bass', index: '02', name: 'BASS', subtitle: 'SUB HARMONIC' },
  pads: { id: 'pads', index: '03', name: 'PADS', subtitle: 'CHORD ENGINE' },
  lead: { id: 'lead', index: '04', name: 'LEAD', subtitle: 'VOLTAGE SOLO' },
};

export const UNIT_CONTROLS: Record<UnitId, ParamRange[]> = {
  drums: [
    { id: 'tune', label: 'TUNE', min: -12, max: 12, origin: 0 },
    { id: 'decay', label: 'DECAY', min: 0.06, max: 1.2 },
    { id: 'tone', label: 'TONE', min: 0, max: 1 },
    { id: 'drive', label: 'DRIVE', min: 0, max: 1 },
  ],
  bass: [
    { id: 'cutoff', label: 'CUTOFF', min: 90, max: 5200 },
    { id: 'resonance', label: 'RESO', min: 0, max: 1 },
    { id: 'decay', label: 'DECAY', min: 0.05, max: 1.1 },
    { id: 'drive', label: 'DRIVE', min: 0, max: 1 },
  ],
  pads: [
    { id: 'cutoff', label: 'CUTOFF', min: 200, max: 7200 },
    { id: 'attack', label: 'ATTACK', min: 0.01, max: 3 },
    { id: 'release', label: 'RELEASE', min: 0.3, max: 6 },
    { id: 'space', label: 'SPACE', min: 0, max: 1 },
  ],
  lead: [
    { id: 'cutoff', label: 'CUTOFF', min: 300, max: 9000 },
    { id: 'resonance', label: 'RESO', min: 0, max: 1 },
    { id: 'decay', label: 'DECAY', min: 0.05, max: 1.4 },
    { id: 'delay', label: 'DELAY', min: 0, max: 1 },
  ],
};

export const TEMPO_RANGE: ParamRange = { id: 'tempo', label: 'TEMPO', min: 70, max: 170 };
export const SWING_RANGE: ParamRange = { id: 'swing', label: 'SWING', min: 0, max: 0.45 };
export const VOLUME_RANGE: ParamRange = { id: 'volume', label: 'MASTER', min: 0, max: 1 };
