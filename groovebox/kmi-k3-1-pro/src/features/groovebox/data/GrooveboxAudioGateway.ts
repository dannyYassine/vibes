export type AudioStepModel = { active: boolean; note: number; velocity: number; length: number };
export type AudioUnitModel = {
  id: "drums" | "bass" | "pads" | "lead";
  muted: boolean;
  rootNote: number;
  controls: Record<string, number>;
  patterns: AudioStepModel[][];
};
export type AudioPatchModel = { tempo: number; swing: number; masterVolume: number; units: AudioUnitModel[] };

export abstract class IGrooveboxAudioGateway {
  abstract start(patch: AudioPatchModel, onStep: (step: number) => void): Promise<void>;
  abstract updatePatch(patch: AudioPatchModel): void;
  abstract stop(): void;
  abstract dispose(): void;
}

type UnitId = AudioUnitModel["id"];

type UnitGraph = {
  input: GainNode;
  drive: WaveShaperNode;
  level: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
};

type AudioGraph = {
  units: Record<UnitId, UnitGraph>;
  compressor: DynamicsCompressorNode;
  master: GainNode;
  reverb: ConvolverNode;
  reverbReturn: GainNode;
  delay: DelayNode;
  delayReturn: GainNode;
  noise: AudioBuffer;
};

type Voice = {
  unit: UnitId;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  output: GainNode;
  startedAt: number;
  remaining: number;
  stopping: boolean;
  released: boolean;
};

const STEP_COUNT = 16;
const SCHEDULER_INTERVAL_MS = 25;
const LOOK_AHEAD_SECONDS = 0.1;
const MIN_GAIN = 0.0001;
const UNIT_IDS: readonly UnitId[] = ["drums", "bass", "pads", "lead"];

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clonePatch(patch: AudioPatchModel): AudioPatchModel {
  return {
    ...patch,
    units: patch.units.map((unit) => ({
      ...unit,
      controls: { ...unit.controls },
      patterns: unit.patterns.map((lane) => lane.map((step) => ({ ...step }))),
    })),
  };
}

function control(unit: AudioUnitModel, key: string, fallback: number, minimum = 0, maximum = 1): number {
  const value = unit.controls[key];
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, minimum, maximum) : fallback;
}

function midiToFrequency(note: number, fallback = 60): number {
  const safeNote = Number.isFinite(note) ? note : fallback;
  return 440 * 2 ** ((clamp(safeNote, 0, 127) - 69) / 12);
}

function stepVelocity(step: AudioStepModel): number {
  return Number.isFinite(step.velocity) ? clamp(step.velocity) : 0.8;
}

function smoothParam(param: AudioParam, value: number, now: number, timeConstant = 0.015): void {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, timeConstant);
}

function percussionEnvelope(param: AudioParam, when: number, peak: number, decay: number, attack = 0.002): number {
  const end = when + Math.max(attack + 0.005, decay);
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(Math.max(MIN_GAIN, peak), when + attack);
  param.exponentialRampToValueAtTime(MIN_GAIN, end);
  param.linearRampToValueAtTime(0, end + 0.01);
  return end + 0.01;
}

function synthEnvelope(
  param: AudioParam,
  when: number,
  peak: number,
  attack: number,
  gate: number,
  decay: number,
  sustain: number,
  release: number,
): number {
  const attackEnd = when + attack;
  const decayEnd = Math.min(gate, attackEnd + decay);
  const sustainedPeak = Math.max(MIN_GAIN, peak * sustain);
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(Math.max(MIN_GAIN, peak), attackEnd);
  if (decayEnd > attackEnd) {
    param.exponentialRampToValueAtTime(sustainedPeak, decayEnd);
  } else {
    param.setValueAtTime(sustainedPeak, attackEnd);
  }
  param.setValueAtTime(sustainedPeak, gate);
  param.linearRampToValueAtTime(0, gate + release);
  return gate + release;
}

