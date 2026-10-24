// Comfy Cakes – pure simulation (no DOM). The view in index.js renders a CakeWorld.
//
// The bakery is a conveyor belt with six slots. A cake advances from slot to slot
// when (a) the work at its slot is finished and (b) the next slot is free:
//
//   0 PAN → 1 BATTER → 2 OVEN → 3 ICING → 4 TOPPING → 5 PICKUP → (served to a customer)

import { Emitter } from '../../core/emitter.js';
import { BODY_COLORS, HATS } from '../../core/purble.js';
import { LEVELS, MAX_STRIKES } from './config.js';

export const SLOT = { PAN: 0, BATTER: 1, OVEN: 2, ICING: 3, TOPPING: 4, PICKUP: 5 };
export const SLOT_COUNT = 6;
export const SLOT_X = [70, 202, 334, 466, 598, 730];
export const BELT_SPEED = 330; // px per second

/** Bake level runs 0 (raw) → 1 (ruined). */
export const BAKE = { RAW_MAX: 0.5, GOLDEN_MAX: 0.8, AUTO_AT: 0.64 };
/** Seconds each station's animation takes before the cake may move on. */
export const WORK = { pour: 1.0, pipe: 0.9, drop: 0.6 };

export function bakeState(bake) {
  if (bake < BAKE.RAW_MAX) return 'raw';
  return bake <= BAKE.GOLDEN_MAX ? 'golden' : 'burnt';
}

export function generateOrder(levelOrConfig, rng) {
  const cfg = typeof levelOrConfig === 'string' ? LEVELS[levelOrConfig] : levelOrConfig;
  const kinds = Object.keys(cfg.toppings);
  const [lo, hi] = cfg.toppingKinds;
  const count = rng.range(Math.min(lo, kinds.length), Math.min(hi, kinds.length));
  const toppings = {};
  for (const kind of rng.sample(kinds, count)) toppings[kind] = rng.range(1, cfg.toppings[kind]);
  return {
    shape: rng.pick(cfg.shapes),
    batter: rng.pick(cfg.batters),
    icing: rng.pick(cfg.icings),
    toppings,
  };
}

/** Compare a finished cake with an order. `errors` lists which parts are wrong. */
export function evaluateCake(cake, order) {
  const errors = [];
  if (cake.shape !== order.shape) errors.push('shape');
  if (cake.batter !== order.batter) errors.push('batter');
  const bake = bakeState(cake.bake);
  if (bake !== 'golden') errors.push(bake);
  if (cake.icing !== order.icing) errors.push('icing');
  const kinds = new Set([...Object.keys(cake.toppings), ...Object.keys(order.toppings)]);
  for (const k of kinds) {
    if ((cake.toppings[k] || 0) !== (order.toppings[k] || 0)) { errors.push('toppings'); break; }
  }
  return { ok: errors.length === 0, errors };
}

export const starsForStrikes = (strikes) => Math.max(1, 3 - strikes);

export class CakeWorld extends Emitter {
  constructor(levelId, rng) {
    super();
    this.levelId = levelId;
    this.cfg = LEVELS[levelId];
    this.rng = rng;
    this.cakes = [];
    this.customers = [];
    this.occ = Array(SLOT_COUNT).fill(null); // slot -> cake id
    this.status = 'playing';                 // playing | won | lost
    this.time = 0;
    this.served = 0;
    this.strikes = 0;
    this.score = 0;
    this.streak = 0;
    this.spawnTimer = 0.7;
    this._id = 1;
  }

  // ───────────────────────────── queries ─────────────────────────────

  get target() { return this.cfg.target; }
  get playing() { return this.status === 'playing'; }
  cakeAt(slot) {
    const id = this.occ[slot];
    return id == null ? null : this.cakes.find((c) => c.id === id) || null;
  }
  /** The cake at `slot` if it is waiting for the player to act. */
  idleCakeAt(slot) {
    const cake = this.cakeAt(slot);
    return cake && cake.phase === 'idle' ? cake : null;
  }
  get waitingCustomers() { return this.customers.filter((c) => c.state === 'waiting'); }
  customer(id) { return this.customers.find((c) => c.id === id) || null; }

