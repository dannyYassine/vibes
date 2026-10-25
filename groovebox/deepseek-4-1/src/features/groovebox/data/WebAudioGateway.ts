import type {
  AudioDrumVoice,
  AudioGateway,
  AudioNote,
  AudioPatch,
  AudioUnitId,
} from './AudioGateway';

interface UnitChannel {
  input: AudioNode;
  gain: GainNode;
  reverb: GainNode;
  delay?: GainNode;
}

interface EngineNodes {
  masterIn: GainNode;
  master: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  drums: UnitChannel;
  bass: UnitChannel;
  pads: UnitChannel;
  lead: UnitChannel;
  drumDrive: WaveShaperNode;
  bassDrive: WaveShaperNode;
  leadDrive: WaveShaperNode;
  delayL: DelayNode;
  delayR: DelayNode;
}

interface ScheduledStep {
  step: number;
  time: number;
}

const STEP_COUNT = 16;

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A gently normalised soft-clipper. amount 0 = almost clean, 1 = aggressive. */
function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  const k = 1 + clamp(amount, 0, 1) * clamp(amount, 0, 1) * 9;
  const norm = Math.tanh(k);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * k) / norm;
  }
  return curve;
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

function makeImpulseResponse(ctx: AudioContext): AudioBuffer {
  const duration = 3.2;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // A dark, diffuse tail with a short pre-delay and a few early reflections.
      const preDelay = i < ctx.sampleRate * 0.012 ? 0 : 1;
      const decay = Math.pow(1 - t, 2.7);
      const shimmer = 0.82 + Math.sin(i * 0.0007 + channel) * 0.18;
      data[i] = (Math.random() * 2 - 1) * decay * preDelay * shimmer * 0.7;
    }
  }
  return buffer;
}

class DrumMachine {
  private lastKick = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
    private readonly noise: AudioBuffer,
  ) {}

  trigger(voice: AudioDrumVoice, time: number, velocity: number, params: AudioPatch['drums']): void {
    if (velocity <= 0) return;
    const tune = Math.pow(2, params.tune / 12);

    switch (voice) {
      case 'kick':
        this.kick(time, velocity, params, tune);
        break;
      case 'snare':
        this.snare(time, velocity, params, tune);
        break;
      case 'hat':
        this.hat(time, velocity, params, tune);
        break;
      case 'perc':
        this.perc(time, velocity, params, tune);
        break;
    }
  }

  private kick(time: number, velocity: number, params: AudioPatch['drums'], tune: number): void {
    if (time < this.lastKick) return;
    this.lastKick = time;

    const decay = 0.1 + params.decay * 0.8;
    const base = 46 * tune;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * 5.5, time);
    osc.frequency.exponentialRampToValueAtTime(base, time + 0.055);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, time + decay);

    const amp = this.ctx.createGain();
    const peak = Math.min(1.15, velocity * 1.1);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(peak, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(amp);
    amp.connect(this.output);

    const click = this.noiseBurst(time, 0.018, velocity * (0.08 + params.tone * 0.3), 1800 + params.tone * 2400);
    if (click) click.connect(this.output);

    osc.start(time);
    osc.stop(time + decay + 0.03);
  }

  private snare(time: number, velocity: number, params: AudioPatch['drums'], tune: number): void {
    const decay = 0.11 + params.decay * 0.26;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((1400 + params.tone * 2400) * tune, time);
    filter.Q.value = 0.9;

    const noise = this.noiseSource();
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(velocity * 0.62, time + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.output);

    const tone = this.ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(185 * tune, time);
    tone.frequency.exponentialRampToValueAtTime(150 * tune, time + decay * 0.6);
    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, time);
    toneGain.gain.exponentialRampToValueAtTime(velocity * (0.18 + params.tone * 0.16), time + 0.003);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, time + decay * 0.75);
    tone.connect(toneGain);
    toneGain.connect(this.output);

    noise.start(time);
    noise.stop(time + decay + 0.03);
    tone.start(time);
    tone.stop(time + decay + 0.03);
  }

  private hat(time: number, velocity: number, params: AudioPatch['drums'], tune: number): void {
    const decay = 0.025 + params.decay * 0.11;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime((6200 + params.tone * 3800) * tune, time);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(9800 * tune, time);
    bp.Q.value = 1.1;

    const noise = this.noiseSource();
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity * 0.52, time + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.output);

    noise.start(time);
    noise.stop(time + decay + 0.02);
  }

  private perc(time: number, velocity: number, params: AudioPatch['drums'], tune: number): void {
    const decay = 0.09 + params.decay * 0.22;
    const base = 760 * tune;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(base, time);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, time + decay);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(base * 1.51, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = base * 1.25;
    filter.Q.value = 5.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity * 0.4, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    const click = this.noiseBurst(time, 0.008, velocity * 0.18, 2400);
    if (click) click.connect(this.output);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + decay + 0.02);
    osc2.stop(time + decay + 0.02);
  }

  private noiseSource(): AudioBufferSourceNode {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noise;
    noise.loop = true;
    return noise;
  }

  private noiseBurst(time: number, decay: number, level: number, frequency: number): GainNode | null {
    if (level <= 0.001) return null;
    const noise = this.noiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(time);
    noise.stop(time + decay + 0.01);
    return gain;
  }
}

