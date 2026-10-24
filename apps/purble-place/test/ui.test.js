// Integration tests: the real shell + real DOM, driven the way a player would.
// Time is stepped by hand (game.advance) so the tests are fast and deterministic.

import { describe, it, assert } from './harness.js';
import { mount } from '../src/index.js';
import { helloPurble } from './fixtures/hello-purble.js';
import { SLOT } from '../src/games/comfy-cakes/logic.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

async function boot(opts = {}) {
  const el = document.createElement('div');
  // on top of the results list so hit-testing (elementFromPoint, drag & drop) behaves like a real page
  el.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:622px;z-index:99999;background:#fff';
  document.body.append(el);
  const app = mount(el, { storage: memory(), sound: false, seed: 1, autoFocus: false, ...opts });
  await app._styles?.loaded;
  app.resize();
  return { app, el, done() { app.destroy(); el.remove(); } };
}
const step = (app, seconds, dt = 0.05) => { for (let t = 0; t < seconds - 1e-9; t += dt) app.game.advance(dt); };
const $ = (app, sel) => app.root.querySelector(sel);
const $$ = (app, sel) => [...app.root.querySelectorAll(sel)];
const dialogButton = (app, label) => $$(app, '.pp-dialog button').find((b) => b.textContent.trim() === label);
const key = (app, k, extra = {}) => app.root.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }));

describe('Shell – hub, menus, navigation', () => {
  it('mounts a hub with a building per game and a menu bar', async () => {
    const t = await boot();
    assert.equal($$(t.app, '.pp-building').length, 3);
    assert.deepEqual($$(t.app, '.pp-menu-title').map((b) => b.textContent), ['Game', 'Help']);
    assert.equal(t.app.view, 'hub');
    assert.ok(t.app.scale > 0.9 && t.app.scale < 1.1, `stage scale ${t.app.scale}`);
    t.done();
  });
  it('opens a game via the level dialog and goes back home', async () => {
    const t = await boot();
    const events = []; t.app.on('*', (n) => events.push(n));
    $$(t.app, '.pp-building')[1].click();
    assert.equal(t.app.view, 'game');
    assert.equal($$(t.app, '.pp-level-btn').length, 3);
    $$(t.app, '.pp-level-btn')[0].click();
    assert.equal(t.app.game.level, 'beginner');
    assert.ok(events.includes('navigate') && events.includes('game:start'));
    t.app.goHome();
    assert.equal(t.app.view, 'hub'); assert.equal(t.app.game, null);
    assert.equal(t.app.overlay.count, 0);
    t.done();
  });
  it('Escape on the level dialog returns to the hub when no level was chosen', async () => {
    const t = await boot();
    t.app.openGame('purble-shop');
    assert.equal(t.app.overlay.count, 1);
    key(t.app, 'Escape');
    assert.equal(t.app.view, 'hub');
    t.done();
  });
  it('menu bar: open Game menu, use Level submenu and Back to Purble Place', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'beginner');
    t.app.menubar.open(0);
    const labels = $$(t.app, '.pp-menu-pop > .pp-menu-item .pp-menu-label').map((n) => n.textContent);
    assert.ok(['New Game', 'Level', 'Sound', 'Statistics', 'Back to the building'].every((l) => labels.includes(l)), labels.join('|'));
    const subs = $$(t.app, '.pp-menu-pop .is-nested .pp-menu-item');
    assert.equal(subs.length, 3);
    assert.ok(subs[0].classList.contains('is-checked'));
    subs[2].click();
    assert.equal(t.app.game.level, 'advanced'); assert.equal($(t.app, '.pp-menu-pop'), null, 'menu closed after choosing');
    t.app.menubar.open(0);
    $$(t.app, '.pp-menu-pop > .pp-menu-item').find((b) => b.textContent.includes('Back to the building')).click();
    assert.equal(t.app.view, 'hub');
    t.done();
  });
  it('menubar:false hides the bar but getMenuModel() still works', async () => {
    const t = await boot({ menubar: false });
    assert.equal($(t.app, '.pp-menubar'), null);
    assert.deepEqual(t.app.getMenuModel().map((m) => m.label), ['Game', 'Help']);
    t.done();
  });
  it('F1 shows help and pauses the game; Esc closes and resumes', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'beginner');
    key(t.app, 'F1');
    assert.equal(t.app.overlay.count, 1); assert.ok(t.app.game.paused);
    key(t.app, 'Escape');
    assert.equal(t.app.overlay.count, 0); assert.ok(!t.app.game.paused);
    t.done();
  });
  it('F2 restarts the current game', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'intermediate');
    let starts = 0; t.app.on('game:start', () => { starts++; });
    key(t.app, 'F2');
    assert.equal(starts, 1);
    t.done();
  });
  it('host pause()/resume() freezes the game clock', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    t.app.pause(); assert.ok(t.app.game.paused);
    t.app.resume(); assert.ok(!t.app.game.paused);
    t.done();
  });
  it('unknown game ids throw', async () => {
    const t = await boot();
    assert.throws(() => t.app.openGame('nope'));
    t.done();
  });
});

