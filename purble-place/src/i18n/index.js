import { EN } from './en.js';
import { format } from '../core/util.js';

/**
 * Build a translate function. `overrides` is a flat { key: string } map layered
 * over the English defaults – pass a full translation or just the lines you want to change.
 * Game titles, taglines and level names can be overridden with
 * `<game-id>.title`, `<game-id>.tagline`, `<game-id>.level.<level-id>.name|desc`.
 */
export function createTranslator(overrides = {}) {
  const table = { ...EN, ...overrides };
  const t = (key, vars) => {
    const str = table[key];
    if (str === undefined) {
      if (typeof console !== 'undefined') console.warn(`[purble-place] missing string: ${key}`);
      return key;
    }
    return vars ? format(str, vars) : str;
  };
  t.has = (key) => key in table;
  return t;
}

/** Apply `<game-id>.*` translation overrides to a game definition (returns a copy). */
export function localizeGame(def, t) {
  const pick = (key, fallback) => (t.has(key) ? t(key) : fallback);
  return {
    ...def,
    title: pick(`${def.id}.title`, def.title),
    tagline: pick(`${def.id}.tagline`, def.tagline),
    levels: def.levels.map((l) => ({
      ...l,
      name: pick(`${def.id}.level.${l.id}.name`, l.name),
      desc: pick(`${def.id}.level.${l.id}.desc`, l.desc),
    })),
  };
}