class BassSynth {
  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {}

  trigger(time: number, note: AudioNote, params: AudioPatch['bass'], gate: number): void {
    if (note.velocity <= 0) return;
    const frequency = midiToHz(note.note);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8 + params.resonance * 15;
    const startCutoff = clamp(params.cutoff * (2.4 + params.resonance * 2.8), 90, 14000);
    filter.frequency.setValueAtTime(startCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(clamp(params.cutoff, 90, 14000), time + Math.max(0.05, params.decay));

    const amp = this.ctx.createGain();
    const peak = note.velocity * 0.5;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(peak, time + 0.006);
    amp.gain.setValueAtTime(peak, time + gate * 0.72);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + gate + 0.06);

    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(frequency, time);

    const square = this.ctx.createOscillator();
    square.type = 'square';
    square.frequency.setValueAtTime(frequency, time);
    square.detune.value = 8;

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(frequency / 2, time);

    const sawGain = this.ctx.createGain();
    sawGain.gain.value = 0.44;
    const squareGain = this.ctx.createGain();
    squareGain.gain.value = 0.18;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.55;

    saw.connect(sawGain);
    square.connect(squareGain);
    sub.connect(subGain);
    sawGain.connect(filter);
    squareGain.connect(filter);
    subGain.connect(filter);
    filter.connect(amp);
    amp.connect(this.output);

    const stopAt = time + gate + 0.09;
    saw.start(time);
    square.start(time);
    sub.start(time);
    saw.stop(stopAt);
    square.stop(stopAt);
    sub.stop(stopAt);
  }
}

class PadSynth {
  private chordVoices: Array<{ gains: GainNode[]; stopAt: number }> = [];
  private static readonly MAX_CHORDS = 10;

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {}

