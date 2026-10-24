// Pair Programming artwork: 20 computer-science tile faces on a 100x100 canvas, plus the A32 Lab building.
// Everything is drawn in code, so edit the colours and paths freely.

/** Draws `shapes` twice (a fat stroke underneath, a clean fill on top) so overlapping parts don't show seams. */
const outlined = (shapes, fill, line, w = 4) =>
  `<g fill="${line}" stroke="${line}" stroke-width="${w * 1.6}" stroke-linejoin="round" stroke-linecap="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;

const shine = (cx, cy, rx, ry, rot = -30) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${cx} ${cy})"/>`;

function keyGrid() {
  let out = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
    if (r === 2 && c > 1 && c < 6) continue;
    out += `<rect x="${15 + c * 9.2}" y="${37 + r * 10}" width="7" height="7" rx="1.6" fill="#fff" stroke="#8a9bb5" stroke-width="1.2"/>`;
  }
  return out + '<rect x="37" y="57" width="26" height="7" rx="1.6" fill="#fff" stroke="#8a9bb5" stroke-width="1.2"/>';
}

function cogTeeth() {
  let out = '';
  for (let i = 0; i < 8; i++) out += `<rect x="42" y="8" width="16" height="22" rx="3" transform="rotate(${i * 45} 50 50)"/>`;
  return out + '<circle cx="50" cy="50" r="28"/>';
}

function calcButtons() {
  let out = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const hot = c === 2;
    out += `<rect x="${31 + c * 15}" y="${44 + r * 11.5}" width="11" height="8" rx="2" fill="${hot ? '#ff9f43' : '#c9d3e3'}"/>`;
  }
  return out;
}

