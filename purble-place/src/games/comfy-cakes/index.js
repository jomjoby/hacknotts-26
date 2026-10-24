// Comfy Cakes – bakery conveyor-belt game. View/controller on top of logic.js.

import { MiniGame } from '../../core/mini-game.js';
import { h, s, svgEl, clear } from '../../core/dom.js';
import { purble } from '../../core/purble.js';
import { LEVELS, SHAPES, BATTERS, ICINGS, TOPPINGS, MAX_STRIKES, byId } from './config.js';
import { CakeWorld, SLOT, SLOT_X, BAKE, bakeState, starsForStrikes } from './logic.js';
import { cakeMarkup, cakeSignature, cakeSVG, controlIcon, sceneMarkup, iconSVG, BELT_Y, CAKE_SCALE } from './art.js';

const CARD_WIDTHS = { 1: 380, 2: 300, 3: 244 };
const CARD_GAP = 12;
const PANEL_W = 126;

export class ComfyCakes extends MiniGame {
  init() {
    this.scene = svgEl(sceneMarkup());
    this.cakeLayer = this.scene.querySelector('[data-layer="cakes"]');
    const role = (name) => this.scene.querySelector(`[data-role="${name}"]`);
    this.fx = {
      door: role('door'), glow: role('oven-glow'), glow2: role('oven-glow2'), smoke: role('smoke'),
      streamBatter: role('stream-batter'), streamIcing: role('stream-icing'), fall: role('fall'),
      tankBatter: role('tank-batter'), tankIcing: role('tank-icing'),
    };
    this.customersEl = h('div', { class: 'cc-customers' });
    this.panelsEl = h('div', { class: 'cc-panels' });
    this.hud = {
      served: h('b', {}, '0'), target: h('span', {}, '0'), score: h('b', {}, '0'),
      strikes: h('span', { class: 'cc-strikes', role: 'img' }),
      tip: h('div', { class: 'cc-tip', 'aria-live': 'polite' }),
    };
    this.el.append(
      this.scene,
      this.customersEl,
      this.panelsEl,
      h('div', { class: 'cc-hud' },
        h('div', { class: 'cc-hud-left' }, this.t('cakes.hud.served'), ' ', this.hud.served, ' / ', this.hud.target),
        this.hud.tip,
        h('div', { class: 'cc-hud-right' }, this.hud.strikes, h('span', { class: 'cc-score' }, this.t('cakes.hud.score'), ' ', this.hud.score))));
  }

  // ───────────────────────────── setup ─────────────────────────────

  begin(levelId) {
    this.world?.clearListeners();
    this.cfg = LEVELS[levelId];
    this.world = new CakeWorld(levelId, this.rng);
    this.cakeNodes = new Map();
    this.custNodes = new Map();
    clear(this.cakeLayer);
    clear(this.customersEl);
    this.fx.tankBatter.setAttribute('fill', byId(BATTERS, this.cfg.batters[0]).color);
    this.fx.tankIcing.setAttribute('fill', byId(ICINGS, this.cfg.icings[0]).color);
    this.buildPanels();
    this.bindWorld();
    this.hud.target.textContent = this.cfg.target;
    this.state = 'playing';
    this.sync();
    this.sound.play('tv-on');
  }