  trigger(time: number, rootNote: AudioNote, params: AudioPatch['pads'], intervals: number[]): void {
    if (rootNote.velocity <= 0) return;
    const chord = intervals.length > 0 ? intervals : [0];
    const gate = 0.35;
    const release = params.release;

    // Retire finished chords and thin the oldest ones before they pile up.
    this.chordVoices = this.chordVoices.filter((voice) => voice.stopAt > time);
    while (this.chordVoices.length >= PadSynth.MAX_CHORDS) {
      const oldest = this.chordVoices.shift();
      if (!oldest) break;
      for (const gain of oldest.gains) {
        gain.gain.cancelScheduledValues(time);
        gain.gain.setTargetAtTime(0.0001, time, 0.035);
      }
    }

    const chordGains: GainNode[] = [];
    let stopAt = time;

    chord.forEach((interval, index) => {
      const note = rootNote.note + interval;
      const frequency = midiToHz(note);
      const voiceGain = this.ctx.createGain();
      const level = (rootNote.velocity * 0.2) / Math.sqrt(chord.length);
      voiceGain.gain.setValueAtTime(0.0001, time);
      voiceGain.gain.linearRampToValueAtTime(level, time + Math.max(0.02, params.attack));
      voiceGain.gain.setValueAtTime(level, time + Math.max(0.02, params.attack) + gate);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.02, params.attack) + gate + release);
      chordGains.push(voiceGain);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(clamp(params.cutoff * 0.72, 120, 12000), time);
      filter.frequency.linearRampToValueAtTime(clamp(params.cutoff, 120, 16000), time + Math.max(0.05, params.attack) + 0.5);

      const panL = this.ctx.createStereoPanner();
      panL.pan.value = -0.42;
      const panR = this.ctx.createStereoPanner();
      panR.pan.value = 0.42;
      panL.connect(voiceGain);
      panR.connect(voiceGain);

      const oscA = this.ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscA.frequency.setValueAtTime(frequency, time);
      oscA.detune.value = -7 - index * 1.5;
      const oscB = this.ctx.createOscillator();
      oscB.type = 'sawtooth';
      oscB.frequency.setValueAtTime(frequency, time);
      oscB.detune.value = 7 + index * 1.5;

      const sub = this.ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(frequency / 2, time);
      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.34;

      oscA.connect(panL);
      oscB.connect(panR);
      sub.connect(subGain);
      subGain.connect(voiceGain);
      voiceGain.connect(filter);
      filter.connect(this.output);

      const voiceStopAt = time + Math.max(0.02, params.attack) + gate + release + 0.15;
      stopAt = Math.max(stopAt, voiceStopAt);
      oscA.start(time);
      oscB.start(time);
      sub.start(time);
      oscA.stop(voiceStopAt);
      oscB.stop(voiceStopAt);
      sub.stop(voiceStopAt);
    });

    this.chordVoices.push({ gains: chordGains, stopAt });
  }
}

class LeadSynth {
  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {}

  trigger(time: number, note: AudioNote, params: AudioPatch['lead'], gate: number): void {
    if (note.velocity <= 0) return;
    const frequency = midiToHz(note.note);
    const amp = this.ctx.createGain();
    const decay = Math.max(0.08, params.decay);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(note.velocity * 0.36, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1 + params.resonance * 12;
    filter.frequency.setValueAtTime(clamp(params.cutoff * 3.1, 400, 16000), time);
    filter.frequency.exponentialRampToValueAtTime(clamp(params.cutoff, 300, 12000), time + Math.max(0.04, decay * 0.65));

    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(frequency, time);
    saw.detune.value = -5;

    const square = this.ctx.createOscillator();
    square.type = 'square';
    square.frequency.setValueAtTime(frequency, time);
    square.detune.value = 6;

    const sawGain = this.ctx.createGain();
    sawGain.gain.value = 0.55;
    const squareGain = this.ctx.createGain();
    squareGain.gain.value = 0.3;

    saw.connect(sawGain);
    square.connect(squareGain);
    sawGain.connect(filter);
    squareGain.connect(filter);
    filter.connect(amp);
    amp.connect(this.output);

    const stopAt = time + Math.max(decay, gate * 0.8) + 0.12;
    saw.start(time);
    square.start(time);
    saw.stop(stopAt);
    square.stop(stopAt);
  }
}

export class WebAudioGateway implements AudioGateway {
  private ctx: AudioContext | null = null;
  private nodes: EngineNodes | null = null;
  private patch: AudioPatch | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private drumMachine: DrumMachine | null = null;
  private bassSynth: BassSynth | null = null;
  private padSynth: PadSynth | null = null;
  private leadSynth: LeadSynth | null = null;

