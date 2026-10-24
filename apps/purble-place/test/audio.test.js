import { describe, it, assert } from './harness.js';
import { mount } from '../src/index.js';
import { Sound, SOUND_NAMES } from '../src/core/audio.js';
import { SAMPLES, ALIASES, SILENT } from '../src/core/samples.js';

const BASE = new URL('../assets/sounds/', import.meta.url).href;

const ORIGINAL_FILES = [
  'BUTTON_CLICK.mp3', 'LOSE_FANFARE.mp3', 'PAIRS_NEW_BOARD.mp3', 'PAIRS_WIN.mp3',
  'PURBLES_CAKEBATTERBUTTON.wav', 'PURBLES_CAKEBOXED.wav', 'PURBLES_CAKEBUTTONS.wav', 'PURBLES_CAKEDUMPED.wav',
  'PURBLES_CAKEFILLINGBUTTON.wav', 'PURBLES_CAKEPANBUTTON.wav', 'PURBLES_CHEFENTER.wav', 'PURBLES_CHEFEXIT.wav',
  'PURBLES_COMFYWIN.wav', 'PURBLES_CONVEYOR.wav', 'PURBLES_DECORATIONSBUTTONS.wav', 'PURBLES_FLAMEBUTTON.wav',
  'PURBLES_FROSTINGBUTTON.wav', 'PURBLES_LEFTARROWBUTTON.wav', 'PURBLES_RIGHTARROWBUTTON.wav',
  'PURBLES_ROTATEBUTTON.wav', 'PURBLES_SHAKERBUTTON.wav', 'PURBLES_TVON_DING.wav',
];

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const text = async (path) => (await fetch(new URL(path, import.meta.url))).text();
const decode = async (file) => {
  const res = await fetch(new URL(file, BASE));
  assert.ok(res.ok, `${file} can be fetched`);
  return new OfflineAudioContext(1, 1, 44100).decodeAudioData(await res.arrayBuffer());
};

