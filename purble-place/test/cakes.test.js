import { describe, it, assert } from './harness.js';
import { Rng } from '../src/core/rng.js';
import { LEVELS, SHAPES, BATTERS, ICINGS, TOPPINGS, MAX_STRIKES } from '../src/games/comfy-cakes/config.js';
import { CakeWorld, SLOT, SLOT_X, BAKE, bakeState, generateOrder, evaluateCake, starsForStrikes } from '../src/games/comfy-cakes/logic.js';
import { cakeMarkup, cakeSignature, controlIcon } from '../src/games/comfy-cakes/art.js';

const tick = (w, seconds, dt = 0.05) => { for (let t = 0; t < seconds - 1e-9 && w.playing; t += dt) w.update(dt); };
const newWorld = (level = 'beginner', seed = 1) => new CakeWorld(level, new Rng(seed));

/** Plays a perfect game: builds every waiting customer's order. Returns the world when it ends. */
function playPerfectly(world, { maxSeconds = 1500, mistakeEvery = 0 } = {}) {
  let made = 0;
  const dt = 0.05;
  const target = () => world.waitingCustomers[0];
  let building = null; // order the current cake was started for
  while (world.playing && world.time < maxSeconds) {
    world.update(dt);
    const cust = target();
    if (!cust) continue;
    if (!building && world.occ[SLOT.PAN] === null && !world.cakes.some((c) => c.slot < SLOT.PICKUP)) {
      building = cust;
      // a "blunder" bot deliberately bakes the wrong shape every Nth cake
      const blunder = mistakeEvery && (made + 1) % mistakeEvery === 0;
      const shape = blunder ? world.cfg.shapes.find((s) => s !== cust.order.shape) : cust.order.shape;
      world.placePan(shape);
    }
    if (!building) continue;
    const o = building.order;
    const batter = world.idleCakeAt(SLOT.BATTER); if (batter && !batter.batter) world.pourBatter(o.batter);
    const oven = world.cakeAt(SLOT.OVEN);
    if (oven && oven.phase === 'baking' && !world.cfg.ovenAuto && oven.bake >= (BAKE.RAW_MAX + BAKE.GOLDEN_MAX) / 2 - 0.05) world.openOven();
    const icing = world.idleCakeAt(SLOT.ICING); if (icing && !icing.icing) world.pipeIcing(o.icing);
    const top = world.idleCakeAt(SLOT.TOPPING);
    if (top) {
      for (const [k, n] of Object.entries(o.toppings)) while ((top.toppings[k] || 0) < n) world.cycleTopping(k);
      world.finishToppings();
    }
    const ready = world.idleCakeAt(SLOT.PICKUP);
    if (ready) {
      made++;
      world.serve(building.id);
      building = null;
    }
  }
  return world;
}

describe('Comfy Cakes – config', () => {
  it('every id used by a level exists in the catalogues', () => {
    const ids = (list) => new Set(list.map((x) => x.id));
    for (const [name, lvl] of Object.entries(LEVELS)) {
      lvl.shapes.forEach((s) => assert.ok(ids(SHAPES).has(s), `${name} shape ${s}`));
      lvl.batters.forEach((s) => assert.ok(ids(BATTERS).has(s), `${name} batter ${s}`));
      lvl.icings.forEach((s) => assert.ok(ids(ICINGS).has(s), `${name} icing ${s}`));
      Object.entries(lvl.toppings).forEach(([k, max]) => { assert.ok(ids(TOPPINGS).has(k), `${name} topping ${k}`); assert.ok(max <= TOPPINGS.find((t) => t.id === k).max, `${name} ${k} max`); });
      assert.ok(lvl.toppingKinds[0] >= 1 && lvl.toppingKinds[1] <= Object.keys(lvl.toppings).length);
    }
  });
  it('every level has undo switched on', () => {
    for (const lvl of Object.values(LEVELS)) assert.equal(lvl.undo, true);
  });
  it('levels get harder', () => {
    const [b, i, a] = ['beginner', 'intermediate', 'advanced'].map((k) => LEVELS[k]);
    assert.ok(b.target < i.target && i.target < a.target);
    assert.ok(b.maxCustomers < i.maxCustomers && i.maxCustomers < a.maxCustomers);
    assert.ok(b.patience > i.patience && i.patience > a.patience);
  });
  it('slots are evenly spaced left to right', () => {
    for (let i = 1; i < SLOT_X.length; i++) assert.ok(SLOT_X[i] > SLOT_X[i - 1]);
  });
});

