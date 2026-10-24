// Purble Shop – code-breaking game. View/controller on top of logic.js.

import { MiniGame } from '../../core/mini-game.js';
import { h, clear } from '../../core/dom.js';
import { purble } from '../../core/purble.js';
import { SHOP_LEVELS, ShopModel, starRating, scoreFor } from './logic.js';
import { ITEM_COLORS, glyphSVG, itemStyle, iconSVG } from './art.js';

const BOARD_H = 396; // vertical room for the guess rows

export class PurbleShop extends MiniGame {
  init() {
    this.bubble = h('div', { class: 'sh-bubble', 'aria-live': 'polite' });
    this.mascot = h('div', { class: 'sh-mascot' });
    this.secretEl = h('div', { class: 'sh-secret' });
    this.rowsEl = h('div', { class: 'sh-rows' });
    this.infoEl = h('div', { class: 'sh-info' });
    this.paletteEl = h('div', { class: 'sh-palette' });
    this.btnCheck = h('button', { class: 'pp-btn pp-btn-primary sh-btn-check', type: 'button', onClick: () => this.check() }, this.t('shop.check'));
    this.btnClear = h('button', { class: 'pp-btn sh-btn', type: 'button', onClick: () => this.clearRow() }, this.t('shop.clearRow'));
    this.btnHint = h('button', { class: 'pp-btn sh-btn', type: 'button', onClick: () => this.hint() }, '');
    this.el.append(
      h('div', { class: 'sh-wall' }),
      h('div', { class: 'sh-board' },
        h('div', { class: 'sh-secret-wrap' }, h('div', { class: 'sh-label' }, this.t('shop.secret')), this.secretEl),
        this.rowsEl),
      h('div', { class: 'sh-side' },
        h('div', { class: 'sh-keeper' }, this.bubble, this.mascot),
        h('div', { class: 'sh-shelf' },
          h('div', { class: 'sh-label' }, this.t('shop.pick')),
          this.infoEl,
          this.paletteEl),
        h('div', { class: 'sh-controls' }, this.btnCheck, h('div', { class: 'sh-controls-row' }, this.btnClear, this.btnHint)),
        h('div', { class: 'sh-legend' },
          h('span', { class: 'sh-peg is-exact' }), ` ${this.t('shop.legend.exact')}`,
          h('br'),
          h('span', { class: 'sh-peg is-partial' }), ` ${this.t('shop.legend.partial')}`)));
  }

  onSettings() {
    if (this.model) this.render();
  }

  begin(levelId) {
    this.cfg = SHOP_LEVELS[levelId];
    this.model = new ShopModel({ ...this.cfg, rng: this.rng });
    this.drag = null;
    this.mood = 'happy';
    this.state = 'playing';
    this.say(this.t('shop.say.start'));
    this.render();
  }

  say(text, mood) {
    this.bubble.textContent = text;
    if (mood) this.mood = mood;
    this.mascot.innerHTML = purble({ body: '#5fd0e0', hat: 'cap', lanyard: true, mood: this.mood, look: -0.6 });
  }

  // ───────────────────────────── rendering ─────────────────────────────

  item(colorIndex, extra = '') {
    const c = ITEM_COLORS[colorIndex];
    const showGlyph = this.ctx.settings.colorblind;
    return h('span', {
      class: ['sh-item', extra],
      style: itemStyle(colorIndex),
      title: c.name,
      html: showGlyph ? glyphSVG(c.glyph) : '',
    });
  }

  render() {
    const m = this.model;
    const rowH = Math.min(46, Math.floor(BOARD_H / m.maxGuesses));
    this.el.style.setProperty('--sh-row', `${rowH}px`);
    this.el.style.setProperty('--sh-item', `${Math.min(36, rowH - 8)}px`);

    this.renderSecret();
    this.renderRows();
    this.renderPalette();

    this.infoEl.textContent = this.t('shop.info', {
      slots: this.cfg.slots,
      colors: this.cfg.colors,
      rule: this.cfg.duplicates ? this.t('shop.repeatsOk') : this.t('shop.noRepeats'),
    });
    this.btnCheck.disabled = !m.full || m.over;
    this.btnClear.disabled = m.over || m.current.every((c) => c === null);
    this.btnHint.disabled = m.over || m.hintsLeft <= 0;
    this.btnHint.textContent = this.t('shop.hint', { n: m.hintsLeft });
    this.mascot.innerHTML = purble({ body: '#5fd0e0', hat: 'cap', lanyard: true, mood: this.mood, look: -0.6 });
  }

  renderSecret() {
    const m = this.model;
    clear(this.secretEl);
    for (let i = 0; i < m.slots; i++) {
      const slot = h('span', { class: 'sh-slot sh-secret-slot' });
      if (m.over) slot.append(this.item(m.secret[i], 'is-reveal'));
      else if (m.revealed[i]) slot.append(this.item(m.secret[i], 'is-hinted'));
      else slot.append(h('span', { class: 'sh-cover' }, '?'));
      this.secretEl.append(slot);
    }
  }