  bindWorld() {
    const w = this.world;
    const snd = (name) => () => this.sound.play(name);
    const sndLater = (name, seconds) => this.after(seconds, () => this.sound.play(name));
    w.on('pan', snd('cake-pan'));
    w.on('pour', ({ batter }) => {
      this.sound.play('cake-batter');
      sndLater('cake-filling', 0.15);
      this.fx.tankBatter.setAttribute('fill', byId(BATTERS, batter).color);
    });
    w.on('pipe', ({ icing }) => { this.sound.play('cake-frosting'); this.fx.tankIcing.setAttribute('fill', byId(ICINGS, icing).color); });
    w.on('topping', ({ count }) => this.sound.play(count ? 'cake-decor' : 'cake-rotate'));
    w.on('drop', () => { this.sound.play('cake-next'); sndLater('cake-shaker', 0.1); });
    w.on('belt', snd('cake-belt'));
    w.on('oven-start', snd('cake-flame'));
    w.on('oven-done', snd('ding'));
    w.on('oven-ready', snd('ding'));
    w.on('oven-open', ({ state }) => {
      this.sound.play('cake-button');
      this.sound.play(state === 'golden' ? 'ding' : 'strike');
      if (state !== 'golden') this.toast(this.t(state === 'raw' ? 'cakes.say.raw' : 'cakes.say.burnt'));
    });
    w.on('oven-burning', () => this.toast(this.t('cakes.say.burning')));
    w.on('pickup', snd('cake-boxed'));
    w.on('customer', snd('chef-enter'));
    w.on('leave', snd('chef-exit'));
    w.on('discard', snd('cake-dumped'));
    w.on('undo', snd('cake-back'));
    w.on('served', ({ customer, points }) => {
      this.sound.play('serve');
      this.floatText(`+${points}`, customer.seat);
    });
    w.on('strike', ({ reason, errors }) => {
      this.sound.play('strike');
      if (reason === 'patience') this.toast(this.t('cakes.say.tooSlow'));
      else this.toast(this.t('cakes.say.wrong', { what: errors.map((e) => this.t(`cakes.err.${e}`)).join(', ') }));
    });
    w.on('end', () => this.after(1.1, () => this.conclude()));
  }

  conclude() {
    const w = this.world;
    const t = this.t;
    if (w.status === 'won') {
      this.finish({
        won: true, stars: starsForStrikes(w.strikes), score: w.score, time: Math.round(w.time), moves: w.served,
        sound: 'comfy-win',
        title: t('cakes.win.title'),
        text: t('cakes.win.text', { served: w.served, strikes: w.strikes, score: w.score }),
      });
    } else {
      this.finish({
        won: false, score: w.score, time: Math.round(w.time), moves: w.served,
        title: t('cakes.lose.title'),
        text: t('cakes.lose.text', { served: w.served, target: w.target }),
      });
    }
  }

  // ───────────────────────────── control panels ─────────────────────────────

  buildPanels() {
    const w = this.world;
    const cfg = this.cfg;
    const t = this.t;
    clear(this.panelsEl);
    this.refs = { pan: [], batter: [], icing: [], topping: {}, trash: [], undo: [], panels: [] };

    const choice = (kind, id, name, onClick) => {
      const el = h('button', { class: 'cc-btn', type: 'button', title: name, 'aria-label': name, onClick: () => { if (!this.paused) onClick(id); } },
        h('span', { class: 'cc-btn-icon', html: controlIcon(kind, id) }),
        h('span', { class: 'cc-btn-label' }, name));
      return el;
    };

    const titles = ['cakes.st.pan', 'cakes.st.batter', 'cakes.st.oven', 'cakes.st.icing', 'cakes.st.toppings', 'cakes.st.pickup'];
    for (let slot = 0; slot < 6; slot++) {
      const trash = h('button', {
        class: 'cc-trash', type: 'button', title: t('cakes.trash'), 'aria-label': t('cakes.trash'),
        onClick: () => { if (!this.paused) w.discard(slot); },
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 13H6.2L5 7Zm3-3h8l1 2H7l1-2Z" fill="currentColor"/></svg>',
      });
      const undo = cfg.undo ? h('button', {
        class: 'cc-trash cc-undo', type: 'button', title: t('cakes.undo'), 'aria-label': t('cakes.undo'),
        onClick: () => { if (!this.paused) this.stepBack(slot); },
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A7.96 7.96 0 0 1 12.5 10c3.04 0 5.64 1.7 6.95 4.2l1.6-.95A9.95 9.95 0 0 0 12.5 8Z" fill="currentColor"/></svg>',
      }) : null;
      const body = h('div', { class: 'cc-panel-body' });
      const panel = h('section', { class: ['cc-panel', `cc-panel-${slot}`], style: { left: `${SLOT_X[slot] - PANEL_W / 2}px` } },
        h('header', {}, h('span', {}, `${slot + 1}. ${t(titles[slot])}`), h('span', { class: 'cc-tools' }, undo, trash)), body);
      this.refs.trash[slot] = trash;
      this.refs.undo[slot] = undo;
      this.refs.panels[slot] = panel;
      this.panelsEl.append(panel);

      if (slot === SLOT.PAN) {
        for (const id of cfg.shapes) {
          const b = choice('shape', id, byId(SHAPES, id).name, (x) => w.placePan(x));
          this.refs.pan.push(b); body.append(b);
        }
      } else if (slot === SLOT.BATTER) {
        for (const id of cfg.batters) {
          const b = choice('batter', id, byId(BATTERS, id).name, (x) => w.pourBatter(x));
          this.refs.batter.push(b); body.append(b);
        }
      } else if (slot === SLOT.OVEN) {
        this.buildOvenPanel(body);
      } else if (slot === SLOT.ICING) {
        for (const id of cfg.icings) {
          const b = choice('icing', id, byId(ICINGS, id).name, (x) => w.pipeIcing(x));
          this.refs.icing.push(b); body.append(b);
        }
      } else if (slot === SLOT.TOPPING) {
        for (const id of Object.keys(cfg.toppings)) {
          const b = choice('topping', id, byId(TOPPINGS, id).name, (x) => w.cycleTopping(x));
          const badge = h('span', { class: 'cc-badge' });
          b.append(badge);
          this.refs.topping[id] = { el: b, badge };
          body.append(b);
        }
        this.refs.done = h('button', { class: 'pp-btn pp-btn-primary cc-done', type: 'button', onClick: () => { if (!this.paused) w.finishToppings(); } }, t('cakes.done'));
        body.append(this.refs.done);
      } else {
        body.append(h('p', { class: 'cc-pickup-note' }, t('cakes.pickupNote')));
      }
    }
  }

