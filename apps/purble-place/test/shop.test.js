import { describe, it, assert } from './harness.js';
import { Rng } from '../src/core/rng.js';
import { SHOP_LEVELS, scoreGuess, randomSecret, ShopModel, starRating, scoreFor } from '../src/games/purble-shop/logic.js';
import { ITEM_COLORS } from '../src/games/purble-shop/art.js';

describe('Purble Shop – scoreGuess', () => {
  const cases = [
    // secret, guess, exact, partial
    [[0, 1, 2, 3], [0, 1, 2, 3], 4, 0],
    [[0, 1, 2, 3], [3, 2, 1, 0], 0, 4],
    [[0, 1, 2, 3], [4, 4, 4, 4], 0, 0],
    [[0, 1, 2, 3], [0, 2, 1, 4], 1, 2],
    [[0, 0, 1, 2], [0, 1, 0, 0], 1, 2],   // duplicates: one exact, only two of the three guessed 0s can pair up
    [[1, 1, 2, 2], [1, 1, 1, 1], 2, 0],
    [[1, 2, 3, 4], [1, 1, 1, 1], 1, 0],   // a repeated guess colour must not over-count
    [[5, 5, 5, 5], [5, 0, 0, 0], 1, 0],
    [[0, 1, 2, 3, 4], [4, 0, 1, 2, 3], 0, 5],
    [[2, 2, 3, 3, 4], [3, 3, 2, 2, 4], 1, 4],
  ];
  for (const [secret, guess, exact, partial] of cases) {
    it(`secret ${secret.join('')} / guess ${guess.join('')} -> ${exact} exact, ${partial} partial`, () => {
      assert.deepEqual(scoreGuess(secret, guess), { exact, partial });
    });
  }
  it('exact + partial never exceeds the number of slots (random fuzz)', () => {
    const rng = new Rng(77);
    for (let i = 0; i < 2000; i++) {
      const secret = Array.from({ length: 5 }, () => rng.int(6));
      const guess = Array.from({ length: 5 }, () => rng.int(6));
      const r = scoreGuess(secret, guess);
      assert.ok(r.exact + r.partial <= 5);
      // symmetric in total colour overlap
      const r2 = scoreGuess(guess, secret);
      assert.equal(r.exact + r.partial, r2.exact + r2.partial);
    }
  });
});

describe('Purble Shop – secrets & levels', () => {
  for (const [name, cfg] of Object.entries(SHOP_LEVELS)) {
    it(`${name}: secret respects slots, colors and the repeat rule`, () => {
      const rng = new Rng(2);
      for (let i = 0; i < 200; i++) {
        const s = randomSecret(rng, cfg);
        assert.equal(s.length, cfg.slots);
        assert.ok(s.every((c) => c >= 0 && c < cfg.colors));
        if (!cfg.duplicates) assert.equal(new Set(s).size, cfg.slots);
      }
    });
  }
  it('there are enough drawn colours for every level', () => {
    assert.ok(ITEM_COLORS.length >= Math.max(...Object.values(SHOP_LEVELS).map((l) => l.colors)));
    assert.equal(new Set(ITEM_COLORS.map((c) => c.glyph)).size, ITEM_COLORS.length);
  });
  it('no-repeat levels need enough colours', () => {
    assert.throws(() => randomSecret(new Rng(1), { slots: 5, colors: 4, duplicates: false }));
  });
});

describe('Purble Shop – model', () => {
  const model = (over = {}) => new ShopModel({ ...SHOP_LEVELS.beginner, rng: new Rng(1), secret: [0, 1, 2, 3], ...over });
  it('place / clear / fillNext / swap / clearRow', () => {
    const m = model();
    assert.equal(m.fillNext(2), 0); assert.equal(m.fillNext(3), 1);
    assert.ok(m.place(3, 4)); assert.deepEqual(m.current, [2, 3, null, 4]);
    assert.ok(m.swapSlots(0, 3)); assert.deepEqual(m.current, [4, 3, null, 2]);
    assert.ok(m.clearSlot(1)); assert.equal(m.clearSlot(1), false);
    m.clearRow(); assert.deepEqual(m.current, [null, null, null, null]);
    assert.equal(m.place(9, 0), false); assert.equal(m.place(0, 99), false);
  });
  it('cannot submit an incomplete row', () => {
    const m = model(); m.place(0, 1);
    assert.equal(m.submit(), null); assert.equal(m.guessesUsed, 0);
  });
  it('winning ends the game', () => {
    const m = model();
    [0, 1, 2, 3].forEach((c, i) => m.place(i, c));
    const row = m.submit();
    assert.deepEqual([row.exact, row.partial], [4, 0]);
    assert.equal(m.status, 'won'); assert.ok(m.over);
    assert.equal(m.place(0, 1), false, 'no edits after the game ends');
  });
  it('running out of guesses loses', () => {
    const m = model({ guesses: 3 });
    for (let g = 0; g < 3; g++) { [4, 4, 4, 4].forEach((c, i) => m.place(i, c)); m.submit(); }
    assert.equal(m.status, 'lost'); assert.equal(m.guessesUsed, 3);
  });
  it('hints reveal distinct slots, are limited, and report the right colour', () => {
    const m = model({ hints: 2 }); const rng = new Rng(4);
    const a = m.useHint(rng); const b = m.useHint(rng);
    assert.ok(a.slot !== b.slot);
    assert.equal(a.color, m.secret[a.slot]);
    assert.equal(m.useHint(rng), null);
    assert.equal(m.hintsLeft, 0); assert.equal(m.hintsUsed, 2);
  });
  it('a model with no hints cannot hint', () => {
    assert.equal(model({ hints: 0 }).useHint(new Rng(1)), null);
  });
  it('can always be solved by a simple solver within the guess limit (all levels)', () => {
    for (const [name, cfg] of Object.entries(SHOP_LEVELS)) {
      for (let seed = 1; seed <= 6; seed++) {
        const m = new ShopModel({ ...cfg, rng: new Rng(seed) });
        const all = [];
        const build = (prefix) => { if (prefix.length === cfg.slots) { if (cfg.duplicates || new Set(prefix).size === cfg.slots) all.push(prefix); return; } for (let c = 0; c < cfg.colors; c++) build([...prefix, c]); };
        build([]);
        let candidates = all;
        while (!m.over) {
          const guess = candidates[0];
          guess.forEach((c, i) => m.place(i, c));
          const row = m.submit();
          candidates = candidates.filter((cand) => { const r = scoreGuess(cand, guess); return r.exact === row.exact && r.partial === row.partial; });
        }
        assert.equal(m.status, 'won', `${name} seed ${seed} not solved in ${m.guessesUsed}`);
      }
    }
  });
});

describe('Purble Shop – rating', () => {
  it('fewer guesses means more stars, hints cost a star (min 1)', () => {
    assert.equal(starRating({ guessesUsed: 4, maxGuesses: 10, hintsUsed: 0 }), 3);
    assert.equal(starRating({ guessesUsed: 8, maxGuesses: 10, hintsUsed: 0 }), 2);
    assert.equal(starRating({ guessesUsed: 10, maxGuesses: 10, hintsUsed: 0 }), 1);
    assert.equal(starRating({ guessesUsed: 4, maxGuesses: 10, hintsUsed: 1 }), 2);
    assert.equal(starRating({ guessesUsed: 10, maxGuesses: 10, hintsUsed: 2 }), 1);
  });
  it('score is positive', () => {
    assert.ok(scoreFor({ guessesUsed: 10, maxGuesses: 10, hintsUsed: 3, slots: 4, colors: 5 }) > 0);
  });
});