  // ───────────────────────────── player actions ─────────────────────────────

  /** Station 1: put a pan of the chosen shape on the belt. */
  placePan(shape) {
    if (!this.playing || this.occ[SLOT.PAN] !== null || !this.cfg.shapes.includes(shape)) return false;
    const cake = {
      id: this._id++, shape, batter: null, icing: null, toppings: {},
      bake: 0, baked: false, slot: SLOT.PAN, x: SLOT_X[SLOT.PAN],
      phase: 'ready', work: null, age: 0,
    };
    this.cakes.push(cake);
    this.occ[SLOT.PAN] = cake.id;
    this.emit('pan', cake);
    return true;
  }

  /** Station 2: fill the pan with batter. */
  pourBatter(batter) {
    const cake = this.idleCakeAt(SLOT.BATTER);
    if (!this.playing || !cake || cake.batter || !this.cfg.batters.includes(batter)) return false;
    cake.batter = batter;
    cake.phase = 'working';
    cake.work = { kind: 'pour', t: 0, dur: WORK.pour };
    this.emit('pour', cake);
    return true;
  }

  /** Station 3 (manual ovens): take the cake out *now*. */
  openOven() {
    const cake = this.cakeAt(SLOT.OVEN);
    if (!this.playing || !cake || cake.phase !== 'baking' || this.cfg.ovenAuto) return false;
    cake.baked = true;
    cake.phase = 'ready';
    this.emit('oven-open', { cake, state: bakeState(cake.bake) });
    return true;
  }

  /** Station 4: pipe the icing. */
  pipeIcing(icing) {
    const cake = this.idleCakeAt(SLOT.ICING);
    if (!this.playing || !cake || cake.icing || !this.cfg.icings.includes(icing)) return false;
    cake.icing = icing;
    cake.phase = 'working';
    cake.work = { kind: 'pipe', t: 0, dur: WORK.pipe };
    this.emit('pipe', cake);
    return true;
  }

  /** Station 5: click a topping to add one; at its max it wraps back to none. */
  cycleTopping(kind) {
    const cake = this.idleCakeAt(SLOT.TOPPING);
    const max = this.cfg.toppings[kind];
    if (!this.playing || !cake || !max) return false;
    const next = ((cake.toppings[kind] || 0) + 1) % (max + 1);
    if (next) cake.toppings[kind] = next;
    else delete cake.toppings[kind];
    this.emit('topping', { cake, kind, count: next });
    return true;
  }

  /** Station 5: finished decorating – send the cake on its way. */
  finishToppings() {
    const cake = this.idleCakeAt(SLOT.TOPPING);
    if (!this.playing || !cake) return false;
    cake.phase = 'working';
    cake.work = { kind: 'drop', t: 0, dur: WORK.drop };
    this.emit('drop', cake);
    return true;
  }

  /** Throw away whatever is in `slot` (burnt, wrong flavour…). */
  discard(slot) {
    const cake = this.cakeAt(slot);
    if (!this.playing || !cake || cake.phase === 'moving') return false;
    this.cakes = this.cakes.filter((c) => c !== cake);
    this.occ[slot] = null;
    this.emit('discard', cake);
    return true;
  }

  /**
   * What "step back" would do for the cake at `slot`.
   *   { step, to?, remove? }  step = which job gets undone; `to` = slot the cake slides back to
   *                            (omitted: it stays where it is); `remove` = the pan goes back on the rack
   *   { reason }              'none' nothing there, 'busy' mid-move, 'bake' can't un-bake a cake
   */
  undoPlan(slot) {
    const cake = this.cakeAt(slot);
    if (!this.cfg.undo || !this.playing || !cake) return { reason: 'none' };
    if (cake.phase === 'moving' || cake.phase === 'working') return { reason: 'busy' };
    const idle = cake.phase === 'idle';
    switch (slot) {
      case SLOT.PAN: return { step: 'pan', remove: true };
      case SLOT.BATTER: return idle ? { step: 'pan', remove: true } : { step: 'batter' };
      case SLOT.OVEN:
        if (cake.phase === 'baking') return { step: 'batter', to: SLOT.BATTER };
        return this.cfg.ovenAuto ? { reason: 'bake' } : { step: 'oven' };
      case SLOT.ICING: return idle ? { reason: 'bake' } : { step: 'icing' };
      case SLOT.TOPPING:
        if (!idle) return { step: 'toppings' };
        if (Object.keys(cake.toppings).length) return { step: 'toppings' };
        return { step: 'icing', to: SLOT.ICING };
      case SLOT.PICKUP: return { step: 'toppings', to: SLOT.TOPPING };
      default: return { reason: 'none' };
    }
  }

