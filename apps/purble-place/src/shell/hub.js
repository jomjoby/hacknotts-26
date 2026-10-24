// The Purble Place town square. By default it draws the campus scene and each game is a clickable
// part of that picture (see campus.js). Games the scene has no spot for fall back to a row of
// small buildings, so extra mini-games still get a door.

import { h, clear } from '../core/dom.js';
import { purble } from '../core/purble.js';
import { shade } from '../core/color.js';
import { esc } from '../core/util.js';
import { CAMPUS_SCENE } from './campus.js';

/** Fallback building for third-party games that don't ship their own art: accent-coloured shop front with the game's icon. */
function genericArt(def) {
  const color = def.hub?.accent || '#8e6bd8';
  const dark = shade(color, -0.45);
  let awning = '';
  for (let i = 0; i < 8; i++) awning += `<path d="M${10 + i * 25} 84 h25 v8 a12.5 12.5 0 0 1 -25 0 Z" fill="${i % 2 ? '#fff6d6' : shade(color, -0.1)}" stroke="${dark}" stroke-width="2"/>`;
  const icon = def.icon ? `<svg x="62" y="110" width="96" height="96" viewBox="${/viewBox="([^"]+)"/.exec(def.icon)?.[1] || '0 0 100 100'}">${def.icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>` : '';
  return `<svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="110" cy="248" rx="100" ry="8" fill="rgba(0,0,0,.2)"/>
    <path d="M4 52 L24 14 H196 L216 52 Z" fill="${shade(color, -0.25)}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="12" y="50" width="196" height="194" rx="6" fill="${color}" stroke="${dark}" stroke-width="4"/>
    <rect x="40" y="58" width="140" height="24" rx="8" fill="#fff6d6" stroke="${dark}" stroke-width="3"/>
    ${awning}
    <rect x="44" y="104" width="132" height="100" rx="8" fill="#fffaf0" stroke="${dark}" stroke-width="3"/>
    ${icon}
    <rect x="86" y="208" width="48" height="36" rx="5" fill="${dark}" opacity=".75"/>
  </svg>`;
}

export class Hub {
  /**
   * @param {object} deps { stats, t, sound, onOpen(gameId) }
   */
  constructor({ stats, t, sound, onOpen, scene = CAMPUS_SCENE }) {
    this.scene = scene;
    this.stats = stats;
    this.t = t;
    this.sound = sound;
    this.onOpen = onOpen;
    this.el = h('div', { class: 'pp-screen pp-hub' });
    this.games = [];
  }

  render(games) {
    this.games = games;
    clear(this.el);
    this.el.innerHTML = this.scene.backdrop;
    this.el.append(
      h('div', { class: 'pp-hub-title' },
        h('div', { class: 'pp-hub-mascot is-left', html: purble({ body: '#a45fd8', hat: 'gradcap', lanyard: true, mood: 'excited' }) }),
        h('div', { class: 'pp-hub-head' },
          h('h1', { class: 'pp-hub-logo', 'aria-label': 'Purble Place', html: nameSVG('Purble Place', ['#c77dff', '#6d4aff'], { size: 64, width: 420, height: 88, logo: true, reflect: false }) }),
          h('div', { class: 'pp-hub-ribbon' }, this.t('hub.ribbon'))),
        h('div', { class: 'pp-hub-mascot is-right', html: purble({ body: '#f08a4b', hat: 'headphones', lanyard: true, mood: 'happy', look: -1 }) })),
      this.buildings(games));
  }

  buildings(games) {
    const spots = games.map((g) => g.hub?.spot || this.scene.spots?.[g.id]);
    return spots.every(Boolean) ? this.spotLayer(games, spots) : this.gridLayer(games);
  }

  /** Each game is a clickable area of the scene, with its name lettered underneath. */
  spotLayer(games, spots) {
    this.el.dataset.rows = '1';
    const layer = h('div', { class: 'pp-buildings is-scene' });
    const nameW = 172;
    const nameSize = 25;
    const nameH = Math.round(nameSize * 1.8);
    games.forEach((def, i) => {
      const { x, y, w, h: zoneH } = spots[i];
      const cx = x + w / 2;
      const colors = def.hub?.colors || [shade(def.hub?.accent || '#8e6bd8', 0.2), shade(def.hub?.accent || '#8e6bd8', -0.1)];
      layer.append(h('button', {
        class: 'pp-building is-spot', type: 'button',
        style: { left: `${Math.round(cx - nameW / 2)}px`, top: `${y}px`, width: `${nameW}px`, height: `${zoneH + nameH}px` },
        'aria-label': def.title,
        onClick: () => { this.sound.play('select'); this.onOpen(def.id); },
      },
      h('span', { class: 'pp-spot-zone', style: { left: `${Math.round((nameW - w) / 2)}px`, width: `${w}px`, height: `${zoneH}px` } }),
      h('span', { class: 'pp-building-name', style: { top: `${zoneH - 2}px` }, html: nameSVG(def.title, colors, { size: nameSize, width: nameW, height: nameSize * 1.5, box: 1.2 }) })));
    });
    return layer;
  }

