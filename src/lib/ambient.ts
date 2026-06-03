import type { SoundId } from "../types";

type NoiseColor = "white" | "pink" | "brown";

function makeNoiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const length = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // pink (aproximación de Paul Kellet)
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buffer;
}

interface SoundSpec {
  color: NoiseColor;
  filter: { type: BiquadFilterType; freq: number; q?: number };
  /** Modulación lenta del volumen (oleaje, viento). */
  swell?: { rate: number; depth: number };
  gain: number;
}

const SPECS: Record<SoundId, SoundSpec> = {
  lluvia: {
    color: "white",
    filter: { type: "highpass", freq: 750, q: 0.6 },
    gain: 0.5,
  },
  bosque: {
    color: "pink",
    filter: { type: "lowpass", freq: 2600, q: 0.7 },
    swell: { rate: 0.08, depth: 0.18 },
    gain: 0.65,
  },
  cafe: {
    color: "brown",
    filter: { type: "bandpass", freq: 520, q: 0.5 },
    gain: 1.1,
  },
  olas: {
    color: "brown",
    filter: { type: "lowpass", freq: 900, q: 0.8 },
    swell: { rate: 0.12, depth: 0.55 },
    gain: 1.0,
  },
  viento: {
    color: "pink",
    filter: { type: "bandpass", freq: 480, q: 1.2 },
    swell: { rate: 0.16, depth: 0.4 },
    gain: 0.9,
  },
};

/**
 * Motor de sonido ambiental generado por completo con la Web Audio API
 * (sin archivos externos). Cada paisaje sonoro combina ruido coloreado,
 * filtros y modulación lenta de volumen.
 */
export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private active: AudioNode[] = [];
  private sources: AudioBufferSourceNode[] = [];
  current: SoundId | null = null;
  private volume = 0.5;

  private ensureContext() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  getVolume() {
    return this.volume;
  }

  stop() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ya detenido */
      }
    });
    this.active.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        /* ignorar */
      }
    });
    this.sources = [];
    this.active = [];
    this.current = null;
  }

  toggle(id: SoundId): SoundId | null {
    if (this.current === id) {
      this.stop();
      return null;
    }
    this.play(id);
    return id;
  }

  play(id: SoundId) {
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    this.stop();

    const ctx = this.ctx;
    const spec = SPECS[id];

    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(ctx, spec.color);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = spec.filter.type;
    filter.frequency.value = spec.filter.freq;
    filter.Q.value = spec.filter.q ?? 1;

    const gain = ctx.createGain();
    gain.gain.value = spec.gain;

    // Fade-in suave
    const now = ctx.currentTime;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0.0001, now);
    fade.gain.exponentialRampToValueAtTime(1, now + 1.2);

    source.connect(filter).connect(gain).connect(fade).connect(this.master);

    this.sources.push(source);
    this.active.push(filter, gain, fade);

    // Modulación lenta (oleaje / viento)
    if (spec.swell) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = spec.swell.rate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = spec.swell.depth * spec.gain;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      this.sources.push(lfo as unknown as AudioBufferSourceNode);
      this.active.push(lfoGain);
    }

    source.start();
    this.current = id;
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.master = null;
    }
  }
}
