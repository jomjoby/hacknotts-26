// The original Purble Place sound files (in assets/sounds/) and which game sound plays which one.
//
// SAMPLES   each recording by name: the file inside assets/sounds/ (wav or mp3) and a volume trim,
//           because the recordings were mixed at very different levels
// ALIASES   the names the games and menus ask for, pointed at a recording. Comfy Cakes has a full
//           set of its own; Pair Programming and Crack the Code have a few, and borrow the closest fit
//           for the rest
// SILENT    names the code asks for that have no recording. They make no sound until one is added
//
// To change which game action plays which file, edit the names used in
// src/games/comfy-cakes/index.js. To swap a recording, replace the file and keep its name.

export const SAMPLES = {
  // Comfy Cakes, the stations
  'cake-pan':      { file: 'PURBLES_CAKEPANBUTTON.wav',        gain: 0.9 },   // choosing a pan
  'cake-batter':   { file: 'PURBLES_CAKEBATTERBUTTON.wav',     gain: 1.8 },   // pressing a batter flavour
  'cake-filling':  { file: 'PURBLES_CAKEFILLINGBUTTON.wav',    gain: 1.6 },   // the batter filling the pan
  'cake-frosting': { file: 'PURBLES_FROSTINGBUTTON.wav',       gain: 1.7 },   // piping the icing
  'cake-decor':    { file: 'PURBLES_DECORATIONSBUTTONS.wav',   gain: 2.2 },   // adding a topping
  'cake-rotate':   { file: 'PURBLES_ROTATEBUTTON.wav',         gain: 1.9 },   // a topping wrapping back to none
  'cake-shaker':   { file: 'PURBLES_SHAKERBUTTON.wav',         gain: 3.5 },   // the toppings falling onto the cake
  'cake-flame':    { file: 'PURBLES_FLAMEBUTTON.wav',          gain: 1.9 },   // the cake going into the oven
  // Comfy Cakes, buttons and the belt
  'cake-button':   { file: 'PURBLES_CAKEBUTTONS.wav',          gain: 2.4 },   // the Take out button
  'cake-back':     { file: 'PURBLES_LEFTARROWBUTTON.wav',      gain: 1.0 },   // step back
  'cake-next':     { file: 'PURBLES_RIGHTARROWBUTTON.wav',     gain: 1.0 },   // Done, send the cake on
  'cake-belt':     { file: 'PURBLES_CONVEYOR.wav',             gain: 0.5 },   // the belt moving a cake on
  'cake-boxed':    { file: 'PURBLES_CAKEBOXED.wav',            gain: 0.6 },   // the cake reaching the counter, boxed
  'cake-dumped':   { file: 'PURBLES_CAKEDUMPED.wav',           gain: 1.6 },   // the bin
  // Comfy Cakes, people and the level
  'chef-enter':    { file: 'PURBLES_CHEFENTER.wav',            gain: 1.2 },   // a customer walks in
  'chef-exit':     { file: 'PURBLES_CHEFEXIT.wav',             gain: 1.3 },   // a customer leaves
  'tv-on':         { file: 'PURBLES_TVON_DING.wav',            gain: 0.3 },   // the level starting
  'comfy-win':     { file: 'PURBLES_COMFYWIN.wav',             gain: 2.4 },   // winning a level
  // Pair Programming
  'pairs-new':     { file: 'PAIRS_NEW_BOARD.mp3',              gain: 0.33 },  // a new board
  'pairs-win':     { file: 'PAIRS_WIN.mp3',                    gain: 0.4 },   // clearing the board
  // Crack the Code
  'lose-fanfare':  { file: 'LOSE_FANFARE.mp3',                 gain: 1.6 },   // out of guesses
  // everywhere
  'button-click':  { file: 'BUTTON_CLICK.mp3',                 gain: 0.9 },   // the regular button click
};

export const ALIASES = {
  // every button in the menus, dialogs and town square
  click: 'button-click',
  select: 'button-click',
  // Pair Programming
  flip: 'cake-rotate',
  unflip: 'cake-rotate',
  match: 'cake-next',
  swap: 'cake-belt',
  // Crack the Code
  place: 'cake-decor',
  remove: 'cake-back',
  check: 'cake-next',
  hint: 'button-click',
  // finishing a game that has no jingle of its own
  win: 'comfy-win',
};

export const SILENT = ['ding', 'strike', 'serve', 'mismatch', 'lose'];
