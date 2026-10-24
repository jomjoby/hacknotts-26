import { describe, it, assert } from './harness.js';
import { Rng } from '../src/core/rng.js';
import { PairsModel, PAIRS_LEVELS, starRating, parTurns, scoreFor } from '../src/games/purble-pairs/logic.js';
import { SYMBOLS } from '../src/games/purble-pairs/art.js';

const make = (level = 'beginner', seed = 1) => new PairsModel({ ...PAIRS_LEVELS[level], rng: new Rng(seed) });
const partnerOf = (m, i) => m.tiles.find((t) => t.index !== i && t.symbol === m.tiles[i].symbol).index;
const decoyOf = (m, i) => m.tiles.find((t) => t.index !== i && t.state === 'down' && t.symbol !== m.tiles[i].symbol).index;

describe('Purble Pairs – deck', () => {
  for (const level of Object.keys(PAIRS_LEVELS)) {
    it(`${level}: every symbol appears exactly twice and fits the board`, () => {
      const m = make(level);
      const { cols, rows } = PAIRS_LEVELS[level];
      assert.equal(m.tiles.length, cols * rows);
      const counts = new Map();
      m.tiles.forEach((t) => counts.set(t.symbol, (counts.get(t.symbol) || 0) + 1));
      assert.ok([...counts.values()].every((n) => n === 2));
      assert.equal(counts.size, m.pairs);
      assert.ok(m.tiles.every((t) => t.symbol >= 0 && t.symbol < SYMBOLS.length));
    });
  }
  it('same seed gives the same board', () => {
    assert.deepEqual(make('intermediate', 5).tiles.map((t) => t.symbol), make('intermediate', 5).tiles.map((t) => t.symbol));
  });
  it('rejects odd boards and boards needing too many symbols', () => {
    assert.throws(() => new PairsModel({ cols: 3, rows: 3, rng: new Rng(1) }));
    assert.throws(() => new PairsModel({ cols: 9, rows: 6, rng: new Rng(1) }));
  });
  it('there are enough drawn symbols for the biggest level', () => {
    assert.ok(SYMBOLS.length >= PAIRS_LEVELS.advanced.cols * PAIRS_LEVELS.advanced.rows / 2);
    assert.equal(new Set(SYMBOLS.map((s) => s.id)).size, SYMBOLS.length);
  });
});

describe('Purble Pairs – flipping', () => {
  it('first flip, then a matching second flip', () => {
    const m = make();
    const a = m.flip(0); assert.equal(a.kind, 'first');
    const b = m.flip(partnerOf(m, 0)); assert.equal(b.kind, 'match');
    assert.equal(m.matched, 1); assert.equal(m.turns, 1); assert.equal(m.tiles[0].state, 'matched');
  });
  it('mismatch leaves both up until the next flip, then hides them', () => {
    const m = make();
    m.flip(0); const d = decoyOf(m, 0);
    const r = m.flip(d); assert.equal(r.kind, 'mismatch');
    assert.equal(m.tiles[0].state, 'up'); assert.equal(m.tiles[d].state, 'up');
    assert.equal(m.mismatches, 1);
    const next = [...m.tiles].find((t) => t.state === 'down').index;
    const r2 = m.flip(next);
    assert.deepEqual(r2.hidden, [0, d]);
    assert.equal(m.tiles[0].state, 'down'); assert.equal(m.tiles[next].state, 'up'); assert.equal(m.first, next);
  });
  it('ignores flips on face-up / matched / out-of-range tiles', () => {
    const m = make();
    m.flip(0);
    assert.equal(m.flip(0).type, 'ignored'); assert.equal(m.flip(999).type, 'ignored');
    m.flip(partnerOf(m, 0)); assert.equal(m.flip(0).type, 'ignored');
  });
  it('dismissPending is idempotent', () => {
    const m = make(); m.flip(0); m.flip(decoyOf(m, 0));
    assert.equal(m.dismissPending().length, 2); assert.equal(m.dismissPending(), null);
  });
  it('solving everything reports done', () => {
    const m = make('beginner', 3); let last;
    for (let i = 0; i < m.tiles.length; i++) {
      if (m.tiles[i].state !== 'down') continue;
      m.flip(i); last = m.flip(partnerOf(m, i));
    }
    assert.ok(m.done); assert.ok(last.done); assert.equal(m.turns, m.pairs); assert.equal(m.mismatches, 0);
  });
});

