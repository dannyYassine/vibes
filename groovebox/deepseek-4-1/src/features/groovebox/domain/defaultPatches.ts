import type { MelodicStep, Patch, Step } from './Patch';
import { SCALES } from './Music';

/**
 * Compact drum-row notation.
 * x = hit (0.8 velocity), X = accent (1.0), o = ghost (0.5), . = rest.
 */
function drumRow(pattern: string): Step[] {
  const chars = pattern.replace(/\s/g, '');
  if (chars.length !== 16) {
    throw new Error(`Drum row must be 16 steps, received ${chars.length}: "${pattern}"`);
  }
  return chars.split('').map((char) => {
    if (char === 'X') return { on: true, velocity: 1 };
    if (char === 'x') return { on: true, velocity: 0.8 };
    if (char === 'o') return { on: true, velocity: 0.45 };
    return { on: false, velocity: 0 };
  });
}

/** 16 entries of either a MIDI note or null (rest). */
function melody(
  notes: Array<number | null>,
  accents: number[] = [],
  ghosts: number[] = [],
  fallback = 60,
): MelodicStep[] {
  if (notes.length !== 16) {
    throw new Error(`Melody must be 16 steps, received ${notes.length}`);
  }
  return notes.map((note, index) => ({
    on: note !== null,
    note: note ?? fallback,
    velocity: accents.includes(index) ? 1 : ghosts.includes(index) ? 0.55 : 0.8,
  }));
}

const A_MINOR = SCALES.naturalMinor;
const D_MINOR = SCALES.naturalMinor;
const E_PHRYGIAN = SCALES.phrygian;

export const DEFAULT_PATCHES: Patch[] = [
  {
    id: 'neon-district',
    name: 'NEON DISTRICT',
    tagline: '4AM HOUSE · RAIN ON GLASS',
    bpm: 124,
    swing: 0.12,
    masterVolume: 0.78,
    drums: {
      params: { tune: 0, decay: 0.5, tone: 0.62, drive: 0.24, volume: 0.9, reverb: 0.1 },
      pattern: {
        kick: drumRow('X...X...X...X...'),
        snare: drumRow('....X.......X...'),
        hat: drumRow('..x...x...x...x.'),
        perc: drumRow('......o.......x.'),
      },
    },
    bass: {
      params: { cutoff: 620, resonance: 0.38, decay: 0.34, drive: 0.22, volume: 0.82, reverb: 0.03 },
      steps: melody(
        [null, null, 33, null, null, null, 33, null, null, null, 36, null, null, null, 31, 35],
        [2, 14],
        [],
        33,
      ),
      scale: A_MINOR,
      root: 33,
    },
    pads: {
      params: { cutoff: 2500, attack: 0.55, release: 2.4, space: 0.5, volume: 0.66 },
      steps: melody(
        [57, null, null, null, null, null, null, null, 53, null, null, null, 55, null, null, null],
        [0],
        [],
        57,
      ),
      scale: A_MINOR,
      root: 57,
      chord: 'min9',
    },
    lead: {
      params: { cutoff: 3600, resonance: 0.32, decay: 0.3, delay: 0.36, volume: 0.5, reverb: 0.28 },
      steps: melody(
        [null, null, null, 76, null, null, 74, null, null, 72, null, null, 71, null, 69, null],
        [3],
        [6, 12],
        57,
      ),
      scale: A_MINOR,
      root: 57,
    },
  },
  {
    id: 'glass-river',
    name: 'GLASS RIVER',
    tagline: 'SLOW CURRENT · DISTANT LIGHTS',
    bpm: 84,
    swing: 0.06,
    masterVolume: 0.74,
    drums: {
      params: { tune: -3, decay: 0.72, tone: 0.3, drive: 0.05, volume: 0.78, reverb: 0.4 },
      pattern: {
        kick: drumRow('x.........x.....'),
        snare: drumRow('........X.......'),
        hat: drumRow('..o...o...o...o.'),
        perc: drumRow('............o..x'),
      },
    },
    bass: {
      params: { cutoff: 320, resonance: 0.22, decay: 0.82, drive: 0.08, volume: 0.72, reverb: 0.08 },
      steps: melody(
        [38, null, null, null, null, null, 33, null, null, null, 34, null, null, null, 36, null],
        [0],
        [],
        38,
      ),
      scale: D_MINOR,
      root: 38,
    },
    pads: {
      params: { cutoff: 1500, attack: 2.1, release: 4.6, space: 0.82, volume: 0.62 },
      steps: melody(
        [50, null, null, null, null, 46, null, null, null, null, 53, null, null, null, null, null],
        [0],
        [],
        50,
      ),
      scale: D_MINOR,
      root: 50,
      chord: 'min11',
    },
    lead: {
      params: { cutoff: 2800, resonance: 0.2, decay: 0.62, delay: 0.62, volume: 0.44, reverb: 0.6 },
      steps: melody(
        [null, null, 62, null, null, null, null, 65, null, null, null, 69, null, null, 72, null],
        [2],
        [7],
        50,
      ),
      scale: D_MINOR,
      root: 50,
    },
  },
  {
    id: 'rust-factory',
    name: 'RUST FACTORY',
    tagline: 'BROKEN MACHINES · E PHRYGIAN',
    bpm: 138,
    swing: 0.04,
    masterVolume: 0.8,
    drums: {
      params: { tune: -5, decay: 0.3, tone: 0.86, drive: 0.72, volume: 0.86, reverb: 0.14 },
      pattern: {
        kick: drumRow('X..x..x.X..x..x.'),
        snare: drumRow('....X.......X..x'),
        hat: drumRow('X.x.X.x.X.x.X.x.'),
        perc: drumRow('.....x...x......'),
      },
    },
    bass: {
      params: { cutoff: 880, resonance: 0.76, decay: 0.19, drive: 0.58, volume: 0.8, reverb: 0.02 },
      steps: melody(
        [40, null, 40, 43, null, 40, 41, null, 40, null, 48, 40, null, 43, 47, null],
        [0, 10],
        [5, 13],
        40,
      ),
      scale: E_PHRYGIAN,
      root: 40,
    },
    pads: {
      params: { cutoff: 1150, attack: 0.08, release: 1.15, space: 0.32, volume: 0.54 },
      steps: melody(
        [52, null, null, null, null, null, 48, null, null, null, null, null, 53, null, null, null],
        [0],
        [],
        52,
      ),
      scale: E_PHRYGIAN,
      root: 52,
      chord: 'min7',
    },
    lead: {
      params: { cutoff: 4300, resonance: 0.56, decay: 0.15, delay: 0.24, volume: 0.44, reverb: 0.22 },
      steps: melody(
        [64, null, 65, 67, null, null, 71, null, 72, null, 71, 67, null, null, 64, null],
        [0, 8],
        [3, 10],
        52,
      ),
      scale: E_PHRYGIAN,
      root: 52,
    },
  },
];

export function clonePatch(patch: Patch): Patch {
  return structuredClone(patch);
}