  private readonly muted: Record<AudioUnitId, boolean> = {
    drums: false,
    bass: false,
    pads: false,
    lead: false,
  };

  private playing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStep = 0;
  private nextTime = 0;
  private lastPassedStep = -1;
  private stepQueue: ScheduledStep[] = [];

  loadPatch(patch: AudioPatch): void {
    this.patch = patch;
    if (this.nodes) this.applyPatch(patch);
  }

  async start(): Promise<void> {
    const nodes = this.ensureNodes();
    if (!this.ctx || !this.patch) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.playing) return;

    const now = this.ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setValueAtTime(this.patch.masterVolume, now);
    this.playing = true;
    this.stepQueue = [];
    this.lastPassedStep = -1;
    this.nextStep = 0;
    this.nextTime = now + 0.06;
    this.scheduleAhead();
    this.timer = setInterval(() => this.scheduleAhead(), 25);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stepQueue = [];
    this.lastPassedStep = -1;

    if (!this.ctx || !this.nodes || !this.patch) return;
    const now = this.ctx.currentTime;
    const master = this.nodes.master.gain;
    master.cancelScheduledValues(now);
    master.setValueAtTime(Math.max(0.0001, master.value), now);
    master.linearRampToValueAtTime(0.0001, now + 0.09);

    // Master stays silent until the next start or audition, so long pad and
    // reverb tails cannot swell back up after the transport is stopped.
  }

  setUnitMuted(unit: AudioUnitId, muted: boolean): void {
    this.muted[unit] = muted;
    if (!this.ctx || !this.nodes || !this.patch) return;
    const channel = this.nodes[unit];
    const volume = this.unitVolume(unit, this.patch);
    const now = this.ctx.currentTime;
    channel.gain.gain.cancelScheduledValues(now);
    channel.gain.gain.setTargetAtTime(muted ? 0.0001 : volume, now, 0.012);
  }

  async audition(unit: AudioUnitId): Promise<void> {
    this.ensureNodes();
    if (!this.ctx || !this.patch) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const patch = this.patch;
    if (!this.playing) {
      const now = this.ctx.currentTime;
      const master = this.nodes?.master.gain;
      if (master) {
        master.cancelScheduledValues(now);
        master.setValueAtTime(patch.masterVolume, now);
      }
    }
    const time = this.ctx.currentTime + 0.03;

    if (unit === 'drums') {
      this.drumMachine?.trigger('kick', time, 0.95, patch.drums);
      this.drumMachine?.trigger('hat', time + 0.11, 0.75, patch.drums);
      this.drumMachine?.trigger('snare', time + 0.22, 0.85, patch.drums);
      return;
    }

    if (unit === 'bass') {
      const note = this.firstActive(patch.bass.notes) ?? { note: 38, velocity: 0.9 };
      this.bassSynth?.trigger(time, note, patch.bass, 0.3);
      return;
    }

    if (unit === 'pads') {
      const note = this.firstActive(patch.pads.notes) ?? { note: 50, velocity: 0.85 };
      this.padSynth?.trigger(time, note, patch.pads, patch.pads.chordIntervals);
      return;
    }

    const note = this.firstActive(patch.lead.notes) ?? { note: 64, velocity: 0.85 };
    this.leadSynth?.trigger(time, note, patch.lead, 0.2);
  }

  currentStep(): number {
    if (!this.playing || !this.ctx) return -1;
    const now = this.ctx.currentTime;
    while (this.stepQueue.length > 0 && this.stepQueue[0].time <= now) {
      const entry = this.stepQueue.shift();
      if (entry) this.lastPassedStep = entry.step;
    }
    return this.lastPassedStep;
  }

  isRunning(): boolean {
    return this.playing;
  }