export const SYMBOLS = [
  { id: 'laptop', name: 'Laptop', svg: () =>
    outlined('<rect x="18" y="18" width="64" height="46" rx="5"/>', '#46556f', '#1d2740') +
    '<rect x="24" y="24" width="52" height="34" rx="2" fill="#5ec1ff"/><path d="M30 33 h18 M30 40 h28 M30 47 h12" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>' +
    outlined('<path d="M8 68 H92 L87 79 Q86 81 83 81 H17 Q14 81 13 79 Z"/>', '#cfd8e8', '#59708f') + '<rect x="41" y="69" width="18" height="3.4" rx="1.7" fill="#8a9bb5"/>' },
  { id: 'bug', name: 'Bug', svg: () =>
    '<path d="M28 46 L10 36 M26 58 L8 58 M30 70 L14 82 M72 46 L90 36 M74 58 L92 58 M70 70 L86 82 M42 22 Q38 10 28 8 M58 22 Q62 10 72 8" stroke="#2b1b3a" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    outlined('<ellipse cx="50" cy="58" rx="24" ry="28"/>', '#e8445f', '#6b1224') + outlined('<circle cx="50" cy="28" r="13"/>', '#2b3a55', '#0f1626') +
    '<path d="M50 34 V86" stroke="#6b1224" stroke-width="3"/><circle cx="38" cy="52" r="5" fill="#2b1b3a"/><circle cx="62" cy="52" r="5" fill="#2b1b3a"/><circle cx="40" cy="70" r="4.4" fill="#2b1b3a"/><circle cx="60" cy="70" r="4.4" fill="#2b1b3a"/>' +
    '<circle cx="44" cy="26" r="3" fill="#fff"/><circle cx="56" cy="26" r="3" fill="#fff"/>' + shine(38, 44, 6, 3.4) },
  { id: 'coffee', name: 'Coffee', svg: () =>
    '<path d="M36 30 Q29 22 37 14 M52 30 Q45 22 53 12" stroke="#a9bbd8" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 48 H78 Q91 48 91 59 Q91 71 76 71 H68" fill="none" stroke="#59708f" stroke-width="7" stroke-linecap="round"/>' +
    outlined('<ellipse cx="46" cy="86" rx="38" ry="8"/>', '#e9eef7', '#59708f', 3) +
    outlined('<path d="M18 38 H72 V64 Q72 84 45 84 Q18 84 18 64 Z"/>', '#ffffff', '#59708f') +
    '<ellipse cx="45" cy="38" rx="27" ry="6" fill="#7a4a2e" stroke="#59708f" stroke-width="3"/><path d="M26 52 V66" stroke="#dfe7f3" stroke-width="5" stroke-linecap="round"/>' },
  { id: 'duck', name: 'Rubber duck', svg: () =>
    outlined('<ellipse cx="46" cy="66" rx="34" ry="22"/><circle cx="62" cy="34" r="19"/><path d="M18 60 Q6 44 24 42 Q24 54 34 58 Z"/>', '#ffd23f', '#a86d00') +
    '<path d="M76 32 Q95 30 94 38 Q88 46 76 42 Z" fill="#ff8a1f" stroke="#a84300" stroke-width="2.6" stroke-linejoin="round"/><circle cx="64" cy="29" r="3.6" fill="#2b1b3a"/><circle cx="65" cy="28" r="1.2" fill="#fff"/>' +
    '<path d="M28 66 Q44 78 60 66" stroke="#d99a00" stroke-width="4" fill="none" stroke-linecap="round"/>' + shine(54, 24, 6, 3) },
  { id: 'keyboard', name: 'Keyboard', svg: () =>
    outlined('<rect x="6" y="28" width="88" height="46" rx="8"/>', '#dfe6f2', '#4f6384') + keyGrid() },
  { id: 'mouse', name: 'Mouse', svg: () =>
    outlined('<path d="M50 12 C75 12 83 33 83 58 C83 80 68 92 50 92 C32 92 17 80 17 58 C17 33 25 12 50 12 Z"/>', '#e9eff9', '#4f6384') +
    '<path d="M17 46 H83 M50 12 V46" stroke="#4f6384" stroke-width="3" fill="none"/><rect x="44" y="22" width="12" height="18" rx="6" fill="#ff6b6b" stroke="#4f6384" stroke-width="2.4"/>' + shine(34, 30, 6, 12, 20) },
  { id: 'usb', name: 'USB stick', svg: () =>
    outlined('<rect x="34" y="36" width="56" height="32" rx="7"/>', '#3d6fd6', '#17316b') +
    outlined('<rect x="6" y="43" width="32" height="18" rx="2"/>', '#cfd6e3', '#59708f', 3) +
    '<rect x="12" y="48" width="7" height="8" fill="#59708f"/><rect x="24" y="48" width="7" height="8" fill="#59708f"/><circle cx="78" cy="52" r="5" fill="#7dff8a" stroke="#17316b" stroke-width="2"/><circle cx="52" cy="52" r="4" fill="#17316b"/>' + shine(60, 42, 10, 3, 0) },
  { id: 'floppy', name: 'Floppy disk', svg: () =>
    outlined('<path d="M14 12 H76 L90 26 V88 H14 Z"/>', '#2d5fc9', '#102a63') +
    '<rect x="30" y="12" width="36" height="24" fill="#cfd6e3" stroke="#59708f" stroke-width="2.6"/><rect x="54" y="16" width="8" height="16" fill="#59708f"/>' +
    '<rect x="24" y="52" width="52" height="34" rx="2" fill="#fff" stroke="#9fb4d6" stroke-width="2"/><path d="M30 62 h40 M30 71 h30" stroke="#c0cde6" stroke-width="3.2"/>' },
  { id: 'headphones', name: 'Headphones', svg: () =>
    '<path d="M18 62 Q18 16 50 16 Q82 16 82 62" stroke="#17203a" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M18 62 Q18 16 50 16 Q82 16 82 62" stroke="#46556f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    outlined('<rect x="8" y="52" width="22" height="36" rx="10"/><rect x="70" y="52" width="22" height="36" rx="10"/>', '#ff5a6e', '#6b1224') + shine(19, 62, 3.4, 8, 0) },
  { id: 'wifi', name: 'Wi-Fi', svg: () => {
    const arcs = 'M10 42 Q50 2 90 42 M25 57 Q50 33 75 57 M38 70 Q50 60 62 70';
    return `<path d="${arcs}" stroke="#103b80" stroke-width="15" fill="none" stroke-linecap="round"/><path d="${arcs}" stroke="#2f8cff" stroke-width="9" fill="none" stroke-linecap="round"/>` +
      '<circle cx="50" cy="83" r="10" fill="#103b80"/><circle cx="50" cy="83" r="6.5" fill="#2f8cff"/>';
  } },
  { id: 'bulb', name: 'Idea', svg: () =>
    outlined('<path d="M50 8 C76 8 86 29 79 48 C75 58 67 62 67 74 H33 C33 62 25 58 21 48 C14 29 24 8 50 8 Z"/>', '#ffe66b', '#a87a00') +
    outlined('<rect x="35" y="74" width="30" height="8" rx="2"/><rect x="40" y="82" width="20" height="8" rx="3"/>', '#c3ccdc', '#59708f', 3) +
    '<path d="M42 62 V48 L50 40 L58 48 V62" stroke="#c98d0a" stroke-width="3.4" fill="none" stroke-linejoin="round"/>' + shine(36, 28, 6, 11, 18) },
  { id: 'cloud', name: 'Cloud', svg: () =>
    outlined('<circle cx="33" cy="58" r="17"/><circle cx="53" cy="44" r="22"/><circle cx="72" cy="60" r="15"/><rect x="25" y="58" width="58" height="19" rx="9"/>', '#e8f4ff', '#4f86c4') +
    '<path d="M50 76 V50 M39 60 L50 48 L61 60" stroke="#2f8cff" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'robot', name: 'Robot', svg: () =>
    '<path d="M50 30 V15" stroke="#4f6384" stroke-width="4.4"/><circle cx="50" cy="12" r="7" fill="#ff5d6c" stroke="#7a1530" stroke-width="2.6"/>' +
    outlined('<rect x="14" y="46" width="9" height="18" rx="3"/><rect x="77" y="46" width="9" height="18" rx="3"/>', '#9fb0cc', '#4f6384', 3) +
    outlined('<rect x="20" y="30" width="60" height="52" rx="13"/>', '#d4dcea', '#4f6384') +
    '<circle cx="38" cy="53" r="8" fill="#5ec1ff" stroke="#17316b" stroke-width="2.4"/><circle cx="62" cy="53" r="8" fill="#5ec1ff" stroke="#17316b" stroke-width="2.4"/><path d="M36 70 H64" stroke="#4f6384" stroke-width="4.5" stroke-linecap="round"/>' + shine(36, 40, 8, 3) },
  { id: 'pizza', name: 'Pizza', svg: () =>
    outlined('<path d="M50 92 L12 22 Q50 4 88 22 Z"/>', '#ffc94a', '#a86a00') +
    '<path d="M12 22 Q50 4 88 22" stroke="#c97a2f" stroke-width="10" fill="none" stroke-linecap="round"/>' +
    '<circle cx="38" cy="38" r="7.5" fill="#e0453f" stroke="#7a1530" stroke-width="2"/><circle cx="62" cy="40" r="7.5" fill="#e0453f" stroke="#7a1530" stroke-width="2"/><circle cx="50" cy="62" r="6.5" fill="#e0453f" stroke="#7a1530" stroke-width="2"/>' },
  { id: 'can', name: 'Energy drink', svg: () =>
    outlined('<rect x="26" y="14" width="48" height="76" rx="9"/>', '#2fd16a', '#0d5a2a') +
    '<rect x="26" y="14" width="48" height="13" rx="6" fill="#cfd6e3" stroke="#59708f" stroke-width="2.6"/><path d="M55 34 L38 60 H50 L44 82 L63 54 H51 Z" fill="#fff266" stroke="#7a6a00" stroke-width="2.2" stroke-linejoin="round"/>' + shine(36, 46, 3.4, 14, 0) },
  { id: 'calculator', name: 'Calculator', svg: () =>
    outlined('<rect x="20" y="8" width="60" height="84" rx="9"/>', '#46556f', '#161e30') +
    '<rect x="28" y="16" width="44" height="19" rx="3" fill="#a6f0c0" stroke="#161e30" stroke-width="1.6"/><path d="M64 26 h-16 M64 26 v0" stroke="#17603a" stroke-width="3.4" stroke-linecap="round"/>' + calcButtons() },
  { id: 'gradcap', name: 'Graduation cap', svg: () =>
    outlined('<path d="M28 46 V68 Q50 84 72 68 V46 L50 58 Z"/>', '#2b3957', '#141b2a') +
    '<path d="M50 18 L94 36 L50 54 L6 36 Z" fill="#33425f" stroke="#141b2a" stroke-width="4" stroke-linejoin="round"/><path d="M50 22 L84 35 L50 47 L16 35 Z" fill="#4a5d85" opacity=".6"/>' +
    '<path d="M86 38 V66" stroke="#ffc933" stroke-width="3.4" stroke-linecap="round"/><rect x="82" y="64" width="8" height="12" rx="2" fill="#ffc933" stroke="#a87a00" stroke-width="1.8"/>' },
  { id: 'branch', name: 'Git branch', svg: () =>
    '<path d="M30 22 V78 M30 56 Q30 40 52 38 Q70 36 70 28" stroke="#4f6384" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    outlined('<circle cx="30" cy="20" r="10"/><circle cx="30" cy="80" r="10"/>', '#2fd16a', '#0d5a2a', 3.4) + outlined('<circle cx="70" cy="26" r="10"/>', '#ff9a2b', '#8a4300', 3.4) },
  { id: 'terminal', name: 'Terminal', svg: () =>
    outlined('<rect x="8" y="14" width="84" height="72" rx="9"/>', '#1d2433', '#0b0f18') +
    '<path d="M8 23 a9 9 0 0 1 9 -9 H83 a9 9 0 0 1 9 9 V30 H8 Z" fill="#3b4a68"/><circle cx="18" cy="22" r="3" fill="#ff5d6c"/><circle cx="28" cy="22" r="3" fill="#ffc933"/><circle cx="38" cy="22" r="3" fill="#2fd16a"/>' +
    '<path d="M22 46 L40 57 L22 68" stroke="#5dff8a" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 70 H70" stroke="#5dff8a" stroke-width="6.5" stroke-linecap="round"/>' },
  { id: 'gear', name: 'Settings', svg: () =>
    outlined(cogTeeth(), '#cfd8e8', '#4f6384') + '<circle cx="50" cy="50" r="12" fill="#4f6384"/><circle cx="50" cy="50" r="6" fill="#e9eff9"/>' + shine(38, 32, 9, 3.4) },
];

export function symbolSVG(index) {
  const sym = SYMBOLS[index % SYMBOLS.length];
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${sym.svg()}</svg>`;
}

export const symbolName = (index) => SYMBOLS[index % SYMBOLS.length].name;

/** Emblem shown on the back of every tile (the glass look is CSS). */
export function tileBackSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="27" fill="#fff" opacity=".16"/>
    <text x="50" y="64" text-anchor="middle" font-family="'Trebuchet MS','Segoe UI',sans-serif" font-weight="800" font-size="46" fill="#fff" opacity=".8">?</text>
  </svg>`;
}

export function iconSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="40" height="40" rx="8" fill="#6f58d8" stroke="#2a1a78" stroke-width="4"/>
    <rect x="54" y="14" width="40" height="40" rx="8" fill="#f4f8ff" stroke="#2a1a78" stroke-width="4"/>
    <g transform="translate(57 17) scale(.34)">${SYMBOLS[0].svg()}</g>
    <rect x="6" y="58" width="40" height="40" rx="8" fill="#f4f8ff" stroke="#2a1a78" stroke-width="4"/>
    <g transform="translate(9 61) scale(.34)">${SYMBOLS[0].svg()}</g>
    <rect x="54" y="58" width="40" height="40" rx="8" fill="#6f58d8" stroke="#2a1a78" stroke-width="4"/></svg>`;
}
