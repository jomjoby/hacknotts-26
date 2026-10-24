/*
 * Paint: a simple Windows 7 style Paint for the HackNotts OS.
 *
 * Opened with openApp('paint') (start menu, or ask Clippy) in a window made by the OS's
 * makeWindow(). Loaded by addons/addons.js.
 *
 * Like Windows 7 Paint: a ribbon with Tools, Brushes, Shapes, Size and Colors; left-click
 * paints with Color 1 and right-click with Color 2; Ctrl+Z / Ctrl+Y undo and redo; drag the
 * handle at the canvas corner to resize it; the Paint menu saves a PNG or opens a picture.
 */
(function () {
  'use strict';

  // The Windows 7 Paint palette.
  const PALETTE = [
    '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
  ];

  const SIZES = [1, 3, 5, 8];
  const MAX_UNDO = 30;

  const svg = (body, view = '0 0 24 24') => `<svg viewBox="${view}" aria-hidden="true">${body}</svg>`;

  // Tool and shape icons, drawn here so there are no image files.
  const ICONS = {
    pencil: svg('<path d="M4 20l2-6L16 4l4 4-10 10z" fill="#f6c343" stroke="#8a5a00"/><path d="M4 20l2-6 4 4z" fill="#f2d7b0" stroke="#8a5a00"/><path d="M16 4l4 4 1-1a2 2 0 0 0-4-4z" fill="#e57373" stroke="#8a2020"/>'),
    fill: svg('<path d="M5 11l7-7 7 7-7 7z" fill="#cfd8dc" stroke="#455a64"/><path d="M5 11h14l-7 7z" fill="#42a5f5"/><path d="M19 12c1 2 2 3 2 4a2 2 0 0 1-4 0c0-1 1-2 2-4z" fill="#1e88e5"/>'),
    text: svg('<text x="12" y="18" text-anchor="middle" font-family="Times New Roman, serif" font-size="18" font-weight="bold" fill="#1e3287">A</text>'),
    eraser: svg('<path d="M3 15l9-9 8 8-6 6H8z" fill="#f48fb1" stroke="#ad1457"/><path d="M3 15l5 5h6l-6-6z" fill="#fce4ec" stroke="#ad1457"/>'),
    picker: svg('<path d="M5 19l9-9 2 2-9 9H5z" fill="#b3e5fc" stroke="#01579b"/><path d="M14 10l3-3a2 2 0 0 1 3 3l-3 3z" fill="#455a64"/>'),
    brush: svg('<path d="M13 11l7-7 1 1-7 7z" fill="#8d6e63" stroke="#4e342e"/><path d="M4 20c0-4 3-7 6-6 2 1 2 3 1 4-2 2-5 2-7 2z" fill="#1e88e5" stroke="#0d47a1"/>'),
    line: svg('<path d="M4 20L20 4" stroke="#1e3287" stroke-width="2"/>'),
    rect: svg('<rect x="4" y="6" width="16" height="12" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    ellipse: svg('<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    roundrect: svg('<rect x="4" y="6" width="16" height="12" rx="4" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    undo: svg('<path d="M9 7H4V2" fill="none" stroke="#1e3287" stroke-width="2"/><path d="M4 7a8 8 0 1 1 1 9" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    redo: svg('<path d="M15 7h5V2" fill="none" stroke="#1e3287" stroke-width="2"/><path d="M20 7a8 8 0 1 0-1 9" fill="none" stroke="#1e3287" stroke-width="2"/>'),
    save: svg('<rect x="3" y="3" width="18" height="18" rx="2" fill="#5c8fd6" stroke="#1e3287"/><rect x="7" y="3" width="10" height="6" fill="#e3edf9"/><rect x="6" y="13" width="12" height="8" fill="#fff"/>'),
    app: svg('<rect x="2" y="3" width="20" height="16" rx="2" fill="#fff" stroke="#1e3287"/><circle cx="8" cy="9" r="2.5" fill="#ed1c24"/><circle cx="14" cy="8" r="2.5" fill="#22b14c"/><circle cx="16" cy="14" r="2.5" fill="#00a2e8"/><path d="M4 21l6-8 2 2-6 7z" fill="#f6c343" stroke="#8a5a00"/>'),
  };

  const TOOLS = [['pencil', 'Pencil'], ['fill', 'Fill with color'], ['text', 'Text'], ['eraser', 'Eraser'], ['picker', 'Color picker']];
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
      width: 820, height: 560, minWidth: 560, minHeight: 360,
      onClose: () => { app = null; },
    });
    app = {
      win,
      tool: 'pencil', previousTool: 'pencil', size: 3, fillShape: false,
      color1: '#000000', color2: '#ffffff',
      undo: [], redo: [],
      name: 'Untitled',
    };
    build();
  }

  // ------------------------------------------------------------------ UI

  function build() {
    const body = app.win.body;
    body.classList.add('pt-root');
    body.tabIndex = 0;
    body.innerHTML = `
      <div class="pt-tabs">
        <div class="pt-appmenu">
          <button class="pt-appbutton" type="button">Paint &#9662;</button>
          <div class="pt-dropdown" hidden>
            <button type="button" data-cmd="new">New</button>
            <button type="button" data-cmd="open">Open...</button>
            <button type="button" data-cmd="save">Save as PNG</button>
            <hr>
            <button type="button" data-cmd="about">About Paint</button>
            <button type="button" data-cmd="exit">Exit</button>
          </div>
        </div>
        <span class="pt-tab on">Home</span>
        <div class="pt-quick">
          <button type="button" data-cmd="save" title="Save (Ctrl+S)">${ICONS.save}</button>
          <button type="button" data-cmd="undo" title="Undo (Ctrl+Z)">${ICONS.undo}</button>
          <button type="button" data-cmd="redo" title="Redo (Ctrl+Y)">${ICONS.redo}</button>
        </div>
      </div>
      <div class="pt-ribbon">
        <div class="pt-group"><div class="pt-tools">
          ${TOOLS.map(([id, label]) => `<button type="button" class="pt-tool" data-tool="${id}" title="${label}">${ICONS[id]}</button>`).join('')}
        </div><span class="pt-label">Tools</span></div>
        <div class="pt-group"><button type="button" class="pt-big pt-tool" data-tool="brush" title="Brush">${ICONS.brush}<span>Brushes</span></button><span class="pt-label">&nbsp;</span></div>
        <div class="pt-group"><div class="pt-shapes">
          ${SHAPES.map(([id, label]) => `<button type="button" class="pt-tool" data-tool="${id}" title="${label}">${ICONS[id]}</button>`).join('')}
        </div>
        <label class="pt-fillopt"><input type="checkbox" class="pt-fillshape"> Fill with Color 2</label><span class="pt-label">Shapes</span></div>
        <div class="pt-group"><div class="pt-sizes">
          ${SIZES.map(s => `<button type="button" class="pt-size" data-size="${s}" title="${s}px"><span style="height:${s}px"></span></button>`).join('')}
        </div><span class="pt-label">Size</span></div>
        <div class="pt-group pt-colours">
          <button type="button" class="pt-colourbox on" data-slot="1"><span class="pt-swatch"></span>Color 1</button>
          <button type="button" class="pt-colourbox" data-slot="2"><span class="pt-swatch"></span>Color 2</button>
          <div class="pt-palette">${PALETTE.map(c => `<button type="button" data-colour="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
          <label class="pt-edit" title="Edit colors"><span class="pt-rainbow"></span>Edit colors<input type="color" class="pt-colourinput"></label>
          <span class="pt-label">Colors</span>
        </div>
      </div>
      <div class="pt-workspace">
        <div class="pt-stage">
          <canvas class="pt-canvas"></canvas>
          <canvas class="pt-overlay"></canvas>
          <div class="pt-handle" title="Drag to resize the picture"></div>
        </div>
      </div>
      <div class="pt-status">
        <span class="pt-pos"></span><span class="pt-dims"></span><span class="pt-zoom">100%</span>
      </div>
      <input type="file" class="pt-file" accept="image/*" hidden>`;

    app.canvas = body.querySelector('.pt-canvas');
    app.overlay = body.querySelector('.pt-overlay');
    app.ctx = app.canvas.getContext('2d', { willReadFrequently: true });
    app.octx = app.overlay.getContext('2d');
    app.slot = 1; // which of Color 1 / Color 2 the palette sets

    resizeCanvas(640, 400, false);
    clearCanvas();
    refreshRibbon();
    wireEvents(body);
    body.focus();
  }

  function refreshRibbon() {
    const body = app.win.body;
    body.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === app.tool));
    body.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', Number(b.dataset.size) === app.size));
    body.querySelectorAll('.pt-colourbox').forEach(b => b.classList.toggle('on', Number(b.dataset.slot) === app.slot));
    body.querySelector('[data-slot="1"] .pt-swatch').style.background = app.color1;
    body.querySelector('[data-slot="2"] .pt-swatch').style.background = app.color2;
    body.querySelector('.pt-fillshape').checked = app.fillShape;
    body.querySelector('[data-cmd="undo"]').disabled = !app.undo.length;
    body.querySelector('[data-cmd="redo"]').disabled = !app.redo.length;
    app.canvas.style.cursor = app.tool === 'text' ? 'text' : 'crosshair';
  }

  function setTitle() {
    app.win.el.querySelector('.os-title').textContent = `${app.name} - Paint`;
  }

  // -------------------------------------------------------------- canvas

  function resizeCanvas(w, h, keep = true) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const old = keep ? app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height) : null;
    app.canvas.width = app.overlay.width = w;
    app.canvas.height = app.overlay.height = h;
    // New space is filled with Color 2, like Paint.
    app.ctx.fillStyle = app.color2;
    app.ctx.fillRect(0, 0, w, h);
    if (old) app.ctx.putImageData(old, 0, 0);
    app.win.body.querySelector('.pt-dims').textContent = `${w} × ${h}px`;
  }

  function clearCanvas() {
    app.ctx.fillStyle = '#ffffff';
    app.ctx.fillRect(0, 0, app.canvas.width, app.canvas.height);
  }

  function snapshot() {
    app.undo.push(app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height));
    if (app.undo.length > MAX_UNDO) app.undo.shift();
    app.redo = [];
    refreshRibbon();
  }

  function restore(from, to) {
    if (!from.length) return;
    to.push(app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height));
    const img = from.pop();
    if (img.width !== app.canvas.width || img.height !== app.canvas.height) {
      app.canvas.width = app.overlay.width = img.width;
      app.canvas.height = app.overlay.height = img.height;
      app.win.body.querySelector('.pt-dims').textContent = `${img.width} × ${img.height}px`;
    }
    app.ctx.putImageData(img, 0, 0);
    refreshRibbon();
  }

  const undo = () => restore(app.undo, app.redo);
  const redo = () => restore(app.redo, app.undo);

  function pointFrom(e) {
    const r = app.canvas.getBoundingClientRect();
    return { x: Math.floor(e.clientX - r.left), y: Math.floor(e.clientY - r.top) };
  }

  // Pencil, brush and eraser: stamp along the line between two points.
  function stroke(a, b, colour) {
    const ctx = app.ctx;
    ctx.fillStyle = colour;
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(a.x + (b.x - a.x) * (i / steps));
      const y = Math.round(a.y + (b.y - a.y) * (i / steps));
      if (app.tool === 'pencil') {
        ctx.fillRect(x, y, 1, 1);
      } else if (app.tool === 'eraser') {
        const s = app.size * 3;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, app.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawShape(ctx, tool, a, b, colour, fillColour) {
    ctx.save();
    ctx.lineWidth = app.size;
    ctx.strokeStyle = colour;
    ctx.fillStyle = fillColour;
    ctx.beginPath();
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (tool === 'line') {
      ctx.moveTo(a.x + 0.5, a.y + 0.5);
      ctx.lineTo(b.x + 0.5, b.y + 0.5);
    } else if (tool === 'rect') {
      ctx.rect(x + 0.5, y + 0.5, w, h);
    } else if (tool === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (tool === 'roundrect') {
      const r = Math.min(12, w / 2, h / 2);
      ctx.roundRect(x + 0.5, y + 0.5, w, h, r);
    }
    if (tool !== 'line' && app.fillShape) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function hexToRgba(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }

  // Fill bucket: flood fill everything connected that's exactly the clicked colour.
  function floodFill(start, colour) {
    const { width: w, height: h } = app.canvas;
    const img = app.ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const at = (x, y) => (y * w + x) * 4;
    const i0 = at(start.x, start.y);
    const target = [data[i0], data[i0 + 1], data[i0 + 2], data[i0 + 3]];
    const fill = hexToRgba(colour);
    if (target.every((v, i) => v === fill[i])) return;
    const same = i => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];
    const stack = [[start.x, start.y]];
    while (stack.length) {
      const [x, y] = stack.pop();
      let left = x;
      while (left >= 0 && same(at(left, y))) left--;
      left++;
      let up = false, down = false;
      for (let cx = left; cx < w && same(at(cx, y)); cx++) {
        data.set(fill, at(cx, y));
        if (y > 0) {
          const s = same(at(cx, y - 1));
          if (s && !up) stack.push([cx, y - 1]);
          up = s;
        }
        if (y < h - 1) {
          const s = same(at(cx, y + 1));
          if (s && !down) stack.push([cx, y + 1]);
          down = s;
        }
      }
    }
    app.ctx.putImageData(img, 0, 0);
  }

  function pickColour(p, slot) {
    const d = app.ctx.getImageData(p.x, p.y, 1, 1).data;
    const hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    if (slot === 2) app.color2 = hex;
    else app.color1 = hex;
    app.tool = app.previousTool; // like Paint, go back to the tool you were using
    refreshRibbon();
  }

  // Text tool: a box appears where you click; Enter (or clicking away) stamps it onto the picture.
  function placeText(p, colour) {
    const stage = app.win.body.querySelector('.pt-stage');
    const box = document.createElement('textarea');
    box.className = 'pt-textbox';
    const fontSize = 12 + app.size * 2;
    Object.assign(box.style, { left: p.x + 'px', top: p.y + 'px', color: colour, fontSize: fontSize + 'px' });
    stage.appendChild(box);
    setTimeout(() => box.focus(), 0);
    let done = false;
    const commit = keep => {
      if (done) return;
      done = true;
      const text = box.value;
      box.remove();
      if (!keep || !text.trim()) return;
      snapshot();
      app.ctx.fillStyle = colour;
      app.ctx.font = `${fontSize}px "Segoe UI", Tahoma, sans-serif`;
      app.ctx.textBaseline = 'top';
      text.split('\n').forEach((line, i) => app.ctx.fillText(line, p.x + 3, p.y + 3 + i * fontSize * 1.25));
      app.win.body.focus();
    };
    box.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(true); }
      if (e.key === 'Escape') commit(false);
    });
    box.addEventListener('blur', () => commit(true));
  }

  // ------------------------------------------------------------- events

  function wireEvents(body) {
    const canvas = app.canvas;
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      const slot = e.button === 2 ? 2 : 1;
      const colour = slot === 2 ? app.color2 : app.color1;
      const other = slot === 2 ? app.color1 : app.color2;
      const start = pointFrom(e);

      if (app.tool === 'fill') { snapshot(); floodFill(start, colour); return; }
      if (app.tool === 'picker') { pickColour(start, slot); return; }
      if (app.tool === 'text') { placeText(start, colour); return; }

      snapshot();
      canvas.setPointerCapture(e.pointerId);
      let last = start;
      const freehand = ['pencil', 'brush', 'eraser'].includes(app.tool);
      // The eraser always paints Color 2 (the background colour), like Paint.
      const inkFor = () => (app.tool === 'eraser' ? app.color2 : colour);
      if (freehand) stroke(start, start, inkFor());

      const move = ev => {
        const p = pointFrom(ev);
        if (freehand) {
          stroke(last, p, inkFor());
          last = p;
        } else {
          app.octx.clearRect(0, 0, app.overlay.width, app.overlay.height);
          drawShape(app.octx, app.tool, start, p, colour, other);
        }
      };
      const up = ev => {
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        if (!freehand) {
          app.octx.clearRect(0, 0, app.overlay.width, app.overlay.height);
          drawShape(app.ctx, app.tool, start, pointFrom(ev), colour, other);
        }
      };
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
    });

    canvas.addEventListener('pointermove', e => {
      const p = pointFrom(e);
      body.querySelector('.pt-pos').textContent = `${p.x}, ${p.y}px`;
    });
    canvas.addEventListener('pointerleave', () => { body.querySelector('.pt-pos').textContent = ''; });

    // Resize the picture from the corner handle.
    const handle = body.querySelector('.pt-handle');
    handle.addEventListener('pointerdown', e => {
      handle.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY, w: app.canvas.width, h: app.canvas.height };
      const move = ev => {
        app.win.body.querySelector('.pt-dims').textContent =
          `${Math.max(1, start.w + ev.clientX - start.x)} × ${Math.max(1, start.h + ev.clientY - start.y)}px`;
      };
      const up = ev => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        snapshot();
        resizeCanvas(start.w + ev.clientX - start.x, start.h + ev.clientY - start.y);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });

    body.addEventListener('click', e => {
      const menu = body.querySelector('.pt-dropdown');
      if (e.target.closest('.pt-appbutton')) { menu.hidden = !menu.hidden; return; }
      if (!e.target.closest('.pt-dropdown')) menu.hidden = true;

      const tool = e.target.closest('[data-tool]');
      if (tool) {
        if (tool.dataset.tool === 'picker' && app.tool !== 'picker') app.previousTool = app.tool;
        app.tool = tool.dataset.tool;
        refreshRibbon();
      }
      const size = e.target.closest('[data-size]');
      if (size) { app.size = Number(size.dataset.size); refreshRibbon(); }
      const slot = e.target.closest('[data-slot]');
      if (slot) { app.slot = Number(slot.dataset.slot); refreshRibbon(); }
      const swatch = e.target.closest('[data-colour]');
      if (swatch) { setColour(swatch.dataset.colour); }
      const cmd = e.target.closest('[data-cmd]');
      if (cmd && !cmd.disabled) { menu.hidden = true; command(cmd.dataset.cmd); }
    });

    body.querySelector('.pt-fillshape').addEventListener('change', e => { app.fillShape = e.target.checked; });
    body.querySelector('.pt-colourinput').addEventListener('input', e => setColour(e.target.value));
    body.querySelector('.pt-file').addEventListener('change', e => openFile(e.target.files[0]));

    body.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z') { e.preventDefault(); undo(); }
      else if (key === 'y') { e.preventDefault(); redo(); }
      else if (key === 's') { e.preventDefault(); command('save'); }
    });
  }

  function setColour(colour) {
    if (app.slot === 2) app.color2 = colour;
    else app.color1 = colour;
    refreshRibbon();
  }

  function command(cmd) {
    if (cmd === 'undo') undo();
    else if (cmd === 'redo') redo();
    else if (cmd === 'new') {
      snapshot();
      resizeCanvas(640, 400, false);
      clearCanvas();
      app.name = 'Untitled';
      setTitle();
    } else if (cmd === 'open') {
      app.win.body.querySelector('.pt-file').click();
    } else if (cmd === 'save') {
      const link = document.createElement('a');
      link.download = (app.name === 'Untitled' ? 'untitled' : app.name.replace(/\.[^.]+$/, '')) + '.png';
      link.href = app.canvas.toDataURL('image/png');
      link.click();
    } else if (cmd === 'about') {
      if (window.Clippy) window.Clippy.say('Paint for HackNotts OS 7. Left-click paints with Color 1, right-click with Color 2. Ctrl+Z undoes your masterpiece.');
    } else if (cmd === 'exit') {
      app.win.close();
    }
  }

  function openFile(file) {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      snapshot();
      resizeCanvas(img.naturalWidth, img.naturalHeight, false);
      app.ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      app.name = file.name;
      setTitle();
    };
    img.src = URL.createObjectURL(file);
  }

  window.PaintApp = { open };
})();