  /** 'ok' | 'blocked' (the station it would go back to is busy) | 'bake' | 'busy' | 'none' */
  canUndo(slot) {
    const plan = this.undoPlan(slot);
    if (plan.reason) return plan.reason;
    if (plan.to !== undefined && this.occ[plan.to] !== null) return 'blocked';
    return 'ok';
  }

  /** Step the cake at `slot` back one job (pour, icing, toppings…). Returns true when something was undone. */
  undo(slot) {
    if (this.canUndo(slot) !== 'ok') return false;
    const cake = this.cakeAt(slot);
    const plan = this.undoPlan(slot);
    switch (plan.step) {
      case 'pan':
        this.cakes = this.cakes.filter((c) => c !== cake);
        this.occ[slot] = null;
        break;
      case 'batter':
        cake.batter = null;
        cake.bake = 0;
        break;
      case 'oven':
        cake.baked = false;
        break;
      case 'icing':
        cake.icing = null;
        break;
      case 'toppings':
        cake.toppings = {};
        break;
      default:
    }
    if (plan.step === 'oven') {
      cake.phase = 'baking';
    } else if (plan.to !== undefined) {
      this.occ[slot] = null;
      this.occ[plan.to] = cake.id;
      cake.slot = plan.to;
      cake.phase = 'moving';
    } else if (!plan.remove) {
      cake.phase = 'idle';
    }
    cake.work = null;
    this.emit('undo', { cake, step: plan.step, slot });
    return true;
  }

  /** Undo for whichever cake is furthest along the belt (Ctrl+Z). */
  undoLatest() {
    for (let slot = SLOT.PICKUP; slot >= 0; slot--) if (this.undo(slot)) return true;
    return false;
  }

  /** Hand the cake at the pickup counter to a customer. */
  serve(customerId) {
    const cake = this.idleCakeAt(SLOT.PICKUP);
    const customer = this.customer(customerId);
    if (!this.playing || !cake || !customer || customer.state !== 'waiting') return false;

    const result = evaluateCake(cake, customer.order);
    this.cakes = this.cakes.filter((c) => c !== cake);
    this.occ[SLOT.PICKUP] = null;

    if (result.ok) {
      const patienceLeft = customer.patience / customer.maxPatience;
      this.streak += 1;
      const points = 100 + Math.round(patienceLeft * 100) + 25 * Math.min(this.streak - 1, 4);
      this.score += points;
      this.served += 1;
      customer.state = 'happy';
      customer.leave = 1.5;
      this.emit('served', { customer, cake, points });
      if (this.served >= this.cfg.target) this._end('won');
    } else {
      customer.state = 'angry';
      customer.leave = 1.6;
      this._strike(customer, 'wrong', result.errors);
    }
    return result.ok;
  }

  // ───────────────────────────── simulation ─────────────────────────────

  update(dt) {
    if (!this.playing) return;
    this.time += dt;
    this._customers(dt);
    for (const cake of this.cakes.slice()) {
      cake.age += dt;
      this._cake(cake, dt);
    }
  }

