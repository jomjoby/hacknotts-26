// Purble Pairs – pure game model (no DOM). The view in index.js renders this.

import { range } from '../../core/util.js';

export const SYMBOL_COUNT = 20;

/**
 * Level table. Tweak freely – the view lays the board out from cols/rows.
 *  peek       seconds every tile is shown face-up before play starts
 *  swapEvery  every Nth mismatch two hidden tiles secretly trade places (0 = never)
 *  maxTurns   the game is lost when this many turns are used and the board is not cleared (0 = no limit)
 *
 * The limits come from playing the boards with a simulated player. Second Year (12 pairs) takes a player who
 * remembers six tiles about 19 turns, so 30 only catches careless play. Final Year (20 pairs) takes even perfect
 * memory about 34 turns because of the swaps (39 at worst), so 42 is the tightest limit that can always be won.
 */
export const PAIRS_LEVELS = {
  beginner:     { cols: 4, rows: 3, peek: 3,   swapEvery: 0, maxTurns: 0 },
  intermediate: { cols: 6, rows: 4, peek: 1.5, swapEvery: 0, maxTurns: 30 },
  advanced:     { cols: 8, rows: 5, peek: 0,   swapEvery: 4, maxTurns: 42 },
};

/** A "perfect-memory" game needs `pairs` turns; par allows some forgetting. */
export const parTurns = (pairs) => Math.ceil(pairs * 1.6);

export function starRating(pairs, turns) {
  const par = parTurns(pairs);
  if (turns <= par) return 3;
  if (turns <= Math.ceil(par * 1.6)) return 2;
  return 1;
}

export function scoreFor({ pairs, turns, mismatches, seconds }) {
  const base = pairs * 100;
  const speed = Math.max(0, pairs * 12 - seconds) * 3;
  return Math.max(0, Math.round(base + speed - mismatches * 15 - Math.max(0, turns - pairs) * 5));
}

export class PairsModel {
  constructor({ cols, rows, rng, swapEvery = 0, maxTurns = 0, symbolCount = SYMBOL_COUNT }) {
    const total = cols * rows;
    if (total % 2) throw new Error('Board needs an even number of tiles');
    this.pairs = total / 2;
    if (this.pairs > symbolCount) throw new Error('Not enough symbols for this board size');
    this.cols = cols;
    this.rows = rows;
    this.swapEvery = swapEvery;
    this.maxTurns = maxTurns;
    this.rng = rng;

    const symbols = rng.sample(range(symbolCount), this.pairs);
    const deck = rng.shuffle([...symbols, ...symbols]);
    this.tiles = deck.map((symbol, index) => ({ index, symbol, state: 'down' })); // down | up | matched

    this.turns = 0;       // completed attempts (two tiles flipped)
    this.mismatches = 0;
    this.matched = 0;     // pairs found
    this.first = null;    // index of the lone face-up tile
    this.pending = null;  // [a, b] mismatched tiles still face-up
    this.swapDue = false;
  }

  get done() { return this.matched === this.pairs; }

  /** Turns left before the game is lost, or Infinity when the level has no limit. */
  get turnsLeft() { return this.maxTurns > 0 ? Math.max(0, this.maxTurns - this.turns) : Infinity; }

  /** Every turn is used and the board is not cleared: the game is lost. */
  get outOfTurns() { return this.maxTurns > 0 && this.turns >= this.maxTurns && !this.done; }

  /**
   * Flip a tile. Returns a description of what happened so the view can animate:
   *   { type: 'ignored' }
   *   { type: 'flip', kind: 'first'|'match'|'mismatch', index, pair?, hidden?, swapped?, done? }
   * `hidden` – a previous mismatched pair that was flipped back because the player moved on.
   * `swapped` – [i, j] hidden tiles that traded places before this flip.
   */
  flip(index) {
    const tile = this.tiles[index];
    if (!tile || tile.state !== 'down') return { type: 'ignored' };

    const out = { type: 'flip', index };
    if (this.pending) {
      out.hidden = this.dismissPending();
      const swapped = this.takeSwap();
      if (swapped) out.swapped = swapped;
    }

    tile.state = 'up';
    if (this.first === null) {
      this.first = index;
      out.kind = 'first';
      return out;
    }

    const other = this.tiles[this.first];
    const pair = [this.first, index];
    this.turns += 1;
    this.first = null;
    if (other.symbol === tile.symbol) {
      other.state = 'matched';
      tile.state = 'matched';
      this.matched += 1;
      out.kind = 'match';
      out.pair = pair;
      out.done = this.done;
    } else {
      this.mismatches += 1;
      this.pending = pair;
      this.swapDue = this.swapEvery > 0 && this.mismatches % this.swapEvery === 0;
      out.kind = 'mismatch';
      out.pair = pair;
    }
    return out;
  }

  /** Flip a mismatched pair back down. Returns [a, b] or null. */
  dismissPending() {
    if (!this.pending) return null;
    const pair = this.pending;
    for (const i of pair) this.tiles[i].state = 'down';
    this.pending = null;
    return pair;
  }

  /** If a swap is due and possible, trade two face-down tiles with different symbols. */
  takeSwap() {
    if (!this.swapDue) return null;
    this.swapDue = false;
    const down = this.tiles.filter((t) => t.state === 'down');
    if (down.length < 2) return null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const [a, b] = this.rng.sample(down, 2);
      if (a.symbol !== b.symbol) {
        [a.symbol, b.symbol] = [b.symbol, a.symbol];
        return [a.index, b.index];
      }
    }
    return null;
  }
}
