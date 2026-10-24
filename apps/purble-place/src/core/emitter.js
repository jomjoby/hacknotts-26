// Minimal event emitter. `on('*', (name, data) => …)` receives every event.

export class Emitter {
  constructor() {
    this._handlers = new Map();
  }
  on(name, fn) {
    if (!this._handlers.has(name)) this._handlers.set(name, new Set());
    this._handlers.get(name).add(fn);
    return () => this.off(name, fn);
  }
  once(name, fn) {
    const off = this.on(name, (data) => { off(); fn(data); });
    return off;
  }
  off(name, fn) {
    this._handlers.get(name)?.delete(fn);
  }
  emit(name, data) {
    this._handlers.get(name)?.forEach((fn) => safe(() => fn(data)));
    this._handlers.get('*')?.forEach((fn) => safe(() => fn(name, data)));
  }
  clearListeners() {
    this._handlers.clear();
  }
}

function safe(fn) {
  try { fn(); } catch (err) { console.error('[purble-place] listener error', err); }
}
