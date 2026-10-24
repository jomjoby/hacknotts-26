// Global game registry. Importing `src/games/index.js` registers the built-in
// games; third parties call registerGame() (or pass `games: [...]` to mount()).
//
// A game definition:
// {
//   id: 'my-game',                       unique, kebab-case
//   title: 'My Game',
//   tagline: 'One line shown on the hub',
//   order: 40,                           hub sort order (lower = further left)
//   levels: [{ id, name, desc }],        1+ difficulty levels
//   Game: class extends MiniGame,
//   hub: { art?: () => '<svg…>', accent?: '#rrggbb' },
//   icon: '<svg…>'                       small square icon (menus, task bars)
// }

const registry = new Map();

export function validateGame(def) {
  const problems = [];
  if (!def || typeof def !== 'object') return ['definition must be an object'];
  if (!def.id || !/^[a-z0-9-]+$/.test(def.id)) problems.push('`id` must be kebab-case');
  if (!def.title) problems.push('`title` is required');
  if (!Array.isArray(def.levels) || !def.levels.length) problems.push('`levels` needs at least one level');
  else if (def.levels.some((l) => !l.id || !l.name)) problems.push('every level needs an `id` and a `name`');
  if (typeof def.Game !== 'function') problems.push('`Game` must be a class extending MiniGame');
  return problems;
}

export function registerGame(def) {
  const problems = validateGame(def);
  if (problems.length) throw new Error(`Invalid game "${def?.id ?? '?'}": ${problems.join('; ')}`);
  registry.set(def.id, def);
  return def;
}

export function unregisterGame(id) {
  return registry.delete(id);
}

export function getRegisteredGames() {
  return [...registry.values()];
}
