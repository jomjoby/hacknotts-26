// Synthesised sound effects (Web Audio). No audio files are shipped, so there is
// nothing to license or preload. Every effect is a handful of oscillator notes.

const n = (f, d, o = {}) => ({ f, d, t: 'sine', v: 0.12, at: 0, ...o });

const SOUNDS = {
  click: [n(660, 0.05, { t: 'square', v: 0.05 })],
  select: [n(520, 0.06, { t: 'triangle' }), n(780, 0.07, { t: 'triangle', at: 0.05 })],
  flip: [n(300, 0.08, { t: 'triangle', to: 520 })],
  unflip: [n(520, 0.08, { t: 'triangle', to: 300, v: 0.08 })],
  match: [n(523, 0.1), n(659, 0.1, { at: 0.09 }), n(784, 0.18, { at: 0.18 })],
  mismatch: [n(220, 0.18, { t: 'sawtooth', v: 0.06, to: 160 })],
  swap: [n(400, 0.07, { t: 'square', v: 0.05, to: 800 }), n(800, 0.07, { t: 'square', v: 0.05, to: 400, at: 0.08 })],
  win: [n(523, 0.12), n(659, 0.12, { at: 0.12 }), n(784, 0.12, { at: 0.24 }), n(1047, 0.35, { at: 0.36 })],
  lose: [n(392, 0.18, { t: 'triangle' }), n(330, 0.18, { t: 'triangle', at: 0.18 }), n(262, 0.4, { t: 'triangle', at: 0.36 })],
  place: [n(440, 0.06, { t: 'triangle', to: 600 })],
  remove: [n(600, 0.06, { t: 'triangle', to: 380, v: 0.08 })],
  check: [n(330, 0.08, { t: 'square', v: 0.05 }), n(440, 0.1, { t: 'square', v: 0.05, at: 0.08 })],
  hint: [n(880, 0.1), n(1175, 0.18, { at: 0.1 })],
  pour: [n(180, 0.5, { t: 'sawtooth', v: 0.035, to: 110 })],
  pipe: [n(700, 0.12, { t: 'triangle', v: 0.06, to: 500 }), n(500, 0.12, { t: 'triangle', v: 0.06, to: 700, at: 0.12 })],
  pop: [n(500, 0.08, { t: 'sine', to: 900 })],
  belt: [n(120, 0.18, { t: 'square', v: 0.025, to: 90 })],
  ding: [n(1318, 0.5, { v: 0.1 }), n(1760, 0.5, { v: 0.05, at: 0.02 })],
  bell: [n(1568, 0.35, { v: 0.1 }), n(2093, 0.45, { v: 0.07, at: 0.12 })],
  serve: [n(659, 0.1), n(880, 0.1, { at: 0.1 }), n(1175, 0.25, { at: 0.2 })],
  strike: [n(180, 0.3, { t: 'sawtooth', v: 0.08, to: 90 })],
  customer: [n(784, 0.1, { t: 'triangle' }), n(988, 0.14, { t: 'triangle', at: 0.1 })],
  trash: [n(300, 0.2, { t: 'square', v: 0.04, to: 80 })],
};

export class Sound {
  constructor({ muted = false } = {}) {
    this.muted = muted;
    this.ctx = null;
  }

  setMuted(value) {
    this.muted = !!value;
  }

  _context() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  play(name) {
    if (this.muted) return;
    const notes = SOUNDS[name];
    if (!notes) return;
    const ctx = this._context();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const note of notes) {
      const start = t0 + note.at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.t;
      osc.frequency.setValueAtTime(note.f, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, start + note.d);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.v, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.d + 0.03);
    }
  }

  destroy() {
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}

export const SOUND_NAMES = Object.keys(SOUNDS);
