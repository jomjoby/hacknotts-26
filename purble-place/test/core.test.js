import { describe, it, assert } from './harness.js';
import { Rng, dailySeed } from '../src/core/rng.js';
import { Emitter } from '../src/core/emitter.js';
import { mix, shade, hexToRgb } from '../src/core/color.js';
import { fmtTime, format, clamp, merge } from '../src/core/util.js';
import { createStorage } from '../src/core/storage.js';
import { Stats } from '../src/core/stats.js';
import { createTranslator, localizeGame } from '../src/i18n/index.js';
import { EN } from '../src/i18n/en.js';
import { registerGame, validateGame, getRegisteredGames, unregisterGame } from '../src/registry.js';
import '../src/games/index.js';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42); const b = new Rng(42);
    assert.deepEqual([a.next(), a.next(), a.int(100)], [b.next(), b.next(), b.int(100)]);
  });
  it('different seeds differ', () => {
    assert.ok(new Rng(1).next() !== new Rng(2).next());
  });
  it('range is inclusive and bounded', () => {
    const r = new Rng(5); const seen = new Set();
    for (let i = 0; i < 500; i++) { const v = r.range(2, 4); assert.ok(v >= 2 && v <= 4); seen.add(v); }
    assert.equal(seen.size, 3);
  });
  it('shuffle is a permutation and does not mutate', () => {
    const arr = [1, 2, 3, 4, 5, 6]; const copy = arr.slice();
    const out = new Rng(9).shuffle(arr);
    assert.deepEqual(arr, copy);
    assert.deepEqual(out.slice().sort(), copy);
  });
  it('sample returns k distinct items', () => {
    const out = new Rng(3).sample([1, 2, 3, 4, 5], 3);
    assert.equal(out.length, 3); assert.equal(new Set(out).size, 3);
  });
  it('fork gives an independent stream', () => {
    const r = new Rng(11); const f = r.fork();
    assert.ok(f instanceof Rng);
  });
  it('dailySeed is stable within a UTC day and changes the next day', () => {
    assert.equal(dailySeed(new Date('2026-03-09T00:00:00Z')), 20260309);
    assert.equal(dailySeed(new Date('2026-03-09T23:59:59Z')), 20260309);
    assert.equal(dailySeed(new Date('2026-03-10T00:00:00Z')), 20260310);
  });
});

describe('Emitter', () => {
  it('on / off / once / wildcard', () => {
    const e = new Emitter(); const seen = [];
    const off = e.on('a', (d) => seen.push(['a', d]));
    e.once('a', (d) => seen.push(['once', d]));
    e.on('*', (n, d) => seen.push(['*', n, d]));
    e.emit('a', 1); e.emit('a', 2); off(); e.emit('a', 3);
    assert.deepEqual(seen, [['a', 1], ['once', 1], ['*', 'a', 1], ['a', 2], ['*', 'a', 2], ['*', 'a', 3]]);
  });
  it('a throwing listener does not break others', () => {
    const e = new Emitter(); let ok = false;
    const orig = console.error; console.error = () => {};
    e.on('x', () => { throw new Error('boom'); }); e.on('x', () => { ok = true; });
    e.emit('x'); console.error = orig;
    assert.ok(ok);
  });
});

describe('util + color', () => {
  it('fmtTime', () => { assert.equal(fmtTime(83), '1:23'); assert.equal(fmtTime(0), '0:00'); assert.equal(fmtTime(-5), '0:00'); });
  it('format fills placeholders and keeps unknown ones', () => { assert.equal(format('{a}-{b}-{c}', { a: 1, b: 'x' }), '1-x-{c}'); });
  it('clamp / merge', () => { assert.equal(clamp(5, 0, 3), 3); assert.deepEqual(merge({ a: { b: 1, c: 2 } }, { a: { b: 9 } }), { a: { b: 9, c: 2 } }); });
  it('mix / shade', () => {
    assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
    assert.equal(shade('#ffffff', -1), '#000000');
    assert.deepEqual(hexToRgb('#f80'), [255, 136, 0]);
  });
});

