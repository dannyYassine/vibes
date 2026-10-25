import { describe, expect, it } from 'vitest';
import { chordIntervals, noteLabel, scalePitches, transposeInScale } from '../domain/Music';
import { DEFAULT_PATCHES } from '../domain/defaultPatches';

describe('default patches', () => {
  it('ships three distinct, complete patches', () => {
    expect(DEFAULT_PATCHES).toHaveLength(3);
    expect(new Set(DEFAULT_PATCHES.map((patch) => patch.id)).size).toBe(3);
    expect(new Set(DEFAULT_PATCHES.map((patch) => patch.name)).size).toBe(3);
    expect(new Set(DEFAULT_PATCHES.map((patch) => patch.bpm)).size).toBe(3);

    for (const patch of DEFAULT_PATCHES) {
      expect(patch.bpm).toBeGreaterThanOrEqual(70);
      expect(patch.bpm).toBeLessThanOrEqual(170);
      expect(patch.masterVolume).toBeGreaterThan(0);
      expect(patch.masterVolume).toBeLessThanOrEqual(1);
      expect(patch.bass.steps).toHaveLength(16);
      expect(patch.pads.steps).toHaveLength(16);
      expect(patch.lead.steps).toHaveLength(16);
      for (const voice of ['kick', 'snare', 'hat', 'perc'] as const) {
        expect(patch.drums.pattern[voice]).toHaveLength(16);
      }
    }
  });

  it('has notes that belong to each unit scale', () => {
    for (const patch of DEFAULT_PATCHES) {
      for (const unit of [patch.bass, patch.pads, patch.lead]) {
        const pitches = scalePitches(unit.root, unit.scale);
        for (const step of unit.steps) {
          if (step.on) expect(pitches).toContain(step.note);
        }
      }
    }
  });

  it('uses a genuinely different groove in each patch', () => {
    const signatures = DEFAULT_PATCHES.map((patch) =>
      (['kick', 'snare', 'hat', 'perc'] as const)
        .map((voice) => patch.drums.pattern[voice].map((step) => (step.on ? 'x' : '.')).join(''))
        .join('|'),
    );
    expect(new Set(signatures).size).toBe(3);
  });
});

describe('music helpers', () => {
  it('labels MIDI notes', () => {
    expect(noteLabel(60)).toBe('C4');
    expect(noteLabel(69)).toBe('A4');
    expect(noteLabel(33)).toBe('A1');
  });

  it('moves through the scale in both directions', () => {
    const pitches = scalePitches(57, [0, 2, 3, 5, 7, 8, 10]);
    const index = pitches.indexOf(69);
    expect(index).toBeGreaterThan(-1);
    expect(transposeInScale(69, 1, 57, [0, 2, 3, 5, 7, 8, 10])).toBe(pitches[index + 1]);
    expect(transposeInScale(69, -1, 57, [0, 2, 3, 5, 7, 8, 10])).toBe(pitches[index - 1]);
  });

  it('exposes chord voicings', () => {
    expect(chordIntervals('min9')).toEqual([0, 3, 7, 10, 14]);
    expect(chordIntervals('sus2')).toEqual([0, 2, 7, 12]);
  });
});