  private ensureNodes(): EngineNodes {
    if (this.ctx && this.nodes) return this.nodes;

    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const masterIn = ctx.createGain();
    masterIn.gain.value = 0.88;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 10;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    const masterSat = ctx.createWaveShaper();
    masterSat.curve = driveCurve(0.14);
    masterSat.oversample = '2x';

    const master = ctx.createGain();
    master.gain.value = this.patch?.masterVolume ?? 0.8;

    masterIn.connect(compressor);
    compressor.connect(masterSat);
    masterSat.connect(master);
    master.connect(ctx.destination);

    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    const reverbHighpass = ctx.createBiquadFilter();
    reverbHighpass.type = 'highpass';
    reverbHighpass.frequency.value = 220;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(ctx);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.9;
    reverbSend.connect(reverbHighpass);
    reverbHighpass.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(masterIn);

    const delaySend = ctx.createGain();
    delaySend.gain.value = 1;
    const delayL = ctx.createDelay(2);
    const delayR = ctx.createDelay(2);
    const feedbackL = ctx.createGain();
    const feedbackR = ctx.createGain();
    feedbackL.gain.value = 0.36;
    feedbackR.gain.value = 0.36;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 3600;
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.8;
    delaySend.connect(delayL);
    delayL.connect(delayFilter);
    delayFilter.connect(delayReturn);
    delayL.connect(feedbackL);
    feedbackL.connect(delayR);
    delayR.connect(feedbackR);
    feedbackR.connect(delayL);
    delayR.connect(delayReturn);
    delayReturn.connect(masterIn);

    const drumDrive = ctx.createWaveShaper();
    drumDrive.curve = driveCurve(0.3);
    drumDrive.oversample = '2x';
    const drums = this.buildChannel(ctx, masterIn, reverbSend, drumDrive);

    const bassDrive = ctx.createWaveShaper();
    bassDrive.curve = driveCurve(0.25);
    bassDrive.oversample = '2x';
    const bass = this.buildChannel(ctx, masterIn, reverbSend, bassDrive);

    const padInput = ctx.createGain();
    const pads = this.buildChannel(ctx, masterIn, reverbSend, padInput);

    const leadDrive = ctx.createWaveShaper();
    leadDrive.curve = driveCurve(0.18);
    leadDrive.oversample = '2x';
    const lead = this.buildChannel(ctx, masterIn, reverbSend, leadDrive);
    const leadDelay = ctx.createGain();
    leadDelay.gain.value = 0.3;
    lead.gain.connect(leadDelay);
    leadDelay.connect(delaySend);
    lead.delay = leadDelay;

    const nodes: EngineNodes = {
      masterIn,
      master,
      reverbSend,
      delaySend,
      drums,
      bass,
      pads,
      lead,
      drumDrive,
      bassDrive,
      leadDrive,
      delayL,
      delayR,
    };
    this.nodes = nodes;

    this.noiseBuffer = makeNoiseBuffer(ctx);
    this.drumMachine = new DrumMachine(ctx, drumDrive, this.noiseBuffer);
    this.bassSynth = new BassSynth(ctx, bassDrive);
    this.padSynth = new PadSynth(ctx, padInput);
    this.leadSynth = new LeadSynth(ctx, leadDrive);

    if (this.patch) this.applyPatch(this.patch);
    return nodes;
  }

  private buildChannel(
    ctx: AudioContext,
    masterIn: GainNode,
    reverbSend: GainNode,
    input: AudioNode,
  ): UnitChannel {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    input.connect(gain);
    gain.connect(masterIn);

    const reverb = ctx.createGain();
    reverb.gain.value = 0;
    gain.connect(reverb);
    reverb.connect(reverbSend);

    return { input, gain, reverb };
  }