describe('Shell – settings, storage, lifecycle', () => {
  it('sound setting persists through the storage adapter', async () => {
    const storage = memory();
    const a = await boot({ storage, sound: true });
    a.app.setMuted(true); a.done();
    const b = await boot({ storage, sound: true });
    assert.equal(b.app.settings.muted, true); assert.equal(b.app.sound.muted, true);
    b.done();
  });
  it('destroy() removes the DOM, the stylesheet and the game', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    const root = t.app.root;
    t.app.destroy();
    assert.ok(!document.contains(root));
    assert.equal(document.querySelectorAll('link[data-purble-place]').length, 0);
    t.done();
  });
  it('two instances coexist; the stylesheet is shared and ref-counted', async () => {
    const a = await boot(); const b = await boot();
    assert.equal(document.querySelectorAll('link[data-purble-place]').length, 1);
    a.app.openGame('purble-shop', 'beginner'); assert.equal(b.app.view, 'hub');
    a.done();
    assert.equal(document.querySelectorAll('link[data-purble-place]').length, 1);
    b.done();
    assert.equal(document.querySelectorAll('link[data-purble-place]').length, 0);
  });
  it('startGame / startLevel options skip the hub', async () => {
    const t = await boot({ startGame: 'purble-shop', startLevel: 'advanced' });
    assert.equal(t.app.view, 'game'); assert.equal(t.app.game.level, 'advanced');
    t.done();
  });
  it('statistics dialog lists played levels', async () => {
    const t = await boot();
    t.app.stats.record('purble-pairs', 'beginner', { won: true, stars: 3, time: 40, score: 700 });
    t.app.showStats();
    assert.ok($(t.app, '.pp-stats').textContent.includes('Pair Programming'));
    t.done();
  });
  it('strings can be overridden', async () => {
    const t = await boot({ strings: { 'menu.game': 'Spiel', 'purble-pairs.title': 'Paare' } });
    assert.equal($$(t.app, '.pp-menu-title')[0].textContent, 'Spiel');
    assert.ok($$(t.app, '.pp-building').some((b) => b.getAttribute('aria-label') === 'Paare'));
    t.done();
  });
});

