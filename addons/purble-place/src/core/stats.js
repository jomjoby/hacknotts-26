// Persistent per-game, per-level statistics.
//
// stats.record('purble-pairs', 'beginner', { won: true, stars: 3, time: 42, moves: 9, score: 640 })
// Fields in BEST_RULES are tracked as personal bests; everything else is ignored.

const BEST_RULES = { stars: 'max', score: 'max', time: 'min', moves: 'min' };

export class Stats {
  constructor(storage) {
    this.storage = storage;
    this.data = storage.get('stats', {});
  }

  _slot(gameId, levelId) {
    const game = (this.data[gameId] ||= {});
    return (game[levelId] ||= { played: 0, won: 0, best: {} });
  }

  record(gameId, levelId, result) {
    const slot = this._slot(gameId, levelId);
    slot.played += 1;
    if (result.won) {
      slot.won += 1;
      for (const [field, rule] of Object.entries(BEST_RULES)) {
        const value = result[field];
        if (typeof value !== 'number' || Number.isNaN(value)) continue;
        const prev = slot.best[field];
        if (prev === undefined || (rule === 'max' ? value > prev : value < prev)) slot.best[field] = value;
      }
    }
    this.storage.set('stats', this.data);
    return slot;
  }

  get(gameId, levelId) {
    return this.data[gameId]?.[levelId] || { played: 0, won: 0, best: {} };
  }

  all() {
    return this.data;
  }

  /** Best star rating across every level of a game (0 if never won). */
  bestStars(gameId, levelId) {
    return this.get(gameId, levelId).best.stars || 0;
  }

  reset() {
    this.data = {};
    this.storage.remove('stats');
  }
}
