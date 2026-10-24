// The town square: the Computer Science building on Jubilee Campus, drawn as a cutaway.
//
// Drawn from photographs of the real place: dark weathered timber cladding, round timber
// towers, glazed roofs between them, louvred windows and the green "Computer Science" sign. The
// CS Atrium (honey timber, glass wall, teal pods, long tables, plants, silver lamp posts) and the
// A32 Lab are rooms INSIDE the building, so each game is a part of this one picture rather than a
// separate building. The building stands at the lake edge and reflects in the water. The round
// timber library sits on its own island at the front left, a red patchwork-clad block rises
// behind the right wing, and Canada geese walk along the bank in the foreground.
//
// The scene is pure SVG (800x600). `spots` tells the hub where each game's clickable area is.

const GROUND = 420;     // where the building meets the promenade
const WATER = 434;      // top of the lake
const BANK = 560;       // top of the foreground bank
const BX = 246;         // the building is drawn 100..700 and then scaled/moved to start here
const S = 0.86;
const f = (n) => Math.round(n * 10) / 10;

function boardWall(x, y, w, h, step = 6) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#7b4b2b"/>`;
  for (let yy = y + step; yy < y + h; yy += step) out += `<path d="M${x} ${yy} H${x + w}" stroke="#55300f" stroke-width="1.3" opacity=".8"/>`;
  return out + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#cs-wall-shade)"/>
    <rect x="${x}" y="${y}" width="${f(w * 0.07)}" height="${h}" fill="#fff" opacity=".16"/><rect x="${f(x + w * 0.93)}" y="${y}" width="${f(w * 0.07)}" height="${h}" fill="#000" opacity=".18"/>`;
}

function glassPane(x, y, w, h, tint = '#6cc4f5') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tint}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${f(h * 0.5)}" fill="#fff" opacity=".28"/>
    <path d="M${f(x + w * 0.1)} ${y + h} L${f(x + w * 0.5)} ${y} H${f(x + w * 0.72)} L${f(x + w * 0.32)} ${y + h} Z" fill="#fff" opacity=".3"/>`;
}

/** A group of slim, tall, timber-framed windows (the narrow bays in the photo). */
function slimWindows(x, y, w, h, panes = 4) {
  const pw = (w - 4) / panes;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5a3318"/>`;
  for (let i = 0; i < panes; i++) out += glassPane(f(x + 2 + i * pw + 1), y + 2, f(pw - 2), h - 4);
  return out;
}

/** A ribbon window with timber louvres across its top, like the long bays in the photo. */
function louvreWindow(x, y, w, h) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5a3318"/>` + glassPane(x + 2, y + 2, w - 4, h - 4, '#5fb4ea');
  const n = 4;
  for (let i = 0; i < n; i++) out += `<rect x="${x + 2}" y="${f(y + 2 + (i * (h * 0.46)) / n)}" width="${w - 4}" height="${f((h * 0.46) / n - 1)}" fill="#b0763f" stroke="#55300f" stroke-width=".7"/>`;
  return out;
}

/** A round timber tower: vertical boards, a ring of glazing and a flat steel cap. */
function tower(cx) {
  const x = cx - 17;
  let ribs = '';
  for (let i = 1; i < 9; i++) ribs += `<path d="M${x + i * 3.8} 215 V${GROUND}" stroke="#2c2016" stroke-width=".9" opacity=".7"/>`;
  return `<g>
    <rect x="${x}" y="205" width="34" height="${GROUND - 205}" fill="url(#cs-cyl)"/>${ribs}
    <rect x="${x}" y="205" width="34" height="10" fill="#9cc4de"/><path d="M${x + 8.5} 205 V215 M${x + 17} 205 V215 M${x + 25.5} 205 V215" stroke="#3b2c20" stroke-width="1.2"/>
    <rect x="${x}" y="205" width="34" height="3" fill="#fff" opacity=".4"/>
    <rect x="${x - 3}" y="199" width="40" height="7" rx="2" fill="#5a6472" stroke="#2f3744" stroke-width="1.4"/>
    <rect x="${x - 3}" y="199" width="40" height="2.6" rx="1" fill="#fff" opacity=".35"/>
  </g>`;
}

