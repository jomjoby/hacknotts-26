// Purble Shop – pure model. A hidden arrangement of coloured items must be
// deduced from "right colour, right place" / "right colour, wrong place" clues.

/**
 *  slots       items in the hidden arrangement
 *  colors      how many distinct item colours are on the shelf
 *  duplicates  may the same colour appear more than once?
 *  guesses     rows on the board
 *  hints       peeks at one hidden slot the player may buy
 */
export const SHOP_LEVELS = {
  beginner:     { slots: 4, colors: 5, duplicates: false, guesses: 10, hints: 2 },
  intermediate: { slots: 4, colors: 6, duplicates: true,  guesses: 10, hints: 1 },
  advanced:     { slots: 5, colors: 8, duplicates: true,  guesses: 12, hints: 1 },
};

/**
 * Classic Mastermind scoring, correct for duplicates.
 * @returns {{exact:number, partial:number}}
 *   exact   – right colour in the right slot
 *   partial – right colour in the wrong slot
 */
export function scoreGuess(secret, guess) {
  let exact = 0;
  const secretLeft = new Map();
  const guessLeft = new Map();
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) {
      exact++;
    } else {
      secretLeft.set(secret[i], (secretLeft.get(secret[i]) || 0) + 1);
      guessLeft.set(guess[i], (guessLeft.get(guess[i]) || 0) + 1);
    }
  }
  let partial = 0;
  for (const [color, count] of guessLeft) partial += Math.min(count, secretLeft.get(color) || 0);
  return { exact, partial };
}

export function randomSecret(rng, { slots, colors, duplicates }) {
  const palette = Array.from({ length: colors }, (_, i) => i);
  if (!duplicates) {
    if (colors < slots) throw new Error('Need at least as many colours as slots when duplicates are off');
    return rng.sample(palette, slots);
  }
  return Array.from({ length: slots }, () => rng.pick(palette));
}

export function starRating({ guessesUsed, maxGuesses, hintsUsed }) {
  let stars = guessesUsed <= Math.ceil(maxGuesses * 0.5) ? 3 : guessesUsed <= Math.ceil(maxGuesses * 0.8) ? 2 : 1;
  stars -= hintsUsed > 0 ? 1 : 0;
  return Math.max(1, stars);
}

export function scoreFor({ guessesUsed, maxGuesses, hintsUsed, slots, colors }) {
  const difficulty = slots * colors;
  return Math.max(50, Math.round((maxGuesses - guessesUsed + 1) * difficulty * 5 - hintsUsed * 100));
}

export class ShopModel {
  constructor({ slots, colors, duplicates, guesses, hints = 0, rng, secret }) {
    this.slots = slots;
    this.colors = colors;
    this.duplicates = duplicates;
    this.maxGuesses = guesses;
    this.hintsLeft = hints;
    this.hintsUsed = 0;
    this.secret = secret || randomSecret(rng, { slots, colors, duplicates });
    this.rows = [];                           // submitted: { guess, exact, partial }
    this.current = Array(slots).fill(null);   // row being edited
    this.revealed = Array(slots).fill(false); // slots exposed by hints
    this.status = 'playing';                  // playing | won | lost
  }

  get guessesUsed() { return this.rows.length; }
  get full() { return this.current.every((c) => c !== null); }
  get over() { return this.status !== 'playing'; }

  place(slot, color) {
    if (this.over || slot < 0 || slot >= this.slots || color < 0 || color >= this.colors) return false;
    this.current[slot] = color;
    return true;
  }

  clearSlot(slot) {
    if (this.over || this.current[slot] === null) return false;
    this.current[slot] = null;
    return true;
  }

  /** Put `color` in the first empty slot. Returns the slot used or -1. */
  fillNext(color) {
    const slot = this.current.indexOf(null);
    if (slot < 0) return -1;
    return this.place(slot, color) ? slot : -1;
  }

  swapSlots(a, b) {
    if (this.over || a === b) return false;
    [this.current[a], this.current[b]] = [this.current[b], this.current[a]];
    return true;
  }

  clearRow() {
    if (this.over) return;
    this.current.fill(null);
  }

  /** Submit the current row. Returns the clue row or null when the row isn't full. */
  submit() {
    if (this.over || !this.full) return null;
    const guess = this.current.slice();
    const { exact, partial } = scoreGuess(this.secret, guess);
    const row = { guess, exact, partial };
    this.rows.push(row);
    this.current = Array(this.slots).fill(null);
    if (exact === this.slots) this.status = 'won';
    else if (this.rows.length >= this.maxGuesses) this.status = 'lost';
    return row;
  }

  /** Reveal one still-hidden slot. Returns { slot, color } or null. */
  useHint(rng) {
    if (this.over || this.hintsLeft <= 0) return null;
    const hidden = this.revealed.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
    if (!hidden.length) return null;
    const slot = rng.pick(hidden);
    this.revealed[slot] = true;
    this.hintsLeft -= 1;
    this.hintsUsed += 1;
    return { slot, color: this.secret[slot] };
  }
}