  buildOvenPanel(body) {
    const cfg = this.cfg;
    const t = this.t;
    const refs = (this.refs.oven = {});
    if (cfg.markers) {
      refs.needle = h('i', { class: 'cc-needle' });
      refs.gauge = h('div', { class: 'cc-gauge', 'aria-hidden': 'true' },
        h('span', { class: 'z-raw', style: { width: `${BAKE.RAW_MAX * 100}%` } }),
        h('span', { class: 'z-gold', style: { width: `${(BAKE.GOLDEN_MAX - BAKE.RAW_MAX) * 100}%` } }),
        h('span', { class: 'z-burnt', style: { width: `${(1 - BAKE.GOLDEN_MAX) * 100}%` } }),
        refs.needle);
      refs.label = h('div', { class: 'cc-oven-label' });
      body.append(refs.gauge, refs.label);
    }
    if (cfg.ovenAuto) {
      body.append(h('p', { class: 'cc-pickup-note' }, t('cakes.ovenAuto')));
    } else {
      refs.button = h('button', { class: 'pp-btn pp-btn-primary cc-take', type: 'button', onClick: () => { if (!this.paused) this.world.openOven(); } }, t('cakes.takeOut'));
      body.append(refs.button);
      if (!cfg.markers) body.append(h('p', { class: 'cc-pickup-note' }, t('cakes.ovenWatch')));
    }
  }

  // ───────────────────────────── per-frame sync ─────────────────────────────

  update(dt) {
    if (!this.world) return;
    this.world.update(dt);
    this.sync();
  }

  sync() {
    this.syncCakes();
    this.syncFx();
    this.syncCustomers();
    this.syncPanels();
    this.syncHud();
  }

  syncCakes() {
    const w = this.world;
    const live = new Set();
    for (const cake of w.cakes) {
      live.add(cake.id);
      let node = this.cakeNodes.get(cake.id);
      if (!node) {
        const g = s('g', { class: 'cc-cake' });
        node = { g, inner: s('g'), sig: '' };
        g.append(node.inner);
        this.cakeLayer.append(g);
        this.cakeNodes.set(cake.id, node);
      }
      const sig = cakeSignature(cake);
      if (sig !== node.sig) {
        node.inner.innerHTML = cakeMarkup(cake);
        node.sig = sig;
      }
      const drop = cake.age < 0.3 ? Math.pow(1 - cake.age / 0.3, 2) * 70 : 0;
      node.g.setAttribute('transform', `translate(${cake.x.toFixed(1)} ${(BELT_Y - drop).toFixed(1)}) scale(${CAKE_SCALE})`);
      node.g.style.opacity = cake.age < 0.15 ? String(cake.age / 0.15) : '1';
    }
    for (const [id, node] of this.cakeNodes) {
      if (!live.has(id)) { node.g.remove(); this.cakeNodes.delete(id); }
    }
    this.scene.classList.toggle('is-moving', w.cakes.some((c) => c.phase === 'moving'));
  }