describe('Comfy Cakes – orders', () => {
  it('generated orders only use what the level offers', () => {
    for (const [name, cfg] of Object.entries(LEVELS)) {
      const rng = new Rng(8);
      for (let i = 0; i < 300; i++) {
        const o = generateOrder(cfg, rng);
        assert.ok(cfg.shapes.includes(o.shape)); assert.ok(cfg.batters.includes(o.batter)); assert.ok(cfg.icings.includes(o.icing));
        const kinds = Object.keys(o.toppings);
        assert.ok(kinds.length >= cfg.toppingKinds[0] && kinds.length <= cfg.toppingKinds[1], `${name} kinds`);
        kinds.forEach((k) => assert.ok(o.toppings[k] >= 1 && o.toppings[k] <= cfg.toppings[k]));
      }
    }
  });
  it('orders show variety', () => {
    const rng = new Rng(3); const seen = new Set();
    for (let i = 0; i < 100; i++) seen.add(JSON.stringify(generateOrder('advanced', rng)));
    assert.ok(seen.size > 60);
  });
  it('bakeState boundaries', () => {
    assert.equal(bakeState(0), 'raw'); assert.equal(bakeState(BAKE.RAW_MAX - 0.001), 'raw');
    assert.equal(bakeState(BAKE.RAW_MAX), 'golden'); assert.equal(bakeState(BAKE.GOLDEN_MAX), 'golden');
    assert.equal(bakeState(BAKE.GOLDEN_MAX + 0.001), 'burnt');
    assert.ok(BAKE.AUTO_AT > BAKE.RAW_MAX && BAKE.AUTO_AT < BAKE.GOLDEN_MAX);
  });
  it('evaluateCake pinpoints each kind of mistake', () => {
    const order = { shape: 'heart', batter: 'chocolate', icing: 'pink', toppings: { candles: 2, cherry: 1 } };
    const good = { shape: 'heart', batter: 'chocolate', icing: 'pink', toppings: { candles: 2, cherry: 1 }, bake: 0.6 };
    assert.deepEqual(evaluateCake(good, order), { ok: true, errors: [] });
    assert.deepEqual(evaluateCake({ ...good, shape: 'round' }, order).errors, ['shape']);
    assert.deepEqual(evaluateCake({ ...good, batter: 'vanilla' }, order).errors, ['batter']);
    assert.deepEqual(evaluateCake({ ...good, icing: 'white' }, order).errors, ['icing']);
    assert.deepEqual(evaluateCake({ ...good, toppings: { candles: 1, cherry: 1 } }, order).errors, ['toppings']);
    assert.deepEqual(evaluateCake({ ...good, toppings: { candles: 2 } }, order).errors, ['toppings']);
    assert.deepEqual(evaluateCake({ ...good, toppings: { candles: 2, cherry: 1, chips: 1 } }, order).errors, ['toppings']);
    assert.deepEqual(evaluateCake({ ...good, bake: 0.2 }, order).errors, ['raw']);
    assert.deepEqual(evaluateCake({ ...good, bake: 0.95 }, order).errors, ['burnt']);
    assert.deepEqual(evaluateCake({ ...good, shape: 'round', icing: 'white', bake: 0.1 }, order).errors, ['shape', 'raw', 'icing']);
  });
});

