// PurblePlace – the application shell. It owns the DOM, scales the fixed 800x600
// stage into whatever container it is given, switches between the hub and the
// mini-games, and exposes the public API described in docs/INTEGRATION.md.

import { Emitter } from '../core/emitter.js';
import { h } from '../core/dom.js';
import { Rng } from '../core/rng.js';
import { createStorage } from '../core/storage.js';
import { Sound } from '../core/audio.js';
import { Stats } from '../core/stats.js';
import { Overlay, starsHTML } from '../core/ui.js';
import { esc, fmtTime } from '../core/util.js';
import { createTranslator, localizeGame } from '../i18n/index.js';
import { getRegisteredGames, validateGame } from '../registry.js';
import { Menubar } from './menubar.js';
import { Hub } from './hub.js';

export const STAGE_W = 800;
export const STAGE_H = 600;
export const VERSION = '1.0.0';

const DEFAULT_CSS = new URL('../styles/index.css', import.meta.url).href;
const DEFAULT_SOUNDS = new URL('../../assets/sounds/', import.meta.url).href;

// stylesheet reference counting per root node (document or shadow root)
const styleRefs = new WeakMap();

function acquireStyles(rootNode, href) {
  const host = rootNode.head || rootNode; // document.head, or the ShadowRoot itself
  let entry = styleRefs.get(rootNode);
  if (!entry) { entry = new Map(); styleRefs.set(rootNode, entry); }
  let rec = entry.get(href);
  if (!rec) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.purblePlace = '';
    rec = { count: 0, link, loaded: new Promise((resolve) => {
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 3000);
    }) };
    host.append(link);
    entry.set(href, rec);
  }
  rec.count += 1;
  return {
    loaded: rec.loaded,
    release() {
      rec.count -= 1;
      if (rec.count <= 0) { rec.link.remove(); entry.delete(href); }
    },
  };
}

export class PurblePlace extends Emitter {
  /**
   * @param {HTMLElement} container
   * @param {object} [options] see docs/INTEGRATION.md
   */
  constructor(container, options = {}) {
    super();
    if (!container || !container.appendChild) throw new Error('PurblePlace: a container element is required');
    this.container = container;
    this.opts = {
      menubar: true, sound: true, autoFocus: true, injectStyles: true, cssUrl: DEFAULT_CSS, soundBase: DEFAULT_SOUNDS,
      storageKey: 'purble-place', maxScale: Infinity, ...options,
    };
    this.t = createTranslator(this.opts.strings);
    this.storage = createStorage(this.opts.storage, this.opts.storageKey);
    this.settings = { muted: false, colorblind: false, ...this.storage.get('settings', {}) };
    if (this.opts.sound === false) this.settings.muted = true;
    this.sound = new Sound({ muted: this.settings.muted, base: this.opts.soundBase || null });
    this.sound.preload();   // about 4 MB; nothing is fetched while muted
    this.stats = new Stats(this.storage);
    this.rng = new Rng(this.opts.seed);
    this.view = 'hub';
    this.game = null;
    this.gameDef = null;
    this.destroyed = false;

    this.games = new Map();
    const defs = [...getRegisteredGames(), ...(this.opts.games || [])];
    defs.forEach((d) => this._addGame(d));

    this._buildDom();
    this._offs = [];
    this._bindEvents();
    this._styles = this.opts.injectStyles ? acquireStyles(container.getRootNode(), this.opts.cssUrl) : null;
    if (this._styles) {
      this.root.style.visibility = 'hidden';
      this._styles.loaded.then(() => { if (!this.destroyed) { this.root.style.visibility = ''; this.resize(); } });
    }

    container.append(this.root);
    this.resize();
    if (this.opts.startGame && this.games.has(this.opts.startGame)) this.openGame(this.opts.startGame, this.opts.startLevel);
    else this.goHome();
    if (this.opts.autoFocus) this.focus();
  }

  // ───────────────────────────── public API ─────────────────────────────

