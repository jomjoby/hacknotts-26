// Base class every mini-game extends. It gives a game:
//   * a root element (`this.el`) mounted in the 800x600 stage
//   * a pausable game clock (`update(dt)`, `after(sec, fn)`)
//   * level selection, result dialogs and statistics for free
//   * automatic clean-up of listeners/timers on destroy()
//
// A game only has to override `begin(levelId)` (build/reset the board) and,
// optionally, `update(dt)`, `helpHTML()`, `getMenu()` and `onKey(e)`.
// See docs/ADDING_MINIGAMES.md and examples/hello-purble.js.

import { h, listen } from './dom.js';
import { starsHTML } from './ui.js';

export class MiniGame {
  /**
   * @param {object} ctx  Provided by the shell: { app, sound, stats, storage, rng, t, toStage }
   * @param {object} def  The registered game definition ({ id, title, levels, … })
   */
  constructor(ctx, def) {
    this.ctx = ctx;
    this.def = def;
    // `pp-pending` hides the half-built board until a level has been chosen
    this.el = h('div', { class: `pp-screen pp-game pp-game-${def.id} pp-pending` });
    this.level = null;
    this.state = 'idle'; // idle | playing | over
    this.time = 0;       // seconds of un-paused game time since mount
    this.rng = ctx.rng;
    this._disposers = [];
    this._timers = [];
    this._holds = new Set();
    this._raf = 0;
    this._last = 0;
    this._dead = false;
    this._frame = this._frame.bind(this);
  }

  // ───────────────────────────── overridables ─────────────────────────────

  /** Called once, right after the element is attached to the stage. */
  init() {}
  /** Build/reset the board for `levelId`. Must call `this.state = 'playing'` when ready. */
  begin(levelId) { throw new Error(`${this.def.id}: begin() not implemented`); }
  /** Per-frame hook; only called while un-paused. */
  update(dt) {}
  /** Keyboard hook (the shell has already handled F1/F2/Esc). */
  onKey(e) {}
  /** Extra items for the Game menu: [{ label, shortcut?, checked?, disabled?, action }] */
  getMenu() { return []; }
  /** Help text (HTML) for Help ▸ How to Play. */
  helpHTML() { return `<p>${this.t('common.noHelp')}</p>`; }
  /** A global setting changed (sound, colour-blind symbols…); re-render if you depend on it. */
  onSettings() {}
  /** Called before the element is removed. */
  onDestroy() {}

  // ───────────────────────────── services ─────────────────────────────

  get t() { return this.ctx.t; }
  get sound() { return this.ctx.sound; }
  get storage() { return this.ctx.storage; }
  get levelDef() { return this.def.levels.find((l) => l.id === this.level) || null; }

  listen(target, type, fn, opts) {
    const off = listen(target, type, fn, opts);
    this._disposers.push(off);
    return off;
  }

  /** Game-clock timer: pauses with the game. Returns a cancel function. */
  after(seconds, fn) {
    const timer = { left: seconds, fn, dead: false };
    this._timers.push(timer);
    return () => { timer.dead = true; };
  }

  /** Hold the game paused (dialog open, host minimised…). Returns an idempotent release(). */
  holdPause(reason = 'hold') {
    const token = Symbol(reason);
    this._holds.add(token);
    return () => { this._holds.delete(token); };
  }

  get paused() { return this._holds.size > 0; }

  /** Host-driven pause/resume (public API, e.g. when the OS window is minimised). */
  pause() {
    if (!this._hostHold) this._hostHold = this.holdPause('host');
  }
  resume() {
    this._hostHold?.();
    this._hostHold = null;
  }

  /** Dialog that auto-pauses the game while open. */
  dialog(opts) {
    const release = this.holdPause('dialog');
    return this.ctx.app.dialog({
      ...opts,
      onClose: (reason) => { release(); opts.onClose?.(reason); },
    });
  }

  toast(text, ms) {
    this.ctx.app.toast(text, ms);
  }

  // ───────────────────────────── flow ─────────────────────────────

  /** Shell entry point. Shows level select unless a level is given. */
  start(levelId) {
    if (levelId && this.def.levels.some((l) => l.id === levelId)) this.startLevel(levelId);
    else this.openLevelSelect();
  }