/** A timber-clad wing. `ground` is the markup for its ground floor. */
function wing(x0, mirror, ground) {
  const w = 176;
  const left = [x0 + 10, x0 + 126]; // slim window groups
  const mid = x0 + 60;
  let out = boardWall(x0, 240, w, GROUND - 240) +
    `<rect x="${x0 - 2}" y="236" width="${w + 4}" height="7" fill="#4b5563" stroke="#2f3744" stroke-width="1.2"/>
     <rect x="${x0 + 18}" y="226" width="${w - 36}" height="11" fill="#a6e0ff" stroke="#4d8ab0" stroke-width="1.4"/>
     <path d="M${x0 + 38} 226 V237 M${x0 + 58} 226 V237 M${x0 + 78} 226 V237 M${x0 + 98} 226 V237 M${x0 + 118} 226 V237 M${x0 + 138} 226 V237" stroke="#6f8aa0" stroke-width="1.2"/>`;
  for (const y of [252, 308]) {
    out += slimWindows(mirror ? left[1] : left[0], y, 42, 40, 4) + slimWindows(mirror ? left[0] : left[1], y, 42, 40, 4) + louvreWindow(mid - 4, y, 62, 40);
  }
  out += `<path d="M${x0} 296 H${x0 + w} M${x0} 352 H${x0 + w}" stroke="#2b3340" stroke-width="2.2"/>` + ground;
  return out;
}

/** Entrance: green sign, glass doors, keypad. */
function entrance(x0) {
  const key = (x, y, c) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${c}" stroke="#101722" stroke-width="1.4"/><ellipse cx="${x - 1.3}" cy="${y - 2}" rx="2" ry="1.2" fill="#fff" opacity=".75"/>`;
  return `
    <path d="M${x0 + 50} 372 H${x0 + 112} L${x0 + 108} 366 H${x0 + 54} Z" fill="#4b5563"/>
    <rect x="${x0 + 54}" y="374" width="54" height="${GROUND - 374}" rx="2" fill="#3a4658" stroke="#232c3a" stroke-width="2"/>
    <rect x="${x0 + 58}" y="378" width="22" height="${GROUND - 382}" fill="#a9d4ee"/><rect x="${x0 + 82}" y="378" width="22" height="${GROUND - 382}" fill="#a9d4ee"/>
    <rect x="${x0 + 58}" y="378" width="22" height="16" fill="#fff" opacity=".35"/><rect x="${x0 + 82}" y="378" width="22" height="16" fill="#fff" opacity=".35"/>
    <path d="M${x0 + 70} 400 V404 M${x0 + 92} 400 V404" stroke="#e5ebf2" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="${x0 + 116}" y="382" width="22" height="30" rx="4" fill="#243044" stroke="#101722" stroke-width="2"/>
    <rect x="${x0 + 120}" y="386" width="14" height="6" rx="1.5" fill="#a6f0c0" stroke="#101722" stroke-width="1"/>
    ${key(x0 + 123.5, 399, '#e0453f')}${key(x0 + 131.5, 399, '#ffd23f')}${key(x0 + 123.5, 407, '#2fd16a')}${key(x0 + 131.5, 407, '#3d8cff')}
    ${slimWindows(x0 + 146, 380, 22, 38, 2)}
    <path d="M${x0 + 22} ${GROUND} V384" stroke="#6b7480" stroke-width="3"/>
    <rect x="${x0 + 4}" y="374" width="44" height="34" rx="2" fill="#12a05a" stroke="#0a5a34" stroke-width="2"/>
    <rect x="${x0 + 4}" y="374" width="44" height="14" rx="2" fill="#fff" opacity=".18"/>
    <rect x="${x0 + 8}" y="378" width="8" height="8" fill="#fff" opacity=".9"/>
    <text x="${x0 + 9}" y="397" font-family="Segoe UI,Arial,sans-serif" font-size="8.4" font-weight="600" fill="#fff">Computer</text>
    <text x="${x0 + 9}" y="405" font-family="Segoe UI,Arial,sans-serif" font-size="8.4" font-weight="600" fill="#fff">Science</text>`;
}

