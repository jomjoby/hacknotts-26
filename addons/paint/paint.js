/*
 * Paint: a simple Windows 7 style Paint for the HackNotts OS.
 *
 * Opened with openApp('paint') (start menu, or ask Clippy) in a window made by the OS's
 * makeWindow(). Loaded by addons/addons.js.
 *
 * Kept simple on purpose: draw, erase, pick a colour and add shapes. Ctrl+Z undoes.
 */
(function () {
  'use strict';

  // The Windows 7 Paint palette.
  const PALETTE = [
    '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
  ];

  const LINE_WIDTH = 3;
  const ERASER_SIZE = 16;
  const MAX_UNDO = 30;

  const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

  // Tool and shape icons, drawn here so there are no image files.
  const ICONS = {
    pencil: svg('<path d="M4 20l2-6L16 4l4 4-10 10z" fill="#f6c343" stroke="#8a5a00"/><path d="M4 20l2-6 4 4z" fill="#f2d7b0" stroke="#8a5a00"/><path d="M16 4l4 4 1-1a2 2 0 0 0-4-4z" fill="#e57373" stroke="#8a2020"/>'),
    eraser: svg('<path d="M3 15l9-9 8 8-6 6H8z" fill="#f48fb1" stroke="#ad1457"/><path d="M3 15l5 5h6l-6-6z" fill="#fce4ec" stroke="#ad1457"/>'),
    line: svg('<path d="M4 20L20 4" stroke="#1e3287" stroke-width="2"/>'),
    rect: svg('<rect x="4" y="6" width="16" height="12" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    ellipse: svg('<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    roundrect: svg('<rect x="4" y="6" width="16" height="12" rx="4" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    app: svg('<rect x="2" y="3" width="20" height="16" rx="2" fill="#fff" stroke="#1e3287"/><circle cx="8" cy="9" r="2.5" fill="#ed1c24"/><circle cx="14" cy="8" r="2.5" fill="#22b14c"/><circle cx="16" cy="14" r="2.5" fill="#00a2e8"/><path d="M4 21l6-8 2 2-6 7z" fill="#f6c343" stroke="#8a5a00"/>'),
  };

  const TOOLS = [['pencil', 'Draw'], ['eraser', 'Eraser']];
  const SHAPES = [['line', 'Line'], ['rect', 'Rectangle'], ['ellipse', 'Oval'], ['roundrect', 'Rounded rectangle']];

  let app = null; // the open Paint window and its state

  function open() {
    if (app) {
      app.win.restore();
      app.win.focus();
      return;
    }
    if (typeof window.makeWindow !== 'function') return;
    const iconUrl = 'data:image/svg+xml,' + encodeURIComponent(ICONS.app.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    const win = window.makeWindow({
      id: 'paint', title: 'Untitled - Paint', icon: iconUrl,
      width: 760, height: 520, minWidth: 480, minHeight: 360,
      onClose: () => { app = null; },
    });
    app = { win, tool: 'pencil', colour: '#000000', undo: [] };
    build();
  }

  // ------------------------------------------------------------------ UI

  function build() {
    const body = app.win.body;
    body.classList.add('pt-root');
    body.tabIndex = 0;
    const toolButtons = list => list.map(([id, label]) =>
      `<button type="button" class="pt-tool" data-tool="${id}" title="${label}">${ICONS[id]}<span>${label}</span></button>`).join('');
    body.innerHTML = `
      <div class="pt-ribbon">
        <div class="pt-group"><div class="pt-tools">${toolButtons(TOOLS)}</div><span class="pt-label">Tools</span></div>
        <div class="pt-group"><div class="pt-shapes">${toolButtons(SHAPES)}</div><span class="pt-label">Shapes</span></div>
        <div class="pt-group pt-colours">
          <div class="pt-colourbox"><span class="pt-swatch"></span>Colour</div>
          <div class="pt-palette">${PALETTE.map(c => `<button type="button" data-colour="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
          <label class="pt-edit" title="Pick any colour"><span class="pt-rainbow"></span>More colours<input type="color" class="pt-colourinput"></label>
          <span class="pt-label">Colours</span>
        </div>
      </div>
      <div class="pt-workspace">
        <div class="pt-stage">
          <canvas class="pt-canvas" width="640" height="400"></canvas>
          <canvas class="pt-overlay" width="640" height="400"></canvas>
        </div>
      </div>`;

    app.canvas = body.querySelector('.pt-canvas');
    app.overlay = body.querySelector('.pt-overlay');
    app.ctx = app.canvas.getContext('2d', { willReadFrequently: true });
    app.octx = app.overlay.getContext('2d');
    app.ctx.fillStyle = '#ffffff';
    app.ctx.fillRect(0, 0, app.canvas.width, app.canvas.height);

    refreshRibbon();
    wireEvents(body);
    body.focus();
  }

  function refreshRibbon() {
    const body = app.win.body;
    body.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === app.tool));
    body.querySelector('.pt-swatch').style.background = app.colour;
  }

  // -------------------------------------------------------------- canvas

  function snapshot() {
    app.undo.push(app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height));
    if (app.undo.length > MAX_UNDO) app.undo.shift();
  }

  function undo() {
    if (app.undo.length) app.ctx.putImageData(app.undo.pop(), 0, 0);
  }

  function pointFrom(e) {
    const r = app.canvas.getBoundingClientRect();
    return { x: Math.floor(e.clientX - r.left), y: Math.floor(e.clientY - r.top) };
  }

  // Draw and erase: a line between the last two pointer positions.
  function stroke(a, b) {
    const ctx = app.ctx;
    ctx.save();
    if (app.tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = ERASER_SIZE;
      ctx.lineCap = 'square';
    } else {
      ctx.strokeStyle = app.colour;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
    }
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawShape(ctx, a, b) {
    ctx.save();
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = app.colour;
    ctx.beginPath();
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (app.tool === 'line') {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    } else if (app.tool === 'rect') {
      ctx.rect(x, y, w, h);
    } else if (app.tool === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (app.tool === 'roundrect') {
      ctx.roundRect(x, y, w, h, Math.min(12, w / 2, h / 2));
    }
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------- events

  function wireEvents(body) {
    const canvas = app.canvas;

    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const start = pointFrom(e);
      snapshot();
      canvas.setPointerCapture(e.pointerId);
      let last = start;
      const freehand = app.tool === 'pencil' || app.tool === 'eraser';
      if (freehand) stroke(start, start);

      const move = ev => {
        const p = pointFrom(ev);
        if (freehand) {
          stroke(last, p);
          last = p;
        } else {
          app.octx.clearRect(0, 0, app.overlay.width, app.overlay.height);
          drawShape(app.octx, start, p);
        }
      };
      const up = ev => {
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        if (!freehand) {
          app.octx.clearRect(0, 0, app.overlay.width, app.overlay.height);
          drawShape(app.ctx, start, pointFrom(ev));
        }
      };
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
    });

    body.addEventListener('click', e => {
      const tool = e.target.closest('[data-tool]');
      if (tool) { app.tool = tool.dataset.tool; refreshRibbon(); }
      const swatch = e.target.closest('[data-colour]');
      if (swatch) setColour(swatch.dataset.colour);
    });

    body.querySelector('.pt-colourinput').addEventListener('input', e => setColour(e.target.value));

    body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });
  }

  // Picking a colour means you want to draw with it, so the eraser switches back to drawing.
  function setColour(colour) {
    app.colour = colour;
    if (app.tool === 'eraser') app.tool = 'pencil';
    refreshRibbon();
  }

  window.PaintApp = { open };
})();