  /** Fallback for games with no spot in the scene: a row (or rows) of small buildings. */
  gridLayer(games) {
    // 1-4 games: one row; 5-8: two; 9-12: three (smaller buildings)
    const n = games.length;
    const rows = Math.min(3, Math.max(1, Math.ceil(n / 4)));
    const layer = h('div', { class: ['pp-buildings', rows === 2 && 'is-compact', rows === 3 && 'is-dense'] });
    this.el.dataset.rows = String(rows);
    const perRow = Math.ceil(n / rows);
    const gap = rows === 1 ? 44 : 14;
    const top0 = rows === 1 ? 168 : 116;
    const rowH = Math.floor((rows === 1 ? 470 - top0 : 566 - top0) / rows);
    const nameSize = rows === 1 ? 38 : rows === 2 ? 28 : 21;
    const nameH = Math.round(nameSize * 1.8);
    const width = Math.min(188, Math.floor((780 - (perRow - 1) * gap) / perRow), Math.floor(((rowH - nameH) * 220) / 260));

    games.forEach((def, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const inRow = r === rows - 1 ? n - perRow * (rows - 1) : perRow;
      const startX = (800 - (inRow * width + (inRow - 1) * gap)) / 2;
      const art = def.hub?.art ? def.hub.art() : genericArt(def);
      const colors = def.hub?.colors || [shade(def.hub?.accent || '#8e6bd8', 0.2), shade(def.hub?.accent || '#8e6bd8', -0.1)];
      const b = h('button', {
        class: 'pp-building', type: 'button',
        style: { left: `${startX + c * (width + gap)}px`, top: `${top0 + r * rowH}px`, width: `${width}px`, '--accent': def.hub?.accent || '#8e6bd8' },
        'aria-label': def.title,
        onClick: () => { this.sound.play('select'); this.onOpen(def.id); },
      },
      h('span', { class: 'pp-building-art', html: art }),
      h('span', { class: 'pp-building-name', html: nameSVG(def.title, colors, { size: nameSize, width: width + 8, height: nameSize * 1.5, box: 1.2 }) }));
      layer.append(b);
    });
    return layer;
  }

  /** Squeeze any title that came out wider than its box. Call once the hub is visible (text can't be measured while hidden). */
  fit() {
    for (const svg of this.el.querySelectorAll('svg.pp-name')) {
      const fitG = svg.querySelector('.pp-name-fit');
      const probe = svg.querySelector('text');
      if (!fitG || !probe) continue;
      let w = 0;
      try { w = probe.getComputedTextLength(); } catch { /* not rendered */ }
      const max = Number(svg.dataset.max);
      const k = w > max ? max / w : 1;
      const cx = Number(svg.dataset.cx);
      const base = Number(svg.dataset.base);
      fitG.setAttribute('transform', k < 1 ? `translate(${cx} ${base}) scale(${k.toFixed(3)}) translate(${-cx} ${-base})` : '');
    }
  }

  /** Re-draw (e.g. after stats changed). */
  refresh() {
    if (this.games.length) { this.render(this.games); this.fit(); }
  }
}

let nameCount = 0;

/**
 * A game's name as chunky cartoon lettering: white sticker outline, dark inner outline, glossy two-tone
 * gradient fill, a highlight across the top half and a faint reflection underneath.
 * Pure SVG so it needs no web font; the face comes from --pp-display-font.
 */
export function nameSVG(text, [light, dark], { size = 40, width = 300, height = 64, logo = false, reflect = true, box = 1.5 } = {}) {
  const id = `pp-n${++nameCount}`;
  const cx = width / 2;
  const base = height * 0.64;
  const outline = Math.max(4, size * 0.17);
  const ink = shade(dark, -0.55);
  const label = esc(text);
  const line = (extra) => `<text x="${cx}" y="${base}" text-anchor="middle" font-size="${size}" ${extra}>${label}</text>`;
  const stack = `
    ${line(`fill="rgba(0,20,60,.35)" stroke="rgba(0,20,60,.35)" stroke-width="${outline * 2.2}" stroke-linejoin="round" transform="translate(0 ${size * 0.1})"`)}
    ${line(`fill="#fff" stroke="#fff" stroke-width="${outline * 2.2}" stroke-linejoin="round"`)}
    ${line(`fill="${ink}" stroke="${ink}" stroke-width="${outline * 1.1}" stroke-linejoin="round"`)}
    ${line(`fill="url(#${id}-fill)"`)}
    ${line(`fill="url(#${id}-gloss)" clip-path="url(#${id}-top)"`)}`;
  return `<svg class="pp-name${logo ? ' is-logo' : ''}" viewBox="0 0 ${width} ${height * box}" data-max="${width - outline * 3}" data-cx="${cx}" data-base="${base}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" overflow="visible">
    <defs>
      <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shade(light, 0.35)}"/><stop offset=".48" stop-color="${light}"/>
        <stop offset=".52" stop-color="${dark}"/><stop offset="1" stop-color="${shade(dark, -0.2)}"/>
      </linearGradient>
      <linearGradient id="${id}-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
      <clipPath id="${id}-top"><rect x="0" y="0" width="${width}" height="${base - size * 0.28}"/></clipPath>
      <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="${base}" width="${width}" height="${height}"><rect x="0" y="${base}" width="${width}" height="${height}" fill="url(#${id}-fade)"/></mask>
    </defs>
    <g class="pp-name-fit"><g class="pp-name-main">${stack}</g>
      ${reflect ? `<g class="pp-name-reflection" mask="url(#${id}-mask)" opacity=".5"><g transform="translate(0 ${base * 2 + size * 0.1}) scale(1 -1)">${line(`fill="${dark}"`)}</g></g>` : ''}</g>
  </svg>`;
}