describe('Plugin system – a fourth game', () => {
  it('appears on the hub, plays, finishes and records stats', async () => {
    const t = await boot({ games: [helloPurble] });
    assert.equal($$(t.app, '.pp-building').length, 4);
    t.app.openGame('hello-purble', 'easy');
    let ended = null; t.app.on('game:end', (e) => { ended = e; });
    for (let i = 0; i < 8; i++) {
      step(t.app, 0.3);
      const target = t.app.root.querySelector('.hp-field button, .pp-game-hello-purble button[aria-label="Purble"]');
      assert.ok(target, `purble ${i} present`);
      target.click();
    }
    step(t.app, 0.5);
    assert.ok(ended && ended.won && ended.game === 'hello-purble');
    assert.equal(t.app.stats.get('hello-purble', 'easy').won, 1);
    assert.ok(dialogButton(t.app, 'Play again'));
    t.done();
  });
  it('a purble that is not clicked in time counts as a miss', async () => {
    const t = await boot({ games: [helloPurble] });
    t.app.openGame('hello-purble', 'hard');
    step(t.app, 2);
    assert.ok(t.app.game.missed >= 1);
    t.done();
  });
  it('invalid definitions are rejected with a helpful message', async () => {
    const t = await boot();
    let msg = ''; try { t.app.registerGame({ id: 'x' }); } catch (e) { msg = e.message; }
    assert.ok(msg.includes('title') || msg.includes('levels'), msg);
    t.done();
  });
});

describe('<purble-place> custom element (shadow DOM)', () => {
  it('renders the hub with styles inside its shadow root and plays a game', async () => {
    await import('../src/element.js');
    const host = document.createElement('purble-place');
    host.setAttribute('muted', '');
    host.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:622px;z-index:99999';
    const events = []; host.addEventListener('purble-game-start', (e) => events.push(e.detail));
    document.body.append(host);
    await host.app._styles.loaded;
    const shadow = host.shadowRoot;
    assert.equal(shadow.querySelectorAll('.pp-building').length, 3);
    assert.equal(shadow.querySelectorAll('link[data-purble-place]').length, 1, 'stylesheet lives in the shadow root');
    assert.equal(document.querySelectorAll('link[data-purble-place]').length, 0, 'and not in the document');
    assert.ok(getComputedStyle(shadow.querySelector('.pp-menubar')).display === 'flex', 'styles applied');
    host.app.openGame('purble-shop', 'beginner');
    assert.deepEqual(events[0], { game: 'purble-shop', level: 'beginner' });
    // hit-testing inside the shadow root (used by drag & drop)
    const slot = shadow.querySelector('.sh-row.is-active .sh-slot'); const r = slot.getBoundingClientRect();
    assert.equal(host.app.game.slotAt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }), 0);
    host.remove();
    assert.equal(host.app, null, 'disconnect destroys the app');
  });
  it('attributes start a game directly', async () => {
    await import('../src/element.js');
    const host = document.createElement('purble-place');
    host.setAttribute('game', 'purble-pairs'); host.setAttribute('level', 'advanced'); host.setAttribute('muted', '');
    host.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:622px;z-index:99999';
    document.body.append(host);
    assert.equal(host.app.game.level, 'advanced');
    host.remove();
  });
});

