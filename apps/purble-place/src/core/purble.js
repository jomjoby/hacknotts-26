// Procedural Purble characters, drawn entirely in SVG.
//
// The look follows the classic ones: a big smooth glossy dome head that is wider at the bottom than the
// top, large glassy eyes with a dark iris and bright highlights, thin brow arcs, a tiny nose, a wide
// flat-topped grin, a small puffy torso made of stacked rings, short puffy arms with mitten hands and
// chunky rounded shoes. Everything is shaded like glossy translucent jelly. Some Purbles also have an
// antenna with a bulb on top.
//
// One function gives the town square its mascots and every game its cast of customers.

import { shade } from './color.js';
import { uid } from './util.js';

/** Jelly colours for the body. */
export const BODY_COLORS = ['#b86bd6', '#5fd0e0', '#ff9a5c', '#ff7bb5', '#8fdc6a', '#ffd45c', '#7a9cff'];
/** Headwear handed out at random (students). */
export const HATS = ['none', 'beanie', 'headphones', 'glasses', 'gradcap', 'cap'];
/** Everything purble() knows how to draw. */
export const ALL_HATS = [...HATS, 'chef', 'party', 'tophat', 'bow', 'crown'];
export const MOODS = ['happy', 'excited', 'neutral', 'worried', 'angry', 'sad'];

const SILVER = '#e3e9f1';

