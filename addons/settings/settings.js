/*
 * Control Panel: Windows 7 style settings for the HackNotts OS.
 *
 * Opened from the start menu's "Control Panel" (openApp('control-panel') in index.js), in a
 * window made by the OS's makeWindow(). Choices are saved in localStorage and applied every
 * time the OS loads (addons/addons.js calls SettingsApp.applySaved()).
 *
 * Pages: Personalization (wallpaper, window colour, transparency), Clippy, Internet Options,
 * Desktop, and System (information about this computer).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'settings:prefs';
  const DEFAULTS = { wallpaper: 'default', colour: 'default', transparency: true, intensity: 80, homepage: 'www.nottsnet.co.uk', year: 2006 };

  function loadPrefs() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return { ...DEFAULTS }; }
  }

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* storage blocked */ }
  }

  let prefs = loadPrefs();

  // ------------------------------------------------------------ wallpapers

  const svgUrl = svg => 'data:image/svg+xml,' + encodeURIComponent(svg);

  // Generated in code, so there are no extra image files: a few Windows 7-flavoured backgrounds.
  // 'default' is whatever index.html sets, so the OS owner can change it there.
  const osWallpaper = () => document.querySelector('.desktop > img');
  const originalWallpaper = osWallpaper() ? osWallpaper().getAttribute('src') : '';

  const WALLPAPERS = [
    { id: 'default', name: 'Default', src: originalWallpaper },
    { id: 'rolling-hills', name: 'Rolling Hills', src: 'images/rolling-hills.jpg' },
    { id: 'purble', name: 'Purble Place', src: 'images/purble-place.jpg' },
    {
      id: 'harmony', name: 'Harmony', src: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="g" cx="0.55" cy="0.45" r="0.8"><stop offset="0" stop-color="#3a8ee6"/><stop offset="0.55" stop-color="#0b4fa8"/><stop offset="1" stop-color="#04234f"/></radialGradient>
        <linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#bfe3ff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#g)"/>
        <path d="M-100 700 C 400 520, 900 760, 1700 380 L 1700 430 C 900 820, 400 580, -100 760 Z" fill="url(#s)"/>
        <path d="M-100 600 C 500 430, 1000 690, 1700 300 L 1700 320 C 1000 720, 500 470, -100 630 Z" fill="url(#s)" opacity="0.6"/></svg>`),
    },
    {
      id: 'aurora', name: 'Aurora', src: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b24"/><stop offset="1" stop-color="#16244f"/></linearGradient>
        <linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="#3cf0b4" stop-opacity="0"/><stop offset="0.5" stop-color="#3cf0b4" stop-opacity="0.6"/><stop offset="1" stop-color="#9b6cff" stop-opacity="0"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#n)"/>
        <path d="M0 420 C 400 200, 800 520, 1600 260 L 1600 360 C 800 620, 400 300, 0 520 Z" fill="url(#a)"/>
        <path d="M0 520 C 500 330, 900 600, 1600 380 L 1600 420 C 900 650, 500 380, 0 560 Z" fill="url(#a)" opacity="0.5"/></svg>`),
    },
    {
      id: 'sunset', name: 'Sunset', src: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1a5a"/><stop offset="0.55" stop-color="#e2533b"/><stop offset="0.8" stop-color="#ffb347"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#s)"/><circle cx="800" cy="660" r="140" fill="#ffd27a" opacity="0.9"/>
        <rect y="700" width="1600" height="200" fill="#2a1035" opacity="0.85"/></svg>`),
    },
    { id: 'blue', name: 'Solid Blue', src: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#2a6ab8"/></svg>') },
  ].filter((w, i, all) => w.src && all.findIndex(o => o.src === w.src) === i); // no blanks or duplicates of the default

  // ------------------------------------------------------- window colours

  // The Windows 7 window colour names, each as a light and a dark tint for the glass.
  const COLOURS = [
    { id: 'default', name: 'Default', light: null, dark: null, swatch: 'linear-gradient(135deg, #b2d0ec, #78a3cd)' },
    { id: 'sky', name: 'Sky', light: [120, 182, 240], dark: [52, 118, 196] },
    { id: 'twilight', name: 'Twilight', light: [70, 104, 160], dark: [22, 46, 96] },
    { id: 'sea', name: 'Sea', light: [86, 196, 186], dark: [20, 122, 120] },
    { id: 'leaf', name: 'Leaf', light: [132, 200, 92], dark: [52, 128, 40] },
    { id: 'lime', name: 'Lime', light: [196, 226, 84], dark: [120, 160, 30] },
    { id: 'sun', name: 'Sun', light: [250, 216, 96], dark: [206, 152, 20] },
    { id: 'pumpkin', name: 'Pumpkin', light: [248, 166, 84], dark: [200, 96, 20] },
    { id: 'blush', name: 'Blush', light: [240, 140, 150], dark: [190, 60, 80] },
    { id: 'violet', name: 'Violet', light: [176, 120, 210], dark: [104, 44, 150] },
    { id: 'lavender', name: 'Lavender', light: [200, 186, 240], dark: [130, 110, 190] },
    { id: 'taupe', name: 'Taupe', light: [196, 176, 156], dark: [128, 104, 84] },
    { id: 'chocolate', name: 'Chocolate', light: [150, 96, 70], dark: [86, 46, 30] },
    { id: 'slate', name: 'Slate', light: [150, 164, 178], dark: [84, 98, 112] },
    { id: 'frost', name: 'Frost', light: [236, 240, 246], dark: [190, 198, 210] },
  ].map(c => ({ ...c, swatch: c.swatch || `linear-gradient(135deg, rgb(${c.light}), rgb(${c.dark}))` }));

  // ------------------------------------------------------------- applying

  function apply() {
    const wallpaper = WALLPAPERS.find(w => w.id === prefs.wallpaper) || WALLPAPERS[0];
    const img = osWallpaper();
    if (img && img.getAttribute('src') !== wallpaper.src) img.src = wallpaper.src;

    // Window colour: settings.css tints windows, the taskbar and the start menu from these.
    // The OS keeps its own look until a colour, the transparency or the intensity is changed.
    const colour = COLOURS.find(c => c.id === prefs.colour) || COLOURS[0];
    const root = document.documentElement.style;
    root.setProperty('--glass-tint', (colour.light || [178, 208, 236]).join(', '));
    root.setProperty('--glass-tint-dark', (colour.dark || [120, 163, 205]).join(', '));
    root.setProperty('--glass-opacity', prefs.transparency ? prefs.intensity / 100 : 1);
    const custom = colour.light || !prefs.transparency || prefs.intensity !== DEFAULTS.intensity;
    if (custom) document.body.dataset.aero = colour.id;
    else delete document.body.dataset.aero;
    document.body.toggleAttribute('data-aero-solid', !prefs.transparency);

    if (window.RetroBrowser) window.RetroBrowser.configure({ homepage: prefs.homepage, year: Number(prefs.year) });
  }

  function set(changes) {
    Object.assign(prefs, changes);
    savePrefs();
    apply();
  }

  // ----------------------------------------------------------------- icons

  // Small Windows 7-ish icons, drawn here so there are no image files to manage.
  const ICONS = {
    panel: `<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="30" rx="3" fill="#3a8ee6" stroke="#1b5fbf" stroke-width="2"/><rect x="8" y="12" width="32" height="22" fill="#cfe7fa"/><rect x="18" y="38" width="12" height="4" fill="#78909c"/><rect x="12" y="42" width="24" height="3" rx="1" fill="#546e7a"/><circle cx="17" cy="20" r="3" fill="#f0a030"/><rect x="23" y="18" width="13" height="3" fill="#1b5fbf"/><rect x="12" y="26" width="24" height="3" fill="#1b5fbf"/></svg>`,
    personalise: `<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="30" rx="3" fill="#3a8ee6" stroke="#1b5fbf" stroke-width="2"/><rect x="8" y="12" width="32" height="22" fill="#8fd16b"/><path d="M8 28c8-8 14-2 20-6s12-2 12-2v14H8z" fill="#3e9d2f"/><circle cx="31" cy="18" r="3" fill="#fff59d"/><rect x="18" y="38" width="12" height="5" fill="#78909c"/></svg>`,
    clippy: `<svg viewBox="0 0 48 48"><path d="M16 12v26a8 8 0 0 0 16 0V8a6 6 0 0 0-12 0v26a4 4 0 0 0 8 0V14" fill="none" stroke="#4f5760" stroke-width="5" stroke-linecap="round"/><path d="M16 12v26a8 8 0 0 0 16 0V8a6 6 0 0 0-12 0v26a4 4 0 0 0 8 0V14" fill="none" stroke="#c9d1d9" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="18" r="4" fill="#fff" stroke="#222"/><circle cx="29" cy="17" r="4" fill="#fff" stroke="#222"/><circle cx="21" cy="18" r="1.8"/><circle cx="30" cy="17" r="1.8"/></svg>`,
    internet: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#3a8ee6" stroke="#1b5fbf" stroke-width="2"/><path d="M10 16c6 3 9 0 12 5s-3 8 3 11 3 9 3 9M29 6c-2 5 2 6 5 8s6 0 8 3" fill="none" stroke="#7fd36b" stroke-width="4" stroke-linecap="round"/></svg>`,
    desktop: `<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="30" rx="3" fill="#3a8ee6" stroke="#1b5fbf" stroke-width="2"/><rect x="8" y="12" width="32" height="22" fill="#cfe7fa"/><rect x="11" y="15" width="6" height="6" fill="#f0a030"/><rect x="11" y="24" width="6" height="6" fill="#4caf50"/><rect x="20" y="15" width="6" height="6" fill="#e53935"/><rect x="18" y="38" width="12" height="5" fill="#78909c"/></svg>`,
    system: `<svg viewBox="0 0 48 48"><rect x="12" y="4" width="24" height="40" rx="3" fill="#607d8b" stroke="#37474f" stroke-width="2"/><rect x="16" y="9" width="16" height="3" fill="#b0bec5"/><rect x="16" y="15" width="16" height="3" fill="#b0bec5"/><circle cx="24" cy="34" r="4" fill="#4caf50" stroke="#2e7d32"/></svg>`,
  };

  // ----------------------------------------------------------------- pages

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const PAGES = {
    home: {
      crumbs: [],
      render: () => `
        <h1>Adjust your computer's settings</h1>
        <div class="cp-categories">
          ${category('personalise', 'Appearance and Personalization', 'personalise', ['Change desktop background', 'Change window colours'])}
          ${category('clippy', 'Clippy', 'clippy', ['Show or hide Clippy', 'Tips and voice'])}
          ${category('internet', 'Network and Internet', 'internet', ['Change your home page', 'Choose the year of the web'])}
          ${category('desktop', 'Desktop', 'desktop', ['Tidy up desktop icons'])}
          ${category('system', 'System and Security', 'system', ['View basic information about your computer'])}
        </div>`,
    },

    personalise: {
      crumbs: ['Appearance and Personalization', 'Personalization'],
      render: () => `
        <h1>Change the visuals on your computer</h1>
        <p class="cp-lead">Click a picture to change the desktop background, or a colour to tint your windows and taskbar.</p>
        <h2>Desktop Background</h2>
        <div class="cp-wallpapers">
          ${WALLPAPERS.map(w => `<button class="cp-wallpaper${prefs.wallpaper === w.id ? ' selected' : ''}" data-wallpaper="${w.id}">
            <img src="${esc(w.src)}" alt=""><span>${esc(w.name)}</span></button>`).join('')}
        </div>
        <h2>Window Color and Appearance</h2>
        <div class="cp-colours">
          ${COLOURS.map(c => `<button class="cp-colour${prefs.colour === c.id ? ' selected' : ''}" data-colour="${c.id}" title="${esc(c.name)}">
            <span style="background: ${c.swatch}"></span></button>`).join('')}
        </div>
        <p class="cp-current">Current colour: <b>${esc((COLOURS.find(c => c.id === prefs.colour) || COLOURS[0]).name)}</b></p>
        <label class="cp-check"><input type="checkbox" id="cp-transparency" ${prefs.transparency ? 'checked' : ''}> Enable transparency</label>
        <label class="cp-slider">Colour intensity:
          <input type="range" id="cp-intensity" min="45" max="100" value="${prefs.intensity}" ${prefs.transparency ? '' : 'disabled'}></label>`,
    },

    clippy: {
      crumbs: ['Clippy'],
      render: () => {
        const c = window.Clippy ? window.Clippy.settings : null;
        if (!c) return '<h1>Clippy</h1><p>Clippy isn\'t running.</p>';
        return `
          <h1>Change how Clippy behaves</h1>
          <p class="cp-lead">Clippy is your desktop assistant. Click him, or press F1, to ask him anything.</p>
          <label class="cp-check"><input type="checkbox" id="cp-clippy-visible" ${c.visible ? 'checked' : ''}> Show Clippy on the desktop</label>
          <label class="cp-check"><input type="checkbox" id="cp-clippy-tips" ${c.tips ? 'checked' : ''}> Let Clippy pop up with tips</label>
          <label class="cp-check"><input type="checkbox" id="cp-clippy-voice" ${c.voice ? 'checked' : ''}> Read Clippy's replies aloud</label>`;
      },
    },

    internet: {
      crumbs: ['Network and Internet', 'Internet Options'],
      render: () => `
        <h1>Internet Options</h1>
        <h2>Home page</h2>
        <p class="cp-lead">The page the browser opens with, and goes to when you click Home.</p>
        <select id="cp-homepage">
          ${[['www.nottsnet.co.uk', 'NottsNet'], ['www.funforum.co.uk', 'FunForum'], ['www.youtube.com', 'YouTube']]
            .map(([value, label]) => `<option value="${value}" ${prefs.homepage === value ? 'selected' : ''}>${label} (http://${value}/)</option>`).join('')}
        </select>
        <h2>The year of the web</h2>
        <p class="cp-lead">Real websites are shown as they looked in this year, using the Wayback Machine.</p>
        <label class="cp-slider"><input type="range" id="cp-year" min="2004" max="2010" value="${prefs.year}"> <b id="cp-year-label">${prefs.year}</b></label>`,
    },

    desktop: {
      crumbs: ['Desktop'],
      render: () => `
        <h1>Tidy up the desktop</h1>
        <p class="cp-lead">Put every desktop icon back in its original place, down the left side of the screen.</p>
        <button class="cp-button" id="cp-reset-icons">Reset icon positions</button>`,
    },

    system: {
      crumbs: ['System and Security', 'System'],
      render: () => {
        const ua = navigator.userAgent;
        const browser = /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'a web browser';
        const host = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'an unknown system';
        const minutes = Math.round(performance.now() / 60000);
        return `
          <h1>View basic information about your computer</h1>
          <h2>Edition</h2>
          <table class="cp-info">
            <tr><td>Edition</td><td><b>HackNotts OS 7 Ultimate</b></td></tr>
            <tr><td>Copyright</td><td>Made at HackNotts 26, University of Nottingham</td></tr>
            <tr><td>Service Pack</td><td>Clippy Pack 1</td></tr>
          </table>
          <h2>System</h2>
          <table class="cp-info">
            <tr><td>Rating</td><td><span class="cp-rating">7.9</span> <a>Retro Experience Index</a></td></tr>
            <tr><td>Processor</td><td>${navigator.hardwareConcurrency || '?'} logical processors</td></tr>
            <tr><td>Installed memory (RAM)</td><td>${navigator.deviceMemory ? navigator.deviceMemory + ' GB (at least)' : 'Plenty (your browser keeps this secret)'}</td></tr>
            <tr><td>System type</td><td>Running in ${browser} on ${host}</td></tr>
            <tr><td>Screen</td><td>${screen.width} x ${screen.height}</td></tr>
            <tr><td>Saved data</td><td id="cp-storage">Checking...</td></tr>
            <tr><td>Up time</td><td>${minutes} minute${minutes === 1 ? '' : 's'}</td></tr>
          </table>
          <h2>Computer name and team</h2>
          <table class="cp-info">
            <tr><td>Computer name</td><td>HACKNOTTS-PC</td></tr>
            <tr><td>Workgroup</td><td>jomjoby (OS), Anand20003831 (Clippy and the browser), Adam, limit10k (FunForum), Manraj Rakhra (Purble Place)</td></tr>
          </table>`;
      },
    },
  };

  const PAGE_TITLES = { personalise: 'Personalization', clippy: 'Clippy', internet: 'Internet Options', desktop: 'Desktop', system: 'System' };

  function category(page, title, icon, links) {
    return `<div class="cp-category">
      <span class="cp-icon">${ICONS[icon]}</span>
      <div><a class="cp-category-title" data-page="${page}">${esc(title)}</a>
      ${links.map(l => `<a class="cp-sublink" data-page="${page}">${esc(l)}</a>`).join('')}</div>
    </div>`;
  }

  // ---------------------------------------------------------------- window

  let win = null;
  let trail = []; // pages visited, for the back and forward buttons
  let index = -1;

  function open(page = 'home') {
    if (win) {
      win.restore();
      win.focus();
      go(page);
      return;
    }
    if (typeof window.makeWindow !== 'function') return;
    win = window.makeWindow({
      id: 'control-panel',
      title: 'Control Panel',
      icon: 'data:image/svg+xml,' + encodeURIComponent(ICONS.panel.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')),
      width: 780,
      height: 520,
      minWidth: 520,
      minHeight: 360,
      onClose: () => { win = null; trail = []; index = -1; },
    });
    win.body.classList.add('cp-root');
    win.body.innerHTML = `
      <div class="cp-addressbar">
        <button class="cp-nav" data-step="-1" title="Back">&#9664;</button>
        <button class="cp-nav" data-step="1" title="Forward">&#9654;</button>
        <div class="cp-crumbs"></div>
      </div>
      <div class="cp-main">
        <nav class="cp-side">
          <a data-page="home">Control Panel Home</a>
          ${Object.entries(PAGE_TITLES).map(([page, title]) => `<a data-page="${page}">${title}</a>`).join('')}
          <div class="cp-seealso">See also<a data-page="clippy">Ask Clippy for help</a></div>
        </nav>
        <section class="cp-content"></section>
      </div>`;
    win.body.addEventListener('click', onClick);
    win.body.addEventListener('input', onInput);
    win.body.addEventListener('change', onChange);
    go(page);
  }

  function go(page, record = true) {
    if (!PAGES[page]) page = 'home';
    if (record) {
      trail = trail.slice(0, index + 1);
      if (trail[index] !== page) { trail.push(page); index++; }
    }
    render();
  }

  function render() {
    const page = trail[index];
    const crumbs = ['Control Panel', ...PAGES[page].crumbs];
    win.body.querySelector('.cp-crumbs').innerHTML = crumbs
      .map((c, i) => (i === 0 ? `<a data-page="home">${esc(c)}</a>` : `<span>${esc(c)}</span>`))
      .join('<i>&#9656;</i>');
    win.body.querySelectorAll('.cp-side a[data-page]').forEach(a => a.classList.toggle('current', a.dataset.page === page));
    win.body.querySelector('[data-step="-1"]').disabled = index <= 0;
    win.body.querySelector('[data-step="1"]').disabled = index >= trail.length - 1;
    const content = win.body.querySelector('.cp-content');
    content.innerHTML = PAGES[page].render();
    content.scrollTop = 0;
    if (page === 'system' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(e => {
        const cell = win && win.body.querySelector('#cp-storage');
        if (cell) cell.textContent = `${(e.usage / 1024 / 1024).toFixed(1)} MB used`;
      }).catch(() => {});
    } else {
      const cell = content.querySelector('#cp-storage');
      if (cell) cell.textContent = 'Unknown';
    }
  }

  function onClick(e) {
    const link = e.target.closest('[data-page]');
    if (link) { go(link.dataset.page); return; }
    const step = e.target.closest('[data-step]');
    if (step && !step.disabled) {
      index += Number(step.dataset.step);
      render();
      return;
    }
    const wallpaper = e.target.closest('[data-wallpaper]');
    if (wallpaper) { set({ wallpaper: wallpaper.dataset.wallpaper }); render(); return; }
    const colour = e.target.closest('[data-colour]');
    if (colour) { set({ colour: colour.dataset.colour }); render(); return; }
    if (e.target.id === 'cp-reset-icons') {
      try { localStorage.removeItem('desktop:icon-positions'); } catch { /* storage blocked */ }
      location.reload();
    }
  }

  // Sliders update live as they move.
  function onInput(e) {
    if (e.target.id === 'cp-intensity') set({ intensity: Number(e.target.value) });
    if (e.target.id === 'cp-year') win.body.querySelector('#cp-year-label').textContent = e.target.value;
  }

  function onChange(e) {
    const t = e.target;
    const clippy = window.Clippy;
    if (t.id === 'cp-transparency') { set({ transparency: t.checked }); render(); }
    else if (t.id === 'cp-year') set({ year: Number(t.value) });
    else if (t.id === 'cp-homepage') set({ homepage: t.value });
    else if (t.id === 'cp-clippy-visible' && clippy) (t.checked ? clippy.show() : clippy.hide());
    else if (t.id === 'cp-clippy-tips' && clippy) clippy.setChattiness(t.checked ? 'normal' : 'quiet');
    else if (t.id === 'cp-clippy-voice' && clippy) clippy.setVoice(t.checked);
  }

  window.SettingsApp = {
    open,
    applySaved: apply,
    get prefs() { return { ...prefs }; },
  };
})();