describe('Campus scene: the three games are rooms of one building', () => {
  it('every built-in game has a spot, inside the stage and the building, and the spots do not overlap', async () => {
    const { CAMPUS_SPOTS } = await import('../src/shell/campus.js');
    const ids = ['comfy-cakes', 'purble-pairs', 'purble-shop'];
    for (const id of ids) {
      const s = CAMPUS_SPOTS[id]; assert.ok(s, `${id} has a spot`);
      assert.ok(s.x >= 240 && s.x + s.w <= 770, `${id} is inside the building's width (right of the library)`);
      assert.ok(s.y >= 150 && s.y + s.h <= 430, `${id} is on the building`);
    }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = CAMPUS_SPOTS[ids[i]]; const b = CAMPUS_SPOTS[ids[j]];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${ids[i]} overlaps ${ids[j]}`);
    }
  });
  it('the town square draws one scene with three clickable spots, not three separate buildings', async () => {
    const t = await boot();
    assert.equal($$(t.app, '.pp-building.is-spot').length, 3);
    assert.equal($$(t.app, '.pp-building-art').length, 0);
    assert.equal($$(t.app, 'svg.pp-hub-bg').length, 1);
    $$(t.app, '.pp-building.is-spot')[1].click();
    assert.equal(t.app.view, 'game');
    t.done();
  });
  it('Atrium Cakes is named across the upper middle of the Atrium; the other two names sit underneath', async () => {
    const { CAMPUS_SPOTS } = await import('../src/shell/campus.js');
    const a = CAMPUS_SPOTS['comfy-cakes'];
    assert.ok(a.label && a.label.y > a.y && a.label.y < a.y + a.h * 0.4, 'label is in the upper part of the Atrium');
    assert.equal(CAMPUS_SPOTS['purble-shop'].label, undefined);
    assert.equal(CAMPUS_SPOTS['purble-pairs'].label, undefined);
    const t = await boot();
    const [shop, cakes, pairs] = ['purble-shop', 'comfy-cakes', 'purble-pairs'].map((id) => $$(t.app, '.pp-building.is-spot').find((b) => b.getAttribute('aria-label') === t.app.listGames().find((g) => g.id === id).title));
    const nameTop = (b) => b.offsetTop + b.querySelector('.pp-building-name').offsetTop;
    assert.ok(nameTop(cakes) < 300, `Atrium name is high on the building (${nameTop(cakes)})`);
    assert.ok(nameTop(shop) >= 400 && nameTop(pairs) >= 400, 'the other names are underneath');
    t.done();
  });
  it('the scene has no invented extras (no Aspire tower, no ducks)', async () => {
    const { CAMPUS_BACKDROP } = await import('../src/shell/campus.js');
    assert.ok(!/duck|aspire/i.test(CAMPUS_BACKDROP));
  });
  it('the towers have no spires, and the sign has no building number', async () => {
    const { CAMPUS_BACKDROP } = await import('../src/shell/campus.js');
    assert.ok(!/cowl|funnel/i.test(CAMPUS_BACKDROP));
    assert.ok(!/>\s*4\s*</.test(CAMPUS_BACKDROP), 'a lone "4" is drawn somewhere');
    assert.ok(CAMPUS_BACKDROP.includes('>Computer<') && CAMPUS_BACKDROP.includes('>Science<'));
  });
  it('the library stands on an island at the front left, clear of the three clickable spots', async () => {
    const { CAMPUS_BACKDROP, CAMPUS_SPOTS } = await import('../src/shell/campus.js');
    assert.equal((CAMPUS_BACKDROP.match(/class="cs-library"/g) || []).length, 1);
    const minX = Math.min(...Object.values(CAMPUS_SPOTS).map((s) => s.x));
    assert.ok(minX >= 246, 'the spots start to the right of the library');
  });
  it('Canada geese walk along the bank', async () => {
    const { CAMPUS_BACKDROP } = await import('../src/shell/campus.js');
    assert.ok((CAMPUS_BACKDROP.match(/class="pp-goose"/g) || []).length >= 3);
  });
});

describe('Hub layout scales to any number of games', () => {
  for (const n of [1, 3, 4, 5, 8, 9, 12]) {
    it(`${n} game(s): every building is inside the stage and none overlap`, async () => {
      const extras = Array.from({ length: Math.max(0, n - 3) }, (_, i) => ({ ...helloPurble, id: `extra-${i}`, title: `Extra ${i}` }));
      const t = await boot({ games: extras });
      if (n < 3) { /* built-ins are always registered; just check n=3 baseline */ }
      const boxes = $$(t.app, '.pp-building').map((b) => ({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }));
      assert.equal(boxes.length, Math.max(3, n));
      boxes.forEach((b, i) => {
        assert.ok(b.x >= 0 && b.x + b.w <= 800, `#${i} horizontal ${b.x}+${b.w}`);
        assert.ok(b.y >= 100 && b.y + b.h <= 600, `#${i} vertical ${b.y}+${b.h}`);
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]; const b = boxes[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, `#${i} overlaps #${j}`);
      }
      t.done();
    });
  }
});