/** Hats and glasses, drawn on the dome head (top of head is y=6, widest point y=44, x=8..92). */
function headwear(kind, body, ink) {
  switch (kind) {
    case 'beanie':
      return `<g><path d="M15 31 Q14 0 50 0 Q86 0 85 31 Z" fill="${shade(body, -0.32)}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M30 8 Q50 -2 70 8" stroke="#fff" stroke-width="2.2" fill="none" opacity=".35" stroke-linecap="round"/>
        <rect x="12" y="27" width="76" height="10" rx="5" fill="#f4f7fb" stroke="${ink}" stroke-width="1.6"/>
        <path d="M22 28 V36 M32 28 V36 M42 28 V36 M52 28 V36 M62 28 V36 M72 28 V36" stroke="#c9d3e0" stroke-width="1.4"/>
        <circle cx="50" cy="0" r="6.5" fill="#fff" stroke="${ink}" stroke-width="1.6"/></g>`;
    case 'headphones':
      return `<g><path d="M9 46 Q6 -3 50 -3 Q94 -3 91 46" fill="none" stroke="#161e30" stroke-width="7.5" stroke-linecap="round"/>
        <path d="M9 46 Q6 -3 50 -3 Q94 -3 91 46" fill="none" stroke="#3b4d72" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M14 28 Q18 4 50 1" fill="none" stroke="#fff" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>
        <rect x="1" y="34" width="15" height="27" rx="7.5" fill="#2c3e5e" stroke="#161e30" stroke-width="1.6"/><rect x="4.5" y="38" width="5" height="12" rx="2.5" fill="#7d9ad0" opacity=".8"/>
        <rect x="84" y="34" width="15" height="27" rx="7.5" fill="#2c3e5e" stroke="#161e30" stroke-width="1.6"/><rect x="90.5" y="38" width="5" height="12" rx="2.5" fill="#7d9ad0" opacity=".8"/></g>`;
    case 'glasses':
      return `<g fill="rgba(200,230,255,.3)" stroke="#2a2236" stroke-width="2.8"><circle cx="31" cy="33.5" r="15.5"/><circle cx="69" cy="33.5" r="15.5"/>
        <path d="M46.5 31 Q50 27 53.5 31" fill="none"/><path d="M16 30 L9 27 M84 30 L91 27" fill="none" stroke-linecap="round"/></g>
        <path d="M22 26 q5 -6 12 -5 M58 26 q5 -6 12 -5" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8" stroke-linecap="round"/>`;
    case 'gradcap':
      return `<g><path d="M24 20 Q50 34 76 20 L76 31 Q50 45 24 31 Z" fill="#232d44" stroke="#111827" stroke-width="1.4"/>
        <path d="M50 -5 L97 12 L50 29 L3 12 Z" fill="#2c3856" stroke="#111827" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M50 -1 L87 12 L50 22 L14 12 Z" fill="#46587e" opacity=".6"/>
        <path d="M88 13 L90 36" stroke="#ffc933" stroke-width="2.6" stroke-linecap="round"/><circle cx="90" cy="38" r="3.6" fill="#ffc933" stroke="#a87a00" stroke-width="1"/></g>`;
    case 'cap':
      return `<g><path d="M14 30 Q16 1 50 1 Q84 1 86 30 Z" fill="#2f5cc4" stroke="#17306e" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M60 28 Q92 25 99 35 Q76 40 56 34 Z" fill="#3f73e0" stroke="#17306e" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="50" cy="2" r="3.6" fill="#fff" stroke="#17306e" stroke-width="1.2"/><path d="M26 20 Q50 8 74 20" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/></g>`;
    case 'chef':
      return `<g><rect x="24" y="17" width="52" height="14" rx="3" fill="#fff" stroke="${ink}" stroke-width="1.4"/>
        <circle cx="29" cy="11" r="11" fill="#fff" stroke="${ink}" stroke-width="1.4"/><circle cx="50" cy="3" r="13" fill="#fff" stroke="${ink}" stroke-width="1.4"/><circle cx="71" cy="11" r="11" fill="#fff" stroke="${ink}" stroke-width="1.4"/>
        <rect x="26" y="19" width="48" height="11" rx="2" fill="#fff"/><rect x="24" y="27" width="52" height="4" fill="#dfe6f0"/></g>`;
    case 'party':
      return `<g transform="rotate(-12 50 22)"><path d="M50 -14 L70 24 L30 24 Z" fill="#ffd54a" stroke="#b8860b" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M43 6 L57 6 L62 16 L38 16 Z" fill="#ff6f91"/><circle cx="50" cy="-14" r="5" fill="#ff6f91" stroke="#b8335a" stroke-width="1.2"/></g>`;
    case 'tophat':
      return `<g><rect x="20" y="19" width="60" height="7" rx="3" fill="#2b2233" stroke="#120d18" stroke-width="1.4"/><rect x="30" y="-6" width="40" height="26" rx="3" fill="#3a2f46" stroke="#120d18" stroke-width="1.4"/>
        <rect x="30" y="12" width="40" height="6" fill="#ff6f91"/><rect x="34" y="-2" width="5" height="16" fill="#fff" opacity=".18"/></g>`;
    case 'bow':
      return `<g transform="translate(74 14) rotate(18)"><path d="M0 0 L-16 -10 L-16 10 Z" fill="#ff6f91" stroke="#b8335a" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 0 L16 -10 L16 10 Z" fill="#ff6f91" stroke="#b8335a" stroke-width="1.3" stroke-linejoin="round"/><circle r="5" fill="#d84a73" stroke="#b8335a" stroke-width="1.2"/></g>`;
    case 'crown':
      return `<g><path d="M27 24 L30 4 L40 15 L50 -1 L60 15 L70 4 L73 24 Z" fill="#ffc933" stroke="#b8860b" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="50" cy="12" r="3.4" fill="#e0405a" stroke="#8a1a30" stroke-width="1"/><circle cx="34" cy="14" r="2.4" fill="#4fa8f0"/><circle cx="66" cy="14" r="2.4" fill="#4fa8f0"/></g>`;
    default:
      return '';
  }
}

/** Blue university lanyard with an ID card on the chest. */
function lanyardArt() {
  return `<g><path d="M36 63 L50 84 M64 63 L50 84" stroke="#1d4fa8" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M36 63 L50 84 M64 63 L50 84" stroke="#5f9bff" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="42" y="81" width="16" height="12" rx="2.4" fill="#fff" stroke="#1d4fa8" stroke-width="1.6"/>
    <circle cx="47" cy="86" r="2.3" fill="#9fb4d6"/><path d="M51 85 H56 M51 88.4 H55" stroke="#9fb4d6" stroke-width="1.3"/></g>`;
}