describe('Comfy Cakes – belt mechanics', () => {
  it('a cake travels the stations in order and stops where the player must act', () => {
    const w = newWorld(); tick(w, 1);
    assert.ok(w.placePan('round'));
    tick(w, 1);
    assert.equal(w.cakeAt(SLOT.BATTER).phase, 'idle', 'waits for batter');
    assert.equal(w.occ[SLOT.PAN], null, 'pan slot freed');
    assert.ok(w.pourBatter('vanilla'));
    tick(w, 0.5); assert.equal(w.cakeAt(SLOT.BATTER).phase, 'working', 'pouring takes time');
    tick(w, 4);   assert.equal(w.cakeAt(SLOT.OVEN).phase, 'baking');
  });
  it('actions are refused at the wrong station / twice', () => {
    const w = newWorld(); tick(w, 0.2);
    assert.equal(w.pourBatter('vanilla'), false, 'no cake yet');
    w.placePan('round');
    assert.equal(w.placePan('square'), false, 'pan slot occupied');
    tick(w, 1);
    assert.equal(w.pipeIcing('white'), false, 'cake is at the batter station');
    assert.equal(w.placePan('heart'), false, 'level has no heart pan');
    assert.ok(w.pourBatter('chocolate')); assert.equal(w.pourBatter('vanilla'), false, 'already filled');
    assert.equal(w.pourBatter('lemon'), false, 'not on this level');
  });
  it('a cake waits when the next slot is busy (blocking) and the pan queue backs up', () => {
    const w = newWorld(); tick(w, 0.2);
    w.placePan('round'); tick(w, 1);                 // at batter, untouched
    w.placePan('square'); tick(w, 2);                // second pan waits at slot 0
    assert.equal(w.cakeAt(SLOT.PAN).phase, 'ready');
    assert.equal(w.cakeAt(SLOT.BATTER).slot, SLOT.BATTER);
    assert.equal(w.placePan('round'), false);
    w.pourBatter('vanilla'); tick(w, 3);             // first leaves for the oven, second advances
    assert.equal(w.cakeAt(SLOT.BATTER).phase, 'idle'); assert.equal(w.occ[SLOT.PAN], null);
  });
  it('slots never hold two cakes', () => {
    const w = newWorld('advanced'); tick(w, 0.2); let max = 0;
    for (let i = 0; i < 400; i++) {
      w.update(0.05);
      if (i % 20 === 0) w.placePan('round');
      const b = w.idleCakeAt(SLOT.BATTER); if (b && !b.batter) w.pourBatter('vanilla');
      const slots = w.cakes.map((c) => c.slot);
      assert.equal(new Set(slots).size, slots.length, 'two cakes share a slot');
      max = Math.max(max, slots.length);
    }
    assert.ok(max >= 2, 'concurrency happened');
  });
  it('discard clears a station (except mid-belt)', () => {
    const w = newWorld(); tick(w, 0.2); w.placePan('round'); tick(w, 1.2);
    assert.ok(w.discard(SLOT.BATTER)); assert.equal(w.cakes.length, 0); assert.equal(w.discard(SLOT.BATTER), false);
  });
});

describe('Comfy Cakes – oven', () => {
  const toOven = (level) => {
    const w = newWorld(level); tick(w, 0.2); w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 2);
    return w;
  };
  it('beginner: oven pops the cake out in the golden zone by itself', () => {
    const w = toOven('beginner'); tick(w, 10);
    const cake = w.cakes[0];
    assert.ok(cake.baked); assert.equal(bakeState(cake.bake), 'golden'); assert.ok(cake.slot > SLOT.OVEN);
    assert.equal(w.openOven(), false, 'no manual control on beginner');
  });
  it('intermediate: left alone the cake burns; opened in the window it is golden', () => {
    const burnt = toOven('intermediate'); const events = []; burnt.on('oven-burning', () => events.push('burning'));
    tick(burnt, 12); assert.equal(burnt.cakeAt(SLOT.OVEN).bake, 1); assert.deepEqual(events, ['burning']);
    burnt.openOven(); assert.equal(bakeState(burnt.cakes[0].bake), 'burnt');

    const ok = toOven('intermediate'); const cfg = LEVELS.intermediate;
    tick(ok, cfg.bakeSeconds * 0.65);
    assert.ok(ok.openOven()); assert.equal(bakeState(ok.cakes[0].bake), 'golden');
  });
  it('opening too early gives a raw cake', () => {
    const w = toOven('advanced'); tick(w, 1); w.openOven();
    assert.equal(bakeState(w.cakes[0].bake), 'raw');
  });
  it('an opened cake stops baking', () => {
    const w = toOven('intermediate'); tick(w, 4); w.openOven(); const b = w.cakes[0].bake;
    w.occ[SLOT.ICING] = 999; tick(w, 5); // icing slot blocked -> cake sits at the oven door
    assert.equal(w.cakes[0].bake, b);
  });
  it('the perfect window is wide enough to hit (>= 1.5 s at every level)', () => {
    for (const lvl of Object.values(LEVELS)) assert.ok((BAKE.GOLDEN_MAX - BAKE.RAW_MAX) * lvl.bakeSeconds >= 1.5);
  });
});