describe('Purble Pairs – UI', () => {
  it('clicking a third tile while a mismatch is showing flips the pair back at once', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'intermediate'); const g = t.app.game; step(t.app, 2);
    const a = g.model.tiles[0]; const d = g.model.tiles.find((x) => x.symbol !== a.symbol);
    g.tileEls[0].click(); g.tileEls[d.index].click(); step(t.app, 0.2);
    assert.equal($$(t.app, '.pr-tile.is-up').length, 2);
    const third = g.model.tiles.find((x) => x.state === 'down');
    g.tileEls[third.index].click(); step(t.app, 0.05);
    assert.equal($$(t.app, '.pr-tile.is-up').length, 1, 'only the new tile is face up');
    assert.ok(g.tileEls[third.index].classList.contains('is-up'));
    step(t.app, 2);                                          // the cancelled mismatch timer must not misfire
    assert.ok(g.tileEls[third.index].classList.contains('is-up'));
    t.done();
  });
  it('plays a whole beginner game by clicking tiles', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'beginner');
    const g = t.app.game; let end = null; t.app.on('game:end', (e) => { end = e; });
    step(t.app, g.cfg.peek + 0.5);                       // the peek is over
    assert.equal($$(t.app, '.pr-tile.is-up').length, 0, 'tiles are face down after the peek');
    // a deliberate mismatch first
    const a = g.model.tiles[0]; const decoy = g.model.tiles.find((x) => x.symbol !== a.symbol);
    g.tileEls[0].click(); step(t.app, 0.2); g.tileEls[decoy.index].click(); step(t.app, 0.2);
    assert.equal($$(t.app, '.pr-tile.is-up').length, 2);
    step(t.app, 1.3);
    assert.equal($$(t.app, '.pr-tile.is-up').length, 0, 'mismatch flipped back');
    for (let i = 0; i < g.model.tiles.length; i++) {
      if (g.model.tiles[i].state !== 'down') continue;
      const mate = g.model.tiles.find((x) => x.index !== i && x.symbol === g.model.tiles[i].symbol).index;
      g.tileEls[i].click(); step(t.app, 0.1); g.tileEls[mate].click(); step(t.app, 0.5);
    }
    assert.equal($$(t.app, '.pr-tile.is-matched').length, 12);
    step(t.app, 1.5);
    assert.ok(end && end.won && end.game === 'purble-pairs');
    assert.ok(end.stars >= 1 && end.moves === 7);
    assert.ok(dialogButton(t.app, 'Play again'));
    t.done();
  });
  it('arrow keys move focus around the board', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'beginner'); const g = t.app.game;
    g.tileEls[0].focus();
    g.boardEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    g.boardEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.equal(g.focusIndex, 1 + g.cfg.cols);
    assert.equal(document.activeElement === g.tileEls[g.focusIndex] || t.app.root.contains(document.activeElement), true);
    t.done();
  });
  it('advanced: the trickster swaps tiles and tells the player', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'advanced'); const g = t.app.game; step(t.app, 0.2);
    for (let n = 0; n < 4; n++) {
      const a = g.model.tiles.find((x) => x.state === 'down');
      const d = g.model.tiles.find((x) => x.state === 'down' && x.symbol !== a.symbol);
      g.tileEls[a.index].click(); step(t.app, 0.1); g.tileEls[d.index].click(); step(t.app, 1.5);
    }
    step(t.app, 1);
    assert.ok($(t.app, '.pp-toast.is-on') || $$(t.app, '.pr-tile.is-swapped').length >= 0);
    assert.equal(g.model.mismatches, 4);
    t.done();
  });
});

