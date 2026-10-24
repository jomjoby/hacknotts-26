// Comfy Cakes artwork – every cake, topping, machine and the bakery scene is
// generated here as SVG. A cake is drawn in a local space where (0,0) is the
// centre of its base on the belt; shapes are squashed vertically (K) so the
// belt is seen from a three-quarter view and extruded downward for thickness.

import { mix, shade } from '../../core/color.js';
import { clamp } from '../../core/util.js';
import { BATTERS, ICINGS, byId } from './config.js';

const K = 0.52;             // vertical squash of a top face
const PAN_H = 14;           // pan height
const CAKE_H = 24;          // baked cake height
const ICING_H = 5;

const num = (v) => +v.toFixed(2);

function starD(R, r, k) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    pts.push(`${num(Math.cos(a) * rad)} ${num((Math.sin(a) * rad + 3) * k)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Outline of a top face. k = 1 gives the flat (icon) version, K the belt-view version. */
export function shapeD(shape, k = K) {
  const f = (v) => num(v * k);
  switch (shape) {
    case 'square':
      return `M-38 ${f(-44)} H38 Q46 ${f(-44)} 46 ${f(-36)} V${f(36)} Q46 ${f(44)} 38 ${f(44)} H-38 Q-46 ${f(44)} -46 ${f(36)} V${f(-36)} Q-46 ${f(-44)} -38 ${f(-44)} Z`;
    case 'heart':
      return `M0 ${f(46)} C-50 ${f(14)} -52 ${f(-26)} -26 ${f(-40)} C-12 ${f(-46)} 0 ${f(-36)} 0 ${f(-26)} C0 ${f(-36)} 12 ${f(-46)} 26 ${f(-40)} C52 ${f(-26)} 50 ${f(14)} 0 ${f(46)} Z`;
    case 'star':
      return starD(54, 27, k);
    default:
      return `M-48 0 A48 ${f(48)} 0 1 0 48 0 A48 ${f(48)} 0 1 0 -48 0 Z`;
  }
}

const SHAPE_CACHE = {};
const D = (shape) => (SHAPE_CACHE[shape] ||= shapeD(shape, K));

/** A thick slab: stacked copies of the outline going down, then the top face. */
function slab(shape, { y = 0, depth = 0, scale = 1, top, side, line, lw = 2.2 }) {
  const d = D(shape);
  const outline = (w) => (line ? `stroke="${line}" stroke-width="${w}" stroke-linejoin="round"` : '');
  let out = '';
  const steps = Math.max(1, Math.ceil(depth / 2));
  // Only the bottom copy is outlined (its outer half stays visible along the sides);
  // outlining every copy would stack into a dark band.
  for (let i = steps; i >= 1 && depth > 0; i--) {
    out += `<path d="${d}" transform="translate(0 ${num(y + (depth * i) / steps)}) scale(${scale})" fill="${side}" ${i === steps ? outline(lw * 2) : ''}/>`;
  }
  out += `<path d="${d}" transform="translate(0 ${num(y)}) scale(${scale})" fill="${top}" ${outline(lw)}/>`;
  return out;
}

const flat = (shape, { y = 0, scale = 1, fill, line, lw = 2 }) =>
  `<path d="${D(shape)}" transform="translate(0 ${num(y)}) scale(${scale})" fill="${fill}" ${line ? `stroke="${line}" stroke-width="${lw}" stroke-linejoin="round"` : ''}/>`;

/** Colour of the cake as it bakes: golden at the sweet spot, charcoal when ruined. */
export function crustColor(batterHex, bake) {
  let c = batterHex;
  c = mix(c, '#b9772e', clamp((bake - 0.25) / 0.45, 0, 1) * 0.42);
  c = mix(c, '#241812', clamp((bake - 0.78) / 0.22, 0, 1) * 0.88);
  return c;
}

// ───────────────────────────── toppings ─────────────────────────────

const SPRINKLE = ['#ff4d6d', '#ffd23f', '#3ec1d3', '#6cc36b', '#ffffff', '#b57cf0'];

function spiral(n, rx, ry, cx, cy) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.6) / n);
    pts.push([cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry]);
  }
  return pts;
}

function starTopping(cx, cy, R, fill = '#ffd23f', stroke = '#c98d0a') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? R * 0.45 : R;
    pts.push(`${num(cx + Math.cos(a) * rad)} ${num(cy + Math.sin(a) * rad * 0.9)}`);
  }
  return `<path d="M${pts.join(' L')} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

function flower(cx, cy, s = 1) {
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    petals += `<circle cx="${num(cx + Math.cos(a) * 3.8 * s)}" cy="${num(cy + Math.sin(a) * 3.2 * s)}" r="${2.7 * s}" fill="#ff8fb8" stroke="#c24b7d" stroke-width=".7"/>`;
  }
  return `${petals}<circle cx="${cx}" cy="${cy}" r="${2 * s}" fill="#ffd54a"/>`;
}