describe('Comfy Cakes – undo (step back)', () => {
  const OVEN_SECONDS = (w) => w.cfg.bakeSeconds;
  /** pan + batter + bake (perfectly) until the cake is waiting at the icing station */
  function toIcing(w, order) {
    tick(w, 0.2); assert.ok(w.placePan(order.shape)); tick(w, 1); assert.ok(w.pourBatter(order.batter));
    for (let i = 0; i < 600 && !w.idleCakeAt(SLOT.ICING); i++) {
      w.update(0.05);
      const oven = w.cakeAt(SLOT.OVEN);
      if (oven && oven.phase === 'baking' && !w.cfg.ovenAuto && oven.bake >= 0.62) w.openOven();
    }
    assert.ok(w.idleCakeAt(SLOT.ICING), 'cake reached the icing station');
    return w.idleCakeAt(SLOT.ICING);
  }
  const otherIcing = (w, id) => w.cfg.icings.find((i) => i !== id);

  for (const level of Object.keys(LEVELS)) {
    it(`${level}: pick the wrong icing, step back from the toppings station, redo it, serve correctly`, () => {
      const w = newWorld(level, 4); tick(w, 1);
      const cust = w.waitingCustomers[0]; const order = cust.order;
      toIcing(w, order);
      assert.ok(w.pipeIcing(otherIcing(w, order.icing))); tick(w, 2);
      const cake = w.cakeAt(SLOT.TOPPING); assert.ok(cake && cake.phase === 'idle');
      assert.equal(cake.icing, otherIcing(w, order.icing));
      assert.equal(w.canUndo(SLOT.TOPPING), 'ok');
      assert.ok(w.undo(SLOT.TOPPING));
      assert.equal(cake.icing, null); assert.equal(cake.phase, 'moving'); assert.equal(cake.slot, SLOT.ICING);
      tick(w, 1);
      assert.equal(cake.phase, 'idle'); assert.equal(w.occ[SLOT.ICING], cake.id); assert.equal(w.occ[SLOT.TOPPING], null);
      assert.ok(w.pipeIcing(order.icing)); tick(w, 2);
      const top = w.idleCakeAt(SLOT.TOPPING);
      for (const [k, n] of Object.entries(order.toppings)) while ((top.toppings[k] || 0) < n) w.cycleTopping(k);
      w.finishToppings(); tick(w, 2);
      assert.ok(w.serve(cust.id)); assert.equal(w.strikes, 0); assert.equal(w.served, 1);
    });
  }

  it('clears toppings in place, then steps back to re-ice', () => {
    const w = newWorld('intermediate', 2); tick(w, 1); const o = w.waitingCustomers[0].order;
    toIcing(w, o); w.pipeIcing(o.icing); tick(w, 2);
    w.cycleTopping('sprinkles'); w.cycleTopping('cherry');
    assert.ok(w.undo(SLOT.TOPPING)); const cake = w.cakeAt(SLOT.TOPPING);
    assert.deepEqual(cake.toppings, {}); assert.equal(cake.icing, o.icing); assert.equal(cake.phase, 'idle');
    assert.ok(w.undo(SLOT.TOPPING)); assert.equal(cake.icing, null); assert.equal(cake.slot, SLOT.ICING);
  });
  it('takes finished toppings back from the pick-up counter', () => {
    const w = newWorld('beginner', 3); tick(w, 1); const o = w.waitingCustomers[0].order;
    toIcing(w, o); w.pipeIcing(o.icing); tick(w, 2);
    w.cycleTopping(Object.keys(o.toppings)[0]); w.finishToppings(); tick(w, 2);
    const cake = w.idleCakeAt(SLOT.PICKUP); assert.ok(cake);
    assert.ok(w.undo(SLOT.PICKUP)); tick(w, 1);
    assert.equal(cake.slot, SLOT.TOPPING); assert.equal(cake.phase, 'idle'); assert.deepEqual(cake.toppings, {});
    assert.equal(cake.icing, o.icing, 'the icing stays');
  });
  it('takes the batter back out of the oven', () => {
    for (const level of ['beginner', 'intermediate']) {
      const w = newWorld(level, 1); tick(w, 0.2); w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 2.5);
      const cake = w.cakeAt(SLOT.OVEN); assert.equal(cake.phase, 'baking');
      assert.ok(w.undo(SLOT.OVEN), level); tick(w, 1);
      assert.equal(cake.slot, SLOT.BATTER); assert.equal(cake.phase, 'idle'); assert.equal(cake.batter, null); assert.equal(cake.bake, 0);
      assert.ok(w.pourBatter('chocolate'), 'pour a different batter');
    }
  });
  it('the pan goes back on the rack from the batter station', () => {
    const w = newWorld(); tick(w, 0.2); w.placePan('round'); tick(w, 1.2);
    assert.ok(w.undo(SLOT.BATTER)); assert.equal(w.cakes.length, 0); assert.equal(w.occ[SLOT.BATTER], null);
  });
  it('un-pours a cake that is waiting for the oven', () => {
    const w = newWorld('intermediate', 1); tick(w, 0.2);
    w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 0.1);
    w.placePan('square'); tick(w, 0.1);                    // a second pan queues behind
    for (let i = 0; i < 80; i++) w.update(0.05);           // first cake is in the oven, second at the batter station
    w.pourBatter('lemon'); tick(w, 1.2);                   // second cake poured but the oven is busy
    const waiting = w.cakeAt(SLOT.BATTER); assert.equal(waiting.phase, 'ready');
    assert.ok(w.undo(SLOT.BATTER)); assert.equal(waiting.batter, null); assert.equal(waiting.phase, 'idle'); assert.equal(waiting.slot, SLOT.BATTER);
  });
  it('refuses to un-bake, and explains why', () => {
    const w = newWorld('beginner', 1); tick(w, 1); toIcing(w, w.waitingCustomers[0].order);
    assert.equal(w.canUndo(SLOT.ICING), 'bake'); assert.equal(w.undo(SLOT.ICING), false);
    assert.equal(w.cakeAt(SLOT.ICING).baked, true);
  });
  it('an opened oven can be shut again; an automatic oven cannot', () => {
    const w = newWorld('intermediate', 1); tick(w, 0.2); w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 2.5);
    tick(w, 4); w.openOven(); const cake = w.cakes[0]; w.occ[SLOT.ICING] = 999;     // jam the icing station so the cake waits at the door
    tick(w, 0.5); assert.equal(cake.phase, 'ready'); const bake = cake.bake;
    assert.ok(w.undo(SLOT.OVEN)); assert.equal(cake.phase, 'baking'); assert.equal(cake.baked, false); assert.equal(cake.bake, bake);
    const a = newWorld('beginner', 1); tick(a, 0.2); a.placePan('round'); tick(a, 1); a.pourBatter('vanilla'); a.occ[SLOT.ICING] = 999; tick(a, 12);
    assert.equal(a.cakes[0].phase, 'ready'); assert.equal(a.canUndo(SLOT.OVEN), 'bake');
  });
  it('is blocked while the station behind is occupied', () => {
    const w = newWorld('intermediate', 1); tick(w, 0.2);
    w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 2.6);     // cake A baking
    w.placePan('square'); tick(w, 1.2);                                          // cake B waiting at the batter station
    assert.equal(w.cakeAt(SLOT.OVEN).phase, 'baking'); assert.equal(w.canUndo(SLOT.OVEN), 'blocked');
    assert.equal(w.undo(SLOT.OVEN), false);
  });
  it('does nothing mid-move, with no cake, or when the level switches it off', () => {
    const w = newWorld(); tick(w, 0.2); assert.equal(w.canUndo(SLOT.TOPPING), 'none');
    w.placePan('round'); tick(w, 0.1); assert.ok(['busy', 'ok'].includes(w.canUndo(SLOT.BATTER)));
    const off = newWorld(); off.cfg = { ...off.cfg, undo: false }; tick(off, 0.2); off.placePan('round'); tick(off, 1.2);
    assert.equal(off.undo(SLOT.BATTER), false); assert.equal(off.cakes.length, 1);
  });
  it('undoLatest steps back the cake that is furthest along', () => {
    const w = newWorld('intermediate', 1); tick(w, 0.2);
    w.placePan('round'); tick(w, 1); w.pourBatter('vanilla'); tick(w, 3);
    w.placePan('square'); tick(w, 1.2);
    assert.equal(w.canUndo(SLOT.OVEN), 'blocked');
    assert.ok(w.undoLatest());                       // the blocked oven is skipped; B's pan goes back on the rack
    assert.equal(w.cakeAt(SLOT.BATTER), null); assert.equal(w.cakes.length, 1); assert.equal(w.cakeAt(SLOT.OVEN).phase, 'baking');
  });
  it('undoing never costs a strike or points', () => {
    const w = newWorld('beginner', 1); tick(w, 1);
    toIcing(w, w.waitingCustomers[0].order); w.pipeIcing('white'); tick(w, 2); w.undo(SLOT.TOPPING); tick(w, 1);
    assert.equal(w.strikes, 0); assert.equal(w.score, 0);
  });
});