describe('storage + stats', () => {
  const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  it('namespaces keys and round-trips JSON', () => {
    const adapter = memory(); const s = createStorage(adapter, 'pp');
    s.set('a', { x: 1 }); s.sub('g').set('a', 2);
    assert.deepEqual(s.get('a'), { x: 1 }); assert.equal(s.sub('g').get('a'), 2); assert.equal(s.get('missing', 'fb'), 'fb');
  });
  it('survives corrupt data', () => {
    const adapter = memory(); adapter.setItem('pp:a', '{not json');
    assert.equal(createStorage(adapter, 'pp').get('a', 'fallback'), 'fallback');
  });
  it('Stats keeps bests with the right direction', () => {
    const st = new Stats(createStorage(memory(), 'pp'));
    st.record('g', 'l', { won: true, stars: 2, time: 50, moves: 12, score: 400 });
    st.record('g', 'l', { won: true, stars: 3, time: 70, moves: 9, score: 300 });
    st.record('g', 'l', { won: false, stars: 3, time: 1 });
    const s = st.get('g', 'l');
    assert.equal(s.played, 3); assert.equal(s.won, 2);
    assert.deepEqual(s.best, { stars: 3, score: 400, time: 50, moves: 9 });
  });
  it('Stats persists', () => {
    const adapter = memory();
    new Stats(createStorage(adapter, 'pp')).record('g', 'l', { won: true, stars: 1 });
    assert.equal(new Stats(createStorage(adapter, 'pp')).bestStars('g', 'l'), 1);
  });
});

describe('i18n + registry', () => {
  it('translator interpolates and overrides', () => {
    const t = createTranslator({ 'menu.game': 'Spiel' });
    assert.equal(t('menu.game'), 'Spiel');
    assert.equal(t('shop.say.clue', { exact: 2, partial: 1 }), '2 in the right spot, 1 in the wrong spot.');
  });
  it('localizeGame overrides titles and level names', () => {
    const t = createTranslator({ 'g.title': 'Titel', 'g.level.a.name': 'Leicht' });
    const out = localizeGame({ id: 'g', title: 'T', tagline: 'tg', levels: [{ id: 'a', name: 'A', desc: 'd' }] }, t);
    assert.equal(out.title, 'Titel'); assert.equal(out.levels[0].name, 'Leicht'); assert.equal(out.levels[0].desc, 'd');
  });
  it('registry has the three built-in games', () => {
    assert.deepEqual(getRegisteredGames().map((g) => g.id).sort(), ['comfy-cakes', 'purble-pairs', 'purble-shop']);
  });
  it('registry validates definitions', () => {
    assert.ok(validateGame({ id: 'Bad Id' }).length > 0);
    assert.throws(() => registerGame({ id: 'x' }));
    class G {}
    registerGame({ id: 'tmp-game', title: 'T', levels: [{ id: 'a', name: 'A' }], Game: G });
    assert.ok(getRegisteredGames().some((g) => g.id === 'tmp-game'));
    unregisterGame('tmp-game');
  });
  it('no on-screen text uses bullet separators or spaced dashes', () => {
    const bad = Object.entries(EN).filter(([, v]) => /[·•●‧∙]| [–—] /.test(v)).map(([k]) => k);
    assert.deepEqual(bad, []);
  });
  it('game and level names cover every level id', () => {
    for (const def of getRegisteredGames()) {
      assert.ok(def.title && !/^\s*$/.test(def.title));
      assert.deepEqual(def.levels.map((l) => l.id), ['beginner', 'intermediate', 'advanced']);
      assert.ok(def.levels.every((l) => l.name));
    }
  });
  it('every translation key used in the source exists in en.js', async () => {
    const files = [
      'src/shell/shell.js', 'src/shell/hub.js', 'src/core/mini-game.js',
      'src/games/comfy-cakes/index.js', 'src/games/purble-pairs/index.js', 'src/games/purble-shop/index.js',
    ];
    const missing = [];
    for (const f of files) {
      const text = await (await fetch(`../${f}`)).text();
      for (const m of text.matchAll(/\bt\(\s*'([\w.]+)'/g)) if (!(m[1] in EN)) missing.push(`${f}: ${m[1]}`);
      for (const m of text.matchAll(/this\.t\(\s*'([\w.]+)'/g)) if (!(m[1] in EN)) missing.push(`${f}: ${m[1]}`);
    }
    // keys built from a variable
    for (const e of ['shape', 'batter', 'raw', 'burnt', 'icing', 'toppings']) if (!(`cakes.err.${e}` in EN)) missing.push(`cakes.err.${e}`);
    for (const e of ['raw', 'golden', 'burnt']) if (!(`cakes.bake.${e}` in EN)) missing.push(`cakes.bake.${e}`);
    for (const e of ['pan', 'batter', 'oven', 'icing', 'toppings', 'pickup']) if (!(`cakes.st.${e}` in EN)) missing.push(`cakes.st.${e}`);
    assert.deepEqual(missing, []);
  });
});