/** Just enough of an AudioContext to see what a Sound asks it to do. */
function fakeContext() {
  const made = { sources: [], oscillators: [] };
  const node = () => ({ connect(next) { return next; } });
  const param = (v = 0) => ({ value: v, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  return {
    made, state: 'running', currentTime: 0, destination: node(),
    resume: () => Promise.resolve(), close: () => Promise.resolve(),
    createGain: () => ({ ...node(), gain: param(1) }),
    createOscillator: () => { const o = { ...node(), type: '', frequency: param(), start() {}, stop() {} }; made.oscillators.push(o); return o; },
    createBufferSource: () => { const s = { ...node(), buffer: null, started: 0, stopped: 0, start() { s.started++; }, stop() { s.stopped++; } }; made.sources.push(s); return s; },
  };
}
const soundWith = (buffers = {}, opts = {}) => {
  const s = new Sound(opts);
  s.ctx = fakeContext();
  for (const [name, buf] of Object.entries(buffers)) s.buffers.set(name, buf);
  return s;
};

describe('Sound – the original recordings', () => {
  it('all 22 supplied recordings are in the table, each under its own name', () => {
    assert.deepEqual(Object.values(SAMPLES).map((s) => s.file).sort(), [...ORIGINAL_FILES].sort());
    assert.equal(new Set(Object.keys(SAMPLES)).size, 22);
  });
  it('every file is in assets/sounds and decodes to audio with something in it', async () => {
    for (const file of ORIGINAL_FILES) {
      const buf = await decode(file);
      assert.ok(buf.duration > 0.2 && buf.duration < 6, `${file} is ${buf.duration}s long`);
      assert.equal(buf.numberOfChannels, 2);
      const data = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      assert.ok(peak > 0.05 && peak <= 1.1, `${file} peak ${peak}`);
    }
  });
  it('gains keep the loudest recording under full scale', async () => {
    for (const [name, s] of Object.entries(SAMPLES)) {
      const data = (await decode(s.file)).getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      assert.ok(peak * s.gain <= 1, `${name} would clip (${(peak * s.gain).toFixed(2)})`);
      assert.ok(peak * s.gain > 0.15, `${name} is too quiet (${(peak * s.gain).toFixed(2)})`);
    }
  });
  it('Comfy Cakes asks for every recording by name, and every name it asks for exists', async () => {
    const src = await text('../src/games/comfy-cakes/index.js');
    for (const name of Object.keys(SAMPLES).filter((n) => /^(cake|chef|tv|comfy)-/.test(n))) assert.ok(src.includes(`'${name}'`), `${name} is never played`);
    const asked = [...src.matchAll(/(?:play|snd|sndLater)\(\s*'([\w-]+)'/g)].map((m) => m[1]);
    assert.ok(asked.length >= 15);
    assert.deepEqual(asked.filter((n) => !SOUND_NAMES.includes(n)), []);
  });
  it('every recording is played by some game, by name or through an alias', async () => {
    const src = (await Promise.all(['comfy-cakes', 'purble-pairs', 'purble-shop'].map((g) => text(`../src/games/${g}/index.js`)))).join('\n');
    const viaAlias = new Set(Object.values(ALIASES));
    for (const name of Object.keys(SAMPLES)) assert.ok(src.includes(`'${name}'`) || viaAlias.has(name), `${name} is never played`);
  });
  it('every alias points at a recording, and no name is both silent and sounding', () => {
    for (const [alias, target] of Object.entries(ALIASES)) {
      assert.ok(target in SAMPLES, `${alias} -> ${target}`);
      assert.ok(!(alias in SAMPLES), `${alias} hides a recording`);
    }
    for (const name of SILENT) assert.ok(!(name in SAMPLES) && !(name in ALIASES), `${name} is silent and mapped`);
  });
  it('no synthesized sound code is left', async () => {
    const src = await text('../src/core/audio.js');
    assert.ok(!/createOscillator|frequency|OscillatorNode/.test(src));
  });
  it('the other games ask only for names that are a recording, an alias, or knowingly silent', async () => {
    for (const f of ['games/purble-pairs/index.js', 'games/purble-shop/index.js', 'shell/hub.js', 'core/ui.js', 'core/mini-game.js']) {
      const src = await text(`../src/${f}`);
      const asked = [...src.matchAll(/sound\??\.play\(\s*'([\w-]+)'/g)].map((m) => m[1]);
      assert.deepEqual(asked.filter((n) => !SOUND_NAMES.includes(n)), [], f);
    }
  });
});

describe('Sound – playback', () => {
  it('preload fetches and decodes the files for real', async () => {
    const s = new Sound({ base: BASE });
    await s.preload(['cake-pan', 'chef-exit']);
    assert.equal(s.buffers.size, 2);
    assert.ok(s.buffers.get('cake-pan').duration > 0.9);
    s.destroy();
  });
  it('a file that is missing is skipped quietly', async () => {
    const s = new Sound({ base: `${BASE}nowhere/` });
    await s.preload(['cake-pan']);
    assert.equal(s.buffers.size, 0);
    s.destroy();
  });
  it('without a sound folder nothing is fetched and nothing plays', async () => {
    const s = soundWith();
    await s.preload();
    assert.equal(s.buffers.size, 0);
    s.play('cake-pan');
    assert.equal(s.ctx.made.sources.length + s.ctx.made.oscillators.length, 0);
  });
  it('a loaded recording plays once, with no beep alongside', () => {
    const s = soundWith({ 'cake-pan': { duration: 1 } });
    s.play('cake-pan');
    const { sources, oscillators } = s.ctx.made;
    assert.equal(sources.length, 1); assert.equal(sources[0].started, 1);
    assert.equal(oscillators.length, 0);
  });
  it('a recording that has not loaded yet is silent that time', () => {
    const s = soundWith();
    s.play('tv-on');
    assert.equal(s.ctx.made.sources.length + s.ctx.made.oscillators.length, 0);
  });
  it('a name that is an alias plays the recording it points at', () => {
    const s = soundWith({ 'cake-rotate': { duration: 0.4 }, 'button-click': { duration: 0.2 } });
    s.play('flip'); s.play('click');
    const { sources } = s.ctx.made;
    assert.equal(sources.length, 2);
  });
  it('a name with no recording makes no sound at all, and never a beep', () => {
    const s = soundWith(Object.fromEntries(Object.keys(SAMPLES).map((n) => [n, { duration: 1 }])));
    for (const name of SILENT) s.play(name);
    s.play('not-a-sound');
    assert.equal(s.ctx.made.sources.length + s.ctx.made.oscillators.length, 0);
  });
  it('the same recording asked for twice at once plays once (several cakes moving on together)', () => {
    const s = soundWith({ 'cake-belt': { duration: 0.8 }, 'cake-pan': { duration: 1 } });
    s.play('cake-belt'); s.play('cake-belt'); s.play('cake-pan');
    assert.equal(s.ctx.made.sources.length, 2);
  });
  it('muted plays nothing, and muting cuts off a recording that is still going', () => {
    const s = soundWith({ 'cake-boxed': { duration: 4 } });
    s.setMuted(true); s.play('cake-boxed');
    assert.equal(s.ctx.made.sources.length, 0);
    s.setMuted(false); s.play('cake-boxed');
    const src = s.ctx.made.sources[0];
    assert.equal(src.stopped, 0);
    s.setMuted(true);
    assert.equal(src.stopped, 1);
  });
  it('sound switched on later still gets the recordings that were asked for while muted', async () => {
    const s = new Sound({ base: BASE, muted: true });
    await s.preload(['cake-pan']);
    assert.equal(s.buffers.size, 0, 'nothing is fetched while muted');
    s.setMuted(false);
    await s._loading.get('cake-pan');
    assert.equal(s.buffers.size, 1);
    s.destroy();
  });
});

describe('Sound – Comfy Cakes uses the recordings', () => {
  async function boot() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:622px;z-index:99999;background:#fff';
    document.body.append(el);
    const app = mount(el, { storage: memory(), sound: false, seed: 1, autoFocus: false });
    await app._styles?.loaded;
    const played = [];
    app.sound.play = (name) => played.push(name);
    return { app, played, done() { app.destroy(); el.remove(); } };
  }
  const step = (app, seconds, dt = 0.05) => { for (let t = 0; t < seconds - 1e-9; t += dt) app.game.advance(dt); };

  it('each button and event plays the recording that matches it', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'intermediate');
    const { world, cfg } = t.app.game;
    const heard = (event, payload) => { t.played.length = 0; world.emit(event, payload); return t.played.slice(); };
    assert.deepEqual(heard('pan', {}), ['cake-pan']);
    assert.deepEqual(heard('pour', { batter: cfg.batters[0] }), ['cake-batter']);
    assert.deepEqual(heard('pipe', { icing: cfg.icings[0] }), ['cake-frosting']);
    assert.deepEqual(heard('topping', { count: 1 }), ['cake-decor']);
    assert.deepEqual(heard('topping', { count: 0 }), ['cake-rotate']);
    assert.deepEqual(heard('drop', {}), ['cake-next']);
    assert.deepEqual(heard('belt', {}), ['cake-belt']);
    assert.deepEqual(heard('oven-start', {}), ['cake-flame']);
    assert.deepEqual(heard('pickup', {}), ['cake-boxed']);
    assert.deepEqual(heard('customer', {}), ['chef-enter']);
    assert.deepEqual(heard('leave', {}), ['chef-exit']);
    assert.deepEqual(heard('discard', {}), ['cake-dumped']);
    assert.deepEqual(heard('undo', {}), ['cake-back']);
    assert.deepEqual(heard('oven-open', { state: 'golden' }), ['cake-button', 'ding']);
    assert.deepEqual(heard('oven-open', { state: 'burnt' }), ['cake-button', 'strike']);
    t.done();
  });
  it('the filling follows the batter button, and the shaker follows Done, a moment later', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    const { world, cfg } = t.app.game;
    t.played.length = 0;
    world.emit('pour', { batter: cfg.batters[0] }); world.emit('drop', {});
    assert.deepEqual(t.played, ['cake-batter', 'cake-next']);
    step(t.app, 0.3);
    assert.ok(t.played.includes('cake-filling') && t.played.includes('cake-shaker'), t.played.join());
    t.done();
  });
  it('the level opens with the TV, and the first customer walks in', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    assert.ok(t.played.includes('tv-on'), t.played.join());
    step(t.app, 1.5);
    assert.ok(t.played.includes('chef-enter'), t.played.join());
    t.done();
  });
  it('a customer who gives up waiting walks out and the exit plays', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    const { world } = t.app.game;
    step(t.app, 1);
    assert.equal(world.customers.length, 1);
    assert.ok(!t.played.includes('chef-exit'), 'still in the queue');
    world.customers[0].patience = 0.2;
    step(t.app, 3);
    assert.equal(world.customers.length, 0);
    assert.equal(t.played.filter((n) => n === 'chef-exit').length, 1);
    t.done();
  });
  it('winning plays the Comfy Cakes win recording; losing asks for the lose sound, which has no recording', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    t.played.length = 0;
    t.app.game.world.status = 'won'; t.app.game.conclude();
    assert.deepEqual(t.played, ['comfy-win']);
    t.app.overlay.closeAll();
    t.played.length = 0;
    t.app.game.world.status = 'lost'; t.app.game.conclude();
    assert.deepEqual(t.played, ['lose']);
    t.done();
  });
  it('leaving the game cuts off any recording still playing', async () => {
    const t = await boot();
    let stopped = 0;
    t.app.sound.stopAll = () => { stopped++; };
    t.app.openGame('comfy-cakes', 'beginner');
    t.app.goHome();
    assert.ok(stopped >= 1);
    t.done();
  });
});