describe('Comfy Cakes – customers & scoring', () => {
  it('the first customer arrives quickly and never exceeds the level cap', () => {
    for (const [name, cfg] of Object.entries(LEVELS)) {
      const w = newWorld(name); tick(w, 1.5); assert.equal(w.waitingCustomers.length, 1, `${name} first customer`);
      let peak = 0; for (let i = 0; i < 2000 && w.playing; i++) { w.update(0.05); peak = Math.max(peak, w.waitingCustomers.length); }
      assert.ok(peak <= cfg.maxCustomers, `${name} peak ${peak}`);
    }
  });
  it('customers sit in distinct seats', () => {
    const w = newWorld('advanced'); tick(w, 40);
    const seats = w.customers.map((c) => c.seat); assert.equal(new Set(seats).size, seats.length);
  });
  it('an impatient customer leaves angry and costs a strike', () => {
    const w = newWorld(); tick(w, 0.7); const c = w.waitingCustomers[0]; assert.ok(c);
    tick(w, LEVELS.beginner.patience + 1);
    assert.equal(w.strikes >= 1, true); assert.equal(c.state, 'angry');
  });
  it('three strikes lose the game and freeze the world', () => {
    const w = newWorld(); let ended = null; w.on('end', (e) => { ended = e; });
    tick(w, 2000);
    assert.equal(w.status, 'lost'); assert.equal(w.strikes, MAX_STRIKES); assert.equal(ended.status, 'lost');
    const t = w.time; w.update(1); assert.equal(w.time, t, 'frozen after the end');
  });
  it('serving a wrong cake is a strike; serving the right one scores', () => {
    const w = newWorld(); tick(w, 1); const c = w.waitingCustomers[0];
    const wrongShape = c.order.shape === 'round' ? 'square' : 'round';
    w.placePan(wrongShape); tick(w, 1); w.pourBatter(c.order.batter); tick(w, 9); w.pipeIcing(c.order.icing); tick(w, 3);
    const top = w.idleCakeAt(SLOT.TOPPING); for (const [k, n] of Object.entries(c.order.toppings)) while ((top.toppings[k] || 0) < n) w.cycleTopping(k);
    w.finishToppings(); tick(w, 2);
    let strike = null; w.on('strike', (e) => { strike = e; });
    assert.equal(w.serve(c.id), false);
    assert.equal(strike.reason, 'wrong'); assert.deepEqual(strike.errors, ['shape']); assert.equal(w.strikes, 1); assert.equal(w.score, 0);
  });
  it('serving requires a finished cake at the counter', () => {
    const w = newWorld(); tick(w, 1); assert.equal(w.serve(w.waitingCustomers[0].id), false);
  });
  it('stars follow mistakes', () => {
    assert.equal(starsForStrikes(0), 3); assert.equal(starsForStrikes(1), 2); assert.equal(starsForStrikes(2), 1); assert.equal(starsForStrikes(3), 1);
  });
});