  syncFx() {
    const w = this.world;
    const fx = this.fx;
    const oven = w.cakeAt(SLOT.OVEN);
    const baking = !!oven && oven.phase === 'baking';
    fx.door.setAttribute('opacity', baking ? '1' : '0');
    const glow = baking ? 0.35 + 0.55 * Math.min(1, oven.bake) : 0;
    fx.glow.setAttribute('opacity', glow.toFixed(2));
    fx.glow2.setAttribute('opacity', (glow * 0.9).toFixed(2));
    fx.smoke.setAttribute('opacity', baking && oven.bake > BAKE.GOLDEN_MAX ? '1' : '0');

    const pour = w.cakeAt(SLOT.BATTER);
    if (pour?.work?.kind === 'pour') {
      const p = pour.work.t / pour.work.dur;
      const len = p < 0.12 ? (p / 0.12) * 30 : p > 0.85 ? 30 * (1 - (p - 0.85) / 0.15) : 30;
      fx.streamBatter.setAttribute('height', Math.max(0, len).toFixed(1));
      fx.streamBatter.setAttribute('fill', byId(BATTERS, pour.batter).color);
    } else {
      fx.streamBatter.setAttribute('height', '0');
    }

    const ice = w.cakeAt(SLOT.ICING);
    if (ice?.work?.kind === 'pipe') {
      fx.streamIcing.setAttribute('opacity', '1');
      fx.streamIcing.setAttribute('stroke', byId(ICINGS, ice.icing).color);
    } else {
      fx.streamIcing.setAttribute('opacity', '0');
    }

    const top = w.cakeAt(SLOT.TOPPING);
    fx.fall.setAttribute('opacity', top?.work?.kind === 'drop' ? '1' : '0');
  }

  // customers

  /** Cards get wider when fewer customers share the counter (room for the order in words). */
  get cardWidth() {
    return CARD_WIDTHS[this.cfg.maxCustomers] || CARD_WIDTHS[3];
  }

  customerLeft(seat) {
    const n = this.cfg.maxCustomers;
    const w = this.cardWidth;
    const total = n * w + (n - 1) * CARD_GAP;
    return (800 - total) / 2 + seat * (w + CARD_GAP);
  }

  makeCustomer(c) {
    const o = c.order;
    const lines = [];
    if (this.cfg.showText) {
      lines.push(`${byId(SHAPES, o.shape).name} ${byId(BATTERS, o.batter).name} cake`);
      lines.push(`${byId(ICINGS, o.icing).name} icing`);
      for (const [id, n] of Object.entries(o.toppings)) lines.push(n > 1 ? `${n} × ${byId(TOPPINGS, id).name}` : byId(TOPPINGS, id).name);
    }
    const face = h('div', { class: 'cc-face' });
    const bar = h('i');
    const el = h('button', {
      class: 'cc-customer', type: 'button', style: { left: `${this.customerLeft(c.seat)}px`, width: `${this.cardWidth}px` },
      'aria-label': this.t('cakes.customerLabel', { order: lines.join(', ') || 'order' }),
      onClick: () => this.serveTo(c.id),
    },
    face,
    h('div', { class: 'cc-ticket' },
      h('div', { class: 'cc-ticket-cake', html: cakeSVG(o) }),
      lines.length ? h('ul', {}, lines.map((l) => h('li', {}, l))) : null),
    h('div', { class: 'cc-bar' }, bar));
    return { el, face, bar, mood: '' };
  }