/** A32 lab: a glass-fronted room full of monitors, and its door. */
function lab(x0) {
  let desks = '';
  for (let i = 0; i < 4; i++) {
    const x = x0 + 14 + i * 24;
    desks += `<rect x="${x}" y="384" width="17" height="12" rx="1.5" fill="#25324a" stroke="#101722" stroke-width="1"/><rect x="${x + 1.5}" y="385.5" width="14" height="8" fill="${i % 2 ? '#2f7fe0' : '#4aa0f2'}"/><path d="M${x + 3} 388 h6 M${x + 3} 391 h9" stroke="#fff" stroke-width="1.2" opacity=".9"/><rect x="${x + 5}" y="396" width="7" height="3" fill="#7488a8"/>`;
  }
  return `
    <rect x="${x0 + 4}" y="368" width="112" height="46" fill="#3b2c20"/>
    ${glassPane(x0 + 7, 371, 106, 40, '#b8dcf2')}
    <path d="M${x0 + 8} 408 H${x0 + 112}" stroke="#6b7480" stroke-width="2"/>
    ${desks}
    <rect x="${x0 + 7}" y="371" width="106" height="40" fill="#fff" opacity=".12"/>
    <rect x="${x0 + 126}" y="372" width="38" height="${GROUND - 372}" rx="2" fill="#3a4658" stroke="#232c3a" stroke-width="2"/>
    <rect x="${x0 + 130}" y="376" width="30" height="${GROUND - 380}" fill="#a9d4ee"/><rect x="${x0 + 130}" y="376" width="30" height="16" fill="#fff" opacity=".35"/>
    <rect x="${x0 + 130}" y="353" width="30" height="15" rx="2" fill="#fff" stroke="#6b7480" stroke-width="1.6"/>
    <text x="${x0 + 145}" y="365" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" fill="#16233a">A32</text>`;
}

/** The glass-roofed atrium, cut away to show the hall inside. */
function atrium() {
  let boards = '';
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    boards += `<path d="M326 ${f(216 + 204 * t)} L362 ${f(240 + 108 * t)}" stroke="#a87a3f" stroke-width="1" opacity=".8"/><path d="M474 ${f(216 + 204 * t)} L438 ${f(240 + 108 * t)}" stroke="#a87a3f" stroke-width="1" opacity=".8"/>`;
  }
  let mull = '';
  for (let i = 0; i <= 6; i++) mull += `<path d="M400 184 L${f(318 + i * 27.3)} 216" stroke="#fff" stroke-width="1.6" opacity=".95"/>`;
  const pod = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 34 V10 Q0 0 10 0 H22 Q30 0 30 10 V34 Z" fill="#1fb4c5" stroke="#0b6f7d" stroke-width="2"/><path d="M5 34 V14 Q5 7 12 7 H20 Q26 7 26 14 V34 Z" fill="#14313f"/><rect x="7" y="24" width="18" height="10" rx="3" fill="#2f4d86"/></g>`;
  const chair = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="3.6" fill="#22bfd0" stroke="#0b6f7d" stroke-width="1.2"/><path d="M${x - 6} ${y} V${y + 8} M${x + 6} ${y} V${y + 8}" stroke="#6b7480" stroke-width="1.6"/>`;
  const plant = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#3f9c4a" stroke="#256b2f" stroke-width="1"><path d="M0 0 Q-9 -14 -14 -6 Q-6 -6 0 0 Z"/><path d="M0 0 Q-2 -18 4 -20 Q4 -8 0 0 Z"/><path d="M0 0 Q9 -14 14 -6 Q6 -6 0 0 Z"/><path d="M0 0 Q-12 -4 -16 4 Q-6 2 0 0 Z" fill="#4fb35a"/><path d="M0 0 Q12 -4 16 4 Q6 2 0 0 Z" fill="#4fb35a"/></g>`;
  return `
    <rect x="318" y="214" width="164" height="${GROUND - 214}" fill="#e7eef3"/>
    <path d="M314 218 L400 184 L486 218 Z" fill="#cfe7f8" stroke="#6f7e90" stroke-width="2.4" stroke-linejoin="round"/>${mull}
    <path d="M330 206 H470 M322 212 H478" stroke="#fff" stroke-width="1.4" opacity=".9"/>
    <path d="M318 216 L400 188 L430 198 L350 224 Z" fill="#fff" opacity=".35"/>
    <path d="M326 216 H474 L438 240 H362 Z" fill="#dff0fb"/>
    <path d="M326 216 L362 240 V348 L326 ${GROUND} Z" fill="#f2b862"/><path d="M474 216 L438 240 V348 L474 ${GROUND} Z" fill="#e2a44e"/>${boards}
    <path d="M326 ${GROUND} H474 L438 348 H362 Z" fill="#f1f4f7"/><path d="M350 ${GROUND} L376 348 M400 ${GROUND} V348 M450 ${GROUND} L424 348" stroke="#d3dae3" stroke-width="1"/>
    <rect x="362" y="240" width="76" height="108" fill="#bfe2f5" stroke="#6f7e90" stroke-width="2"/>
    <path d="M381 240 V348 M400 240 V348 M419 240 V348 M362 276 H438 M362 312 H438" stroke="#7d8da0" stroke-width="1.5"/>
    <path d="M372 288 h56 M376 296 h48 M384 304 h32" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".92"/>
    ${plant(369, 346, 0.6)}${plant(431, 346, 0.6)}
    ${pod(327, 366, 1.2)}${pod(348, 350, 0.62)}${pod(443, 350, 0.62)}${pod(446, 366, 1.2)}
    <path d="M352 266 V404 M448 266 V404" stroke="#aab4c0" stroke-width="3.2"/><ellipse cx="352" cy="266" rx="14" ry="4" fill="#e1e8ef" stroke="#8d99a6" stroke-width="1.4"/><ellipse cx="448" cy="266" rx="14" ry="4" fill="#e1e8ef" stroke="#8d99a6" stroke-width="1.4"/>
    <path d="M364 392 H436 L444 402 H356 Z" fill="#fafcff" stroke="#9aa6b6" stroke-width="1.4"/><path d="M360 402 V414 M440 402 V414" stroke="#6b7480" stroke-width="2.4"/>
    ${chair(372, 410)}${chair(396, 410)}${chair(420, 410)}${chair(444, 410)}
    ${plant(338, 414, 0.95)}${plant(462, 414, 0.95)}
    <rect x="326" y="216" width="148" height="${GROUND - 216}" fill="#fff" opacity=".07"/>
    <path d="M326 ${GROUND} L338 216 H372 L346 ${GROUND} Z" fill="#fff" opacity=".13"/>
    <path d="M318 214 V${GROUND} M482 214 V${GROUND}" stroke="#6f7e90" stroke-width="5"/><path d="M326 216 V${GROUND} M474 216 V${GROUND}" stroke="#8d99a6" stroke-width="2.4"/>`;
}