const CANDLE_X = { 1: [0], 2: [-13, 13], 3: [-22, 0, 22] };
const CANDLE_COLOR = ['#ff6f91', '#5cc5ee', '#ffd23f'];

const TOPPING_DRAW = {
  sprinkles: (y) => spiral(20, 27, 10, 0, y).map(([x, yy], i) =>
    `<rect x="${num(x - 3.2)}" y="${num(yy - 1.1)}" width="6.4" height="2.2" rx="1.1" fill="${SPRINKLE[i % SPRINKLE.length]}" transform="rotate(${(i * 53) % 180 - 90} ${num(x)} ${num(yy)})"/>`).join(''),
  chips: (y) => spiral(9, 25, 9, 0, y).map(([x, yy]) =>
    `<path d="M${num(x - 3)} ${num(yy + 1.5)} Q${num(x)} ${num(yy - 4)} ${num(x + 3)} ${num(yy + 1.5)} Z" fill="#3b2113" stroke="#1f100a" stroke-width=".8" stroke-linejoin="round"/>`).join(''),
  stars: (y) => [[-17, -1], [14, -4], [-3, 6], [9, 4]].map(([x, dy]) => starTopping(x, y + dy, 5.2)).join(''),
  flowers: (y) => [[-17, 1], [15, -2], [-1, 6]].map(([x, dy]) => flower(x, y + dy, 1.05)).join(''),
  cherry: (y) =>
    `<path d="M0 ${y - 9} Q3 ${y - 20} 11 ${y - 22}" stroke="#4d7a22" stroke-width="2.6" fill="none" stroke-linecap="round"/>
     <circle cx="0" cy="${y - 4}" r="8" fill="#d92b45" stroke="#8f1428" stroke-width="1.6"/>
     <ellipse cx="-2.6" cy="${y - 7}" rx="2.6" ry="1.8" fill="#fff" opacity=".6"/>`,
};

function candles(count, y) {
  return (CANDLE_X[count] || []).map((x, i) => {
    const color = CANDLE_COLOR[i % 3];
    return `<g transform="translate(${x} ${y + (i % 2 ? 2 : 0)})">
      <rect x="-2.8" y="-21" width="5.6" height="21" rx="1.6" fill="${color}" stroke="${shade(color, -0.4)}" stroke-width="1.1"/>
      <path d="M-2.8 -15 L2.8 -17 M-2.8 -9 L2.8 -11" stroke="#fff" stroke-width="1.6" opacity=".8"/>
      <g class="cc-flame"><path d="M0 -23 Q-4.6 -28 0 -35 Q4.6 -28 0 -23 Z" fill="#ff9f1c"/><path d="M0 -24.5 Q-2.2 -28 0 -31.5 Q2.2 -28 0 -24.5 Z" fill="#ffe27a"/></g>
    </g>`;
  }).join('');
}

function toppingsMarkup(toppings, topY) {
  let out = '';
  // back-to-front so tall things overlap sensibly
  for (const kind of ['sprinkles', 'chips', 'flowers', 'stars']) if (toppings[kind]) out += TOPPING_DRAW[kind](topY);
  if (toppings.candles) out += candles(toppings.candles, topY + 1);
  if (toppings.cherry) out += TOPPING_DRAW.cherry(topY + 5);
  return out;
}

// ───────────────────────────── the cake ─────────────────────────────

/**
 * Inner SVG markup of a cake (origin = centre of its base).
 * Reads: shape, batter, bake, baked, icing, toppings, work ({kind,t,dur}).
 */
