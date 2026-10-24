// Registers the built-in games. Import this file for its side effect.

import { registerGame } from '../registry.js';
import { comfyCakes } from './comfy-cakes/index.js';
import { purblePairs } from './purble-pairs/index.js';
import { purbleShop } from './purble-shop/index.js';

export const BUILTIN_GAMES = [comfyCakes, purblePairs, purbleShop];
BUILTIN_GAMES.forEach(registerGame);

export { comfyCakes, purblePairs, purbleShop };