describe('Sound – Pair Programming, Crack the Code and the menus', () => {
  async function boot() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:622px;z-index:99999;background:#fff';
    document.body.append(el);
    const app = mount(el, { storage: memory(), sound: false, seed: 1, autoFocus: false });
    await app._styles?.loaded;
    const played = [];
    app.sound.play = (name) => played.push(name);
    return { app, played, done() { app.destroy(); el.remove(); } };
  }

  it('Pair Programming plays its new board sound whenever a board is dealt, then its own win sound', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'beginner');
    assert.equal(t.played.filter((n) => n === 'pairs-new').length, 1);
    t.app.newGame();
    assert.equal(t.played.filter((n) => n === 'pairs-new').length, 2);
    t.played.length = 0;
    t.app.game.win();
    assert.deepEqual(t.played, ['pairs-win']);
    t.done();
  });
  it('Pair Programming plays the lose fanfare when the turns run out', async () => {
    const t = await boot();
    t.app.openGame('purble-pairs', 'intermediate');
    t.played.length = 0;
    t.app.game.lose();
    assert.deepEqual(t.played, ['lose-fanfare']);
    t.done();
  });
  it('Crack the Code plays the lose fanfare when the guesses run out, and the plain win sound when it is cracked', async () => {
    const t = await boot();
    t.app.openGame('purble-shop', 'beginner');
    t.played.length = 0;
    t.app.game.lose();
    assert.deepEqual(t.played, ['lose-fanfare']);
    t.app.overlay.closeAll();
    t.played.length = 0;
    t.app.game.win();
    assert.deepEqual(t.played, ['win']);
    assert.equal(ALIASES.win, 'comfy-win');
    t.done();
  });
  it('Comfy Cakes losing has no recording and stays silent', async () => {
    const t = await boot();
    t.app.openGame('comfy-cakes', 'beginner');
    t.played.length = 0;
    t.app.game.world.status = 'lost'; t.app.game.conclude();
    assert.deepEqual(t.played, ['lose']);
    assert.ok(!('lose' in ALIASES) && !('lose' in SAMPLES));
    t.done();
  });
  it('every menu, dialog and town square button plays the regular button click', async () => {
    const t = await boot();
    assert.equal(ALIASES.click, 'button-click');
    assert.equal(ALIASES.select, 'button-click');
    t.app.root.querySelector('.pp-building').click();
    assert.ok(t.played.includes('select'), t.played.join());
    t.played.length = 0;
    t.app.root.querySelector('.pp-level-btn').click();
    assert.ok(t.played.includes('select'), t.played.join());
    t.done();
  });
});
