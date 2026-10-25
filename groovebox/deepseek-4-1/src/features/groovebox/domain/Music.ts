import type { ChordName } from './Patch';

export const STEPS_PER_BAR = 16;

export const SCALES: Record<string, number[]> = {
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export const CHORDS: Record<ChordName, number[]> = {
  min7: [0, 3, 7, 10],
  min9: [0, 3, 7, 10, 14],
  min11: [0, 3, 7, 10, 14, 17],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7, 12],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function noteName(note: number): string {
  return NOTE_NAMES[((note % 12) + 12) % 12];
}

export function noteLabel(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return `${noteName(note)}${octave}`;
}

/** Every scale pitch across a generous playable range, ordered low to high. */
export function scalePitches(root: number, scale: number[]): number[] {
  const pitches: number[] = [];
  for (let octave = -1; octave <= 3; octave++) {
    for (const interval of scale) {
      pitches.push(root + interval + octave * 12);
    }
  }
  return pitches.filter((pitch) => pitch >= 12 && pitch <= 108).sort((a, b) => a - b);
}

/** Move a note up/down the scale, snapping in-scale notes to their neighbours. */
export function transposeInScale(note: number, direction: number, root: number, scale: number[]): number {
  const pitches = scalePitches(root, scale);
  if (pitches.length === 0) return note;

  let index = pitches.indexOf(note);
  if (index === -1) {
    // Snap to the closest scale pitch, biased in the direction of travel.
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    pitches.forEach((pitch, i) => {
      const distance = Math.abs(pitch - note);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    index = best;
    if (direction > 0 && pitches[index] < note) index += 1;
    if (direction < 0 && pitches[index] > note) index -= 1;
    return pitches[Math.min(pitches.length - 1, Math.max(0, index))];
  }

  const next = Math.min(pitches.length - 1, Math.max(0, index + direction));
  return pitches[next];
}

export function chordIntervals(chord: ChordName): number[] {
  return CHORDS[chord];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatHz(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} kHz`;
  return `${Math.round(value)} Hz`;
}

export function formatSeconds(value: number): string {
  if (value < 1) return `${Math.round(value * 1000)} ms`;
  return `${value.toFixed(2)} s`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatSemitones(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} st`;
}

export function formatBpm(value: number): string {
  return `${Math.round(value)}`;
}
