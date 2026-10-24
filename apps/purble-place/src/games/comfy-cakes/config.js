// Comfy Cakes – every tweakable number and every option in one place.
// Add a flavour / shape / topping here (and give it art in art.js) and the
// order generator, control panels and tickets pick it up automatically.

export const SHAPES = [
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'heart', name: 'Heart' },
  { id: 'star', name: 'Star' },
];

export const BATTERS = [
  { id: 'vanilla', name: 'Vanilla', color: '#f3d9a4' },
  { id: 'chocolate', name: 'Chocolate', color: '#7a4a2e' },
  { id: 'strawberry', name: 'Strawberry', color: '#f58fab' },
  { id: 'lemon', name: 'Lemon', color: '#f7e45a' },
  { id: 'blueberry', name: 'Blueberry', color: '#7f9cf7' },
];

export const ICINGS = [
  { id: 'white', name: 'Vanilla', color: '#fffdf7' },
  { id: 'pink', name: 'Strawberry', color: '#ff9ec4' },
  { id: 'brown', name: 'Chocolate', color: '#6f3d22' },
  { id: 'mint', name: 'Mint', color: '#9fe3c0' },
  { id: 'blue', name: 'Blueberry', color: '#8fc7ff' },
  { id: 'yellow', name: 'Lemon', color: '#ffe27a' },
];

/** `max` is the largest count the player can stack (candles go 1..3). */
export const TOPPINGS = [
  { id: 'sprinkles', name: 'Sprinkles', max: 1 },
  { id: 'cherry', name: 'Cherry', max: 1 },
  { id: 'candles', name: 'Candles', max: 3 },
  { id: 'chips', name: 'Choc chips', max: 1 },
  { id: 'stars', name: 'Gold stars', max: 1 },
  { id: 'flowers', name: 'Daisies', max: 1 },
];

export const MAX_STRIKES = 3;

/**
 * Difficulty table.
 *   target        cakes to deliver to win
 *   maxCustomers  customers waiting at once
 *   patience      seconds a customer waits
 *   spawnGap      average seconds between new customers
 *   bakeSeconds   seconds for a cake to go from raw (0) to ruined (1)
 *   ovenAuto      true: oven pops the cake out at the perfect moment. false: player pulls it out
 *   markers       show the colour-coded bake gauge
 *   toppings      { id: maxCount } toppings available on the shelf
 *   toppingKinds  [min, max] different toppings per order
 *   showText      print the order in words on the ticket (otherwise: picture only)
 *   undo          show the "step back" buttons (everything except baking can be taken back)
 */
export const LEVELS = {
  beginner: {
    target: 5, maxCustomers: 1, patience: 110, spawnGap: 8,
    bakeSeconds: 6, ovenAuto: true, markers: true,
    shapes: ['round', 'square'],
    batters: ['vanilla', 'chocolate', 'strawberry'],
    icings: ['white', 'pink', 'brown'],
    toppings: { sprinkles: 1, cherry: 1, candles: 1 },
    toppingKinds: [1, 1],
    showText: true, tips: true, undo: true,
  },
  intermediate: {
    target: 8, maxCustomers: 2, patience: 90, spawnGap: 10,
    bakeSeconds: 9, ovenAuto: false, markers: true,
    shapes: ['round', 'square', 'heart'],
    batters: ['vanilla', 'chocolate', 'strawberry', 'lemon'],
    icings: ['white', 'pink', 'brown', 'mint', 'blue'],
    toppings: { sprinkles: 1, cherry: 1, candles: 2, chips: 1, stars: 1 },
    toppingKinds: [1, 2],
    showText: false, tips: true, undo: true,
  },
  advanced: {
    target: 12, maxCustomers: 3, patience: 75, spawnGap: 12,
    bakeSeconds: 7.5, ovenAuto: false, markers: false,
    shapes: ['round', 'square', 'heart', 'star'],
    batters: ['vanilla', 'chocolate', 'strawberry', 'lemon', 'blueberry'],
    icings: ['white', 'pink', 'brown', 'mint', 'blue', 'yellow'],
    toppings: { sprinkles: 1, cherry: 1, candles: 3, chips: 1, stars: 1, flowers: 1 },
    toppingKinds: [1, 3],
    showText: false, tips: false, undo: true,
  },
};

export const byId = (list, id) => list.find((x) => x.id === id);