  _cake(cake, dt) {
    switch (cake.phase) {
      case 'moving': {
        const tx = SLOT_X[cake.slot];
        const step = BELT_SPEED * dt;
        if (Math.abs(tx - cake.x) <= step) {
          cake.x = tx;
          this._arrive(cake);
        } else {
          cake.x += Math.sign(tx - cake.x) * step;
        }
        break;
      }
      case 'working':
        cake.work.t += dt;
        if (cake.work.t >= cake.work.dur) {
          cake.work.t = cake.work.dur;
          cake.phase = 'ready';
          cake.work = null;
        }
        break;
      case 'baking':
        this._bake(cake, dt);
        break;
      case 'ready':
        this._advance(cake);
        break;
      default:
    }
  }

  _bake(cake, dt) {
    const rate = dt / this.cfg.bakeSeconds;
    const before = cake.bake;
    if (this.cfg.ovenAuto) {
      cake.bake = Math.min(BAKE.AUTO_AT, cake.bake + rate);
      if (cake.bake >= BAKE.AUTO_AT) {
        cake.baked = true;
        cake.phase = 'ready';
        this.emit('oven-done', cake);
      }
      return;
    }
    cake.bake = Math.min(1, cake.bake + rate);
    if (before < BAKE.RAW_MAX && cake.bake >= BAKE.RAW_MAX) this.emit('oven-ready', cake);
    if (before <= BAKE.GOLDEN_MAX && cake.bake > BAKE.GOLDEN_MAX) this.emit('oven-burning', cake);
  }

  _advance(cake) {
    if (cake.slot >= SLOT.PICKUP) return;
    const next = cake.slot + 1;
    if (this.occ[next] !== null) return;
    this.occ[cake.slot] = null;
    this.occ[next] = cake.id;
    cake.slot = next;
    cake.phase = 'moving';
    this.emit('belt', cake);
  }

  _arrive(cake) {
    if (cake.slot === SLOT.OVEN) {
      cake.phase = 'baking';
      this.emit('oven-start', cake);
    } else {
      cake.phase = 'idle';
      if (cake.slot === SLOT.PICKUP) this.emit('pickup', cake);
    }
  }

  _customers(dt) {
    const waiting = this.waitingCustomers.length;
    // The level ends once enough customers are queued to finish it – no pointless extra pressure.
    const needed = this.cfg.target - this.served;
    if (waiting < this.cfg.maxCustomers && waiting < needed) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this._spawn();
    } else {
      this.spawnTimer = Math.max(this.spawnTimer, 1.5);
    }

    for (const c of this.customers.slice()) {
      c.age += dt;
      if (c.state === 'waiting') {
        c.patience -= dt;
        if (c.patience <= 0) {
          c.patience = 0;
          c.state = 'angry';
          c.leave = 1.6;
          this._strike(c, 'patience');
          if (!this.playing) return;
        }
      } else {
        c.leave -= dt;
        if (c.leave <= 0) this.customers = this.customers.filter((x) => x !== c);
      }
    }
  }

  _spawn() {
    const used = new Set(this.customers.map((c) => c.seat));
    let seat = 0;
    while (used.has(seat)) seat++;
    if (seat >= this.cfg.maxCustomers) { this.spawnTimer = 0.5; return; }
    const customer = {
      id: this._id++, seat, state: 'waiting', age: 0, leave: 0,
      order: generateOrder(this.cfg, this.rng),
      patience: this.cfg.patience, maxPatience: this.cfg.patience,
      body: this.rng.pick(BODY_COLORS), hat: this.rng.pick(HATS), lanyard: this.rng.chance(0.7), antenna: this.rng.chance(0.3), suit: this.rng.chance(0.35) ? 'silver' : null,
    };
    this.customers.push(customer);
    this.spawnTimer = this.cfg.spawnGap * this.rng.float(0.8, 1.2);
    this.emit('customer', customer);
  }

  _strike(customer, reason, errors = []) {
    this.strikes += 1;
    this.streak = 0;
    this.emit('strike', { customer, reason, errors });
    if (this.strikes >= MAX_STRIKES) this._end('lost');
  }

  _end(status) {
    if (!this.playing) return;
    this.status = status;
    this.emit('end', { status, served: this.served, strikes: this.strikes, score: this.score, time: this.time });
  }
}
