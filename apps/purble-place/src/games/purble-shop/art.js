// Purble Shop artwork: item colours + colour-blind glyphs, hub building and icon.

import { shade } from '../../core/color.js';

function starPath(cx, cy, R, r, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const GLYPHS = {
  circle: '<circle cx="12" cy="12" r="5.2"/>',
  square: '<rect x="7" y="7" width="10" height="10" rx="1.6"/>',
  triangle: '<path d="M12 5.5 L19 18 H5 Z" stroke-linejoin="round"/>',
  diamond: '<path d="M12 4 L19.5 12 L12 20 L4.5 12 Z"/>',
  star: `<path d="${starPath(12, 12.6, 8, 3.6)}"/>`,
  heart: '<path d="M12 19.5 C4.5 14.5 3.5 9 7.4 7.8 C9.6 7.2 12 8.8 12 10.4 C12 8.8 14.4 7.2 16.6 7.8 C20.5 9 19.5 14.5 12 19.5 Z"/>',
  plus: '<path d="M10 5 h4 v5 h5 v4 h-5 v5 h-4 v-5 h-5 v-4 h5 Z"/>',
  moon: '<path d="M15 4.5 A8.5 8.5 0 1 0 19.5 15 A6.6 6.6 0 1 1 15 4.5 Z"/>',
};

/** Shelf colours, in a fixed order; the first N are used at lower levels. */
export const ITEM_COLORS = [
  { id: 'red', name: 'Red', hex: '#e53935', glyph: 'circle' },
  { id: 'orange', name: 'Orange', hex: '#fb8c00', glyph: 'square' },
  { id: 'yellow', name: 'Yellow', hex: '#fdd835', glyph: 'triangle' },
  { id: 'green', name: 'Green', hex: '#43a047', glyph: 'diamond' },
  { id: 'blue', name: 'Blue', hex: '#1e88e5', glyph: 'star' },
  { id: 'purple', name: 'Purple', hex: '#8e24aa', glyph: 'heart' },
  { id: 'pink', name: 'Pink', hex: '#f06ba8', glyph: 'plus' },
  { id: 'teal', name: 'Teal', hex: '#00acc1', glyph: 'moon' },
];

export function glyphSVG(glyph) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="1.1" paint-order="stroke">${GLYPHS[glyph]}</svg>`;
}

export function itemStyle(colorIndex) {
  const c = ITEM_COLORS[colorIndex];
  return { '--c': c.hex, '--cd': shade(c.hex, -0.35), '--cl': shade(c.hex, 0.45) };
}

export function iconSVG() {
  const dots = ITEM_COLORS.slice(0, 4).map((c, i) =>
    `<circle cx="${20 + i * 20}" cy="30" r="9" fill="${c.hex}" stroke="${shade(c.hex, -0.4)}" stroke-width="2.4"/>`).join('');
  const dots2 = ITEM_COLORS.slice(4, 8).map((c, i) =>
    `<circle cx="${20 + i * 20}" cy="70" r="9" fill="${c.hex}" stroke="${shade(c.hex, -0.4)}" stroke-width="2.4"/>`).join('');
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="12" width="92" height="76" rx="10" fill="#58c5d6" stroke="#1d7f8f" stroke-width="4"/>${dots}${dots2}</svg>`;
}
