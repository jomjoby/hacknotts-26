// "Catch the Purble" – the smallest useful extra mini-game. Copy this file to start your own.
//
//   import { mount } from '../../src/index.js';
//   import { helloPurble } from './hello-purble.js';
//   mount(el, { games: [helloPurble] });       // or registerGame(helloPurble) for every instance
//
// What a game gets from MiniGame for free:
//   level select dialog, pause/resume, game clock (update/after), result dialog and stats,
//   sound, storage, menu items, help dialog, clean-up on destroy
//
// Rules of the road: build everything inside this.el (an 800x600 design space – the shell
// scales it), use this.after()/this.listen() instead of setTimeout/addEventListener, and call
// this.finish() when the round ends.

import { MiniGame } from '../../src/core/mini-game.js';
import { h } from '../../src/core/dom.js';
import { purble } from '../../src/core/purble.js';

const LEVELS = {
  easy: { hits: 8, size: 130, life: 2.2 },
  hard: { hits: 14, size: 80, life: 1.1 },
};

export class HelloPurble extends MiniGame {
  init() {
    this.score = h('b', {}, '0');
    this.field = h('div', { class: 'hp-field' });
    this.el.style.background = 'linear-gradient(#bfe9ff, #e9fbd9)';
    this.el.append(
      h('div', { style: { position: 'absolute', left: '16px', top: '12px', font: '800 22px var(--pp-font)', color: '#3c2170' } }, 'Caught: ', this.score),
      this.field);
    this.field.style.cssText = 'position:absolute;inset:50px 0 0 0';
  }

  begin(levelId) {
    this.cfg = LEVELS[levelId];
    this.caught = 0;
    this.missed = 0;
    this.field.replaceChildren();
    this.score.textContent = '0';
    this.state = 'playing';
    this.spawn();
  }

  spawn() {
    if (this.state !== 'playing') return;
    const { size, life } = this.cfg;
    const x = this.rng.range(10, 800 - size - 10);
    const y = this.rng.range(10, 550 - size - 10);
    const body = this.rng.pick(['#a45fd8', '#4fb8c9', '#f08a4b', '#ec6fa4']);
    const el = h('button', {
      type: 'button', 'aria-label': 'Purble',
      style: { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${size}px`, padding: 0, border: 0, background: 'none', cursor: 'pointer' },
      html: purble({ body, mood: 'excited' }),
    });
    const cancelMiss = this.after(life, () => { el.remove(); this.missed += 1; this.sound.play('mismatch'); this.next(); });
    el.addEventListener('click', () => {
      if (this.paused) return;
      cancelMiss();
      el.remove();
      this.caught += 1;
      this.score.textContent = String(this.caught);
      this.sound.play('match');
      this.next();
    });
    this.field.append(el);
  }

  next() {
    if (this.caught >= this.cfg.hits) {
      const stars = this.missed === 0 ? 3 : this.missed < 4 ? 2 : 1;
      this.finish({
        won: true, stars, score: this.caught * 100 - this.missed * 20, moves: this.caught + this.missed,
        title: 'Caught them all!', text: `You caught ${this.caught} purbles and missed ${this.missed}.`,
      });
    } else {
      this.after(0.25, () => this.spawn());
    }
  }

  helpHTML() {
    return '<p>Click each Purble before it hops away!</p>';
  }
}

export const helloPurble = {
  id: 'hello-purble',
  title: 'Catch the Purble',
  order: 90,
  levels: [
    { id: 'easy', name: 'Easy' },
    { id: 'hard', name: 'Hard' },
  ],
  Game: HelloPurble,
  hub: { accent: '#6cc36b' },
  icon: purble({ mood: 'excited' }),
};
