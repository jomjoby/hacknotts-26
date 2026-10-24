
function startMenu() {
    const menu = document.getElementById("start-menu");

    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

function shutDown() {
    window.close();
}

function openApp(app) {
    switch (app) {
        case "firefox":
            // The retro browser (browser/), loaded by addons/addons.js.
            if (window.RetroBrowser) RetroBrowser.open();
            break;

        case "recycle-bin":
            // alert("Recycle Bin opened!");
            break;

        case "purble-place":
            openPurblePlace();
            break;

        case "control-panel":
            // The Control Panel (settings/), loaded by addons/addons.js.
            if (window.SettingsApp) SettingsApp.open();
            break;
    }
}

// Clippy can open and close desktop apps too ("open purble place").
window.addEventListener('clippy:open-app', e => openApp(e.detail.id));
window.addEventListener('clippy:close-app', e => {
    if (e.detail.id === 'purble-place' && purbleWindow) purbleWindow.close();
});


// ---- Windows ----------------------------------------------------------------
// Aero windows for desktop apps. makeWindow() gives back { el, body, close, minimise, restore, focus };
// put the app inside `body`. Windows can be dragged by the title bar, resized from the corner,
// maximised (double-click the title bar) and minimised to a taskbar button.

const CAPTION_ICONS = {
    min: '<svg viewBox="0 0 10 10"><rect x="1" y="6" width="8" height="2.5"/></svg>',
    max: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0zm2 3v5h6V3z"/></svg>',
    close: '<svg viewBox="0 0 10 10"><path d="m0 1.5 1.5-1.5L5 3.5 8.5 0 10 1.5 6.5 5 10 8.5 8.5 10 5 6.5 1.5 10 0 8.5 3.5 5z"/></svg>',
};

const TASKBAR_SPACE = 80; // the taskbar's height plus its gap, kept clear when maximised

// The highest window on screen (OS windows and the browser share one stack).
function topZIndex() {
    const windows = document.querySelectorAll('[data-app-window]');
    return Math.max(100, ...[...windows].map(w => Number(w.style.zIndex) || 0));
}

function makeWindow({ id, title, icon, width, height, minWidth = 320, minHeight = 240, onClose, onMinimise, onRestore, onFocus }) {
    const el = document.createElement('section');
    el.className = 'os-window';
    el.dataset.appWindow = id;
    el.dataset.title = title;
    el.innerHTML = `
        <header class="os-titlebar">
            <img class="os-title-icon" alt="">
            <span class="os-title"></span>
            <div class="os-caption">
                <button class="os-min" type="button" aria-label="Minimise">${CAPTION_ICONS.min}</button>
                <button class="os-max" type="button" aria-label="Maximise">${CAPTION_ICONS.max}</button>
                <button class="os-close" type="button" aria-label="Close">${CAPTION_ICONS.close}</button>
            </div>
        </header>
        <div class="os-window-body"></div>
        <div class="os-resize"></div>`;
    el.querySelector('.os-title-icon').src = icon;
    el.querySelector('.os-title').textContent = title;
    const body = el.querySelector('.os-window-body');

    // width/height are the size of the app area; the frame adds 14px across and 37px down.
    const w = Math.min(width + 14, innerWidth - 20);
    const h = Math.min(height + 37, innerHeight - TASKBAR_SPACE - 20);
    Object.assign(el.style, {
        width: w + 'px',
        height: h + 'px',
        left: Math.max(10, (innerWidth - w) / 2) + 'px',
        top: Math.max(10, (innerHeight - TASKBAR_SPACE - h) / 2) + 'px',
        minWidth: minWidth + 14 + 'px',
        minHeight: minHeight + 37 + 'px',
    });
    document.querySelector('.desktop').appendChild(el);

    // Taskbar button: click to minimise, restore or bring to the front.
    const taskbarBtn = document.createElement('div');
    taskbarBtn.className = 'taskbar-btn os-taskbar-btn';
    taskbarBtn.title = title;
    taskbarBtn.innerHTML = '<img alt="">';
    taskbarBtn.querySelector('img').src = icon;
    document.querySelector('.taskbar').appendChild(taskbarBtn);

    let restoreRect = null;
    const isMinimised = () => el.classList.contains('os-minimised');
    const isTop = () => Number(el.style.zIndex) >= topZIndex();

    const win = {
        el,
        body,
        focus() {
            if (!isTop() || !el.style.zIndex) el.style.zIndex = topZIndex() + 1;
            taskbarBtn.classList.add('active');
            if (onFocus) onFocus();
        },
        minimise() {
            el.classList.add('os-minimised');
            taskbarBtn.classList.remove('active');
            if (onMinimise) onMinimise();
        },
        restore() {
            if (!isMinimised()) return;
            el.classList.remove('os-minimised');
            if (onRestore) onRestore();
            win.focus();
        },
        close() {
            if (onClose) onClose();
            el.remove();
            taskbarBtn.remove();
        },
    };

    function toggleMaximise() {
        if (restoreRect) {
            Object.assign(el.style, restoreRect);
            restoreRect = null;
        } else {
            restoreRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
            Object.assign(el.style, { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight - TASKBAR_SPACE + 'px' });
        }
        el.classList.toggle('os-maximised', !!restoreRect);
    }

    el.querySelector('.os-min').addEventListener('click', win.minimise);
    el.querySelector('.os-max').addEventListener('click', toggleMaximise);
    el.querySelector('.os-close').addEventListener('click', win.close);
    el.addEventListener('pointerdown', () => win.focus(), true);
    taskbarBtn.addEventListener('click', () => {
        if (isMinimised()) win.restore();
        else if (isTop()) win.minimise();
        else win.focus();
    });

    // Drag by the title bar, and resize from the bottom-right corner.
    function dragWith(handle, onMove) {
        handle.addEventListener('pointerdown', e => {
            if (e.button !== 0 || e.target.closest('.os-caption')) return;
            const start = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
            handle.setPointerCapture(e.pointerId);
            const move = ev => onMove(ev.clientX - start.x, ev.clientY - start.y, start);
            const up = () => {
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', up);
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', up);
        });
    }

    const titlebar = el.querySelector('.os-titlebar');
    titlebar.addEventListener('dblclick', e => { if (!e.target.closest('.os-caption')) toggleMaximise(); });
    dragWith(titlebar, (dx, dy, start) => {
        if (restoreRect) return; // maximised windows stay put
        el.style.left = Math.min(Math.max(start.left + dx, 80 - start.w), innerWidth - 80) + 'px';
        el.style.top = Math.min(Math.max(start.top + dy, 0), innerHeight - TASKBAR_SPACE - 30) + 'px';
    });
    dragWith(el.querySelector('.os-resize'), (dx, dy, start) => {
        el.style.width = start.w + dx + 'px';
        el.style.height = start.h + dy + 'px';
    });

    win.focus();
    return win;
}


// ---- Purble Place (purble-place/) ---------------------------------------------
// The game is built from JavaScript modules. Some browsers (Chrome) won't load modules from a
// page opened as a file, so then we use addons/purble-place-bundle.js, the same game as one plain
// script (rebuild it with addons/build-purble-bundle.sh after changing the game).

let purble = null;
let purbleWindow = null;

async function openPurblePlace() {
    if (purbleWindow) {
        purbleWindow.restore();
        purbleWindow.focus();
        return;
    }

    const win = makeWindow({
        id: 'purble-place',
        title: 'Purble Place',
        icon: 'images/purble-place.png',
        width: 800,
        height: 623,
        minWidth: 480,
        minHeight: 383,
        onClose: () => {
            if (purble) purble.destroy();
            purble = null;
            purbleWindow = null;
        },
        onMinimise: () => purble && purble.pause(),
        onRestore: () => purble && purble.resume(),
        onFocus: () => purble && purble.focus(),
    });
    purbleWindow = win;

    const showProblem = text => {
        win.body.innerHTML = '<div class="os-window-message"><b>Purble Place couldn\'t start</b><p></p></div>';
        win.body.querySelector('p').textContent = text;
    };

    let mount;
    try {
        ({ mount } = await import('./purble-place/src/index.js'));
    } catch (err) {
        try {
            await loadScript('addons/purble-place-bundle.js');
            mount = window.PurblePlaceBundle.mount;
        } catch {
            console.error(err);
            showProblem('The game files failed to load (' + err.message + ').');
            return;
        }
    }
    if (purbleWindow !== win) return; // closed while it was loading
    purble = mount(win.body, { onExit: () => win.close() });
    purble.focus();
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load ' + src));
        document.head.appendChild(script);
    });
}



