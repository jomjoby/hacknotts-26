// Purble Pairs – memory-matching game. View/controller on top of logic.js.

import { MiniGame } from '../../core/mini-game.js';
import { h, clear } from '../../core/dom.js';
import { fmtTime } from '../../core/util.js';
import { PairsModel, PAIRS_LEVELS, starRating, scoreFor } from './logic.js';
import { symbolSVG, symbolName, tileBackSVG, iconSVG } from './art.js';

const BOARD = { x: 40, y: 96, w: 720, h: 476 };
const LOW_TURNS = 5;   // the turns counter turns red at this many left

export class PurblePairs extends MiniGame {
  init() {
    this.hud = {
      pairs: h('b', {}, '0 / 0'),
      turns: h('b', {}, '0'),
      time: h('b', {}, '0:00'),
    };
    this.boardEl = h('div', { class: 'pr-board', role: 'grid' });
    this.banner = h('div', { class: 'pr-banner', 'aria-live': 'polite' });
    this.turnsChip = h('div', { class: 'pr-chip' }, this.t('pairs.hud.turns'), ' ', this.hud.turns);
    this.el.append(
      h('div', { class: 'pr-table' }),
      h('div', { class: 'pr-hud' },
        h('div', { class: 'pr-chip' }, this.t('pairs.hud.pairs'), ' ', this.hud.pairs),
        h('div', { class: 'pr-chip pr-chip-title' }, this.def.title),
        this.turnsChip,
        h('div', { class: 'pr-chip' }, this.t('pairs.hud.time'), ' ', this.hud.time)),
      this.boardEl,
      this.banner);

    this.listen(this.boardEl, 'keydown', (e) => this.onBoardKey(e));
  }

  begin(levelId) {
    const cfg = PAIRS_LEVELS[levelId];
    this.cfg = cfg;
    this.model = new PairsModel({ ...cfg, rng: this.rng });
    this.elapsed = 0;
    this.started = false;
    this.phase = 'play';
    this.focusIndex = 0;
    this._cancelMismatch?.();
    this._cancelMismatch = null;
    this.state = 'playing';

    this.buildBoard();
    this.updateHud(true);
    this.banner.classList.remove('is-on');
    this.sound.play('pairs-new');

    if (cfg.peek > 0) {
      this.phase = 'peek';
      this.model.tiles.forEach((tile, i) => this.setUp(i, true));
      this.showBanner(this.t('pairs.memorize'));
      this.after(cfg.peek, () => {
        this.model.tiles.forEach((tile, i) => this.setUp(i, false));
        this.banner.classList.remove('is-on');
        this.phase = 'play';
        this.sound.play('unflip');
      });
    }
  }

  showBanner(text) {
    this.banner.textContent = text;
    this.banner.classList.add('is-on');
  }

  buildBoard() {
    const { cols, rows } = this.cfg;
    const gap = cols >= 8 ? 8 : cols >= 6 ? 10 : 14;
    const size = Math.floor(Math.min((BOARD.w - gap * (cols - 1)) / cols, (BOARD.h - gap * (rows - 1)) / rows));
    const width = size * cols + gap * (cols - 1);
    const height = size * rows + gap * (rows - 1);
    const left = BOARD.x + (BOARD.w - width) / 2;
    const top = BOARD.y + (BOARD.h - height) / 2;

    clear(this.boardEl);
    this.boardEl.style.setProperty('--pr-tile', `${size}px`);
    this.boardEl.setAttribute('aria-rowcount', rows);
    this.boardEl.setAttribute('aria-colcount', cols);
    this.tileEls = this.model.tiles.map((tile, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const el = h('button', {
        class: 'pr-tile',
        type: 'button',
        role: 'gridcell',
        tabindex: i === this.focusIndex ? '0' : '-1',
        style: { left: `${left + c * (size + gap) - BOARD.x}px`, top: `${top + r * (size + gap) - BOARD.y}px`, width: `${size}px`, height: `${size}px` },
        dataset: { index: i },
        'aria-label': this.tileLabel(i),
        onClick: () => this.onTile(i),
        onFocus: () => { this.focusIndex = i; },
      },
      h('span', { class: 'pr-tile-inner' },
        h('span', { class: 'pr-face pr-back', html: tileBackSVG() }),
        h('span', { class: 'pr-face pr-front' })));
      return el;
    });
    this.boardEl.append(...this.tileEls);
    this.boardEl.style.left = `${BOARD.x}px`;
    this.boardEl.style.top = `${BOARD.y}px`;
    this.boardEl.style.width = `${BOARD.w}px`;
    this.boardEl.style.height = `${BOARD.h}px`;
  }

  tileLabel(i) {
    const tile = this.model.tiles[i];
    const { cols } = this.cfg;
    const pos = this.t('pairs.tileAt', { row: Math.floor(i / cols) + 1, col: (i % cols) + 1 });
    if (tile.state === 'down') return `${pos}: ${this.t('pairs.faceDown')}`;
    return `${pos}: ${symbolName(tile.symbol)}${tile.state === 'matched' ? ` (${this.t('pairs.matched')})` : ''}`;
  }