/** The building itself, drawn at 100..700 and then moved/scaled to leave room for the library. */
function building() {
  return `<g transform="translate(${BX} ${GROUND}) scale(${S}) translate(-100 ${-GROUND})">
    ${wing(100, false, entrance(100))}
    ${wing(524, true, lab(524))}
    ${atrium()}
    ${tower(297)}${tower(503)}
    <path d="M100 236 V${GROUND} M700 236 V${GROUND}" stroke="#4b5563" stroke-width="4"/>
    <rect x="96" y="${GROUND}" width="608" height="6" fill="#3b4250"/>
    <path d="M100 240 H276 V${GROUND} H100 Z M524 240 H700 V${GROUND} H524 Z" fill="url(#cs-glare)"/>
  </g>`;
}

/** A red patchwork-clad block rising behind the right wing. */
function redBlock() {
  const reds = ['#c8323c', '#e0525a', '#a82a33', '#e8747b', '#b53a3f', '#d9444c'];
  let out = `<path d="M-6 330 L84 300 V ${GROUND} H-6 Z" fill="#a82a33"/>`;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const x = -4 + c * 13;
    out += `<path d="M${x} ${f(332 - c * 0.3 * 4.3 + r * 13)} l12 -3.6 v11 l-12 3.6 Z" fill="${reds[(r * 5 + c * 3) % reds.length]}" stroke="#7d1d25" stroke-width=".5"/>`;
  }
  out += '<path d="M-4 358 L84 332 M-4 384 L84 358" stroke="#2f8f6f" stroke-width="4"/>';
  return `<g transform="translate(822 -288) scale(-1.7 1.7)">${out}</g>`;
}

