// Lumen Deep — synthesized sound effects. No audio files: every sound is
// an oscillator envelope built with the Web Audio API, so the game ships
// zero assets and still answers every action with a sound.
export class Sfx {
  constructor() {
    this.context = null;
    this.muted = false;
    this.master = null;
  }

  // Created lazily on the first user gesture (browsers block audio before
  // one); safe to call before that — it just does nothing.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.context = new AC();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One blip: a sine/triangle tone that slides from `from` to `to` Hz.
  blip({ from = 440, to = 440, dur = 0.12, type = 'sine', gain = 1, when = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const g = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A short filtered-noise splash for bubbles and damage.
  noise({ dur = 0.18, gain = 0.5, freq = 1200, when = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const len = Math.max(1, Math.floor(this.context.sampleRate * dur));
    const buf = this.context.createBuffer(1, len, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.context.createBufferSource();
    src.buffer = buf;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = this.context.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  pickup(combo) {
    // Pitch climbs with the combo: the streak is audible.
    const base = 520 + Math.min(combo, 8) * 45;
    this.blip({ from: base, to: base * 1.5, dur: 0.14, type: 'sine', gain: 0.9 });
    this.blip({ from: base * 2, to: base * 2.4, dur: 0.1, type: 'triangle', gain: 0.35, when: 0.03 });
  }

  damage() {
    this.blip({ from: 220, to: 55, dur: 0.35, type: 'sawtooth', gain: 0.9 });
    this.noise({ dur: 0.25, gain: 0.7, freq: 900 });
  }

  refill() {
    this.blip({ from: 300, to: 620, dur: 0.22, type: 'sine', gain: 0.7 });
    this.blip({ from: 620, to: 900, dur: 0.18, type: 'sine', gain: 0.5, when: 0.08 });
  }

  level() {
    [523, 659, 784].forEach((f, i) =>
      this.blip({ from: f, to: f, dur: 0.16, type: 'triangle', gain: 0.6, when: i * 0.09 }),
    );
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.blip({ from: f, to: f, dur: 0.22, type: 'triangle', gain: 0.6, when: i * 0.11 }),
    );
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) =>
      this.blip({ from: f, to: f * 0.94, dur: 0.3, type: 'sine', gain: 0.55, when: i * 0.16 }),
    );
  }

  click() {
    this.blip({ from: 700, to: 700, dur: 0.05, type: 'square', gain: 0.25 });
  }
}
