// Sound effects: the original Purble Place recordings (see samples.js and assets/sounds/).
// A name with no recording makes no sound.
// A page opened as a file (file://) cannot fetch them, so the host can pack them into
// window.PURBLE_PLACE_SOUNDS ({ 'FILE.wav': base64 }) and they are read from there instead.

import { SAMPLES, ALIASES, SILENT } from './samples.js';

/** The same recording asked for twice inside this many seconds plays once (several cakes moving on together). */
const RETRIGGER = 0.08;

export class Sound {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.muted]
   * @param {string}  [opts.base]     folder URL holding the wav files; leave out to play nothing
   */
  constructor({ muted = false, base = null } = {}) {
    this.muted = muted;
    this.base = base;
    this.ctx = null;
    this.buffers = new Map();   // recording name -> decoded AudioBuffer
    this._loading = new Map();  // recording name -> promise
    this._last = new Map();     // recording name -> when it last started (seconds, performance.now)
    this._live = new Set();     // sources that are still playing
    this._decoder = null;
    this._wanted = null;
    this._dead = false;
  }

  setMuted(value) {
    this.muted = !!value;
    if (this.muted) this.stopAll();
    else if (this._wanted) this.preload(this._wanted);
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

  /**
   * Fetch and decode recordings ahead of time (all of them, or just `names`).
   * Safe to call any number of times; a file that cannot be loaded is skipped and stays silent.
   * While muted nothing is fetched, but the request is kept and carried out when sound is switched on.
   */
  preload(names = Object.keys(SAMPLES)) {
    this._wanted = names;
    if (this.muted) return Promise.resolve();
    return Promise.all(names.map((name) => this._load(name)));
  }

  _load(name) {
    const sample = SAMPLES[name];
    if (!sample || !this.base || this._dead || this.buffers.has(name)) return Promise.resolve();
    let job = this._loading.get(name);
    if (!job) {
      job = this._fetch(sample.file)
        .then((buffer) => { if (buffer && !this._dead) this.buffers.set(name, buffer); })
        .catch(() => {});
      this._loading.set(name, job);
    }
    return job;
  }

  async _fetch(file) {
    const data = await this._bytes(file);
    if (!data) return null;
    // An offline context decodes without needing a click first, so the sound is ready before the first one is played.
    if (!this._decoder) {
      const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
      this._decoder = Offline ? new Offline(1, 1, 44100) : this._context();
    }
    return this._decoder ? this._decoder.decodeAudioData(data) : null;
  }

  /** A file's bytes: the copy packed into the page if there is one, otherwise fetched from the sound folder. */
  async _bytes(file) {
    const packed = globalThis.PURBLE_PLACE_SOUNDS?.[file];
    if (packed) return Uint8Array.from(atob(packed), (c) => c.charCodeAt(0)).buffer;
    const res = await fetch(new URL(file, this.base));
    return res.ok ? res.arrayBuffer() : null;
  }

  play(name) {
    if (this.muted) return;
    name = ALIASES[name] || name;
    const sample = SAMPLES[name];
    if (!sample) return;
    const buffer = this.buffers.get(name);
    if (!buffer) { this._load(name); return; }   // not here yet, so this one is silent
    const ctx = this._context();
    if (!ctx) return;
    const now = performance.now() / 1000;   // not ctx.currentTime, which stands still until the first click wakes the context
    if (now - (this._last.get(name) ?? -1) < RETRIGGER) return;
    this._last.set(name, now);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = sample.gain ?? 1;
    src.connect(gain).connect(ctx.destination);
    this._live.add(src);
    src.onended = () => this._live.delete(src);
    src.start();
  }

  /** Cut off any recording that is still playing (a long one should not carry on after leaving the game). */
  stopAll() {
    for (const src of this._live) { try { src.stop(); } catch { /* already finished */ } }
    this._live.clear();
  }

  destroy() {
    this._dead = true;
    this.stopAll();
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.buffers.clear();
  }
}

/** Every name the code may ask for. */
export const SOUND_NAMES = [...Object.keys(SAMPLES), ...Object.keys(ALIASES), ...SILENT];