describe('Comfy Cakes – full games played by a bot', () => {
  for (const [name, cfg] of Object.entries(LEVELS)) {
    it(`${name}: a perfect player wins with 0 mistakes in reasonable time`, () => {
      for (const seed of [1, 2, 3]) {
        const w = playPerfectly(newWorld(name, seed));
        assert.equal(w.status, 'won', `${name}/${seed}: ${w.status}, served ${w.served}, strikes ${w.strikes}, t=${w.time.toFixed(0)}`);
        assert.equal(w.served, cfg.target); assert.equal(w.strikes, 0);
        assert.ok(w.score >= cfg.target * 100);
        assert.ok(w.time < cfg.target * 70, `${name} took ${w.time.toFixed(0)}s`);
      }
    });
  }
  it('a bot that always bakes the wrong shape loses after exactly three mistakes', () => {
    const w = playPerfectly(newWorld('advanced', 5), { mistakeEvery: 1 });
    assert.equal(w.status, 'lost'); assert.equal(w.strikes, MAX_STRIKES); assert.equal(w.served, 0);
  });
  it('a bot that blunders every 4th cake can still win beginner', () => {
    const w = playPerfectly(newWorld('beginner', 5), { mistakeEvery: 4 });
    assert.equal(w.status, 'won'); assert.equal(w.strikes, 1);
  });
  it('no customers are spawned beyond what is needed to finish', () => {
    const w = newWorld('beginner', 2); playPerfectly(w);
    assert.equal(w.waitingCustomers.length, 0);
  });
});