  startLevel(levelId) {
    this._timers.length = 0;
    this.level = levelId;
    this.ctx.storage.set('lastLevel', levelId);
    this.state = 'idle';
    this.begin(levelId);
    this.el.classList.remove('pp-pending');
    this.ctx.app.emit('game:start', { game: this.def.id, level: levelId });
  }

  /** Restart the current level (F2) or ask for a level if none chosen yet. */
  newGame() {
    this.ctx.app.overlay.closeAll();
    if (this.level) this.startLevel(this.level);
    else this.openLevelSelect();
  }

  openLevelSelect() {
    const t = this.t;
    const list = h('div', { class: 'pp-levels' });
    const dlg = this.dialog({
      title: `${this.def.title}`,
      body: list,
      buttons: [{ label: t('common.backToHub'), onClick: () => this.ctx.app.goHome() }],
      className: 'pp-dialog-levels',
      onClose: (reason) => { if (reason === 'cancel' && !this.level) this.ctx.app.goHome(); },
    });
    for (const lvl of this.def.levels) {
      const best = this.ctx.stats.bestStars(this.def.id, lvl.id);
      list.append(h('button', {
        class: ['pp-level-btn', this.level === lvl.id ? 'is-current' : ''],
        type: 'button',
        onClick: () => { this.sound.play('select'); dlg.close('button'); this.startLevel(lvl.id); },
      },
      h('strong', {}, lvl.name),
      lvl.desc ? h('span', { class: 'pp-level-desc' }, lvl.desc) : null,
      h('span', { class: 'pp-level-best', html: starsHTML(best) })));
    }
  }

  /**
   * End the round: records stats, plays a jingle, emits `game:end` and shows the result dialog.
   * @param {object} r { won, stars, score, time, moves, title, text, mascot, sound }
   *                   `sound` names the jingle to play instead of the default win or lose one
   */
  finish(r) {
    this.state = 'over';
    const t = this.t;
    this.ctx.stats.record(this.def.id, this.level, r);
    this.ctx.app.emit('game:end', {
      game: this.def.id, level: this.level, won: !!r.won,
      stars: r.stars || 0, score: r.score, time: r.time, moves: r.moves,
    });
    this.sound.play(r.sound || (r.won ? 'win' : 'lose'));
    const body = `<p>${r.text || ''}</p>${r.won ? `<p class="pp-result-stars">${starsHTML(r.stars || 0)}</p>` : ''}`;
    this.dialog({
      title: r.title,
      body,
      mascot: r.mascot || { mood: r.won ? 'excited' : 'sad' },
      cancelable: false,
      buttons: [
        { label: t('common.playAgain'), primary: true, onClick: () => this.startLevel(this.level) },
        { label: t('common.changeLevel'), onClick: () => this.openLevelSelect() },
        { label: t('common.backToHub'), onClick: () => this.ctx.app.goHome() },
      ],
    });
  }

  // ───────────────────────────── plumbing (shell-facing) ─────────────────────────────

  mount(parent) {
    parent.append(this.el);
    this.init();
    this._raf = requestAnimationFrame(this._frame);
  }

  _frame(ts) {
    if (this._dead) return;
    const dt = this._last ? Math.min(0.1, (ts - this._last) / 1000) : 0;
    this._last = ts;
    if (!this.paused) this.advance(dt);
    this._raf = requestAnimationFrame(this._frame);
  }

  /**
   * Run the game clock forward by `dt` seconds: fires `after()` timers, then `update(dt)`.
   * Called every animation frame; also handy for deterministic tests and fast-forwarding.
   */
  advance(dt) {
    this.time += dt;
    for (const timer of this._timers.slice()) {
      if (timer.dead) continue;
      timer.left -= dt;
      if (timer.left <= 0) { timer.dead = true; timer.fn(); }
    }
    this._timers = this._timers.filter((x) => !x.dead);
    this.update(dt);
  }

  destroy() {
    this._dead = true;
    cancelAnimationFrame(this._raf);
    this._disposers.forEach((off) => off());
    this._disposers = [];
    this._timers = [];
    this.sound?.stopAll?.();   // a long recording should not play on over the town square
    this.onDestroy();
    this.el.remove();
  }
}