  /** Visually flip a tile face-up/down. */
  setUp(i, up) {
    const el = this.tileEls[i];
    if (!el) return;
    if (up) el.querySelector('.pr-front').innerHTML = symbolSVG(this.model.tiles[i].symbol);
    el.classList.toggle('is-up', up);
    el.setAttribute('aria-label', up ? `${this.t('pairs.tileAt', { row: Math.floor(i / this.cfg.cols) + 1, col: (i % this.cfg.cols) + 1 })}: ${symbolName(this.model.tiles[i].symbol)}` : this.tileLabel(i));
  }

  onTile(i) {
    if (this.phase !== 'play' || this.paused || this.state !== 'playing' || this.model.outOfTurns) return;
    const res = this.model.flip(i);
    if (res.type === 'ignored') return;
    this.started = true;

    if (res.hidden) {
      this._cancelMismatch?.();
      this._cancelMismatch = null;
      res.hidden.forEach((j) => this.setUp(j, false));
      this.sound.play('unflip');
    }
    if (res.swapped) this.animateSwap(res.swapped);

    this.setUp(i, true);
    this.sound.play('flip');

    if (res.kind === 'match') {
      this.after(0.4, () => {
        res.pair.forEach((j) => {
          this.tileEls[j].classList.add('is-matched');
          this.tileEls[j].setAttribute('aria-label', this.tileLabel(j));
        });
        this.sound.play('match');
      });
      if (res.done) this.after(1.1, () => this.win());
    } else if (res.kind === 'mismatch') {
      this.after(0.35, () => this.sound.play('mismatch'));
      this._cancelMismatch = this.after(1.05, () => {
        this._cancelMismatch = null;
        const hidden = this.model.dismissPending();
        if (!hidden) return;
        hidden.forEach((j) => this.setUp(j, false));
        this.sound.play('unflip');
        const swapped = this.model.takeSwap();
        if (swapped) this.after(0.35, () => this.animateSwap(swapped));
      });
    }
    if (this.model.outOfTurns) this.after(1.4, () => this.lose());   // let the last two tiles be seen first
    this.updateHud();
  }

  animateSwap(pair) {
    this.sound.play('swap');
    this.toast(this.t('pairs.swapped'), 2600);
    for (const j of pair) {
      const el = this.tileEls[j];
      el.classList.remove('is-swapped');
      void el.offsetWidth;
      el.classList.add('is-swapped');
      this.after(0.8, () => el.classList.remove('is-swapped'));
    }
  }

  win() {
    if (this.state !== 'playing') return;
    const m = this.model;
    const seconds = Math.round(this.elapsed);
    const stars = starRating(m.pairs, m.turns);
    const score = scoreFor({ pairs: m.pairs, turns: m.turns, mismatches: m.mismatches, seconds });
    this.finish({
      won: true, stars, score, time: seconds, moves: m.turns,
      sound: 'pairs-win',
      title: this.t('pairs.win.title'),
      text: this.t('pairs.win.text', { pairs: m.pairs, turns: m.turns, time: fmtTime(seconds), score }),
    });
  }

  lose() {
    if (this.state !== 'playing') return;
    const m = this.model;
    this.finish({
      won: false, time: Math.round(this.elapsed), moves: m.turns,
      sound: 'lose-fanfare',
      title: this.t('pairs.lose.title'),
      text: this.t('pairs.lose.text', { found: m.matched, pairs: m.pairs, turns: m.maxTurns }),
    });
  }

  update(dt) {
    if (this.state !== 'playing' || this.phase !== 'play') return;
    if (this.started) {
      const before = Math.floor(this.elapsed);
      this.elapsed += dt;
      if (Math.floor(this.elapsed) !== before) this.updateHud();
    }
  }

  updateHud(force) {
    const m = this.model;
    if (!m) return;
    this.hud.pairs.textContent = `${m.matched} / ${m.pairs}`;
    this.hud.turns.textContent = m.maxTurns ? `${m.turns} / ${m.maxTurns}` : String(m.turns);
    this.turnsChip.classList.toggle('is-low', m.maxTurns > 0 && m.turnsLeft <= LOW_TURNS);
    this.hud.time.textContent = fmtTime(this.elapsed || 0);
    if (force) this.hud.time.textContent = '0:00';
  }

  onBoardKey(e) {
    if (!this.cfg) return;
    const { cols, rows } = this.cfg;
    const total = cols * rows;
    let next = this.focusIndex;
    switch (e.key) {
      case 'ArrowRight': next = Math.min(total - 1, next + 1); break;
      case 'ArrowLeft': next = Math.max(0, next - 1); break;
      case 'ArrowDown': next = Math.min(total - 1, next + cols); break;
      case 'ArrowUp': next = Math.max(0, next - cols); break;
      case 'Home': next = 0; break;
      case 'End': next = total - 1; break;
      default: return;
    }
    e.preventDefault();
    this.tileEls[this.focusIndex].tabIndex = -1;
    this.focusIndex = next;
    this.tileEls[next].tabIndex = 0;
    this.tileEls[next].focus({ preventScroll: true });
  }

  helpHTML() {
    return this.t('pairs.help');
  }
}

export const purblePairs = {
  id: 'purble-pairs',
  title: 'Pair Programming',
  order: 20,
  levels: [
    { id: 'beginner', name: 'First Year' },
    { id: 'intermediate', name: 'Second Year' },
    { id: 'advanced', name: 'Final Year' },
  ],
  Game: PurblePairs,
  hub: { accent: '#8e6bd8', colors: ['#b48cff', '#4f7dff'] },
  icon: iconSVG(),
};