export function cakeMarkup(cake) {
  const out = [];
  const shape = cake.shape;
  const bake = cake.bake || 0;
  const batterHex = cake.batter ? byId(BATTERS, cake.batter)?.color : null;
  const tint = batterHex ? crustColor(batterHex, bake) : null;
  const work = cake.work;
  const prog = work ? clamp(work.t / work.dur, 0, 1) : 1;

  out.push(`<ellipse cx="0" cy="5" rx="55" ry="${num(32 * K * 1.5)}" fill="rgba(0,0,0,.2)"/>`);

  let height = CAKE_H;
  if (!cake.baked) {
    height = PAN_H;
    out.push(slab(shape, { y: -PAN_H, depth: PAN_H, top: '#d3d9e3', side: '#a7afbe', line: '#69728a' }));
    out.push(flat(shape, { y: -PAN_H + 1.5, scale: 0.9, fill: '#8f98a9' }));
    if (batterHex) {
      const fill = work?.kind === 'pour' ? 1 - (1 - prog) * (1 - prog) : 1;
      const rise = clamp(bake / 0.5, 0, 1);
      const y = -(3 + fill * 7 + rise * 5);
      out.push(flat(shape, { y, scale: 0.9, fill: tint, line: shade(tint, -0.35), lw: 1.6 }));
      out.push(`<ellipse cx="-14" cy="${num(y - 2)}" rx="9" ry="2.6" fill="#fff" opacity="${num(0.28 * (1 - rise))}"/>`);
    }
  } else {
    out.push(slab(shape, { y: -CAKE_H, depth: CAKE_H, scale: 0.98, top: shade(tint, 0.04), side: shade(tint, -0.1), line: shade(tint, -0.5) }));
    out.push(`<path d="M-30 ${-CAKE_H + 12} Q0 ${-CAKE_H + 20} 30 ${-CAKE_H + 12}" stroke="${shade(tint, 0.25)}" stroke-width="2.2" fill="none" opacity=".5" stroke-linecap="round"/>`);
  }

  let topY = -height;
  if (cake.icing) {
    const c = byId(ICINGS, cake.icing)?.color || '#fff';
    const p = cake.work?.kind === 'pipe' ? clamp(prog, 0.04, 1) : 1;
    const e = 1 - (1 - p) * (1 - p);
    out.push(slab(shape, { y: -(height + ICING_H), depth: ICING_H, scale: 0.95 * e, top: c, side: shade(c, -0.14), line: shade(c, -0.5), lw: 2 }));
    out.push(flat(shape, { y: -(height + ICING_H + 3), scale: 0.6 * e, fill: shade(c, 0.1), line: shade(c, -0.3), lw: 1.4 }));
    out.push(`<ellipse cx="-9" cy="${num(-(height + ICING_H + 4))}" rx="8" ry="2.2" fill="#fff" opacity=".5"/>`);
    topY = -(height + ICING_H + 3);
  }

  const toppings = cake.toppings || {};
  if (Object.keys(toppings).length) {
    out.push(`<g class="cc-pop">${toppingsMarkup(toppings, topY)}</g>`);
  }
  return out.join('');
}

/** Cheap change detector so the view only rebuilds a cake's markup when it looks different. */
export function cakeSignature(cake) {
  const w = cake.work;
  return [
    cake.shape, cake.batter, Math.round((cake.bake || 0) * 60), cake.baked ? 1 : 0, cake.icing,
    JSON.stringify(cake.toppings || {}),
    w ? `${w.kind}${Math.round((w.t / w.dur) * 12)}` : '-',
  ].join('|');
}

/** Standalone <svg> of a cake – used on order tickets and result dialogs. */
export function cakeSVG(spec, cls = '') {
  const cake = { ...spec, bake: 0.64, baked: true, work: null };
  return `<svg class="cc-cake-svg ${cls}" viewBox="-60 -76 120 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${cakeMarkup(cake)}</svg>`;
}

// ───────────────────────────── control-panel icons ─────────────────────────────