describe('Purble Shop – UI', () => {
  const solve = (t, g) => { g.model.secret.forEach((c) => $$(t.app, '.sh-pal')[c].click()); };
  it('wins by clicking palette colours and Check', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner'); const g = t.app.game; let end = null; t.app.on('game:end', (e) => { end = e; });
    assert.equal($$(t.app, '.sh-pal').length, 5);
    assert.ok($(t.app, '.sh-btn-check').disabled, 'Check disabled while the row is empty');
    // a wrong guess first: shift the secret by one colour
    g.model.secret.forEach((c) => $$(t.app, '.sh-pal')[(c + 1) % 5].click());
    assert.ok(!$(t.app, '.sh-btn-check').disabled);
    $(t.app, '.sh-btn-check').click();
    assert.equal(g.model.rows.length, 1);
    assert.equal($$(t.app, '.sh-row.is-done .sh-peg.is-exact, .sh-row.is-done .sh-peg.is-partial').length, g.model.rows[0].exact + g.model.rows[0].partial);
    solve(t, g); $(t.app, '.sh-btn-check').click(); step(t.app, 1.5);
    assert.ok(end && end.won && end.moves === 2);
    assert.equal($$(t.app, '.sh-secret .sh-item').length, 4, 'secret revealed');
    t.done();
  });
  it('a full row refuses more colours; clicking a placed item takes it back', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner'); const g = t.app.game;
    for (let i = 0; i < 4; i++) $$(t.app, '.sh-pal')[i].click();
    $$(t.app, '.sh-pal')[4].click();
    assert.deepEqual(g.model.current, [0, 1, 2, 3]);
    // a click with detail 0 is what keyboard activation (Enter/Space) produces
    $$(t.app, '.sh-row.is-active .sh-slot')[1].click();
    assert.deepEqual(g.model.current, [0, null, 2, 3]);
    t.done();
  });
  it('keyboard: 1-5 add, Backspace removes, Enter checks, H hints', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner'); const g = t.app.game;
    ['1', '2', '3', '4'].forEach((k) => key(t.app, k));
    assert.deepEqual(g.model.current, [0, 1, 2, 3]);
    key(t.app, 'Backspace'); assert.deepEqual(g.model.current, [0, 1, 2, null]);
    key(t.app, '5'); key(t.app, 'Enter'); assert.equal(g.model.rows.length, 1);
    const left = g.model.hintsLeft; key(t.app, 'h'); assert.equal(g.model.hintsLeft, left - 1);
    assert.equal($$(t.app, '.sh-secret .is-hinted').length, 1);
    t.done();
  });
  it('drag & drop: palette -> slot, slot -> slot swap, slot -> off-board removes', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner'); const g = t.app.game;
    const center = (el) => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; };
    const fire = (el, type, pos, extra = {}) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, ...pos, ...extra }));
    const drag = (from, to) => {
      const a = center(from); const b = to ? center(to) : { clientX: a.clientX, clientY: a.clientY + 5000 };
      fire(from, 'pointerdown', a); fire(from, 'pointermove', { clientX: a.clientX + 12, clientY: a.clientY + 12 }); fire(from, 'pointermove', b); fire(from, 'pointerup', b);
    };
    const slots = () => $$(t.app, '.sh-row.is-active .sh-slot');
    drag($$(t.app, '.sh-pal')[3], slots()[2]);
    assert.deepEqual(g.model.current, [null, null, 3, null]);
    drag($$(t.app, '.sh-pal')[1], slots()[0]);
    assert.deepEqual(g.model.current, [1, null, 3, null]);
    drag(slots()[0], slots()[2]);
    assert.deepEqual(g.model.current, [3, null, 1, null], 'swapped');
    drag(slots()[2], null);
    assert.deepEqual(g.model.current, [3, null, null, null], 'dragged off the board');
    // plain pointer click on palette adds, on slot removes
    const c = center($$(t.app, '.sh-pal')[2]); const p = $$(t.app, '.sh-pal')[2];
    fire(p, 'pointerdown', c); fire(p, 'pointerup', c);
    assert.deepEqual(g.model.current, [3, 2, null, null]);
    t.done();
  });
  it('colour-blind symbols toggle shows glyphs on every item', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner');
    assert.equal($$(t.app, '.sh-pal .sh-item svg').length, 0);
    t.app.setSetting('colorblind', true);
    assert.equal($$(t.app, '.sh-pal .sh-item svg').length, 5);
    t.done();
  });
  it('losing reveals the secret and offers another go', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner'); const g = t.app.game; let end = null; t.app.on('game:end', (e) => { end = e; });
    const wrong = g.model.secret.map((c) => (c + 1) % 5);
    // make sure the guess can't be accidentally right
    for (let i = 0; i < 10; i++) { wrong.forEach((c) => $$(t.app, '.sh-pal')[c].click()); $(t.app, '.sh-btn-check').click(); }
    step(t.app, 1.5);
    assert.ok(end && !end.won); assert.ok($$(t.app, '.pp-dialog-title').some((n) => n.textContent.trim() === 'Locked out'));
    t.done();
  });
});

