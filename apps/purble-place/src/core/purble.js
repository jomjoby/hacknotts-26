// Procedural Purble characters: round blobs drawn entirely in SVG.
// Body colour, mood, headwear and lanyard are parameters, so one function
// gives the hub a mascot and every game a cast of customers.

import { shade } from './color.js';

export const BODY_COLORS = ['#a45fd8', '#4fb8c9', '#f08a4b', '#ec6fa4', '#6cc36b', '#e9c23a', '#6f8ef0'];
/** Headwear handed out at random (students). */
export const HATS = ['none', 'beanie', 'headphones', 'glasses', 'gradcap', 'cap'];
/** Everything purble() knows how to draw. */
export const ALL_HATS = [...HATS, 'chef', 'party', 'tophat', 'bow', 'crown'];
export const MOODS = ['happy', 'excited', 'neutral', 'worried', 'angry', 'sad'];

const INK = '#2b1b3a';

function hat(kind, body) {
  switch (kind) {
    case 'chef':
      return `<g><rect x="33" y="14" width="34" height="14" rx="3" fill="#fff"/>
        <circle cx="35" cy="12" r="10" fill="#fff"/><circle cx="50" cy="8" r="12" fill="#fff"/><circle cx="65" cy="12" r="10" fill="#fff"/>
        <rect x="33" y="24" width="34" height="4" fill="#e6e0f0"/></g>`;
    case 'party':
      return `<g transform="rotate(-12 50 20)"><path d="M50 -6 L66 28 L34 28 Z" fill="#ffd54a"/>
        <path d="M44 14 L56 14 L60 22 L40 22 Z" fill="#ff6f91"/><circle cx="50" cy="-6" r="4.5" fill="#ff6f91"/></g>`;
    case 'tophat':
      return `<g><rect x="30" y="22" width="40" height="5" rx="2" fill="#2b2233"/><rect x="36" y="2" width="28" height="22" rx="2" fill="#3a2f46"/>
        <rect x="36" y="16" width="28" height="5" fill="#ff6f91"/></g>`;
    case 'bow':
      return `<g transform="translate(66 24) rotate(18)"><path d="M0 0 L-14 -9 L-14 9 Z" fill="#ff6f91"/><path d="M0 0 L14 -9 L14 9 Z" fill="#ff6f91"/>
        <circle r="4.5" fill="#d84a73"/></g>`;
    case 'crown':
      return `<g><path d="M32 28 L34 10 L42 20 L50 6 L58 20 L66 10 L68 28 Z" fill="#ffc933" stroke="#c9961a" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="16" r="3" fill="#e0405a"/></g>`;
    case 'beanie':
      return `<g><path d="M30 28 Q32 6 50 6 Q68 6 70 28 Z" fill="${shade(body, -0.25)}"/><rect x="28" y="24" width="44" height="7" rx="3" fill="#fff" opacity=".85"/>
        <circle cx="50" cy="5" r="5" fill="#fff"/></g>`;
    case 'headphones':
      return `<g><path d="M15 52 Q13 8 50 8 Q87 8 85 52" fill="none" stroke="#2c3e5e" stroke-width="5.5" stroke-linecap="round"/>
        <path d="M17 50 Q17 14 50 13" fill="none" stroke="#6d8fc4" stroke-width="1.6" opacity=".7"/>
        <rect x="6" y="40" width="14" height="26" rx="7" fill="#2c3e5e"/><rect x="9" y="43" width="5" height="12" rx="2.5" fill="#6d8fc4" opacity=".75"/>
        <rect x="80" y="40" width="14" height="26" rx="7" fill="#2c3e5e"/><rect x="83" y="43" width="5" height="12" rx="2.5" fill="#6d8fc4" opacity=".75"/></g>`;
    case 'glasses':
      return `<g fill="rgba(190,225,255,.28)" stroke="#2c2438" stroke-width="3">
        <circle cx="37" cy="50" r="13"/><circle cx="63" cy="50" r="13"/><path d="M50 49 q0 -3 0 0" fill="none"/>
        <path d="M48 48 Q50 45 52 48" fill="none"/><path d="M24 47 L16 43 M76 47 L84 43" fill="none" stroke-linecap="round"/></g>
        <path d="M29 42 q4 -5 10 -4" stroke="#fff" stroke-width="2.2" fill="none" opacity=".8" stroke-linecap="round"/>`;
    case 'gradcap':
      return `<g><path d="M30 22 Q50 34 70 22 L70 30 Q50 40 30 30 Z" fill="#1c2434"/>
        <path d="M50 2 L90 15 L50 28 L10 15 Z" fill="#26324a" stroke="#141b2a" stroke-width="2" stroke-linejoin="round"/>
        <path d="M50 4 L82 14 L50 21 L18 14 Z" fill="#3a4a6a" opacity=".55"/>
        <path d="M82 15 L84 33" stroke="#ffc933" stroke-width="2.4" stroke-linecap="round"/><circle cx="84" cy="35" r="3.4" fill="#ffc933"/></g>`;
    case 'cap':
      return `<g><path d="M26 31 Q27 7 50 7 Q73 7 74 31 Z" fill="#1f3a6e" stroke="#142848" stroke-width="2"/>
        <path d="M60 29 Q84 28 92 36 Q72 40 56 34 Z" fill="#2c4f94" stroke="#142848" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="8" r="3.2" fill="#fff"/><path d="M34 24 Q50 15 66 24" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/></g>`;
    default:
      return '';
  }
}