  renderRows(justScored = -1) {
    const m = this.model;
    clear(this.rowsEl);
    for (let r = 0; r < m.maxGuesses; r++) {
      const done = m.rows[r];
      const active = r === m.rows.length && !m.over;
      const row = h('div', { class: ['sh-row', done && 'is-done', active && 'is-active', r === justScored && 'is-new'] });
      row.append(h('span', { class: 'sh-num' }, r + 1));
      const slots = h('span', { class: 'sh-slots' });
      for (let s = 0; s < m.slots; s++) {
        const color = done ? done.guess[s] : active ? m.current[s] : null;
        const slot = h('span', { class: 'sh-slot', dataset: { slot: s } });
        if (color !== null) {
          const it = this.item(color);
          slot.append(it);
          if (active) {
            slot.classList.add('is-filled');
            slot.addEventListener('pointerdown', (e) => this.startDrag(e, color, s));
            slot.addEventListener('click', (e) => { if (e.detail === 0) this.removeFrom(s); });
            slot.tabIndex = 0;
            slot.setAttribute('role', 'button');
            slot.setAttribute('aria-label', this.t('shop.slotFilled', { n: s + 1, color: ITEM_COLORS[color].name }));
          }
        } else if (active) {
          slot.setAttribute('aria-label', this.t('shop.slotEmpty', { n: s + 1 }));
        }
        slots.append(slot);
      }
      row.append(slots);
      const clues = h('span', { class: 'sh-clues', 'aria-label': done ? this.t('shop.clueLabel', { exact: done.exact, partial: done.partial }) : null });
      const cols = Math.ceil(m.slots / 2);
      clues.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      for (let k = 0; k < m.slots; k++) {
        const kind = done ? (k < done.exact ? 'is-exact' : k < done.exact + done.partial ? 'is-partial' : '') : '';
        clues.append(h('span', { class: ['sh-peg', kind] }));
      }
      row.append(clues);
      this.rowsEl.append(row);
    }
  }

  renderPalette() {
    const m = this.model;
    clear(this.paletteEl);
    for (let c = 0; c < m.colors; c++) {
      const info = ITEM_COLORS[c];
      const btn = h('button', {
        class: 'sh-pal',
        type: 'button',
        disabled: m.over || null,
        'aria-label': this.t('shop.palItem', { color: info.name, key: c + 1 }),
        onPointerDown: (e) => this.startDrag(e, c, null),
        onClick: (e) => { if (e.detail === 0) this.addColor(c); },
      }, this.item(c), h('span', { class: 'sh-pal-key' }, c + 1));
      this.paletteEl.append(btn);
    }
  }

  // ───────────────────────────── actions ─────────────────────────────

  addColor(color) {
    const slot = this.model.fillNext(color);
    if (slot < 0) { this.toast(this.t('shop.rowFull')); return; }
    this.sound.play('place');
    this.render();
  }

  removeFrom(slot) {
    if (this.model.clearSlot(slot)) {
      this.sound.play('remove');
      this.render();
    }
  }

  clearRow() {
    this.model.clearRow();
    this.sound.play('remove');
    this.render();
  }

  check() {
    const m = this.model;
    if (m.over || this.paused) return;
    if (!m.full) { this.toast(this.t('shop.fillFirst')); return; }
    const index = m.rows.length;
    const row = m.submit();
    this.sound.play('check');
    this.say(this.clueText(row), row.exact >= m.slots - 1 && row.exact < m.slots ? 'excited' : 'happy');
    this.render();
    this.renderRows(index);
    if (m.status === 'won') {
      this.mood = 'excited';
      this.after(1.0, () => this.win());
    } else if (m.status === 'lost') {
      this.mood = 'sad';
      this.after(1.0, () => this.lose());
    }
  }

  clueText({ exact, partial }) {
    if (!exact && !partial) return this.t('shop.say.none');
    if (!partial) return this.t('shop.say.exactOnly', { exact });
    if (!exact) return this.t('shop.say.partialOnly', { partial });
    return this.t('shop.say.clue', { exact, partial });
  }

  hint() {
    const r = this.model.useHint(this.rng);
    if (!r) return;
    this.sound.play('hint');
    this.say(this.t('shop.say.hint', { n: r.slot + 1, color: ITEM_COLORS[r.color].name }), 'excited');
    this.render();
  }

  secretNames() {
    return this.model.secret.map((c) => ITEM_COLORS[c].name).join(', ');
  }