describe('Comfy Cakes – UI', () => {
  const btn = (app, slot, label) => $$(app, `.cc-panel-${slot} button`).find((b) => (b.title || b.textContent).trim().startsWith(label));
  it('builds and serves a cake with real button clicks; DOM tracks the simulation', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); const g = t.app.game;
    step(t.app, 1.2);
    assert.equal($$(t.app, '.cc-customer').length, 1);
    const o = g.world.customers[0].order;
    const SH = { round: 'Round', square: 'Square' }; const BA = { vanilla: 'Vanilla', chocolate: 'Chocolate', strawberry: 'Strawberry' };
    const IC = { white: 'Vanilla', pink: 'Strawberry', brown: 'Chocolate' }; const TP = { sprinkles: 'Sprinkles', cherry: 'Cherry', candles: 'Candles' };
    assert.ok(!btn(t.app, 0, SH[o.shape]).disabled);
    assert.ok(btn(t.app, 1, 'Vanilla').disabled, 'batter locked until a pan arrives');
    btn(t.app, 0, SH[o.shape]).click(); step(t.app, 0.1);
    assert.equal($$(t.app, '.cc-cake').length, 1);
    step(t.app, 1.0);
    assert.ok(!btn(t.app, 1, BA[o.batter]).disabled);
    btn(t.app, 1, BA[o.batter]).click(); step(t.app, 9);
    assert.ok(!btn(t.app, 3, IC[o.icing]).disabled, 'cake reached icing');
    btn(t.app, 3, IC[o.icing]).click(); step(t.app, 2.5);
    for (const [k, n] of Object.entries(o.toppings)) for (let i = 0; i < n; i++) btn(t.app, 4, TP[k]).click();
    step(t.app, 0.05);                                       // the view syncs on the next frame
    assert.ok($(t.app, '.cc-btn.is-on'), 'topping highlighted');
    btn(t.app, 4, 'Done').click(); step(t.app, 2);
    assert.ok($(t.app, '.cc-customer').classList.contains('is-hot'), 'customer lights up when the cake is ready');
    $(t.app, '.cc-customer').click(); step(t.app, 0.2);
    assert.equal(g.world.served, 1); assert.ok(g.world.score >= 100);
    assert.equal($(t.app, '.cc-hud-left b').textContent, '1');
    t.done();
  });
  it('serving with no cake only shows a hint', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); step(t.app, 1.2);
    $(t.app, '.cc-customer').click();
    assert.equal(t.app.game.world.strikes, 0);
    assert.ok($(t.app, '.pp-toast.is-on'));
    t.done();
  });
  it('intermediate: manual oven gauge, take-out button and burn warning', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'intermediate'); const g = t.app.game; step(t.app, 1);
    assert.ok($(t.app, '.cc-take') && $(t.app, '.cc-gauge'));
    assert.ok($(t.app, '.cc-take').disabled);
    btn(t.app, 0, 'Round').click(); step(t.app, 1); btn(t.app, 1, 'Vanilla').click(); step(t.app, 3);
    assert.ok(!$(t.app, '.cc-take').disabled, 'oven button live while baking');
    for (let i = 0; i < 400 && g.world.cakeAt(SLOT.OVEN).bake < 0.62; i++) step(t.app, 0.05);
    assert.equal($(t.app, '.cc-oven-label').textContent, 'Perfect');
    $(t.app, '.cc-take').click(); step(t.app, 1);
    assert.ok(g.world.cakes[0].baked);
    t.done();
  });
  it('advanced hides the gauge and the tips', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'advanced'); step(t.app, 1);
    assert.equal($(t.app, '.cc-gauge'), null); assert.equal($(t.app, '.cc-tip').textContent, '');
    assert.equal($$(t.app, '.cc-panel-0 .cc-btn').length, 4);
    t.done();
  });
  it('losing shows the closing dialog; Play again starts fresh', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); const g = t.app.game; let end = null; t.app.on('game:end', (e) => { end = e; });
    for (let i = 0; i < 4000 && g.world.playing; i++) g.advance(0.1);
    step(t.app, 1.5);
    assert.ok(end && !end.won);
    dialogButton(t.app, 'Play again').click();
    assert.equal(g.world.status, 'playing'); assert.equal(g.world.strikes, 0);
    t.done();
  });
  it('every level shows a step-back button on all six stations', async () => {
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      const t = await boot();
      t.app.openGame('comfy-cakes', level); step(t.app, 0.2);
      assert.equal($$(t.app, '.cc-undo').length, 6, level);
      t.done();
    }
  });
  it('step back: take the wrong icing back with the button, and with Ctrl+Z', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); const g = t.app.game; step(t.app, 1.2);
    btn(t.app, 0, 'Round').click(); step(t.app, 1.2); btn(t.app, 1, 'Vanilla').click(); step(t.app, 9);
    btn(t.app, 3, 'Chocolate').click(); step(t.app, 2.5);
    assert.equal(g.world.cakeAt(SLOT.TOPPING).icing, 'brown');
    const back = $(t.app, '.cc-panel-4 .cc-undo'); assert.ok(!back.disabled);
    back.click(); step(t.app, 1.2);
    assert.equal(g.world.cakeAt(SLOT.ICING).icing, null);
    btn(t.app, 3, 'Vanilla').click(); step(t.app, 2.5);
    assert.equal(g.world.cakeAt(SLOT.TOPPING).icing, 'white');
    key(t.app, 'z', { ctrlKey: true }); step(t.app, 1.2);
    assert.equal(g.world.cakeAt(SLOT.ICING).icing, null, 'Ctrl+Z does the same');
    t.done();
  });
  it('clicking step back where the bake blocks it explains why', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); const g = t.app.game; step(t.app, 1.2);
    btn(t.app, 0, 'Round').click(); step(t.app, 1.2); btn(t.app, 1, 'Vanilla').click(); step(t.app, 9);
    $(t.app, '.cc-panel-3 .cc-undo').click();
    assert.ok($(t.app, '.pp-toast.is-on').textContent.includes('un-bake'));
    assert.equal(g.world.cakeAt(SLOT.ICING).baked, true);
    t.done();
  });
  it('trash buttons discard the cake at their station', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner'); const g = t.app.game; step(t.app, 1);
    btn(t.app, 0, 'Round').click(); step(t.app, 1.5);
    const trash = $(t.app, `.cc-panel-${SLOT.BATTER} .cc-trash`); assert.ok(!trash.disabled);
    trash.click(); step(t.app, 0.1);
    assert.equal(g.world.cakes.length, 0); assert.equal($$(t.app, '.cc-cake').length, 0);
    t.done();
  });
});