function toppingIcon(kind) {
  switch (kind) {
    case 'sprinkles':
      return spiral(9, 30, 26, 0, 4).map(([x, y], i) =>
        `<rect x="${num(x - 8)}" y="${num(y - 2.5)}" width="16" height="5" rx="2.5" fill="${SPRINKLE[i % SPRINKLE.length]}" transform="rotate(${(i * 61) % 180 - 90} ${num(x)} ${num(y)})"/>`).join('');
    case 'cherry':
      return `<path d="M0 -10 Q8 -36 28 -42" stroke="#4d7a22" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="0" cy="12" r="26" fill="#d92b45" stroke="#8f1428" stroke-width="4"/><ellipse cx="-9" cy="2" rx="8" ry="5" fill="#fff" opacity=".6"/>`;
    case 'candles':
      return `<rect x="-9" y="-12" width="18" height="52" rx="5" fill="#ff6f91" stroke="#a83a58" stroke-width="3.5"/><path d="M-9 4 L9 -2 M-9 22 L9 16" stroke="#fff" stroke-width="5" opacity=".85"/><path d="M0 -16 Q-16 -34 0 -54 Q16 -34 0 -16 Z" fill="#ff9f1c"/><path d="M0 -20 Q-7 -32 0 -43 Q7 -32 0 -20 Z" fill="#ffe27a"/>`;
    case 'chips':
      return spiral(6, 28, 26, 0, 2).map(([x, y]) =>
        `<path d="M${num(x - 10)} ${num(y + 7)} Q${num(x)} ${num(y - 16)} ${num(x + 10)} ${num(y + 7)} Z" fill="#3b2113" stroke="#1f100a" stroke-width="2" stroke-linejoin="round"/>`).join('');
    case 'stars':
      return [[-18, 12, 20], [16, -12, 22], [18, 26, 15]].map(([x, y, r]) => starTopping(x, y, r)).join('').replace(/stroke-width="1.2"/g, 'stroke-width="3"');
    case 'flowers':
      return `<g transform="translate(0 2) scale(5.6)">${flower(0, 0, 1)}</g>`;
    default:
      return '';
  }
}

