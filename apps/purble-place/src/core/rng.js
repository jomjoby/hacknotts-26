// Seedable PRNG so games are reproducible (daily challenges, bug reports, tests).

export function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same number for everyone on a given UTC day – pass it as `seed` for a daily challenge. */
export function dailySeed(date = new Date()) {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export class Rng {
  constructor(seed) {
    this.seed = seed ?? (Math.random() * 4294967296) >>> 0;
    this._next = mulberry32(this.seed);
  }
  /** float in [0, 1) */
  next() { return this._next(); }
  /** integer in [0, n) */
  int(n) { return Math.floor(this.next() * n); }
  /** integer in [lo, hi] inclusive */
  range(lo, hi) { return lo + this.int(hi - lo + 1); }
  /** float in [lo, hi) */
  float(lo = 0, hi = 1) { return lo + this.next() * (hi - lo); }
  chance(p = 0.5) { return this.next() < p; }
  pick(arr) { return arr[this.int(arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  sample(arr, k) { return this.shuffle(arr).slice(0, k); }
  /** Independent child generator (so one game's draws don't disturb another's). */
  fork() { return new Rng(this.int(2147483647)); }
}