describe('Comfy Cakes – art', () => {
  const full = { shape: 'heart', batter: 'chocolate', icing: 'pink', toppings: { sprinkles: 1, candles: 3, cherry: 1, chips: 1, stars: 1, flowers: 1 }, bake: 0.64, baked: true, work: null };
  it('draws every shape and stage without throwing', () => {
    for (const s of SHAPES) {
      assert.ok(cakeMarkup({ ...full, shape: s.id }).length > 100);
      assert.ok(cakeMarkup({ shape: s.id, batter: null, bake: 0, baked: false, toppings: {}, work: null }).includes('<path'));
      assert.ok(cakeMarkup({ shape: s.id, batter: 'vanilla', bake: 0.3, baked: false, toppings: {}, work: { kind: 'pour', t: 0.4, dur: 1 } }).includes('<path'));
    }
    for (const b of BATTERS) for (const i of ICINGS) assert.ok(cakeMarkup({ ...full, batter: b.id, icing: i.id }).length > 100);
    for (const t of TOPPINGS) assert.ok(controlIcon('topping', t.id).includes('<svg'));
  });
  it('signature changes only when the picture changes', () => {
    const a = cakeSignature(full);
    assert.equal(a, cakeSignature({ ...full, x: 1, slot: 4, phase: 'moving' }));
    assert.ok(a !== cakeSignature({ ...full, icing: 'white' }));
    assert.ok(a !== cakeSignature({ ...full, toppings: {} }));
    assert.ok(a !== cakeSignature({ ...full, bake: 0.9 }));
  });
});