  syncCustomers() {
    const w = this.world;
    const live = new Set();
    const pickup = w.idleCakeAt(SLOT.PICKUP);
    for (const c of w.customers) {
      live.add(c.id);
      let node = this.custNodes.get(c.id);
      if (!node) {
        node = this.makeCustomer(c);
        this.custNodes.set(c.id, node);
        this.customersEl.append(node.el);
      }
      const frac = c.patience / c.maxPatience;
      node.bar.style.width = `${(frac * 100).toFixed(1)}%`;
      node.bar.className = frac > 0.5 ? 'is-good' : frac > 0.25 ? 'is-warn' : 'is-bad';
      let mood = 'happy';
      if (c.state === 'happy') mood = 'excited';
      else if (c.state === 'angry') mood = 'angry';
      else if (frac < 0.18) mood = 'angry';
      else if (frac < 0.38) mood = 'worried';
      else if (frac < 0.6) mood = 'neutral';
      if (mood !== node.mood) {
        node.mood = mood;
        node.face.innerHTML = purble({ body: c.body, hat: c.hat, lanyard: c.lanyard, antenna: c.antenna, suit: c.suit, mood, look: 0.5 });
      }
      node.el.classList.toggle('is-leaving', c.state !== 'waiting');
      node.el.classList.toggle('is-happy', c.state === 'happy');
      node.el.classList.toggle('is-angry', c.state === 'angry');
      node.el.classList.toggle('is-hot', c.state === 'waiting' && !!pickup);
      node.el.disabled = c.state !== 'waiting';
    }
    for (const [id, node] of this.custNodes) {
      if (!live.has(id)) { node.el.remove(); this.custNodes.delete(id); }
    }
  }

  serveTo(id) {
    if (this.paused || this.state !== 'playing') return;
    if (!this.world.idleCakeAt(SLOT.PICKUP)) {
      this.toast(this.t('cakes.noCake'));
      return;
    }
    this.world.serve(id);
  }

  floatText(text, seat) {
    const el = h('div', { class: 'cc-float', style: { left: `${this.customerLeft(seat) + this.cardWidth / 2}px` } }, text);
    this.el.append(el);
    this.after(1.2, () => el.remove());
  }

  // panels

  syncPanels() {
    const w = this.world;
    const r = this.refs;
    const set = (el, disabled) => { if (el.disabled !== disabled) el.disabled = disabled; };

    const panCan = w.playing && w.occ[SLOT.PAN] === null;
    r.pan.forEach((b) => set(b, !panCan));

    const batterCake = w.idleCakeAt(SLOT.BATTER);
    r.batter.forEach((b) => set(b, !(w.playing && batterCake && !batterCake.batter)));

    const iceCake = w.idleCakeAt(SLOT.ICING);
    r.icing.forEach((b) => set(b, !(w.playing && iceCake && !iceCake.icing)));

    const topCake = w.idleCakeAt(SLOT.TOPPING);
    for (const [id, ref] of Object.entries(r.topping)) {
      set(ref.el, !(w.playing && topCake));
      const n = topCake ? topCake.toppings[id] || 0 : 0;
      ref.badge.textContent = n > 0 ? String(n) : '';
      ref.el.classList.toggle('is-on', n > 0);
    }
    set(r.done, !(w.playing && topCake));

    const oven = w.cakeAt(SLOT.OVEN);
    const baking = !!oven && oven.phase === 'baking';
    if (r.oven.button) set(r.oven.button, !(w.playing && baking));
    if (r.oven.needle) {
      r.oven.needle.style.left = `${(baking ? oven.bake : 0) * 100}%`;
      r.oven.needle.style.opacity = baking ? '1' : '0';
      const state = baking ? bakeState(oven.bake) : '';
      r.oven.label.textContent = state ? this.t(`cakes.bake.${state}`) : '';
      r.oven.label.dataset.state = state;
    }

    for (let slot = 0; slot < 6; slot++) {
      const cake = w.cakeAt(slot);
      set(r.trash[slot], !(w.playing && cake && cake.phase !== 'moving'));
      if (r.undo[slot]) set(r.undo[slot], !['ok', 'blocked', 'bake'].includes(w.canUndo(slot)));
    }

    if (this.cfg.tips) {
      const hot = this.nextStep();
      r.panels.forEach((p, i) => p.classList.toggle('is-hot', hot === i));
    }
  }

