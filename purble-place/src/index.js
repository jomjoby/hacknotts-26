// Purble Place – public entry point.
//
//   import { mount } from './apps/purble-place/src/index.js';
//   const app = mount(document.getElementById('window-body'), { onExit: () => closeWindow() });
//
// See the README next to this folder's src/ for every option, event and method.

import './games/index.js'; // registers Comfy Cakes, Purble Pairs, Purble Shop

import { PurblePlace, VERSION, STAGE_W, STAGE_H } from './shell/shell.js';
import { iconSVG as hubIcon } from './games/comfy-cakes/art.js';

export { PurblePlace, VERSION, STAGE_W, STAGE_H };
export { registerGame, unregisterGame, getRegisteredGames, validateGame } from './registry.js';
export { MiniGame } from './core/mini-game.js';
export { Rng, dailySeed } from './core/rng.js';
export { Emitter } from './core/emitter.js';
export { Sound } from './core/audio.js';
export { purble } from './core/purble.js';
export { h, s, svgEl, clear } from './core/dom.js';
export { createTranslator } from './i18n/index.js';
export { EN } from './i18n/en.js';

/** Create a Purble Place instance inside `container`. */
export function mount(container, options) {
  return new PurblePlace(container, options);
}

/**
 * Facts an OS shell / window manager needs to host this app.
 * The client area is a fixed 4:3 stage that scales to fit, so any window size works.
 */
export const manifest = {
  id: 'purble-place',
  name: 'Purble Place',
  version: VERSION,
  icon: hubIcon(),
  stage: { width: STAGE_W, height: STAGE_H },
  /** Suggested window client size (stage plus the 23px menu bar). */
  defaultSize: { width: STAGE_W, height: STAGE_H + 23 },
  minSize: { width: 480, height: 383 },
  resizable: true,
  aspectRatio: STAGE_W / STAGE_H,
};