export class WebAudioGrooveboxAudioGateway extends IGrooveboxAudioGateway {
  private context: AudioContext | null = null;
  private graph: AudioGraph | null = null;
  private patch: AudioPatchModel | null = null;
  private onStep: ((step: number) => void) | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private readonly ledTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly voices = new Set<Voice>();
  private readonly driveCurves = new Map<number, Float32Array<ArrayBuffer>>();
  private generation = 0;
  private playing = false;
  private disposed = false;
  private nextStep = 0;
  private currentStep = 0;
  private nextStepTime = 0;

  async start(patch: AudioPatchModel, onStep: (step: number) => void): Promise<void> {
    if (this.disposed) throw new Error("Cannot start a disposed audio gateway.");

    this.stop();
    this.patch = clonePatch(patch);
    this.onStep = onStep;
    const generation = this.generation;
    const context = this.ensureContext();
    this.applyPatchToGraph();

    try {
      if (context.state !== "running") await context.resume();
    } catch (error) {
      if (generation !== this.generation || this.disposed) return;
      this.stop();
      throw error;
    }

    if (generation !== this.generation || this.disposed) return;
    if (context.state !== "running") {
      this.stop();
      throw new Error("AudioContext could not be resumed.");
    }

    this.beginTransport(generation);
  }

  updatePatch(patch: AudioPatchModel): void {
    this.patch = clonePatch(patch);
    this.applyPatchToGraph();
  }

  stop(): void {
    this.generation += 1;
    this.playing = false;

    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const timer of this.ledTimers) clearTimeout(timer);
    this.ledTimers.clear();

    this.stopAllVoices();
    this.nextStep = 0;
    this.currentStep = 0;
    this.nextStepTime = 0;
    this.onStep = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;