/**
 * The library: a timber drum that is wider at the top than the base, with a flat roof and railing, a
 * rooftop box and mast, four floors of timber bands alternating with lit glass, and diagonal steel columns.
 */
function library() {
  const CX = 128; const TOP = 376; const BASE = 512; const TW = 122; const BW = 76;
  const xl = (y) => f(CX - TW + ((TW - BW) * (y - TOP)) / (BASE - TOP));
  const xr = (y) => f(CX + TW - ((TW - BW) * (y - TOP)) / (BASE - TOP));
  const band = (y0, y1, fill) => `<path d="M${xl(y0)} ${y0} H${xr(y0)} L${xr(y1)} ${y1} H${xl(y1)} Z" fill="${fill}"/>`;
  let out = `<ellipse cx="${CX}" cy="${BASE + 4}" rx="${BW + 26}" ry="8" fill="rgba(0,20,40,.35)"/>`;
  out += band(TOP, TOP + 11, '#e8ad5f');                       // roof fascia
  let y = TOP + 11;
  for (let fl = 0; fl < 4; fl++) {
    const g0 = y; const g1 = y + 17; const t1 = y + 30;
    out += band(g0, g1, '#2f4f7a');                            // glass
    for (let k = 0; k < 9; k++) {                              // lit rooms behind the glass
      const t = (k + 0.5) / 9;
      const lx = xl(g0 + 8) + (xr(g0 + 8) - xl(g0 + 8)) * t;
      out += `<rect x="${f(lx - 5)}" y="${g0 + 3}" width="10" height="9" fill="${k % 4 === 1 ? '#f0d79c' : '#9fb7cc'}" opacity="${k % 4 === 1 ? 0.8 : 0.5}"/>`;
    }
    out += `<path d="M${xl(g0)} ${g0} H${xr(g0)} L${xr(g1)} ${g1} H${xl(g1)} Z" fill="url(#cs-lib-glare)"/>`;
    out += band(g1, t1, fl === 3 ? '#8a4524' : '#aa5c30');     // timber
    out += `<path d="M${xl(g1)} ${g1} H${xr(g1)}" stroke="#ffd9a0" stroke-width="1" opacity=".5"/><path d="M${xl(t1)} ${t1} H${xr(t1)}" stroke="#5c2c14" stroke-width="1.4" opacity=".7"/>`;
    y = t1;
  }
  out += band(y, BASE, '#6f3519');                             // base band
  for (let i = 0; i <= 6; i++) {                               // diagonal steel columns
    const x0 = f(CX - TW + (i * 2 * TW) / 6); const x1 = f(CX - BW + (i * 2 * BW) / 6);
    out += `<path d="M${x0} ${TOP} L${x1} ${BASE}" stroke="#262f3d" stroke-width="${i === 0 || i === 6 ? 5 : 3.6}" stroke-linecap="round"/><path d="M${f(x0 + 1.6)} ${TOP + 2} L${f(x1 + 1.4)} ${BASE - 2}" stroke="#8fa0b6" stroke-width="1.1" opacity=".8"/>`;
  }
  out += `<path d="M${xl(TOP)} ${TOP} H${xr(TOP)}" stroke="#7b5632" stroke-width="2"/>`;
  // roof: railing, rooftop box and mast
  let rail = '';
  for (let x = xl(TOP) + 6; x < xr(TOP) - 4; x += 11) rail += `<path d="M${x} ${TOP} V${TOP - 8}" stroke="#c9d1db" stroke-width="1.4"/>`;
  out += `${rail}<path d="M${xl(TOP) + 4} ${TOP - 8} H${xr(TOP) - 4}" stroke="#e2e8ef" stroke-width="2"/>
    <rect x="${CX - 24}" y="${TOP - 19}" width="48" height="12" rx="2" fill="#cfd6df" stroke="#7d8da0" stroke-width="1.4"/><rect x="${CX - 20}" y="${TOP - 16}" width="40" height="5" fill="#4a5f78"/>
    <path d="M${CX + 6} ${TOP - 19} V${TOP - 38}" stroke="#8d99a6" stroke-width="1.8"/><path d="M${CX + 1} ${TOP - 34} H${CX + 11}" stroke="#8d99a6" stroke-width="1.6"/>`;
  out += `<path d="M${xl(TOP)} ${TOP} L${xl(TOP) + 70} ${TOP} L${xl(BASE - 20)} ${BASE - 20} L${xl(BASE)} ${BASE} Z" fill="#fff" opacity=".1"/>`;
  return `<g class="cs-library">${out}</g>`;
}