  win() {
    const m = this.model;
    const stars = starRating({ guessesUsed: m.guessesUsed, maxGuesses: m.maxGuesses, hintsUsed: m.hintsUsed });
    const score = scoreFor({ guessesUsed: m.guessesUsed, maxGuesses: m.maxGuesses, hintsUsed: m.hintsUsed, slots: m.slots, colors: m.colors });
    this.render();
    this.say(this.t('shop.say.win'), 'excited');
    this.finish({
      won: true, stars, score, moves: m.guessesUsed,
      title: this.t('shop.win.title'),
      text: this.t('shop.win.text', { n: m.guessesUsed, score }),
    });
  }

  lose() {
    this.render();
    this.say(this.t('shop.say.lose'), 'sad');
    this.finish({
      won: false, moves: this.model.guessesUsed,
      title: this.t('shop.lose.title'),
      text: this.t('shop.lose.text', { secret: this.secretNames() }),
    });
  }

  // ───────────────────────────── drag & drop ─────────────────────────────

  startDrag(e, color, fromSlot) {
    if (e.button !== 0 || this.model.over || this.paused || this.drag) return;
    const target = e.currentTarget;
    const drag = { color, fromSlot, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
    this.drag = drag;
    try { target.setPointerCapture(e.pointerId); } catch { /* not capturable */ }

    const finish = (ev, cancelled) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
      drag.ghost?.remove();
      this.el.querySelectorAll('.is-lifted, .is-drop').forEach((n) => n.classList.remove('is-lifted', 'is-drop'));
      this.drag = null;
      if (cancelled) return;
      this.dropped(drag, ev);
    };
    const move = (ev) => {
      if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 5) {
        drag.moved = true;
        drag.ghost = this.item(color, 'sh-ghost');
        this.el.append(drag.ghost);
        if (fromSlot !== null) target.classList.add('is-lifted');
      }
      if (!drag.moved) return;
      const p = this.ctx.toStage(ev);
      drag.ghost.style.left = `${p.x}px`;
      drag.ghost.style.top = `${p.y}px`;
      this.el.querySelectorAll('.is-drop').forEach((n) => n.classList.remove('is-drop'));
      const slot = this.slotAt(ev);
      if (slot !== null) this.rowsEl.querySelector(`.is-active [data-slot="${slot}"]`)?.classList.add('is-drop');
    };
    const up = (ev) => finish(ev, false);
    const cancel = (ev) => finish(ev, true);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', cancel);
  }

  slotAt(ev) {
    const root = this.el.getRootNode();
    const hit = root.elementFromPoint?.(ev.clientX, ev.clientY);
    const slot = hit?.closest?.('.sh-slot');
    if (!slot || !slot.closest('.sh-row.is-active') || slot.dataset.slot === undefined) return null;
    return Number(slot.dataset.slot);
  }

  dropped(drag, ev) {
    const m = this.model;
    if (!drag.moved) {
      // plain click
      if (drag.fromSlot === null) this.addColor(drag.color);
      else this.removeFrom(drag.fromSlot);
      return;
    }
    const to = this.slotAt(ev);
    if (to !== null) {
      if (drag.fromSlot === null) m.place(to, drag.color);
      else m.swapSlots(drag.fromSlot, to);
      this.sound.play('place');
    } else if (drag.fromSlot !== null) {
      m.clearSlot(drag.fromSlot);
      this.sound.play('remove');
    }
    this.render();
  }

  // ───────────────────────────── keyboard & help ─────────────────────────────

  onKey(e) {
    if (!this.model || this.model.over || e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = e.target.closest?.('button, [role="button"]');
    if (/^[1-9]$/.test(e.key)) {
      const c = Number(e.key) - 1;
      if (c < this.model.colors) { e.preventDefault(); this.addColor(c); }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const last = this.model.current.map((c, i) => (c === null ? -1 : i)).filter((i) => i >= 0).pop();
      if (last !== undefined) this.removeFrom(last);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      this.clearRow();
    } else if (e.key === 'Enter' && !onButton) {
      e.preventDefault();
      this.check();
    } else if (e.key.toLowerCase() === 'h' && !onButton) {
      this.hint();
    }
  }

  getMenu() {
    return [
      { label: this.t('shop.menu.hint'), shortcut: 'H', action: () => this.hint(), disabled: !this.model || this.model.over },
      { label: this.t('shop.menu.symbols'), checked: !!this.ctx.settings.colorblind, action: () => this.ctx.app.setSetting('colorblind', !this.ctx.settings.colorblind) },
    ];
  }

  helpHTML() {
    return this.t('shop.help');
  }
}

export const purbleShop = {
  id: 'purble-shop',
  title: 'Crack the Code',
  order: 30,
  levels: [
    { id: 'beginner', name: 'First Year' },
    { id: 'intermediate', name: 'Second Year' },
    { id: 'advanced', name: 'Final Year' },
  ],
  Game: PurbleShop,
  hub: { accent: '#2fb5c8', colors: ['#22d3e6', '#2fc46b'] },
  icon: iconSVG(),
};