// Desktop icons snap to a grid, like Windows: click an icon to select it, drag it
// anywhere and it snaps into the nearest cell (swapping with any icon already there).
// Positions are remembered in this browser. The grid's size and spacing come from
// .desktop-space in styles.css. Give an icon data-id="..." to keep its saved spot
// even if icons are reordered.


let deletedItems = JSON.parse(localStorage.getItem("deletedItems")) || [];

function moveToBin(icon) {
    const id = icon.dataset.id;

    if (id === "recycle-bin") return;

    if (!deletedItems.includes(id)) {
        deletedItems.push(id);
        localStorage.setItem("deletedItems", JSON.stringify(deletedItems));
    }

    icon.style.display = "none";
}

function restoreFromBin(id) {
    deletedItems = deletedItems.filter(item => item !== id);
    localStorage.setItem("deletedItems", JSON.stringify(deletedItems));

    const icon = document.querySelector(`.desktop-icon[data-id="${id}"]`);

    if (icon) {
        icon.style.display = "";
    }
}

(function () {
  'use strict';

  const STORAGE_KEY = 'desktop:icon-positions';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }

  function save(positions) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch { /* storage blocked */ }
  }

  function init() {
    const space = document.querySelector('.desktop-space');
    if (!space) return;
    const icons = [...space.querySelectorAll('.desktop-icon')];
    const idOf = (icon, i) => icon.dataset.id || String(i);
    const saved = load();

    // The grid as laid out by the CSS: where it starts, cell sizes, and how many cells fit.
    function grid() {
      const style = getComputedStyle(space);
      const rect = space.getBoundingClientRect();
      const columns = style.gridTemplateColumns.split(' ');
      const rows = style.gridTemplateRows.split(' ');
      return {
        left: rect.left + parseFloat(style.paddingLeft),
        top: rect.top + parseFloat(style.paddingTop),
        cellW: parseFloat(columns[0]) || 80,
        cellH: parseFloat(rows[0]) || 90,
        gapX: parseFloat(style.columnGap) || 0,
        gapY: parseFloat(style.rowGap) || 0,
        cols: Math.max(1, columns.length),
        rows: Math.max(1, rows.length),
      };
    }

    const cellOf = icon => (icon.dataset.col == null ? null : [Number(icon.dataset.col), Number(icon.dataset.row)]);
    const iconAt = (col, row, except) => icons.find(i => i !== except && i.dataset.col == col && i.dataset.row == row);

    function place(icon, col, row) {
      icon.dataset.col = col;
      icon.dataset.row = row;
      icon.style.gridColumn = String(col + 1);
      icon.style.gridRow = String(row + 1);
    }

    // First empty cell, filling down then across like Windows.
    function firstFree(g, except) {
      for (let col = 0; col < g.cols; col++) {
        for (let row = 0; row < g.rows; row++) if (!iconAt(col, row, except)) return [col, row];
      }
      return [0, 0];
    }

    function savePositions() {
      const positions = {};
      icons.forEach((icon, i) => { positions[idOf(icon, i)] = cellOf(icon); });
      save(positions);
    }

    // Put every icon in a cell: its saved spot if it still fits, otherwise the first free one.
    function layout() {
      const g = grid();
      icons.forEach(icon => { delete icon.dataset.col; delete icon.dataset.row; });
      icons.forEach((icon, i) => {
        const spot = saved[idOf(icon, i)];
        if (spot && spot[0] < g.cols && spot[1] < g.rows && !iconAt(spot[0], spot[1], icon)) place(icon, spot[0], spot[1]);
      });
      icons.forEach(icon => { if (!cellOf(icon)) place(icon, ...firstFree(g, icon)); });
    }

    function select(icon) {
      icons.forEach(i => i.classList.toggle('selected', i === icon));
    }

    icons.forEach(icon => {
      icon.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        select(icon);
        const start = { x: e.clientX, y: e.clientY };
        let dragging = false;
        icon.setPointerCapture(e.pointerId);

        const move = ev => {
          const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
          if (!dragging && Math.hypot(dx, dy) < 5) return; // a click, not a drag
          dragging = true;
          icon.classList.add('dragging');
          icon.style.transform = `translate(${dx}px, ${dy}px)`;
        };

        const up = ev => {
          icon.removeEventListener('pointermove', move);
          icon.removeEventListener('pointerup', up);
          icon.removeEventListener('pointercancel', up);
          if (!dragging) {
            openApp(icon.dataset.id);
            return;
}
          icon.classList.remove('dragging');
          icon.style.transform = '';

          // Snap to the cell under the pointer; an icon already there swaps into our old spot.
          const g = grid();
          const col = Math.min(g.cols - 1, Math.max(0, Math.floor((ev.clientX - g.left + g.gapX / 2) / (g.cellW + g.gapX))));
          const row = Math.min(g.rows - 1, Math.max(0, Math.floor((ev.clientY - g.top + g.gapY / 2) / (g.cellH + g.gapY))));
          const [oldCol, oldRow] = cellOf(icon);
          const other = iconAt(col, row, icon);
          if (other) place(other, oldCol, oldRow);
          place(icon, col, row);
          savePositions();
        };

        icon.addEventListener('pointermove', move);
        icon.addEventListener('pointerup', up);
        icon.addEventListener('pointercancel', up);
      });
    });

    // Clicking anywhere else clears the selection.
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest || !e.target.closest('.desktop-icon')) select(null);
    });

    // If the window shrinks, icons that no longer fit move to free cells.
    window.addEventListener('resize', () => {
      const g = grid();
      icons.forEach(icon => {
        const [col, row] = cellOf(icon);
        if (col >= g.cols || row >= g.rows) {
          delete icon.dataset.col;
          place(icon, ...firstFree(g, icon));
        }
      });
    });

    layout();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