    const context = this.context;
    this.context = null;
    this.graph = null;
    this.patch = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }

  private ensureContext(): AudioContext {
    if (this.context && this.context.state !== "closed") return this.context;

    if (typeof AudioContext === "undefined") {
      throw new Error("Web Audio API is not available in this environment.");
    }

    const context = new AudioContext({ latencyHint: "interactive" });
    this.context = context;
    try {
      this.graph = this.createGraph(context);
    } catch (error) {
      this.context = null;
      this.graph = null;
      void context.close().catch(() => undefined);
      throw error;
    }
    return context;
  }

  private createGraph(context: AudioContext): AudioGraph {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;

    const master = context.createGain();
    master.gain.value = 0;
    compressor.connect(master);
    master.connect(context.destination);

    const reverb = context.createConvolver();
    reverb.normalize = true;
    reverb.buffer = this.createImpulseResponse(context);
    const reverbReturn = context.createGain();
    reverbReturn.gain.value = 0.5;
    reverb.connect(reverbReturn);
    reverbReturn.connect(compressor);

    const delay = context.createDelay(2);
    delay.delayTime.value = 0.375;
    const delayReturn = context.createGain();
    delayReturn.gain.value = 0.4;
    delay.connect(delayReturn);
    delayReturn.connect(compressor);

    const feedbackFilter = context.createBiquadFilter();
    feedbackFilter.type = "lowpass";
    feedbackFilter.frequency.value = 4800;
    const feedback = context.createGain();
    feedback.gain.value = 0.32;
    delay.connect(feedbackFilter);
    feedbackFilter.connect(feedback);
    feedback.connect(delay);

    const createUnit = (id: UnitId): UnitGraph => {
      const input = context.createGain();
      const drive = context.createWaveShaper();
      const level = context.createGain();
      const reverbSend = context.createGain();
      const delaySend = context.createGain();
      drive.curve = this.driveCurve(0);
      drive.oversample = id === "drums" || id === "bass" ? "2x" : "none";
      level.gain.value = 0;
      reverbSend.gain.value = 0;
      delaySend.gain.value = 0;
      input.connect(drive);
      drive.connect(level);
      level.connect(compressor);
      level.connect(reverbSend);
      level.connect(delaySend);
      reverbSend.connect(reverb);
      delaySend.connect(delay);
      return { input, drive, level, reverbSend, delaySend };
    };

    return {
      units: {
        drums: createUnit("drums"),
        bass: createUnit("bass"),
        pads: createUnit("pads"),
        lead: createUnit("lead"),
      },
      compressor,
      master,
      reverb,
      reverbReturn,
      delay,
      delayReturn,
      noise: this.createNoiseBuffer(context),
    };
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  private createImpulseResponse(context: AudioContext): AudioBuffer {
    const length = Math.ceil(context.sampleRate * 1.8);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      let smoothed = 0;
      for (let index = 0; index < length; index += 1) {
        const white = Math.random() * 2 - 1;
        smoothed = smoothed * 0.92 + white * 0.08;
        const decay = (1 - index / length) ** 2.8;
        data[index] = (white - smoothed) * decay * 0.55;
      }
    }
    return impulse;
  }

  private driveCurve(amount: number): Float32Array<ArrayBuffer> {
    const key = Math.round(clamp(amount) * 100);
    const cached = this.driveCurves.get(key);
    if (cached) return cached;

    const drive = key / 100;
    const curve = new Float32Array(2048);
    const strength = drive * 30;
    for (let index = 0; index < curve.length; index += 1) {
      const input = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = ((1 + strength) * input) / (1 + strength * Math.abs(input));
    }
    this.driveCurves.set(key, curve);
    return curve;
  }

  private beginTransport(generation: number): void {
    const context = this.context;
    if (!context) return;

    this.applyPatchToGraph();
    this.nextStep = 0;
    this.currentStep = 0;
    this.nextStepTime = context.currentTime + 0.05;
    this.playing = true;
    this.runScheduler(generation);
    this.schedulerTimer = setInterval(() => this.runScheduler(generation), SCHEDULER_INTERVAL_MS);
  }

  private runScheduler(generation: number): void {
    const context = this.context;
    if (!context || !this.playing || generation !== this.generation) return;

    const now = context.currentTime;
    let duration = this.stepDuration();
    if (this.nextStepTime < now - 0.25) {
      const skipped = Math.floor((now - this.nextStepTime) / duration);
      this.nextStep = (this.nextStep + skipped) % STEP_COUNT;
      this.nextStepTime += skipped * duration;
    }

    const horizon = now + LOOK_AHEAD_SECONDS;
    while (this.nextStepTime < horizon) {
      duration = this.stepDuration();
      const step = this.nextStep;
      const swing = step % 2 === 1 ? duration * this.swing() * 0.5 : 0;
      const when = this.nextStepTime + swing;
      this.scheduleStep(step, when, duration);
      this.scheduleStepCallback(step, when, generation);
      this.nextStep = (step + 1) % STEP_COUNT;
      this.nextStepTime += this.stepDuration();
    }
  }

  private scheduleStepCallback(step: number, when: number, generation: number): void {
    const context = this.context;
    if (!context) return;

    const delay = Math.max(0, (when - context.currentTime) * 1000);
    const timer = setTimeout(() => {
      this.ledTimers.delete(timer);
      if (!this.playing || generation !== this.generation) return;
      this.currentStep = step;
      this.onStep?.(step);
    }, delay);
    this.ledTimers.add(timer);
  }

  private scheduleStep(stepIndex: number, when: number, duration: number): void {
    const patch = this.patch;
    if (!patch) return;

    for (const unit of patch.units) {
      if (unit.muted || control(unit, "level", this.defaultLevel(unit.id)) <= 0) continue;

      for (let laneIndex = 0; laneIndex < unit.patterns.length; laneIndex += 1) {
        if (unit.id === "drums" && laneIndex >= 4) break;
        const lane = unit.patterns[laneIndex];
        if (!lane || lane.length === 0) continue;
        const step = lane[stepIndex % lane.length];
        if (!step?.active || stepVelocity(step) <= 0) continue;

        if (unit.id === "drums") {
          this.scheduleDrum(laneIndex, unit, step, when);
        } else if (unit.id === "bass") {
          this.scheduleBass(unit, step, when, duration);
        } else if (unit.id === "pads") {
          this.schedulePad(unit, step, when, duration);
        } else {
          this.scheduleLead(unit, step, when, duration);
        }
      }
    }
  }

  private scheduleDrum(lane: number, unit: AudioUnitModel, step: AudioStepModel, when: number): void {
    if (lane === 0) this.scheduleKick(unit, step, when);
    else if (lane === 1) this.scheduleSnare(unit, step, when);
    else if (lane === 2) this.scheduleHat(unit, step, when);
    else this.scheduleClap(unit, step, when);
  }

  private scheduleKick(unit: AudioUnitModel, step: AudioStepModel, when: number): void {
    const { context, graph } = this.requireAudio();
    const velocity = stepVelocity(step);
    const punch = control(unit, "punch", 0.65);
    const tone = control(unit, "tone", 0.5);
    const decay = control(unit, "decay", 0.45);
    const transpose = (Number.isFinite(step.note) ? step.note : 60) - 60;
    const base = clamp(midiToFrequency(unit.rootNote + transpose), 30, 140);
    const output = this.createVoiceOutput(context, graph, "drums");

    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(base * (2 + punch * 2.5), when);
    oscillator.frequency.exponentialRampToValueAtTime(base, when + 0.025 + (1 - punch) * 0.035);
    const body = context.createGain();
    const bodyEnd = percussionEnvelope(body.gain, when, velocity * (0.55 + punch * 0.35), 0.12 + decay * 0.55);
    oscillator.connect(body);
    body.connect(output);

    const click = this.createNoiseSource(context, graph);
    const clickFilter = context.createBiquadFilter();
    clickFilter.type = "highpass";
    clickFilter.frequency.value = 1800 + tone * 4500;
    const clickGain = context.createGain();
    const clickEnd = percussionEnvelope(clickGain.gain, when, velocity * (0.015 + punch * 0.14), 0.012, 0.001);
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(output);

    this.trackVoice("drums", [oscillator, click], [body, clickFilter, clickGain, output], output, when);
    oscillator.start(when);
    oscillator.stop(bodyEnd + 0.02);
    this.startNoise(click, graph, when, clickEnd + 0.01);
  }

  private scheduleSnare(unit: AudioUnitModel, step: AudioStepModel, when: number): void {
    const { context, graph } = this.requireAudio();
    const velocity = stepVelocity(step);
    const tone = control(unit, "tone", 0.5);
    const decay = control(unit, "decay", 0.45);
    const note = Number.isFinite(step.note) ? clamp(step.note, 0, 127) : 60;
    const pitch = 2 ** ((note - 60) / 12);
    const output = this.createVoiceOutput(context, graph, "drums");

    const noise = this.createNoiseSource(context, graph);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 700 + tone * 2200;
    const noiseGain = context.createGain();
    const noiseEnd = percussionEnvelope(noiseGain.gain, when, velocity * 0.48, 0.09 + decay * 0.35);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(output);

    const bodyOscillator = context.createOscillator();
    bodyOscillator.type = "triangle";
    const bodyFrequency = (165 + tone * 90) * pitch;
    bodyOscillator.frequency.setValueAtTime(bodyFrequency, when);
    bodyOscillator.frequency.exponentialRampToValueAtTime(bodyFrequency * 0.65, when + 0.045);
    const bodyGain = context.createGain();
    const bodyEnd = percussionEnvelope(bodyGain.gain, when, velocity * 0.28, 0.07 + decay * 0.14);
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(output);

    this.trackVoice(
      "drums",
      [noise, bodyOscillator],
      [noiseFilter, noiseGain, bodyGain, output],
      output,
      when,
    );
    this.startNoise(noise, graph, when, noiseEnd + 0.01);
    bodyOscillator.start(when);
    bodyOscillator.stop(bodyEnd + 0.02);
  }

  private scheduleHat(unit: AudioUnitModel, step: AudioStepModel, when: number): void {
    const { context, graph } = this.requireAudio();
    const velocity = stepVelocity(step);
    const tone = control(unit, "tone", 0.5);
    const decay = control(unit, "decay", 0.35);
    const output = this.createVoiceOutput(context, graph, "drums");
    const noise = this.createNoiseSource(context, graph);
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 5500 + tone * 5500;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    const end = percussionEnvelope(gain.gain, when, velocity * 0.27, 0.025 + decay * 0.22, 0.001);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    this.trackVoice("drums", [noise], [filter, gain, output], output, when);
    this.startNoise(noise, graph, when, end + 0.01);
  }

  private scheduleClap(unit: AudioUnitModel, step: AudioStepModel, when: number): void {
    const { context, graph } = this.requireAudio();
    const velocity = stepVelocity(step);
    const tone = control(unit, "tone", 0.5);
    const decay = control(unit, "decay", 0.45);
    const output = this.createVoiceOutput(context, graph, "drums");
    const noise = this.createNoiseSource(context, graph);
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100 + tone * 1500;
    filter.Q.value = 0.8;
    const gain = context.createGain();
    const param = gain.gain;
    const peak = velocity * 0.42;
    param.setValueAtTime(0, when);

    const bursts = [0, 0.014, 0.029, 0.044];
    for (let index = 0; index < bursts.length; index += 1) {
      const start = when + bursts[index];
      param.setValueAtTime(0, start);
      param.linearRampToValueAtTime(peak * (1 - index * 0.12), start + 0.0015);
      param.exponentialRampToValueAtTime(MIN_GAIN, start + 0.007);
    }
    const end = when + 0.17 + decay * 0.22;
    param.linearRampToValueAtTime(peak * 0.5, when + 0.053);
    param.exponentialRampToValueAtTime(MIN_GAIN, end);
    param.linearRampToValueAtTime(0, end + 0.01);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    this.trackVoice("drums", [noise], [filter, gain, output], output, when);
    this.startNoise(noise, graph, when, end + 0.02);
  }

  private scheduleBass(unit: AudioUnitModel, step: AudioStepModel, when: number, duration: number): void {
    const { context, graph } = this.requireAudio();
    this.limitPolyphony("bass", 1, when);
    const velocity = stepVelocity(step);
    const cutoff = control(unit, "cutoff", 900, 100, 3200);
    const resonance = control(unit, "resonance", 4, 0.5, 16);
    const decay = control(unit, "decay", 0.5);
    const output = this.createVoiceOutput(context, graph, "bass");
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(resonance, when);
    filter.frequency.setValueAtTime(cutoff * (1.2 + velocity * 0.8), when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.55), when + 0.025 + decay * 0.45);
    const amplitude = context.createGain();
    const gate = when + this.sustainDuration(step, duration);
    const end = synthEnvelope(amplitude.gain, when, velocity * 0.34, 0.004, gate, 0.04 + decay * 0.55, 0.5 + decay * 0.25, 0.035 + decay * 0.12);
    filter.connect(amplitude);
    amplitude.connect(output);

    const saw = context.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.setValueAtTime(midiToFrequency(step.note, unit.rootNote), when);
    const sawGain = context.createGain();
    sawGain.gain.value = 0.7;
    saw.connect(sawGain);
    sawGain.connect(filter);

    const sub = context.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(midiToFrequency(step.note - 12, unit.rootNote - 12), when);
    const subGain = context.createGain();
    subGain.gain.value = 0.55;
    sub.connect(subGain);
    subGain.connect(filter);

    this.trackVoice("bass", [saw, sub], [filter, amplitude, sawGain, subGain, output], output, when);
    saw.start(when);
    sub.start(when);
    saw.stop(end + 0.02);
    sub.stop(end + 0.02);
  }

  private schedulePad(unit: AudioUnitModel, step: AudioStepModel, when: number, duration: number): void {
    const { context, graph } = this.requireAudio();
    this.limitPolyphony("pads", 4, when);
    const velocity = stepVelocity(step);
    const harmony = control(unit, "harmony", 0.2);
    const cutoff = control(unit, "cutoff", 3400, 200, 8000);
    const attack = control(unit, "attack", 0.18, 0.01, 1.5);
    const intervals = harmony < 1 / 3 ? [0, 3, 7, 10] : harmony < 2 / 3 ? [0, 4, 7, 11, 14] : [0, 5, 7, 12];
    const output = this.createVoiceOutput(context, graph, "pads");
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 0.65;
    const amplitude = context.createGain();
    const gate = when + this.sustainDuration(step, duration);
    const attackEnd = Math.min(gate, when + attack);
    const release = 0.35 + attack * 0.25;
    const end = gate + release;
    const peak = velocity * 0.45;
    amplitude.gain.setValueAtTime(0, when);
    amplitude.gain.linearRampToValueAtTime(peak, attackEnd);
    amplitude.gain.setValueAtTime(peak, gate);
    amplitude.gain.linearRampToValueAtTime(0, end);
    filter.connect(amplitude);
    amplitude.connect(output);

    const mixA = context.createGain();
    const mixB = context.createGain();
    mixA.gain.value = 0.5 / intervals.length;
    mixB.gain.value = 0.5 / intervals.length;
    mixA.connect(filter);
    mixB.connect(filter);

    const sources: OscillatorNode[] = [];
    for (let index = 0; index < intervals.length; index += 1) {
      const note = step.note + intervals[index];
      const spread = (index - (intervals.length - 1) / 2) * 0.6;
      const first = context.createOscillator();
      first.type = "sawtooth";
      first.frequency.setValueAtTime(midiToFrequency(note, unit.rootNote), when);
      first.detune.setValueAtTime(-5 + spread, when);
      first.connect(mixA);
      const second = context.createOscillator();
      second.type = "sawtooth";
      second.frequency.setValueAtTime(midiToFrequency(note, unit.rootNote), when);
      second.detune.setValueAtTime(5 + spread, when);
      second.connect(mixB);
      sources.push(first, second);
    }

    this.trackVoice("pads", sources, [filter, amplitude, mixA, mixB, output], output, when);
    for (const source of sources) {
      source.start(when);
      source.stop(end + 0.03);
    }
  }

  private scheduleLead(unit: AudioUnitModel, step: AudioStepModel, when: number, duration: number): void {
    const { context, graph } = this.requireAudio();
    this.limitPolyphony("lead", 4, when);
    const velocity = stepVelocity(step);
    const tone = control(unit, "tone", 0.6);
    const cutoff = control(unit, "cutoff", 4800, 300, 9000);
    const decay = control(unit, "decay", 0.5);
    const output = this.createVoiceOutput(context, graph, "lead");
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 0.7 + tone * 2.5;
    const amplitude = context.createGain();
    const gate = when + this.sustainDuration(step, duration);
    const end = synthEnvelope(amplitude.gain, when, velocity * 0.28, 0.005, gate, 0.05 + decay * 0.5, 0.25 + decay * 0.45, 0.04 + decay * 0.2);
    filter.connect(amplitude);
    amplitude.connect(output);

    const frequency = midiToFrequency(step.note, unit.rootNote);
    const saw = context.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.setValueAtTime(frequency, when);
    saw.detune.setValueAtTime(-3 - tone * 5, when);
    const sawGain = context.createGain();
    sawGain.gain.value = 0.65 - tone * 0.2;
    saw.connect(sawGain);
    sawGain.connect(filter);

    const square = context.createOscillator();
    square.type = "square";
    square.frequency.setValueAtTime(frequency, when);
    square.detune.setValueAtTime(3 + tone * 5, when);
    const squareGain = context.createGain();
    squareGain.gain.value = 0.2 + tone * 0.35;
    square.connect(squareGain);
    squareGain.connect(filter);

    this.trackVoice("lead", [saw, square], [filter, amplitude, sawGain, squareGain, output], output, when);
    saw.start(when);
    square.start(when);
    saw.stop(end + 0.02);
    square.stop(end + 0.02);
  }

  private createVoiceOutput(context: AudioContext, graph: AudioGraph, unit: UnitId): GainNode {
    const output = context.createGain();
    output.gain.value = 1;
    output.connect(graph.units[unit].input);
    return output;
  }

  private createNoiseSource(context: AudioContext, graph: AudioGraph): AudioBufferSourceNode {
    const source = context.createBufferSource();
    source.buffer = graph.noise;
    source.loop = true;
    return source;
  }

  private startNoise(source: AudioBufferSourceNode, graph: AudioGraph, when: number, end: number): void {
    source.start(when, Math.random() * graph.noise.duration);
    source.stop(end);
  }

  private trackVoice(
    unit: UnitId,
    sources: AudioScheduledSourceNode[],
    nodes: AudioNode[],
    output: GainNode,
    startedAt: number,
  ): void {
    const voice: Voice = {
      unit,
      sources,
      nodes,
      output,
      startedAt,
      remaining: sources.length,
      stopping: false,
      released: false,
    };
    this.voices.add(voice);
    for (const source of sources) {
      source.onended = () => {
        if (voice.released) return;
        voice.remaining -= 1;
        if (voice.remaining <= 0) this.releaseVoice(voice);
      };
    }
  }

  private limitPolyphony(unit: UnitId, maximum: number, when: number): void {
    const active = [...this.voices]
      .filter((voice) => voice.unit === unit && !voice.stopping && !voice.released)
      .sort((left, right) => left.startedAt - right.startedAt);
    while (active.length >= maximum) {
      const oldest = active.shift();
      if (!oldest) break;
      this.stopVoiceAt(oldest, when, 0.025);
    }
  }

  private stopVoiceAt(voice: Voice, when: number, release: number): void {
    if (voice.stopping || voice.released) return;
    voice.stopping = true;
    const now = this.context?.currentTime ?? when;
    const start = Math.max(now, when);
    const end = start + release;
    voice.output.gain.cancelScheduledValues(start);
    voice.output.gain.setValueAtTime(1, start);
    voice.output.gain.linearRampToValueAtTime(0, end);
    for (const source of voice.sources) {
      try {
        source.stop(end + 0.005);
      } catch {
        // A naturally ended source is already silent and will be cleaned by onended.
      }
    }
  }

  private stopAllVoices(): void {
    const now = this.context?.currentTime ?? 0;
    for (const voice of [...this.voices]) {
      for (const source of voice.sources) {
        try {
          source.stop(now);
        } catch {
          // Already stopped sources need no further work.
        }
      }
      this.releaseVoice(voice);
    }
  }

  private releaseVoice(voice: Voice): void {
    if (voice.released) return;
    voice.released = true;
    this.voices.delete(voice);
    for (const source of voice.sources) {
      source.onended = null;
      source.disconnect();
    }
    for (const node of voice.nodes) node.disconnect();
  }

  private applyPatchToGraph(): void {
    const context = this.context;
    const graph = this.graph;
    const patch = this.patch;
    if (!context || !graph || !patch) return;

    const now = context.currentTime;
    const masterVolume = Number.isFinite(patch.masterVolume) ? clamp(patch.masterVolume) : 0.8;
    smoothParam(graph.master.gain, masterVolume, now);
    smoothParam(graph.delay.delayTime, Math.min(1.95, this.stepDuration() * 3), now, 0.03);

    for (const id of UNIT_IDS) {
      const unit = patch.units.find((candidate) => candidate.id === id);
      const nodes = graph.units[id];
      const level = unit && !unit.muted ? control(unit, "level", this.defaultLevel(id)) : 0;
      smoothParam(nodes.level.gain, level, now);
      nodes.drive.curve = this.driveCurve(
        unit && (id === "drums" || id === "bass") ? control(unit, "drive", id === "drums" ? 0.18 : 0.25) : 0,
      );
      smoothParam(nodes.reverbSend.gain, unit && id === "pads" ? control(unit, "space", 0.4) * 0.75 : 0, now, 0.03);
      smoothParam(nodes.delaySend.gain, unit && id === "lead" ? control(unit, "echo", 0.35) * 0.65 : 0, now, 0.03);
    }
  }

  private sustainDuration(step: AudioStepModel, stepDuration: number): number {
    const length = Number.isFinite(step.length) ? Math.max(0.25, step.length) : 1;
    return Math.max(0.04, length * stepDuration);
  }

  private stepDuration(): number {
    const tempo = this.patch && Number.isFinite(this.patch.tempo) ? clamp(this.patch.tempo, 30, 300) : 120;
    return 15 / tempo;
  }

  private swing(): number {
    return this.patch && Number.isFinite(this.patch.swing) ? clamp(this.patch.swing) : 0;
  }

  private defaultLevel(unit: UnitId): number {
    if (unit === "drums") return 0.8;
    if (unit === "bass") return 0.75;
    if (unit === "pads") return 0.65;
    return 0.65;
  }

  private requireAudio(): { context: AudioContext; graph: AudioGraph } {
    if (!this.context || !this.graph) throw new Error("Audio graph is not initialized.");
    return { context: this.context, graph: this.graph };
  }
}