  private applyPatch(patch: AudioPatch): void {
    if (!this.ctx || !this.nodes) return;
    const now = this.ctx.currentTime;
    const nodes = this.nodes;

    nodes.drumDrive.curve = driveCurve(patch.drums.drive);
    nodes.bassDrive.curve = driveCurve(0.12 + patch.bass.drive * 0.7);
    nodes.leadDrive.curve = driveCurve(0.1);

    for (const unit of ['drums', 'bass', 'pads', 'lead'] as const) {
      const channel = nodes[unit];
      const volume = this.unitVolume(unit, patch);
      channel.gain.gain.cancelScheduledValues(now);
      channel.gain.gain.setTargetAtTime(this.muted[unit] ? 0.0001 : volume, now, 0.015);
    }

    const setSend = (unit: UnitChannel, amount: number) => {
      unit.reverb.gain.setTargetAtTime(clamp(amount, 0, 1) * 0.95, now, 0.03);
    };
    setSend(nodes.drums, patch.drums.reverb);
    setSend(nodes.bass, patch.bass.reverb);
    setSend(nodes.pads, patch.pads.space);
    setSend(nodes.lead, patch.lead.reverb);
    if (nodes.lead.delay) {
      nodes.lead.delay.gain.setTargetAtTime(clamp(patch.lead.delay, 0, 1) * 0.9, now, 0.03);
    }

    const beat = 60 / Math.max(40, patch.bpm);
    const delayTime = clamp(beat * 0.75, 0.03, 1.8);
    nodes.delayL.delayTime.setTargetAtTime(delayTime, now, 0.04);
    nodes.delayR.delayTime.setTargetAtTime(delayTime, now, 0.04);

    if (this.playing) {
      nodes.master.gain.setTargetAtTime(patch.masterVolume, now, 0.02);
    }
  }

  private unitVolume(unit: AudioUnitId, patch: AudioPatch): number {
    switch (unit) {
      case 'drums':
        return patch.drums.volume;
      case 'bass':
        return patch.bass.volume;
      case 'pads':
        return patch.pads.volume;
      case 'lead':
        return patch.lead.volume;
    }
  }

  private scheduleAhead(): void {
    if (!this.playing || !this.ctx || !this.patch) return;
    const now = this.ctx.currentTime;
    const stepDuration = 60 / Math.max(40, this.patch.bpm) / 4;

    // If the tab was asleep, don't try to back-fill history.
    if (this.nextTime < now - stepDuration * 2) {
      this.nextTime = now + 0.04;
    }

    while (this.nextTime < now + 0.16) {
      const swingOffset = this.nextStep % 2 === 1 ? this.patch.swing * stepDuration * 0.5 : 0;
      this.scheduleStep(this.nextStep, this.nextTime + swingOffset, stepDuration);
      this.stepQueue.push({ step: this.nextStep, time: this.nextTime });
      this.nextTime += stepDuration;
      this.nextStep = (this.nextStep + 1) % STEP_COUNT;
    }
  }

  private scheduleStep(step: number, time: number, stepDuration: number): void {
    const patch = this.patch;
    if (!patch) return;

    if (!this.muted.drums) {
      const voices: AudioDrumVoice[] = ['kick', 'snare', 'hat', 'perc'];
      for (const voice of voices) {
        const velocity = patch.drums.pattern[voice][step] ?? 0;
        this.drumMachine?.trigger(voice, time, velocity, patch.drums);
      }
    }

    if (!this.muted.bass) {
      const note = patch.bass.notes[step];
      if (note) this.bassSynth?.trigger(time, note, patch.bass, stepDuration * 0.9);
    }


    if (!this.muted.pads) {
      const note = patch.pads.notes[step];
      if (note) this.padSynth?.trigger(time, note, patch.pads, patch.pads.chordIntervals);
    }

    if (!this.muted.lead) {
      const note = patch.lead.notes[step];
      if (note) this.leadSynth?.trigger(time, note, patch.lead, stepDuration);
    }
  }

  private firstActive(notes: AudioNote[]): AudioNote | null {
    return notes.find((note) => note.velocity > 0) ?? null;
  }
}