/** Blue university lanyard with an ID card hanging on the chest. */
function lanyardArt() {
  return `<g><path d="M32 66 L50 90 M68 66 L50 90" stroke="#2f6fd0" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 66 L50 90 M68 66 L50 90" stroke="#8fc0ff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
    <rect x="41" y="88" width="18" height="13" rx="2.5" fill="#fff" stroke="#2f6fd0" stroke-width="1.8"/>
    <circle cx="46" cy="93.5" r="2.4" fill="#9fb4d6"/><path d="M50.5 92 H56 M50.5 95.5 H55" stroke="#9fb4d6" stroke-width="1.4"/></g>`;
}

function face(mood, look) {
  const lx = look * 2;
  const eye = (cx) => `<g class="pp-eye"><ellipse cx="${cx}" cy="50" rx="9" ry="10.5" fill="#fff"/>
    <circle cx="${cx + lx}" cy="52" r="5" fill="${INK}"/><circle cx="${cx + lx - 1.8}" cy="49.5" r="1.7" fill="#fff"/></g>`;
  const line = (d, w = 3.4) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  let brows = '';
  let mouth = '';
  let extra = '';
  switch (mood) {
    case 'excited':
      mouth = `<path d="M36 66 Q50 90 64 66 Z" fill="#7a1f3d" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M42 77 Q50 72 58 77 Q50 84 42 77 Z" fill="#ff7a96"/>`;
      extra = `<ellipse cx="27" cy="66" rx="5" ry="3" fill="#ff7a96" opacity=".5"/><ellipse cx="73" cy="66" rx="5" ry="3" fill="#ff7a96" opacity=".5"/>`;
      break;
    case 'neutral':
      mouth = line('M41 70 H59');
      break;
    case 'worried':
      brows = line('M28 36 L44 40') + line('M72 36 L56 40');
      mouth = line('M38 72 Q44 66 50 72 T62 72');
      break;
    case 'angry':
      brows = line('M27 38 L45 44', 4) + line('M73 38 L55 44', 4);
      mouth = line('M38 74 Q50 62 62 74');
      extra = `<path d="M82 36 l5 -5 m-2 9 l7 -2" stroke="#e0405a" stroke-width="2.4" stroke-linecap="round"/>`;
      break;
    case 'sad':
      brows = line('M28 41 L44 36') + line('M72 41 L56 36');
      mouth = line('M39 74 Q50 64 61 74');
      extra = `<path d="M31 62 q-3 6 0 9 q3 -3 0 -9 Z" fill="#7ec8ff"/>`;
      break;
    default: // happy
      mouth = line('M36 66 Q50 80 64 66');
      extra = `<ellipse cx="27" cy="67" rx="5" ry="3" fill="#ff7a96" opacity=".45"/><ellipse cx="73" cy="67" rx="5" ry="3" fill="#ff7a96" opacity=".45"/>`;
  }
  return `${eye(37)}${eye(63)}${brows}${mouth}${extra}`;
}

/**
 * @param {object} o
 * @param {string} [o.body]  body colour
 * @param {string} [o.mood]  happy | excited | neutral | worried | angry | sad
 * @param {string} [o.hat]   none | beanie | headphones | glasses | gradcap | cap | chef | party | tophat | bow | crown
 * @param {boolean} [o.lanyard] show a university lanyard
 * @param {number} [o.look]  -1 (left) .. 1 (right) eye direction
 * @param {string} [o.cls]   extra class on the <svg>
 */
export function purble({ body = BODY_COLORS[0], mood = 'happy', hat: hatKind = 'none', look = 0, cls = '', lanyard = false } = {}) {
  const dark = shade(body, -0.35);
  const light = shade(body, 0.4);
  return `<svg class="pp-purble ${cls}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="95" rx="28" ry="4" fill="rgba(0,0,0,.2)"/>
    <ellipse cx="32" cy="90" rx="10" ry="5.5" fill="${dark}"/><ellipse cx="68" cy="90" rx="10" ry="5.5" fill="${dark}"/>
    <circle cx="22" cy="30" r="10" fill="${body}"/><circle cx="22" cy="30" r="5" fill="${light}" opacity=".6"/>
    <circle cx="78" cy="30" r="10" fill="${body}"/><circle cx="78" cy="30" r="5" fill="${light}" opacity=".6"/>
    <ellipse cx="50" cy="58" rx="39" ry="34" fill="${body}"/>
    <ellipse cx="50" cy="72" rx="26" ry="16" fill="${light}" opacity=".3"/>
    <ellipse cx="34" cy="38" rx="13" ry="6.5" fill="#fff" opacity=".3" transform="rotate(-24 34 38)"/>
    ${lanyard ? lanyardArt() : ''}
    ${face(mood, look)}
    ${hat(hatKind, body)}
  </svg>`;
}