  /** Which station wants attention next (drives the highlight + the tip text). */
  nextStep() {
    const w = this.world;
    if (!w.playing) return -1;
    if (w.idleCakeAt(SLOT.PICKUP)) return SLOT.PICKUP;
    if (w.idleCakeAt(SLOT.TOPPING)) return SLOT.TOPPING;
    if (w.idleCakeAt(SLOT.ICING)) return SLOT.ICING;
    const oven = w.cakeAt(SLOT.OVEN);
    if (oven && oven.phase === 'baking' && !this.cfg.ovenAuto && oven.bake >= BAKE.RAW_MAX) return SLOT.OVEN;
    if (w.idleCakeAt(SLOT.BATTER)) return SLOT.BATTER;
    if (w.occ[SLOT.PAN] === null && w.waitingCustomers.length) return SLOT.PAN;
    return -1;
  }

  syncHud() {
    const w = this.world;
    this.hud.served.textContent = String(w.served);
    this.hud.score.textContent = String(w.score);
    const strikes = this.hud.strikes;
    if (strikes.dataset.n !== String(w.strikes)) {
      strikes.dataset.n = String(w.strikes);
      strikes.setAttribute('aria-label', this.t('cakes.hud.strikes', { n: w.strikes, max: MAX_STRIKES }));
      strikes.innerHTML = Array.from({ length: MAX_STRIKES }, (_, i) =>
        `<svg class="${i < w.strikes ? 'is-lost' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C4 14.5 2 9.5 5 6.5 C7.6 4 11 5 12 7.4 C13 5 16.4 4 19 6.5 C22 9.5 20 14.5 12 21 Z" fill="currentColor"/></svg>`).join('');
    }
    const tip = this.cfg.tips ? this.tipText() : '';
    if (this.hud.tip.textContent !== tip) this.hud.tip.textContent = tip;
  }

  tipText() {
    const w = this.world;
    const t = this.t;
    if (!w.playing) return '';
    const step = this.nextStep();
    const oven = w.cakeAt(SLOT.OVEN);
    switch (step) {
      case SLOT.PICKUP: return t('cakes.tip.serve');
      case SLOT.TOPPING: return t('cakes.tip.topping');
      case SLOT.ICING: return t('cakes.tip.icing');
      case SLOT.OVEN: return oven.bake > BAKE.GOLDEN_MAX ? t('cakes.tip.burnt') : t('cakes.tip.oven');
      case SLOT.BATTER: return t('cakes.tip.batter');
      case SLOT.PAN: return t('cakes.tip.pan');
      default:
        if (oven && oven.phase === 'baking') return this.cfg.ovenAuto ? t('cakes.tip.ovenWait') : t('cakes.tip.ovenWatch');
        return w.waitingCustomers.length ? t('cakes.tip.working') : t('cakes.tip.wait');
    }
  }

  /** The step-back button: undo, or say why that isn't possible. */
  stepBack(slot) {
    const why = this.world.canUndo(slot);
    if (why === 'ok') this.world.undo(slot);
    else if (why === 'bake') this.toast(this.t('cakes.say.noUnbake'));
    else if (why === 'blocked') this.toast(this.t('cakes.say.undoBlocked'));
  }

  onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && this.cfg?.undo) {
      e.preventDefault();
      this.undoLatest();
    }
  }

  undoLatest() {
    if (this.paused || this.state !== 'playing') return;
    if (!this.world.undoLatest()) this.toast(this.t('cakes.say.nothingToUndo'));
  }

  getMenu() {
    if (!this.cfg?.undo) return [];
    return [{ label: this.t('cakes.menu.undo'), shortcut: 'Ctrl+Z', action: () => this.undoLatest(), disabled: !this.world?.playing }];
  }

  helpHTML() {
    return this.t('cakes.help');
  }
}

export const comfyCakes = {
  id: 'comfy-cakes',
  title: 'Atrium Cakes',
  order: 10,
  levels: [
    { id: 'beginner', name: 'First Year' },
    { id: 'intermediate', name: 'Second Year' },
    { id: 'advanced', name: 'Final Year' },
  ],
  Game: ComfyCakes,
  hub: { accent: '#ff7aa8', colors: ['#ff7bb0', '#ff8a2b'] },
  icon: iconSVG(),
};