/** Eyes, brows, mouth and cheeks for each mood. `ink` is a dark tone of the body colour. */
function face(mood, look, body, ink, lashes, id) {
  const lx = look * 2.6;
  const big = mood === 'excited' ? 1 : 0;
  const ey = mood === 'excited' ? 32.5 : 33.5;
  const eye = (cx, outer) => `<g class="pp-eye">
    <ellipse cx="${cx}" cy="${ey}" rx="${11.5 + big}" ry="${12 + big}" fill="#fbf7ff" stroke="${ink}" stroke-width="1.5"/>
    <circle cx="${cx + lx}" cy="${ey + 1.4}" r="${8.1 + big * 0.6}" fill="url(#${id}i)"/>
    <circle cx="${cx + lx}" cy="${ey + 1.4}" r="${4.4 + big * 0.4}" fill="${shade(body, -0.78)}"/>
    <circle cx="${cx + lx - 3.2}" cy="${ey - 2.8}" r="3" fill="#fff"/><circle cx="${cx + lx + 3.2}" cy="${ey + 4.6}" r="1.4" fill="#fff" opacity=".9"/>
    <path d="M${cx - 11} ${ey - 4.5} Q${cx} ${ey - 16} ${cx + 11} ${ey - 4.5}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
    ${lashes ? `<path d="M${cx + outer * 11} ${ey - 4.5} l${outer * 5} -3.4 M${cx + outer * 11.6} ${ey - 0.8} l${outer * 5.8} -1.2 M${cx + outer * 11.2} ${ey + 3} l${outer * 5} 1.2" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>` : ''}
  </g>`;
  const brow = (d) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`;
  const teeth = (d) => `<path d="${d}" fill="#fff" stroke="${ink}" stroke-width="1.9" stroke-linejoin="round"/>`;
  const lowerLip = (d) => `<path d="${d}" fill="${shade(body, -0.5)}" opacity=".85"/>`;
  const cheeks = (o) => `<ellipse cx="17" cy="50" rx="4.8" ry="3.2" fill="#ff5f8f" opacity="${o}"/><ellipse cx="83" cy="50" rx="4.8" ry="3.2" fill="#ff5f8f" opacity="${o}"/>`;
  const both = (left, right) => brow(left) + brow(right);
  let brows = '';
  let mouth = '';
  let extra = '';
  switch (mood) {
    case 'excited':
      brows = both('M24 19 Q32 13.5 41 17', 'M76 19 Q68 13.5 59 17');
      mouth = `<path d="M29 48.5 H71 Q71 63 50 63 Q29 63 29 48.5 Z" fill="${shade(body, -0.68)}" stroke="${ink}" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M30 48.5 H70 L69 53.5 H31 Z" fill="#fff"/><ellipse cx="50" cy="59" rx="9" ry="3.4" fill="#ff7a96"/>`;
      extra = cheeks(0.4);
      break;
    case 'neutral':
      brows = both('M24 21 Q32 18 41 21', 'M76 21 Q68 18 59 21');
      mouth = `<path d="M37 54 Q50 59 63 54" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`;
      break;
    case 'worried':
      brows = both('M22 25 Q30 20 42 16', 'M78 25 Q70 20 58 16');
      mouth = teeth('M32 50 H68 Q68 60 50 60 Q32 60 32 50 Z') + lowerLip('M34 55.5 Q50 62.5 66 55.5 Q65 59.5 50 59.8 Q35 59.5 34 55.5Z');
      break;
    case 'angry':
      brows = both('M23 19 Q31 22 42 28', 'M77 19 Q69 22 58 28');
      mouth = `<path d="M33 52 H67 L64 61 H36 Z" fill="#fff" stroke="${ink}" stroke-width="1.9" stroke-linejoin="round"/><path d="M42 52 V61 M50 52 V61 M58 52 V61" stroke="${ink}" stroke-width="1.3"/>`;
      extra = '<path d="M90 12 l5 -5 m-2 10 l8 -2" stroke="#ff4d4d" stroke-width="2.6" stroke-linecap="round"/>';
      break;
    case 'sad':
      brows = both('M23 26 Q31 21 42 17', 'M77 26 Q69 21 58 17');
      mouth = `<path d="M38 59 Q50 50 62 59" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`;
      extra = '<path d="M24 48 q-4 7 0 11 q4 -4 0 -11 Z" fill="#8fd4ff" stroke="#3b8fd0" stroke-width="1"/>';
      break;
    default: // happy
      brows = both('M24 20 Q32 15 41 19', 'M76 20 Q68 15 59 19');
      mouth = teeth('M30 49 H70 Q70 60 50 60 Q30 60 30 49 Z') + lowerLip('M32 55 Q50 63 68 55 Q67 59.5 50 60 Q33 59.5 32 55Z');
      extra = cheeks(0.35);
  }
  return { eyes: eye(31, -1) + eye(69, 1), brows, mouth, extra };
}

