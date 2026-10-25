/**
 * Layer 1 gateway. Audio is external I/O, so the synthesis engine lives below
 * the domain. The shapes here are the "wire format" the service hands over;
 * they deliberately do not import domain entities.
 */

export type AudioUnitId = 'drums' | 'bass' | 'pads' | 'lead';
export type AudioDrumVoice = 'kick' | 'snare' | 'hat' | 'perc';

export interface AudioNote {
  note: number;
  /** 0 = rest. */
  velocity: number;
}

export interface AudioPatch {
  bpm: number;
  swing: number;
  masterVolume: number;
  drums: {
    tune: number;
    decay: number;
    tone: number;
    drive: number;
    volume: number;
    reverb: number;
    pattern: Record<AudioDrumVoice, number[]>;
  };
  bass: {
    cutoff: number;
    resonance: number;
    decay: number;
    drive: number;
    volume: number;
    reverb: number;
    notes: AudioNote[];
  };
  pads: {
    cutoff: number;
    attack: number;
    release: number;
    space: number;
    volume: number;
    chordIntervals: number[];
    notes: AudioNote[];
  };
  lead: {
    cutoff: number;
    resonance: number;
    decay: number;
    delay: number;
    volume: number;
    reverb: number;
    notes: AudioNote[];
  };
}

export interface AudioGateway {
  /** Store a patch; starts applying immediately if audio is already running. */
  loadPatch(patch: AudioPatch): void;
  /** Resume the context (must be called from a user gesture) and start the transport. */
  start(): Promise<void>;
  stop(): void;
  setUnitMuted(unit: AudioUnitId, muted: boolean): void;
  audition(unit: AudioUnitId): Promise<void>;
  /** Current 0-based step, or -1 while stopped. */
  currentStep(): number;
  isRunning(): boolean;
}