/** Icon for a control-panel button. kind: shape | batter | icing | topping */
export function controlIcon(kind, id) {
  let inner = '';
  if (kind === 'shape') {
    const d = shapeD(id, 1);
    inner = `<path d="${d}" fill="#d3d9e3" stroke="#69728a" stroke-width="6" stroke-linejoin="round" transform="scale(.98)"/><path d="${d}" fill="#8f98a9" transform="scale(.72)"/>`;
  } else if (kind === 'batter') {
    const c = byId(BATTERS, id)?.color || '#ccc';
    inner = `<circle r="40" fill="#e9eef5" stroke="#7b8497" stroke-width="5"/><circle r="31" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="3"/><ellipse cx="-11" cy="-12" rx="12" ry="6" fill="#fff" opacity=".45" transform="rotate(-30 -11 -12)"/>`;
  } else if (kind === 'icing') {
    const c = byId(ICINGS, id)?.color || '#fff';
    const line = shade(c, -0.45);
    // a scalloped disc of frosting with a piped spiral
    let scallops = '';
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      scallops += `<circle cx="${num(Math.cos(a) * 34)}" cy="${num(Math.sin(a) * 34)}" r="13"/>`;
    }
    inner = `<g fill="${line}" stroke="${line}" stroke-width="7" stroke-linejoin="round">${scallops}<circle r="36"/></g>
      <g fill="${c}">${scallops}<circle r="36"/></g>
      <path d="M0 -4 a5 5 0 1 1 5 5 a11 11 0 1 1 -11 -11 a17 17 0 1 1 17 17" fill="none" stroke="${shade(c, -0.22)}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="-16" cy="-20" rx="11" ry="5" fill="#fff" opacity=".6" transform="rotate(-35 -16 -20)"/>`;
  } else {
    inner = toppingIcon(id);
  }
  return `<svg viewBox="-56 -56 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

// ───────────────────────────── the bakery scene ─────────────────────────────

export const BELT_Y = 352; // y of a cake's base centre
export const CAKE_SCALE = 0.95;

/** Static scenery. Dynamic parts carry data-role attributes the view toggles. */
export function sceneMarkup() {
  const metal = 'url(#cc-metal)';
  return `<svg class="cc-scene" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="cc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b676"/><stop offset="1" stop-color="#cc9d5c"/></linearGradient>
    <linearGradient id="cc-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff1fc"/><stop offset="1" stop-color="#b3d8f0"/></linearGradient>
    <linearGradient id="cc-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fdbe8"/><stop offset=".49" stop-color="#25b8c9"/><stop offset=".5" stop-color="#16939f"/><stop offset="1" stop-color="#1aa5b3"/></linearGradient>
    <linearGradient id="cc-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d5dce6"/></linearGradient>
    <linearGradient id="cc-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfd5e2"/><stop offset=".5" stop-color="#eef1f8"/><stop offset="1" stop-color="#b4bccd"/></linearGradient>
    <pattern id="cc-boards" width="20" height="9" patternUnits="userSpaceOnUse"><path d="M0 8.5 H20" stroke="#a87a3f" stroke-width="1.4" opacity=".75"/></pattern>
    <linearGradient id="cc-ray" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="cc-glow" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#e8631c"/><stop offset="1" stop-color="#7a2a10"/></radialGradient>
  </defs>

  <g data-layer="back">
    <!-- honey timber walls, a glass roof above, tall glazed bays in between (the CS Atrium) -->
    <rect width="800" height="340" fill="url(#cc-wall)"/><rect width="800" height="340" fill="url(#cc-boards)"/>
    <rect width="800" height="118" fill="url(#cc-glass)"/>
    <path d="M0 6 H800 M0 60 H800" stroke="#7d8da0" stroke-width="2"/>
    ${Array.from({ length: 15 }, (_, i) => `<path d="M${i * 57} 6 L${i * 57 + 57} 60 M${i * 57 + 57} 6 L${i * 57} 60" stroke="#8d99a6" stroke-width="1.4" opacity=".8"/>`).join('')}
    ${Array.from({ length: 15 }, (_, i) => `<path d="M${i * 57} 0 V118" stroke="#6f7e90" stroke-width="3"/>`).join('')}
    <rect width="800" height="8" fill="#c99a5b"/><rect y="8" width="800" height="3" fill="rgba(0,0,0,.18)"/>
    ${Array.from({ length: 15 }, (_, i) => `<g><rect x="${i * 57 + 3}" y="148" width="51" height="174" fill="#3b2c20"/><rect x="${i * 57 + 6}" y="151" width="45" height="168" fill="#a8d3ee"/><rect x="${i * 57 + 6}" y="151" width="45" height="84" fill="#fff" opacity=".3"/><path d="M${i * 57 + 10} 319 L${i * 57 + 34} 151 H${i * 57 + 46} L${i * 57 + 22} 319 Z" fill="#fff" opacity=".28"/></g>`).join('')}
    <path d="M60 0 H330 L170 330 H-60 Z" fill="url(#cc-ray)"/><path d="M430 0 H520 L400 330 H320 Z" fill="url(#cc-ray)" opacity=".7"/><path d="M640 0 H700 L640 330 H590 Z" fill="url(#cc-ray)" opacity=".55"/>
    <rect y="118" width="800" height="14" fill="url(#cc-teal)"/><rect y="118" width="800" height="2" fill="rgba(255,255,255,.75)"/><rect y="132" width="800" height="5" fill="rgba(0,0,0,.14)"/>
    <rect y="376" width="800" height="224" fill="url(#cc-table)"/><rect y="376" width="800" height="8" fill="rgba(0,30,60,.22)"/><path d="M0 376 H800 V440 L0 520 Z" fill="rgba(120,170,220,.12)"/>
    <path d="M0 470 H800 M0 540 H800" stroke="#c9d2de" stroke-width="2" opacity=".7"/>
    <!-- silver lamp posts and plants, as in the atrium -->
    ${[138, 666].map((x) => `<path d="M${x} 140 V326" stroke="#aab4c0" stroke-width="4"/><ellipse cx="${x}" cy="140" rx="15" ry="4.6" fill="#e1e8ef" stroke="#8d99a6" stroke-width="1.5"/>
      <g transform="translate(${x} 326)" fill="#3f9c4a" stroke="#256b2f" stroke-width="1"><path d="M0 0 Q-12 -22 -20 -10 Q-8 -10 0 0 Z"/><path d="M0 0 Q-3 -28 5 -30 Q6 -12 0 0 Z"/><path d="M0 0 Q12 -22 20 -10 Q8 -10 0 0 Z"/><path d="M0 0 Q-16 -6 -22 6 Q-8 4 0 0 Z" fill="#4fb35a"/><path d="M0 0 Q16 -6 22 6 Q8 4 0 0 Z" fill="#4fb35a"/></g>`).join('')}

    <!-- belt -->
    <rect y="324" width="800" height="54" fill="#2d3039"/><rect y="324" width="800" height="7" fill="#585e6d"/>
    <g class="cc-tread" stroke="#4b5060" stroke-width="3" fill="none"><path d="M0 341 H800"/><path d="M0 352 H800"/><path d="M0 363 H800"/></g>
    <rect y="372" width="800" height="6" fill="#1b1d24"/>

    <!-- 1 pans -->
    <rect x="18" y="146" width="104" height="178" rx="8" fill="#c98f5a" stroke="#7c4f2e" stroke-width="3"/>
    <rect x="26" y="154" width="88" height="162" rx="4" fill="#7c4f2e" opacity=".35"/>
    <path d="M26 224 H114 M26 282 H114" stroke="#a8703f" stroke-width="7"/>
    ${[0, 1, 2].map((i) => `<ellipse cx="70" cy="${216 - i * 5}" rx="33" ry="11" fill="${i % 2 ? '#c4cad6' : '#aeb6c4'}" stroke="#69728a" stroke-width="2"/>`).join('')}
    ${[0, 1].map((i) => `<ellipse cx="${50 + i * 40}" cy="${275 - i * 2}" rx="24" ry="8.5" fill="#aeb6c4" stroke="#69728a" stroke-width="2"/>`).join('')}
    <text x="70" y="172" text-anchor="middle" class="cc-label">PANS</text>

    <!-- 2 batter -->
    <rect x="166" y="130" width="72" height="16" rx="6" fill="#8a93a6" stroke="#6b7488" stroke-width="2"/>
    <rect x="154" y="142" width="96" height="108" rx="16" fill="${metal}" stroke="#7b8497" stroke-width="3"/>
    <ellipse cx="202" cy="190" rx="31" ry="27" fill="#fff" stroke="#7b8497" stroke-width="3"/>
    <ellipse data-role="tank-batter" cx="202" cy="192" rx="25" ry="21" fill="#f3d9a4"/><ellipse cx="193" cy="182" rx="9" ry="5" fill="#fff" opacity=".45"/>
    <text x="202" y="238" text-anchor="middle" class="cc-label">BATTER</text>
    <path d="M190 250 H214 L209 297 H195 Z" fill="#aab3c4" stroke="#7b8497" stroke-width="2.5"/>
    <rect x="192" y="294" width="20" height="9" rx="3" fill="#8a93a6" stroke="#6b7488" stroke-width="2"/>

    <!-- 3 oven interior -->
    <rect x="278" y="288" width="112" height="64" fill="#2a1b17"/>
    <rect data-role="oven-glow" x="278" y="288" width="112" height="64" fill="url(#cc-glow)" opacity="0"/>

    <!-- 4 icing -->
    <rect x="420" y="142" width="92" height="116" rx="16" fill="#ffeaf3" stroke="#d27aa3" stroke-width="3"/>
    <path d="M422 214 H510 M422 226 H510" stroke="#f8c3da" stroke-width="5"/>
    <circle cx="466" cy="186" r="27" fill="#fff" stroke="#d27aa3" stroke-width="3"/>
    <circle data-role="tank-icing" cx="466" cy="186" r="21" fill="#ff9ec4"/><ellipse cx="458" cy="177" rx="8" ry="4.5" fill="#fff" opacity=".5"/>
    <text x="466" y="246" text-anchor="middle" class="cc-label">ICING</text>
    <path d="M452 258 H480 L474 293 H458 Z" fill="#dfe4ee" stroke="#9aa3b6" stroke-width="2.5"/>
    <rect x="455" y="290" width="22" height="9" rx="3" fill="#b5bccb" stroke="#8a93a6" stroke-width="2"/>

    <!-- 5 toppings -->
    <rect x="548" y="146" width="100" height="106" rx="8" fill="#c98f5a" stroke="#7c4f2e" stroke-width="3"/>
    <rect x="556" y="154" width="84" height="90" rx="4" fill="#7c4f2e" opacity=".35"/>
    <path d="M556 198 H640" stroke="#a8703f" stroke-width="7"/>
    <g class="cc-jar"><rect x="562" y="162" width="30" height="34" rx="8" fill="#eaf6ff" stroke="#7b8497" stroke-width="2"/><g transform="translate(577 180) scale(.2)">${toppingIcon('sprinkles')}</g></g>
    <g class="cc-jar"><rect x="604" y="162" width="30" height="34" rx="8" fill="#eaf6ff" stroke="#7b8497" stroke-width="2"/><g transform="translate(619 180) scale(.22)">${toppingIcon('cherry')}</g></g>
    <g class="cc-jar"><rect x="562" y="206" width="30" height="34" rx="8" fill="#eaf6ff" stroke="#7b8497" stroke-width="2"/><g transform="translate(577 224) scale(.2)">${toppingIcon('candles')}</g></g>
    <g class="cc-jar"><rect x="604" y="206" width="30" height="34" rx="8" fill="#eaf6ff" stroke="#7b8497" stroke-width="2"/><g transform="translate(619 224) scale(.22)">${toppingIcon('stars')}</g></g>
    <path d="M580 254 H616 L608 294 H588 Z" fill="#aab3c4" stroke="#7b8497" stroke-width="2.5"/>

    <!-- 6 pickup -->
    <ellipse cx="730" cy="360" rx="58" ry="25" fill="#fff6e8" stroke="#d4b27c" stroke-width="3"/>
    <ellipse cx="730" cy="360" rx="45" ry="18" fill="none" stroke="#ead7b5" stroke-width="3"/>
    <rect x="684" y="150" width="92" height="34" rx="9" fill="#fff6d6" stroke="#b8864a" stroke-width="3"/>
    <text x="730" y="173" text-anchor="middle" class="cc-label cc-label-dark">PICK UP</text>
    <path d="M730 186 V230" stroke="#b8864a" stroke-width="3" stroke-dasharray="3 5"/>
    <path d="M722 222 L730 234 L738 222" fill="none" stroke="#b8864a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g data-layer="cakes"></g>

  <g data-layer="front">
    <!-- oven shell -->
    <path fill-rule="evenodd" fill="${metal}" stroke="#7b8497" stroke-width="3" stroke-linejoin="round"
      d="M274 150 H394 Q406 150 406 162 V352 H262 V162 Q262 150 274 150 Z M278 288 H390 V352 H278 Z"/>
    <rect x="276" y="162" width="116" height="40" rx="7" fill="#4a5163"/>
    <circle cx="298" cy="182" r="9" fill="#c9d0de" stroke="#8a93a6" stroke-width="2"/><circle cx="334" cy="182" r="9" fill="#c9d0de" stroke="#8a93a6" stroke-width="2"/><circle cx="370" cy="182" r="9" fill="#c9d0de" stroke="#8a93a6" stroke-width="2"/>
    <path d="M298 182 l4 -5 M334 182 l0 -6 M370 182 l-4 -5" stroke="#4a5163" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="276" y="212" width="116" height="62" rx="9" fill="#2a1b17" stroke="#7b8497" stroke-width="3"/>
    <rect data-role="oven-glow2" x="280" y="216" width="108" height="54" rx="6" fill="url(#cc-glow)" opacity="0"/>
    <text x="334" y="144" text-anchor="middle" class="cc-label">OVEN</text>
    <rect x="316" y="128" width="36" height="22" rx="4" fill="#8d96a8" stroke="#6b7488" stroke-width="2"/>
    <rect data-role="door" x="278" y="288" width="112" height="64" rx="3" fill="rgba(255,196,120,.3)" stroke="#e0a860" stroke-width="3" opacity="0"/>
    <g data-role="smoke" opacity="0"><circle class="cc-puff" cx="318" cy="284" r="8"/><circle class="cc-puff cc-puff2" cx="338" cy="282" r="11"/><circle class="cc-puff cc-puff3" cx="356" cy="284" r="9"/></g>

    <!-- effects -->
    <rect data-role="stream-batter" x="199" y="303" width="6" height="0" rx="3" fill="#f3d9a4"/>
    <path data-role="stream-icing" d="M466 299 Q458 308 466 314 Q474 320 466 326" stroke="#ff9ec4" stroke-width="9" fill="none" stroke-linecap="round" opacity="0"/>
    <g data-role="fall" opacity="0"><circle class="cc-fall" cx="590" cy="296" r="3.2" fill="#ff4d6d"/><circle class="cc-fall cc-fall2" cx="598" cy="296" r="3.2" fill="#ffd23f"/><circle class="cc-fall cc-fall3" cx="606" cy="296" r="3.2" fill="#3ec1d3"/><circle class="cc-fall cc-fall4" cx="594" cy="296" r="3" fill="#6cc36b"/><circle class="cc-fall cc-fall5" cx="602" cy="296" r="3" fill="#b57cf0"/></g>
  </g>
</svg>`;
}

// ───────────────────────────── hub building & icon ─────────────────────────────

export function iconSVG() {
  return `<svg viewBox="-60 -80 120 116" xmlns="http://www.w3.org/2000/svg">${cakeMarkup({ shape: 'round', batter: 'chocolate', icing: 'pink', toppings: { candles: 2 }, bake: 0.64, baked: true })}</svg>`;
}
