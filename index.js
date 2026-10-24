
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
            // alert("Purble Place opened!");
            break;
    }
}

// Desktop icons snap to a grid, like Windows: click an icon to select it, drag it
// anywhere and it snaps into the nearest cell (swapping with any icon already there).
// Positions are remembered in this browser. The grid's size and spacing come from
// .desktop-space in styles.css. Give an icon data-id="..." to keep its saved spot
// even if icons are reordered.
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