  /** Games in hub order, with translated titles. */
  listGames() {
    return [...this.games.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100)).map((d) => localizeGame(d, this.t));
  }

  /** Add a game to this instance only (use `registerGame` from the package for all instances). */
  registerGame(def) {
    this._addGame(def);
    if (this.view === 'hub') this.goHome();
  }

  openGame(id, levelId) {
    const def = this.games.get(id);
    if (!def) throw new Error(`Unknown game "${id}"`);
    this._closeGame();
    this.overlay.closeAll();
    const local = localizeGame(def, this.t);
    const ctx = {
      app: this,
      sound: this.sound,
      stats: this.stats,
      storage: this.storage.sub(def.id),
      settings: this.settings,
      rng: this.rng.fork(),
      t: this.t,
      toStage: (e) => this.toStage(e),
    };
    const game = new def.Game(ctx, local);
    this.game = game;
    this.gameDef = local;
    this.view = 'game';
    this.hub.el.hidden = true;
    game.mount(this.screens);
    this.menubar?.refresh();
    this.emit('navigate', { view: 'game', game: id });
    game.start(levelId);
    this.focus();
  }

  goHome() {
    this._closeGame();
    this.overlay.closeAll();
    this.view = 'hub';
    this.hub.render(this.listGames());
    this.hub.el.hidden = false;
    this.hub.fit();
    this.menubar?.refresh();
    this.emit('navigate', { view: 'hub' });
  }

  newGame() {
    this.game?.newGame();
  }

  pause() { this.game?.pause(); }
  resume() { this.game?.resume(); }
  focus() { this.root.focus({ preventScroll: true }); }

  setMuted(muted) { this.setSetting('muted', !!muted); }

  setSetting(key, value) {
    this.settings[key] = value;
    this.storage.set('settings', this.settings);
    if (key === 'muted') this.sound.setMuted(value);
    this.game?.onSettings();
    this.emit('settings', { ...this.settings });
  }

  dialog(opts) { return this.overlay.dialog(opts); }
  toast(text, ms) { this.overlay.toast(text, ms); }

  /** Re-measure the container. Called automatically via ResizeObserver; call it manually if your host animates sizes. */
  resize() {
    const w = this.viewport.clientWidth;
    const hgt = this.viewport.clientHeight;
    if (!w || !hgt) return;
    const scale = Math.min(this.opts.maxScale, w / STAGE_W, hgt / STAGE_H);
    const x = Math.round((w - STAGE_W * scale) / 2);
    const y = Math.round((hgt - STAGE_H * scale) / 2);
    this.stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.scale = scale;
  }

  /** Pointer event -> stage (800x600) coordinates. */
  toStage(e) {
    const r = this.stage.getBoundingClientRect();
    const k = r.width / STAGE_W || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  }

  /**
   * Declarative menu structure. Hosts with their own chrome can render this
   * (set `menubar: false`) and call item.action() on click.
   */
  getMenuModel() {
    const t = this.t;
    const game = this.game;
    const levels = this.gameDef?.levels || [];
    const gameItems = [
      { label: t('menu.newGame'), shortcut: 'F2', action: () => this.newGame(), disabled: !game },
      { label: t('menu.level'), disabled: !game, submenu: levels.map((l) => ({ label: l.name, checked: game?.level === l.id, action: () => game.startLevel(l.id) })) },
    ];
    const extra = (game?.getMenu() || []).filter(Boolean);
    if (extra.length) gameItems.push({ separator: true }, ...extra);
    gameItems.push(
      { separator: true },
      { label: t('menu.sound'), checked: !this.settings.muted, action: () => this.setMuted(!this.settings.muted) },
      { label: t('menu.stats'), action: () => this.showStats() },
      { separator: true },
      { label: t('menu.home'), disabled: this.view === 'hub', action: () => this.goHome() },
      { label: t('menu.exit'), shortcut: 'Alt+F4', hidden: !this.opts.onExit, action: () => this.opts.onExit?.() },
    );
    return [
      { label: t('menu.game'), items: gameItems },
      { label: t('menu.help'), items: [
        { label: t('menu.howto'), shortcut: 'F1', action: () => this.showHelp() },
        { label: t('menu.about'), action: () => this.showAbout() },
      ] },
    ];
  }

  showHelp() {
    const release = this.game?.holdPause('help');
    const body = this.game ? this.game.helpHTML() : this.t('hub.help');
    const title = this.game ? this.t('menu.helpTitle', { game: this.gameDef.title }) : this.t('menu.helpHub');
    this.overlay.dialog({ title, body, className: 'pp-dialog-help', mascot: { body: '#a45fd8', mood: 'happy', hat: 'party' }, onClose: () => release?.() });
  }

  showAbout() {
    const release = this.game?.holdPause('about');
    this.overlay.dialog({
      title: this.t('menu.about'),
      body: this.t('about.body', { version: VERSION }),
      mascot: { body: '#4fb8c9', mood: 'excited', hat: 'crown' },
      onClose: () => release?.(),
    });
  }

  showStats() {
    const t = this.t;
    const release = this.game?.holdPause('stats');
    let rows = '';
    for (const def of this.listGames()) {
      for (const lvl of def.levels) {
        const s = this.stats.get(def.id, lvl.id);
        if (!s.played) continue;
        const b = s.best;
        rows += `<tr><td>${esc(def.title)}</td><td>${esc(lvl.name)}</td><td>${s.won}/${s.played}</td>
          <td>${b.stars ? starsHTML(b.stars) : '–'}</td><td>${b.score ?? '–'}</td><td>${b.time != null ? fmtTime(b.time) : '–'}</td></tr>`;
      }
    }
    const body = rows
      ? `<table class="pp-stats"><thead><tr><th>${t('stats.game')}</th><th>${t('stats.level')}</th><th>${t('stats.won')}</th><th>${t('stats.stars')}</th><th>${t('stats.score')}</th><th>${t('stats.time')}</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<p>${t('stats.empty')}</p>`;
    this.overlay.dialog({
      title: t('menu.stats'),
      body,
      className: 'pp-dialog-wide',
      buttons: [
        { label: t('stats.reset'), onClick: () => { this.stats.reset(); this.hub.refresh(); if (this.view === 'hub') this.goHome(); } },
        { label: t('common.close'), primary: true },
      ],
      onClose: () => release?.(),
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('destroy');
    this._closeGame();
    this._offs.forEach((off) => off());
    this.menubar?.destroy();
    this.overlay.destroy();
    this.sound.destroy();
    this.resizeObserver?.disconnect();
    this.root.remove();
    this._styles?.release();
    this.clearListeners();
  }

  // ───────────────────────────── internals ─────────────────────────────

  _addGame(def) {
    const problems = validateGame(def);
    if (problems.length) throw new Error(`Invalid game "${def?.id ?? '?'}": ${problems.join('; ')}`);
    this.games.set(def.id, def);
  }

  _buildDom() {
    this.screens = h('div', { class: 'pp-screens' });
    this.overlayLayer = h('div', { class: 'pp-overlay' });
    this.stage = h('div', { class: 'pp-stage', style: { width: `${STAGE_W}px`, height: `${STAGE_H}px` } }, this.screens, this.overlayLayer);
    this.viewport = h('div', { class: 'pp-viewport' }, this.stage);
    this.root = h('div', { class: 'pp-root', tabindex: '0', role: 'application', 'aria-label': 'Purble Place' });
    this.overlay = new Overlay(this.overlayLayer, { sound: this.sound });
    this.hub = new Hub({
      stats: this.stats, t: this.t, sound: this.sound,
      onOpen: (id) => this.openGame(id),
    });
    this.screens.append(this.hub.el);
    if (this.opts.menubar) {
      this.menubar = new Menubar(this.root, () => this.getMenuModel(), { onAction: () => this.focus() });
      this.root.append(this.menubar.el);
    }
    this.root.append(this.viewport);
  }

  _bindEvents() {
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      this._offs.push(() => target.removeEventListener(type, fn, opts));
    };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.viewport);

    on(this.root, 'keydown', (e) => this._onKey(e));
    on(this.root, 'pointerdown', (e) => {
      if (!e.target.closest?.('button, input, select, textarea, [tabindex]')) this.focus();
    });
    on(this.root, 'contextmenu', (e) => e.preventDefault());
  }

  _onKey(e) {
    if (e.key === 'Escape') {
      if (this.menubar?.isOpen) { this.menubar.close(); this.focus(); }
      else this.overlay.closeTop();
      return;
    }
    if (e.key === 'F1') { e.preventDefault(); if (!this.overlay.count) this.showHelp(); return; }
    if (e.key === 'F2') { e.preventDefault(); if (!this.overlay.count) this.newGame(); return; }
    if (this.overlay.count || this.menubar?.isOpen) return;
    this.game?.onKey(e);
  }

  _closeGame() {
    if (!this.game) return;
    this.game.destroy();
    this.game = null;
    this.gameDef = null;
    this.menubar?.close();
  }
}