describe('Purble Pairs – trickster swap', () => {
  const advanced = () => make('advanced', 4);
  it('swap becomes due on every Nth mismatch only', () => {
    const m = advanced();
    for (let n = 1; n <= PAIRS_LEVELS.advanced.swapEvery; n++) {
      const a = m.tiles.find((t) => t.state === 'down').index;
      m.flip(a); const r = m.flip(decoyOf(m, a)); assert.equal(r.kind, 'mismatch');
      assert.equal(m.swapDue, n === PAIRS_LEVELS.advanced.swapEvery, `after mismatch ${n}`);
      if (n < PAIRS_LEVELS.advanced.swapEvery) m.dismissPending();
    }
  });
  it('swap trades two hidden tiles and keeps the deck valid', () => {
    const m = advanced();
    m.swapDue = true;
    const before = m.tiles.map((t) => t.symbol);
    const pair = m.takeSwap();
    assert.equal(pair.length, 2);
    const after = m.tiles.map((t) => t.symbol);
    assert.deepEqual(after.slice().sort(), before.slice().sort());
    assert.ok(before[pair[0]] === after[pair[1]] && before[pair[1]] === after[pair[0]] && before[pair[0]] !== before[pair[1]]);
    assert.equal(m.swapDue, false);
  });
  it('never swaps face-up or matched tiles', () => {
    const m = advanced();
    m.flip(0); m.flip(partnerOf(m, 0));            // tiles 0 and mate matched
    m.flip(1);                                      // a lone face-up tile
    const snapshot = m.tiles.map((t) => [t.state, t.symbol]);
    m.swapDue = true;
    const pair = m.takeSwap();
    for (let i = 0; i < m.tiles.length; i++) if (!pair.includes(i)) assert.deepEqual([m.tiles[i].state, m.tiles[i].symbol], snapshot[i]);
    assert.ok(pair.every((i) => m.tiles[i].state === 'down'));
  });
  it('flip() applies a due swap before revealing the new tile', () => {
    const m = advanced(); m.swapEvery = 1;
    m.flip(0); m.flip(decoyOf(m, 0));               // mismatch -> swap due
    const idx = m.tiles.find((t) => t.state === 'down').index;
    const r = m.flip(idx);
    assert.ok(r.swapped && r.swapped.length === 2);
  });
  it('beginner and intermediate never swap', () => {
    for (const lvl of ['beginner', 'intermediate']) {
      const m = make(lvl);
      for (let i = 0; i < 12; i++) { const a = m.tiles.find((t) => t.state === 'down').index; m.flip(a); m.flip(decoyOf(m, a)); assert.equal(m.swapDue, false); }
    }
  });
});

describe('Purble Pairs – rating', () => {
  it('stars fall as turns rise', () => {
    const pairs = 6;
    assert.equal(starRating(pairs, pairs), 3);
    assert.equal(starRating(pairs, parTurns(pairs)), 3);
    assert.equal(starRating(pairs, parTurns(pairs) + 1), 2);
    assert.equal(starRating(pairs, 40), 1);
  });
  it('score is never negative and rewards fewer mistakes', () => {
    assert.ok(scoreFor({ pairs: 6, turns: 60, mismatches: 54, seconds: 500 }) >= 0);
    assert.ok(scoreFor({ pairs: 6, turns: 6, mismatches: 0, seconds: 20 }) > scoreFor({ pairs: 6, turns: 12, mismatches: 6, seconds: 20 }));
  });
});