/**
 * @param {object} o
 * @param {string} [o.body]      jelly colour of the head, arms and shoes
 * @param {string} [o.mood]      happy | excited | neutral | worried | angry | sad
 * @param {string} [o.hat]       none | beanie | headphones | glasses | gradcap | cap | chef | party | tophat | bow | crown
 * @param {boolean} [o.lanyard]  show a university lanyard
 * @param {boolean} [o.antenna]  an antenna with a bulb on top (also gives a triangle nose and eyelashes)
 * @param {string} [o.suit]      'silver' for a silver torso (default: a pale tint of the body colour)
 * @param {boolean} [o.bust]     head only (for small icons)
 * @param {number} [o.look]      -1 (left) .. 1 (right) eye direction
 * @param {string} [o.cls]       extra class on the <svg>
 */
export function purble({ body = BODY_COLORS[0], mood = 'happy', hat = 'none', look = 0, cls = '', lanyard = false, antenna = false, suit = null, bust = false } = {}) {
  const id = uid('pg');
  const ink = shade(body, -0.52);
  const suitColor = suit === 'silver' ? SILVER : shade(body, 0.52);
  const suitEdge = shade(suitColor, -0.4);
  const shoe = shade(body, -0.12);
  const f = face(mood, look, body, ink, antenna, id);
  const head = 'M8 46 C8 19 26 6 50 6 C74 6 92 19 92 46 C92 58 78 64 50 64 C22 64 8 58 8 46 Z';

  const ring = (cy, rx, ry) => `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id}s)" stroke="${suitEdge}" stroke-width="1.3"/>
    <ellipse cx="${50 - rx * 0.35}" cy="${cy - ry * 0.45}" rx="${rx * 0.4}" ry="${ry * 0.28}" fill="#fff" opacity=".5"/>`;

  // arms: a puffy tube ending in a mitten. dir -1 = left side, 1 = right side
  const arm = (dir) => {
    const x = (v) => (dir > 0 ? 100 - v : v);
    const tube = `M${x(33)} 65 Q${x(21)} 66 ${x(20)} 74 Q${x(19.5)} 79 ${x(23)} 81`;
    return `<path d="${tube}" fill="none" stroke="${suitEdge}" stroke-width="9.6" stroke-linecap="round"/>
      <path d="${tube}" fill="none" stroke="${suitColor}" stroke-width="7.4" stroke-linecap="round"/>
      <path d="M${x(31)} 65.6 Q${x(22.5)} 67 ${x(21.5)} 73" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
      <circle cx="${x(23.5)}" cy="81.5" r="4.7" fill="${shade(suitColor, 0.12)}" stroke="${suitEdge}" stroke-width="1.3"/>`;
  };

  const shoeShape = (dir) => {
    const x = (v) => (dir > 0 ? 100 - v : v);
    return `<path d="M${x(20)} 92 Q${x(19)} 85 ${x(29)} 84.5 H${x(40)} Q${x(48)} 85 ${x(48)} 92 Q${x(48)} 99.5 ${x(40)} 99.5 H${x(26)} Q${x(20)} 99.5 ${x(20)} 92 Z" fill="url(#${id}f)" stroke="${shade(shoe, -0.45)}" stroke-width="1.4"/>
      <path d="M${x(22)} 96 H${x(46)}" stroke="${shade(shoe, 0.6)}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
      <ellipse cx="${x(37)}" cy="88.5" rx="6.5" ry="2.4" fill="#fff" opacity=".5"/>`;
  };

  const bulb = antenna
    ? `<path d="M50 6.5 Q49 -6 36 -8" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
       <circle cx="33.5" cy="-8" r="6.2" fill="url(#${id}b)" stroke="${ink}" stroke-width="1.4"/><circle cx="31.5" cy="-10" r="2" fill="#fff" opacity=".8"/>`
    : '';
  const nose = antenna
    ? `<path d="M50 40 L55.5 49 H44.5 Z" fill="${shade(body, -0.35)}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`
    : `<circle cx="50" cy="44" r="2.9" fill="${shade(body, -0.2)}" stroke="${ink}" stroke-width="1"/><circle cx="49.2" cy="43" r="1" fill="#fff" opacity=".7"/>`;
  const star = lanyard ? ''
    : `<path d="M50 71.6 l1.5 3 3.3 .4 -2.4 2.3 .6 3.2 -3 -1.6 -3 1.6 .6 -3.2 -2.4 -2.3 3.3 -.4 Z" fill="${shade(suitColor, 0.6)}" stroke="${shade(suitColor, -0.2)}" stroke-width=".7" stroke-linejoin="round"/>`;
  const view = bust ? '2 -14 96 80' : '0 0 100 100';

  return `<svg class="pp-purble ${cls}" viewBox="${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${id}h" cx=".36" cy=".24" r=".95"><stop offset="0" stop-color="${shade(body, 0.66)}"/><stop offset=".3" stop-color="${shade(body, 0.3)}"/><stop offset=".7" stop-color="${body}"/><stop offset="1" stop-color="${shade(body, -0.26)}"/></radialGradient>
      <radialGradient id="${id}g" cx=".5" cy="1.05" r=".62"><stop offset="0" stop-color="${shade(body, 0.75)}" stop-opacity=".7"/><stop offset="1" stop-color="${shade(body, 0.75)}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(suitColor, 0.45)}"/><stop offset=".55" stop-color="${suitColor}"/><stop offset="1" stop-color="${shade(suitColor, -0.24)}"/></linearGradient>
      <radialGradient id="${id}f" cx=".4" cy=".22" r=".95"><stop offset="0" stop-color="${shade(shoe, 0.5)}"/><stop offset=".5" stop-color="${shoe}"/><stop offset="1" stop-color="${shade(shoe, -0.3)}"/></radialGradient>
      <radialGradient id="${id}i" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="${shade(body, -0.05)}"/><stop offset="1" stop-color="${shade(body, -0.62)}"/></radialGradient>
      <radialGradient id="${id}b" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#bfe0ff"/><stop offset=".5" stop-color="#3f86e8"/><stop offset="1" stop-color="#1a3f9c"/></radialGradient>
    </defs>
    ${bust ? '' : `<ellipse cx="50" cy="99.6" rx="31" ry="2.6" fill="rgba(0,0,0,.2)"/>
    ${arm(-1)}${arm(1)}${ring(82, 15.5, 6.6)}${ring(75, 17.5, 7.2)}${ring(68, 15.5, 6.6)}${star}
    ${shoeShape(-1)}${shoeShape(1)}
    ${lanyard ? lanyardArt() : ''}`}
    ${bulb}
    <path d="${head}" fill="url(#${id}h)" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="${head}" fill="url(#${id}g)"/>
    <ellipse cx="29" cy="17" rx="15" ry="6.2" fill="#fff" opacity=".6" transform="rotate(-24 29 17)"/><ellipse cx="22" cy="28" rx="3.4" ry="2.2" fill="#fff" opacity=".5" transform="rotate(-24 22 28)"/>
    <path d="M87 40 C87 53 76 60 56 62" fill="none" stroke="${shade(body, 0.7)}" stroke-width="2.4" opacity=".4" stroke-linecap="round"/>
    ${f.extra}${f.brows}${f.eyes}${nose}${f.mouth}
    ${headwear(hat, body, ink)}
  </svg>`;
}