/** The island the library stands on: grass, a stone rim, reeds and a few yellow flowers. */
function island() {
  let reeds = '';
  for (let i = 0; i < 16; i++) {
    const x = 18 + i * 15.5 + (i % 3) * 2;
    const y = 524 + (i % 2) * 5 + Math.abs(7 - i) * 0.5;
    reeds += `<path d="M${x} ${f(y + 8)} q${i % 2 ? 2 : -2} -10 ${i % 2 ? 4 : -3} -16" stroke="#3b8f4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (i % 4 === 1) reeds += `<circle cx="${x + 2}" cy="${f(y - 8)}" r="2.2" fill="#ffd23f"/>`;
  }
  return `<ellipse cx="130" cy="522" rx="128" ry="22" fill="#0b3a66" opacity=".22"/>
    <path d="M4 514 Q26 496 130 494 T256 514 Q240 536 130 538 T4 514 Z" fill="#a39b8b" stroke="#7b7566" stroke-width="2"/>
    <path d="M10 513 Q30 499 130 497 T250 513 Q236 529 130 531 T10 513 Z" fill="url(#pp-lawn)"/>${reeds}`;
}

/** One Canada goose, facing right: black head and neck with a white chinstrap, brown back, pale chest, black tail. */
function goose(x, y, delay, duration, scale = 0.95) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="pp-goose" style="animation-duration:${duration}s;animation-delay:${delay}s"><g class="pp-goose-bob">
    <g class="pp-leg"><path d="M-3 -9 L-4 -1 M-4 -1 h6" stroke="#222" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
    <g class="pp-leg pp-leg-b"><path d="M7 -9 L8 -1 M8 -1 h6" stroke="#222" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
    <path d="M-17 -22 L-30 -27 L-27 -15 Z" fill="#1c1c1c"/>
    <ellipse cx="0" cy="-18" rx="19" ry="10.5" fill="#b08a5c" stroke="#2a2342" stroke-width="2.2"/>
    <ellipse cx="9" cy="-14" rx="11.5" ry="7.5" fill="#ece3d2"/>
    <path d="M-14 -22 Q-2 -29 12 -22 Q2 -16 -14 -22 Z" fill="#8a6f52"/>
    <ellipse cx="-15" cy="-14.5" rx="4.2" ry="3.2" fill="#fff"/>
    <path d="M12 -23 Q22 -26 21 -37 Q21 -42 24 -43" stroke="#1b1b1b" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <circle cx="25" cy="-44" r="5.4" fill="#1b1b1b" stroke="#2a2342" stroke-width="1"/>
    <path d="M29 -44.5 L37 -43 L29 -40.5 Z" fill="#1b1b1b"/>
    <ellipse cx="24.6" cy="-41.2" rx="3.8" ry="2.4" fill="#fff" transform="rotate(-20 24.6 -41.2)"/>
    <circle cx="26.4" cy="-45.4" r="1.1" fill="#fff"/>
  </g></g></g>`;
}

/** The foreground riverbank (static, so it can carry the ink outline). */
function bankGround() {
  let tufts = '';
  for (let i = 0; i < 26; i++) {
    const x = 6 + i * 31 + (i % 3) * 5;
    tufts += `<path d="M${x} ${BANK + 8} q-2 -9 -5 -12 M${x} ${BANK + 8} q1 -11 3 -15 M${x} ${BANK + 8} q4 -8 8 -9" stroke="#2a8a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    if (i % 5 === 2) tufts += `<circle cx="${x + 6}" cy="${BANK - 2}" r="2.8" fill="#ffd23f" stroke="#a87a00" stroke-width="1"/>`;
  }
  return `<g filter="url(#cs-ink)"><path d="M0 ${BANK + 8} Q90 ${BANK - 2} 200 ${BANK + 6} T420 ${BANK + 4} T640 ${BANK + 7} T800 ${BANK + 2} V610 H0 Z" fill="url(#pp-lawn)"/>
    <path d="M0 ${BANK + 11} Q90 ${BANK + 1} 200 ${BANK + 9} T420 ${BANK + 7} T640 ${BANK + 10} T800 ${BANK + 5}" stroke="#fff" stroke-width="2.4" fill="none" opacity=".45"/>${tufts}</g>`;
}

/** A line of geese walking along the bank (animated, so no filter: each goose carries its own outline). */
function geeseRow() {
  return `${goose(0, 586, -2, 40)}${goose(0, 580, -8.5, 40, 0.85)}${goose(0, 590, -15, 40)}${goose(0, 583, -22, 40, 0.8)}`;
}

function trees() {
  const round = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#2d7a3a" stroke-width="1.6"/>`;
  const con = (x, y, h, c) => `<path d="M${x} ${y} L${x - h * 0.28} ${y + h} H${x + h * 0.28} Z" fill="${c}" stroke="#2d7a3a" stroke-width="1.4" stroke-linejoin="round"/>`;
  return `${con(28, 330, 70, '#4fae5e')}${con(60, 350, 56, '#5cc06a')}${round(236, 402, 14, '#52b562')}${round(250, 408, 11, '#69cf74')}
    ${con(786, 352, 58, '#4fae5e')}${round(772, 402, 13, '#52b562')}`;
}

function lampPost(x) {
  return `<path d="M${x} ${GROUND + 4} V352" stroke="#aab4c0" stroke-width="3.4"/><ellipse cx="${x}" cy="350" rx="11" ry="3.6" fill="#e1e8ef" stroke="#8d99a6" stroke-width="1.4"/>`;
}

/** A puffy cartoon cloud: dark outline, white body, a pale blue underside. */
function cloud(cls, x, y, k, o = 1) {
  const blobs = '<circle cx="0" cy="0" r="26"/><circle cx="34" cy="-12" r="32"/><circle cx="72" cy="2" r="24"/><rect x="-18" y="-2" width="112" height="30" rx="15"/>';
  return `<g class="pp-cloud ${cls}" opacity="${o}"><g transform="translate(${x} ${y}) scale(${k})">
    <g fill="#2a2342" stroke="#2a2342" stroke-width="7" stroke-linejoin="round">${blobs}</g>
    <g fill="#fff">${blobs}</g><path d="M-14 22 Q40 34 92 22 V28 Q40 36 -14 28 Z" fill="#cfe6fb"/><ellipse cx="22" cy="-18" rx="14" ry="6" fill="#fff" opacity=".9"/>
  </g></g>`;
}

const SKY_DEFS = `
  <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c78ee"/><stop offset=".55" stop-color="#5db8ff"/><stop offset="1" stop-color="#cbeeff"/></linearGradient>
  <radialGradient id="pp-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#fff0a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe56b" stop-opacity="0"/></radialGradient>
  <linearGradient id="pp-lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe36a"/><stop offset="1" stop-color="#3fb34a"/></linearGradient>
  <linearGradient id="pp-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fdcff"/><stop offset=".5" stop-color="#2d9cf0"/><stop offset="1" stop-color="#1766cf"/></linearGradient>
  <linearGradient id="pp-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="pp-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="cs-wall-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  <linearGradient id="cs-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a2c18"/><stop offset=".3" stop-color="#a06a3e"/><stop offset=".6" stop-color="#865630"/><stop offset="1" stop-color="#3c2312"/></linearGradient>
  <linearGradient id="cs-glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".4" stop-color="#fff" stop-opacity=".05"/><stop offset=".41" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="cs-lib-glare" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".35" stop-color="#fff" stop-opacity=".4"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>
  <linearGradient id="cs-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".85" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="cs-fade-mask" maskUnits="userSpaceOnUse" x="0" y="${WATER}" width="800" height="${600 - WATER}"><rect x="0" y="${WATER}" width="800" height="${600 - WATER}" fill="url(#cs-fade)"/></mask>
  <filter id="cs-ink" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="fat"/><feFlood flood-color="#2a2342"/><feComposite in2="fat" operator="in" result="ink"/><feMerge><feMergeNode in="ink"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="cs-ripple" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.16" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G"/></filter>`;

export const CAMPUS_BACKDROP = `<svg class="pp-hub-bg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>${SKY_DEFS}</defs>
  <rect width="800" height="440" fill="url(#pp-sky)"/>
  <circle cx="650" cy="70" r="150" fill="url(#pp-sun)"/><circle cx="650" cy="70" r="28" fill="#fffbe6"/>
  <g class="pp-rays"><path d="M650 70 L120 440 H300 Z" fill="url(#pp-ray)"/><path d="M650 70 L330 440 H470 Z" fill="url(#pp-ray)" opacity=".7"/><path d="M650 70 L520 440 H600 Z" fill="url(#pp-ray)" opacity=".6"/></g>
  ${cloud("pp-cloud-a", 100, 190, 1, 0.98)}
  ${cloud("pp-cloud-b", 560, 150, 0.85, 0.95)}

  <path d="M0 372 Q60 350 130 368 Q210 344 300 370 Q400 350 500 370 Q600 348 700 368 Q760 356 800 364 V440 H0 Z" fill="#6fb487" opacity=".9"/>
  <g filter="url(#cs-ink)">${redBlock()}</g>
  <path d="M0 410 Q200 396 400 408 T800 402 V${WATER} H0 Z" fill="url(#pp-lawn)"/>
  <g filter="url(#cs-ink)">${trees()}</g>

  <g filter="url(#cs-ink)">${building()}${lampPost(782)}</g>
  <rect x="0" y="${GROUND}" width="800" height="${WATER - GROUND}" fill="#d9d2c2"/><path d="M0 ${GROUND + 2} H800" stroke="#fff" stroke-width="2" opacity=".8"/><path d="M0 ${WATER - 1} H800" stroke="#8f8878" stroke-width="3"/>

  <!-- the lake, with the building reflected in it -->
  <rect y="${WATER}" width="800" height="${600 - WATER}" fill="url(#pp-lake)"/>
  <g mask="url(#cs-fade-mask)" opacity=".9"><g filter="url(#cs-ripple)"><g transform="translate(0 ${WATER * 2}) scale(1 -1)">${redBlock()}${building()}</g></g></g>
  <path d="M0 ${WATER} H800 V${WATER + 16} Q600 ${WATER + 8} 400 ${WATER + 18} T0 ${WATER + 14} Z" fill="#fff" opacity=".2"/>
  <ellipse cx="640" cy="490" rx="130" ry="12" fill="url(#pp-shine)" opacity=".75"/><ellipse cx="620" cy="530" rx="80" ry="8" fill="url(#pp-shine)" opacity=".55"/>
  <g stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".65"><path d="M300 500 q12 -5 24 0 t24 0"/><path d="M420 530 q14 -5 28 0 t28 0"/><path d="M560 512 q14 -5 28 0 t28 0"/><path d="M700 540 q14 -5 28 0 t28 0"/></g>
  <g class="pp-sparkle" fill="#fff"><circle cx="330" cy="520" r="2.4"/><circle cx="470" cy="500" r="2"/><circle cx="610" cy="540" r="2.6"/><circle cx="520" cy="546" r="2"/><circle cx="730" cy="505" r="2.2"/></g>

  <!-- the library, on its own island at the front left -->
  <g filter="url(#cs-ink)">${island()}${library()}</g>
  <!-- the foreground bank, with the geese -->
  ${bankGround()}
  ${geeseRow()}
</svg>`;

const map = (x, y, w, h) => ({
  x: Math.round(BX + (x - 100) * S),
  y: Math.round(GROUND + (y - GROUND) * S),
  w: Math.round(w * S),
  h: Math.round(h * S),
});

/**
 * Clickable areas, keyed by game id: x, y, w, h of the part of the picture the game lives in.
 * The game's name is lettered underneath (or, with `label: { y }`, across the picture at that height). These match the building art above (they are mapped
 * through the same move-and-scale), so if you change BX or S they follow.
 */
export const CAMPUS_SPOTS = {
  'purble-shop': map(100, 300, 176, GROUND - 300),   // the front door and keypad
  'comfy-cakes': { ...map(318, 190, 164, GROUND - 190), label: { y: 246 } },   // the CS Atrium, named across its upper middle
  'purble-pairs': map(524, 300, 176, GROUND - 300),  // the A32 Lab
};

export const CAMPUS_SCENE = { backdrop: CAMPUS_BACKDROP, spots: CAMPUS_SPOTS };
