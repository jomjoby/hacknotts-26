/*
 * RetroBrowser: a Firefox-on-Windows-7 style web browser for the HackNotts 26 OS.
 *
 * "Websites" are HTML files in this repo, registered with an address
 * (e.g. messenger.msn.com -> msn/index.html) and shown in iframes, one per tab.
 * Unknown addresses get a retro "Server not found" page; anything that isn't
 * an address goes to a fake search engine.
 *
 * Usage (at the end of <body>):
 *   <link rel="stylesheet" href="browser/browser.css">
 *   <script src="browser/browser.js"></script>
 *   <script>RetroBrowser.init({ launcher: '.desktop-icon', icon: 'images/Mozilla_Firefox_logo_2004.webp' });</script>
 */
(function () {
  'use strict';

  const config = {
    name: 'Mozilla Firefox',
    icon: '',                     // image used for the window, taskbar button and title bar
    homepage: 'www.nottsnet.co.uk',
    launcher: null,               // CSS selector for desktop icons that open the browser on double-click
    bottom: 80,                   // space to leave for the taskbar
    base: '',                     // prefix for site file paths, if the OS isn't at the site root
  };

  // ------------------------------------------------------------------ sites

  const sites = [];

  const normalise = address => address.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/\/+$/, '');

  // { address, aliases, title, src, description, icon, app }
  // app: an app id (like 'msn') announced to Clippy while the site is on screen.
  function registerSite(site) {
    const entry = Object.assign({ aliases: [], description: '', icon: '' }, site);
    entry.address = normalise(entry.address);
    entry.aliases = entry.aliases.map(normalise);
    const existing = sites.findIndex(s => s.address === entry.address);
    if (existing >= 0) sites[existing] = entry;
    else sites.push(entry);
  }

  const findSite = address => {
    const a = normalise(address);
    return sites.find(s => s.address === a || s.aliases.includes(a));
  };

  registerSite({
    address: 'www.nottsnet.co.uk',
    aliases: ['nottsnet', 'nottsnet.co.uk', 'home', 'about:home'],
    title: 'NottsNet - Your Gateway to the Web',
    src: 'browser/sites/home.html',
    description: 'The finest portal on the information superhighway. News, chat, search and more.',
  });

  registerSite({
    address: 'messenger.msn.com',
    aliases: ['msn', 'msn.com', 'www.msn.com', 'messenger', 'msn messenger', 'messenger.msn.co.uk'],
    title: 'MSN Messenger',
    src: 'msn/index.html',
    description: 'Chat with your friends online. Nudges, winks and personal messages included.',
    app: 'msn',
  });

  // -------------------------------------------------------------- helpers

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  const GLOBE = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#3a8ee6" stroke="#1b5fbf"/>' +
    '<path d="M3 5c2 1 3 0 4 2s-1 3 1 4 1 3 1 3M10 2c-1 2 1 2 2 3s2 0 3 1" fill="none" stroke="#7fd36b" stroke-width="1.6"/></svg>');

  const ICONS = {
    back: '<svg viewBox="0 0 16 16"><path d="M9 2 3 8l6 6V10h5V6H9z"/></svg>',
    forward: '<svg viewBox="0 0 16 16"><path d="m7 2 6 6-6 6v-4H2V6h5z"/></svg>',
    reload: '<svg viewBox="0 0 16 16"><path d="M13.5 8A5.5 5.5 0 1 1 11.6 3.8L10 5.4h4.5V1l-1.5 1.4A7.5 7.5 0 1 0 15.5 8z"/></svg>',
    stop: '<svg viewBox="0 0 16 16"><path d="m3 4.4 1.4-1.4L8 6.6 11.6 3 13 4.4 9.4 8l3.6 3.6-1.4 1.4L8 9.4 4.4 13 3 11.6 6.6 8z" fill="#c8361c"/></svg>',
    home: '<svg viewBox="0 0 16 16"><path d="M8 1.5 1 8h2v6.5h4v-4h2v4h4V8h2z"/></svg>',
    search: '<svg viewBox="0 0 16 16"><path d="M6.5 1a5.5 5.5 0 0 1 4.4 8.8l4 4-1.2 1.2-4-4A5.5 5.5 0 1 1 6.5 1zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/></svg>',
    min: '<svg viewBox="0 0 10 10"><rect x="1" y="6" width="8" height="2.5"/></svg>',
    max: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0zm2 3v5h6V3z"/></svg>',
    restore: '<svg viewBox="0 0 10 10"><path d="M2 0h8v7H8v3H0V3h2zm1 3v0h5v4h1V1H3zM1 5v4h6V5z"/></svg>',
    close: '<svg viewBox="0 0 10 10"><path d="m0 1.5 1.5-1.5L5 3.5 8.5 0 10 1.5 6.5 5 10 8.5 8.5 10 5 6.5 1.5 10 0 8.5 3.5 5z"/></svg>',
  };

  // Does a site's file exist yet? (So unfinished sites show "under construction", not a 404.)
  async function fileExists(src) {
    try {
      const res = await fetch(src, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch {
      return true; // can't check (e.g. opened as a file): just try loading it
    }
  }

  // ------------------------------------------------------- built-in pages

  const PAGE_STYLE = `
    body { margin: 0; font: 13px Verdana, Tahoma, sans-serif; color: #222; background: #eef2f7; }
    a { color: #0645ad; cursor: pointer; }
    .box { max-width: 560px; margin: 60px auto; padding: 24px 28px; background: #fff; border: 1px solid #b8c4d2; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
    h1 { margin: 0 0 12px; font: bold 20px Tahoma, sans-serif; color: #1b3d6b; }
    ul { padding-left: 20px; line-height: 1.7; }
    button { padding: 4px 14px; border: 1px solid #707070; border-radius: 3px; background: linear-gradient(#f2f2f2, #ebebeb 50%, #dddddd 51%, #cfcfcf); font: 12px Tahoma, sans-serif; cursor: pointer; }
    button:hover { border-color: #3c7fb1; background: linear-gradient(#eaf6fd, #d9f0fc 50%, #bee6fd 51%, #a7d9f5); }`;

  function errorPage(address) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Server not found</title><style>${PAGE_STYLE}
      .box { border-left: 6px solid #e8a33c; }
      .icon { float: left; margin: 0 16px 8px 0; font: bold 40px Georgia, serif; color: #e8a33c; }</style></head>
      <body><div class="box"><div class="icon">!</div><h1>Server not found</h1>
      <p>${escapeHtml(config.name)} can't find the server at <b>${escapeHtml(address)}</b>.</p>
      <ul>
        <li>Check the address for typing errors such as <b>ww</b>.example.com instead of <b>www</b>.example.com.</li>
        <li>Check your modem is plugged in, and that nobody has picked up the phone.</li>
        <li>This web only knows a few sites. Try <a data-goto="www.nottsnet.co.uk">NottsNet</a> or <a data-goto="messenger.msn.com">MSN Messenger</a>.</li>
      </ul>
      <p><button onclick="location.reload()">Try Again</button></p></div></body></html>`;
  }

  function missingPage(site) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(site.title)} - Under Construction</title><style>${PAGE_STYLE}
      body { background: repeating-linear-gradient(45deg, #ffd400 0 24px, #222 24px 48px); }
      .box { text-align: center; }</style></head>
      <body><div class="box"><h1>Under Construction!</h1>
      <p><b>${escapeHtml(site.title)}</b> is coming soon. Our webmasters are working round the clock (and on dial-up).</p>
      <p>Please check back later, or go back to <a data-goto="www.nottsnet.co.uk">NottsNet</a>.</p></div></body></html>`;
  }

  const JOKE_RESULTS = [
    { title: 'Free RAM Download - 100% Legit!!!', address: 'www.downloadmoreram.biz', description: 'Double your computer speed instantly. No viruses (probably).' },
    { title: 'Crazy Frog Ringtones - Text FROG to 87121', address: 'www.ringtones4u.co.uk', description: 'The hottest polyphonic ringtones for your Nokia 3310.' },
    { title: "Clippy's Fan Club - Members Area", address: 'www.clippyfans.org', description: 'It looks like you are searching for fun. Would you like help with that?' },
  ];

  function searchPage(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = sites.filter(s => words.some(w => [s.title, s.address, s.description, ...s.aliases].join(' ').toLowerCase().includes(w)));
    const results = [...matches, ...JOKE_RESULTS].map(r => `
      <div class="result"><a data-goto="${escapeHtml(r.address)}">${escapeHtml(r.title)}</a>
      <div class="url">http://${escapeHtml(r.address)}/</div><div>${escapeHtml(r.description)}</div></div>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(query)} - Notts Search</title><style>${PAGE_STYLE}
      body { background: #fff; }
      header { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid #c9d4e2; background: linear-gradient(#f5f9ff, #e3ecf8); }
      .logo { font: bold 26px Georgia, serif; color: #e25d00; text-shadow: 1px 1px 0 #fff; }
      .logo span { color: #1b5fbf; }
      form { display: flex; gap: 6px; }
      input { width: 320px; padding: 4px; border: 1px solid #8e9dad; font: 13px Verdana, sans-serif; }
      main { max-width: 640px; padding: 12px 20px; }
      .stats { color: #666; font-size: 11px; }
      .result { margin: 16px 0; line-height: 1.45; }
      .result a { font-size: 15px; }
      .url { color: #0a7d0a; font-size: 12px; }</style></head>
      <body><header><div class="logo">Notts<span>Search</span></div>
      <form data-search><input name="q" value="${escapeHtml(query)}"><button>Search</button></form></header>
      <main><div class="stats">Results 1 - ${matches.length + JOKE_RESULTS.length} for <b>${escapeHtml(query)}</b> (0.${Math.floor(Math.random() * 90 + 10)} seconds on dial-up)</div>
      ${matches.length ? '' : '<p>Your search did not match many documents. Here are some we found anyway:</p>'}${results}</main></body></html>`;
  }

  // ---------------------------------------------------------------- window

  let win = null; // the one browser window: { el, tabs, active, ... }
  let tabCounter = 0;
  let zTop = 100;

  const TEMPLATE = `
    <header class="rb-titlebar">
      <img class="rb-title-icon" alt="">
      <span class="rb-title"></span>
      <div class="rb-caption">
        <button class="rb-min" type="button" aria-label="Minimise">${ICONS.min}</button>
        <button class="rb-max" type="button" aria-label="Maximise">${ICONS.max}</button>
        <button class="rb-close" type="button" aria-label="Close">${ICONS.close}</button>
      </div>
    </header>
    <div class="rb-tabstrip"><button class="rb-newtab" type="button" title="Open a new tab">+</button></div>
    <div class="rb-body">
      <div class="rb-navbar">
        <div class="rb-keyhole">
          <button class="rb-back" type="button" title="Back">${ICONS.back}</button>
          <button class="rb-forward" type="button" title="Forward">${ICONS.forward}</button>
        </div>
        <form class="rb-field rb-urlbar">
          <img class="rb-url-icon" alt="">
          <input class="rb-url" type="text" spellcheck="false" autocomplete="off" aria-label="Address">
          <button class="rb-reload" type="button" title="Reload">${ICONS.reload}</button>
        </form>
        <form class="rb-field rb-searchbar">
          <span class="rb-engine">N</span>
          <input class="rb-search" type="text" placeholder="Notts Search" aria-label="Search">
          <button type="submit" title="Search">${ICONS.search}</button>
        </form>
        <button class="rb-tool rb-home" type="button" title="Home">${ICONS.home}</button>
      </div>
      <div class="rb-bookmarks"></div>
      <div class="rb-viewport"></div>
      <footer class="rb-status">
        <span class="rb-status-text">Done</span>
        <div class="rb-progress"><span></span></div>
        <span class="rb-zone">Internet | Protected Mode: On</span>
      </footer>
    </div>
    <div class="rb-resize"></div>`;

  const BOOKMARKS = [
    { label: 'NottsNet', address: 'www.nottsnet.co.uk' },
    { label: 'MSN Messenger', address: 'messenger.msn.com' },
    { label: 'Free Ringtones!!!', address: 'www.ringtones4u.co.uk' },
    { label: 'HackNotts', address: 'hacknotts.com' },
  ];

  const $ = sel => win.el.querySelector(sel);

  function open(address) {
    if (!win) build(address || config.homepage);
    else if (address) navigate(address);
    restore();
    focusWindow();
    return win.el;
  }

  function build(firstAddress) {
    const el = document.createElement('section');
    el.className = 'rb-window';
    el.dataset.appWindow = 'browser';
    el.dataset.title = config.name;
    el.innerHTML = TEMPLATE;
    const width = Math.min(960, innerWidth - 40);
    const height = Math.min(640, innerHeight - config.bottom - 40);
    Object.assign(el.style, {
      left: Math.max(10, (innerWidth - width) / 2) + 'px',
      top: Math.max(10, (innerHeight - config.bottom - height) / 2) + 'px',
      width: width + 'px',
      height: height + 'px',
    });
    document.body.appendChild(el);
    win = { el, tabs: [], active: null, maximized: false, restoreRect: null, taskbarBtn: null, progressTimer: null };

    $('.rb-title-icon').src = config.icon || GLOBE;
    $('.rb-min').addEventListener('click', minimise);
    $('.rb-max').addEventListener('click', toggleMaximise);
    $('.rb-close').addEventListener('click', close);
    $('.rb-newtab').addEventListener('click', () => newTab(config.homepage));
    $('.rb-back').addEventListener('click', () => step(-1));
    $('.rb-forward').addEventListener('click', () => step(1));
    $('.rb-reload').addEventListener('click', () => (win.active.loading ? stop() : reload()));
    $('.rb-home').addEventListener('click', () => navigate(config.homepage));
    $('.rb-urlbar').addEventListener('submit', e => { e.preventDefault(); navigate($('.rb-url').value); $('.rb-url').blur(); });
    $('.rb-url').addEventListener('focus', e => e.target.select());
    $('.rb-searchbar').addEventListener('submit', e => {
      e.preventDefault();
      const q = $('.rb-search').value.trim();
      if (q) go(win.active, searchEntry(q));
    });
    $('.rb-bookmarks').replaceChildren(...BOOKMARKS.map(b => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rb-bookmark';
      const icon = document.createElement('img');
      icon.src = (findSite(b.address) || {}).icon || GLOBE;
      icon.alt = '';
      button.append(icon, b.label);
      button.addEventListener('click', () => navigate(b.address));
      button.addEventListener('mouseenter', () => setStatus('http://' + b.address + '/'));
      button.addEventListener('mouseleave', () => setStatus(win.active.loading ? 'Loading...' : 'Done'));
      return button;
    }));

    el.addEventListener('pointerdown', focusWindow, true);
    el.addEventListener('keydown', onKey);
    setUpDragging();
    setUpResizing();
    addTaskbarButton();
    newTab(firstAddress);
  }

  function close() {
    if (!win) return;
    win.tabs.forEach(t => announceApp(t, null));
    win.el.remove();
    if (win.taskbarBtn) win.taskbarBtn.remove();
    win = null;
  }

  function minimise() {
    win.el.classList.add('rb-minimized');
    updateTaskbarButton();
  }

  function restore() {
    win.el.classList.remove('rb-minimized');
    updateTaskbarButton();
  }

  function focusWindow() {
    if (!win) return;
    win.el.style.zIndex = ++zTop;
    win.el.classList.remove('rb-inactive');
    updateTaskbarButton();
  }

  function toggleMaximise() {
    const style = win.el.style;
    if (win.maximized) {
      Object.assign(style, win.restoreRect);
      $('.rb-max').innerHTML = ICONS.max;
    } else {
      win.restoreRect = { left: style.left, top: style.top, width: style.width, height: style.height };
      Object.assign(style, { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight - config.bottom + 'px' });
      $('.rb-max').innerHTML = ICONS.restore;
    }
    win.maximized = !win.maximized;
    win.el.classList.toggle('rb-maximized', win.maximized);
  }

  // Drag by the title bar (pointer capture keeps working even over the page iframe).
  function setUpDragging() {
    const bar = $('.rb-titlebar');
    bar.addEventListener('dblclick', e => { if (!e.target.closest('.rb-caption')) toggleMaximise(); });
    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.rb-caption')) return;
      if (win.maximized) toggleMaximise();
      const rect = win.el.getBoundingClientRect();
      const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      bar.setPointerCapture(e.pointerId);
      win.el.classList.add('rb-busy');
      const move = ev => {
        win.el.style.left = clamp(ev.clientX - offset.x, 80 - rect.width, innerWidth - 80) + 'px';
        win.el.style.top = clamp(ev.clientY - offset.y, 0, innerHeight - config.bottom - 30) + 'px';
      };
      const up = () => {
        win.el.classList.remove('rb-busy');
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  }

  function setUpResizing() {
    const grip = $('.rb-resize');
    grip.addEventListener('pointerdown', e => {
      const start = { x: e.clientX, y: e.clientY, w: win.el.offsetWidth, h: win.el.offsetHeight };
      grip.setPointerCapture(e.pointerId);
      win.el.classList.add('rb-busy');
      const move = ev => {
        win.el.style.width = Math.max(480, start.w + ev.clientX - start.x) + 'px';
        win.el.style.height = Math.max(320, start.h + ev.clientY - start.y) + 'px';
      };
      const up = () => {
        win.el.classList.remove('rb-busy');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  }

  // A button on the OS taskbar while the browser is open: click to minimise or restore.
  function addTaskbarButton() {
    const taskbar = document.querySelector('.taskbar');
    if (!taskbar) return;
    const btn = document.createElement('div');
    btn.className = 'taskbar-btn rb-taskbar-btn';
    btn.title = config.name;
    const img = document.createElement('img');
    img.src = config.icon || GLOBE;
    img.alt = config.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      if (win.el.classList.contains('rb-minimized')) { restore(); focusWindow(); }
      else if (Number(win.el.style.zIndex) === zTop) minimise();
      else focusWindow();
    });
    taskbar.appendChild(btn);
    win.taskbarBtn = btn;
  }

  function updateTaskbarButton() {
    if (win && win.taskbarBtn) {
      win.taskbarBtn.classList.toggle('rb-focused', !win.el.classList.contains('rb-minimized') && Number(win.el.style.zIndex) === zTop);
    }
  }

  // ------------------------------------------------------------------- tabs

  function newTab(address) {
    const tab = { id: ++tabCounter, history: [], index: -1, title: 'New Tab', icon: GLOBE, loading: false, app: null };

    tab.tabEl = document.createElement('div');
    tab.tabEl.className = 'rb-tab';
    tab.tabEl.innerHTML = '<img class="rb-tab-icon" alt=""><span class="rb-tab-title"></span><button class="rb-tab-close" type="button" aria-label="Close tab">×</button>';
    tab.tabEl.addEventListener('pointerdown', e => { if (!e.target.closest('.rb-tab-close')) selectTab(tab); });
    tab.tabEl.addEventListener('auxclick', e => { if (e.button === 1) closeTab(tab); });
    tab.tabEl.querySelector('.rb-tab-close').addEventListener('click', () => closeTab(tab));
    $('.rb-tabstrip').insertBefore(tab.tabEl, $('.rb-newtab'));

    tab.frame = document.createElement('iframe');
    tab.frame.title = 'Web page';
    tab.frame.addEventListener('load', () => onFrameLoad(tab));
    $('.rb-viewport').appendChild(tab.frame);

    win.tabs.push(tab);
    selectTab(tab);
    if (address) navigate(address, tab);
    return tab;
  }

  function selectTab(tab) {
    win.active = tab;
    for (const t of win.tabs) {
      t.tabEl.classList.toggle('rb-active', t === tab);
      t.frame.hidden = t !== tab;
    }
    updateChrome();
  }

  function closeTab(tab) {
    if (win.tabs.length === 1) { close(); return; }
    announceApp(tab, null);
    const i = win.tabs.indexOf(tab);
    win.tabs.splice(i, 1);
    tab.tabEl.remove();
    tab.frame.remove();
    if (win.active === tab) selectTab(win.tabs[Math.min(i, win.tabs.length - 1)]);
  }

  // ------------------------------------------------------------- navigation

  const searchEntry = query => ({ kind: 'search', query, address: 'search.nottsnet.co.uk/?q=' + encodeURIComponent(query) });

  // Turn whatever was typed into a history entry: a known site, a search, or an error page.
  function entryFor(input) {
    const text = input.trim();
    if (!text) return null;
    const site = findSite(text);
    if (site) return { kind: 'site', address: site.address };
    const search = normalise(text).match(/^search\.nottsnet\.co\.uk\/\?q=(.*)$/);
    if (search) return searchEntry(decodeURIComponent(search[1]));
    const parent = findSite(normalise(text).split('/')[0]);
    if (parent) return { kind: 'missing', address: normalise(text) }; // a page we haven't built on a site we have
    if (!/\s/.test(text) && /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(normalise(text))) return { kind: 'error', address: normalise(text) };
    return searchEntry(text);
  }

  function navigate(input, tab = win && win.active) {
    if (!win) { open(input); return; }
    const entry = entryFor(input);
    if (entry) go(tab, entry);
  }

  function go(tab, entry) {
    tab.history = tab.history.slice(0, tab.index + 1);
    tab.history.push(entry);
    tab.index++;
    load(tab);
  }

  function step(delta) {
    const tab = win.active;
    const index = tab.index + delta;
    if (index < 0 || index >= tab.history.length) return;
    tab.index = index;
    load(tab);
  }

  const reload = () => load(win.active);

  function stop() {
    const tab = win.active;
    tab.loadId = (tab.loadId || 0) + 1;
    tab.loading = false;
    finishProgress('Stopped');
    updateChrome();
  }

  async function load(tab) {
    const entry = tab.history[tab.index];
    const loadId = (tab.loadId = (tab.loadId || 0) + 1);
    tab.loading = true;
    tab.expectedSrc = null;
    if (tab === win.active) startProgress('Opening page http://' + entry.address + '/...');
    updateChrome();

    let html = null, src = null;
    const site = entry.kind === 'site' && findSite(entry.address);
    if (site) {
      src = config.base + site.src;
      if (!(await fileExists(src))) html = missingPage(site);
    } else if (entry.kind === 'search') {
      html = searchPage(entry.query);
    } else if (entry.kind === 'missing') {
      html = missingPage({ title: 'This page' });
    } else {
      html = errorPage(entry.address);
    }

    await sleep(250 + Math.random() * 450); // the authentic dial-up wait
    if (!win || tab.loadId !== loadId) return;

    if (html) {
      tab.frame.removeAttribute('src');
      tab.frame.srcdoc = html;
    } else {
      tab.frame.removeAttribute('srcdoc');
      tab.expectedSrc = src;
      tab.frame.src = src;
    }
  }

  function onFrameLoad(tab) {
    // Ignore the empty about:blank load every new iframe fires.
    if (!win || !tab.history.length || !(tab.frame.hasAttribute('src') || tab.frame.hasAttribute('srcdoc'))) return;
    let doc = null;
    try { doc = tab.frame.contentDocument; } catch { /* cross-origin page */ }

    // If the page followed an ordinary link to another of our sites, keep the address bar in step.
    if (doc && tab.expectedSrc) {
      const path = tab.frame.contentWindow.location.pathname;
      const current = tab.history[tab.index];
      const landed = sites.find(s => path.endsWith('/' + s.src));
      if (landed && current.address !== landed.address) {
        tab.history = tab.history.slice(0, tab.index + 1);
        tab.history.push({ kind: 'site', address: landed.address });
        tab.index++;
      }
    }

    const entry = tab.history[tab.index];
    const site = entry.kind === 'site' && findSite(entry.address);
    tab.title = (doc && doc.title) || (site && site.title) || entry.address;
    tab.icon = (site && site.icon) || GLOBE;
    tab.loading = false;
    if (doc) hookPage(tab, doc);
    announceApp(tab, site && site.app, site && site.title);
    if (tab === win.active) finishProgress('Done');
    updateChrome();
  }

  // Make links and search forms inside pages drive the browser.
  //   <a data-goto="messenger.msn.com">  opens one of our sites
  //   <a href="http://...">             goes through the browser too (usually "Server not found")
  //   <form data-search><input name="q"> searches Notts Search
  function hookPage(tab, doc) {
    doc.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a');
      if (!a) return;
      const target = a.getAttribute('data-goto') || (/^https?:\/\//i.test(a.getAttribute('href') || '') ? a.getAttribute('href') : null);
      if (!target) return;
      e.preventDefault();
      if (a.target === '_blank' || e.ctrlKey || e.metaKey) newTab(target);
      else navigate(target, tab);
    });
    doc.addEventListener('submit', e => {
      if (!e.target.matches('[data-search]')) return;
      e.preventDefault();
      const q = String(new FormData(e.target).get('q') || '').trim();
      if (q) go(tab, searchEntry(q));
    });
    doc.addEventListener('mouseover', e => {
      const a = e.target.closest && e.target.closest('a');
      const target = a && (a.getAttribute('data-goto') || a.getAttribute('href'));
      if (tab === win.active && !tab.loading) setStatus(target && target !== '#' ? 'http://' + normalise(target) + '/' : 'Done');
    });
    doc.addEventListener('pointerdown', focusWindow);
    doc.addEventListener('keydown', onKey);
  }

  // Tell Clippy (and anything else listening) when an app like MSN is on screen in a tab.
  function announceApp(tab, app, title) {
    if (tab.app === app) return;
    if (tab.app) window.dispatchEvent(new CustomEvent('os:app-closed', { detail: { id: tab.app } }));
    tab.app = app || null;
    if (app) window.dispatchEvent(new CustomEvent('os:app-opened', { detail: { id: app, title } }));
  }

  // ---------------------------------------------------------------- chrome

  function updateChrome() {
    if (!win || !win.active) return;
    const tab = win.active;
    const entry = tab.history[tab.index];
    for (const t of win.tabs) {
      t.tabEl.classList.toggle('rb-loading', t.loading);
      t.tabEl.querySelector('.rb-tab-icon').src = t.icon;
      t.tabEl.querySelector('.rb-tab-title').textContent = t.loading && !t.title ? 'Loading...' : t.title;
      t.tabEl.title = t.title;
    }
    $('.rb-title').textContent = `${tab.title} - ${config.name}`;
    $('.rb-url-icon').src = tab.icon;
    if (document.activeElement !== $('.rb-url')) $('.rb-url').value = entry ? 'http://' + entry.address + (entry.kind === 'search' ? '' : '/') : '';
    $('.rb-back').disabled = tab.index <= 0;
    $('.rb-forward').disabled = tab.index >= tab.history.length - 1;
    const reloadBtn = $('.rb-reload');
    reloadBtn.innerHTML = tab.loading ? ICONS.stop : ICONS.reload;
    reloadBtn.title = tab.loading ? 'Stop' : 'Reload';
    if (entry && entry.kind === 'search' && document.activeElement !== $('.rb-search')) $('.rb-search').value = entry.query;
  }

  const setStatus = text => { if (win) $('.rb-status-text').textContent = text; };

  function startProgress(text) {
    setStatus(text);
    const bar = $('.rb-progress');
    const fill = bar.firstElementChild;
    bar.classList.add('rb-on');
    let p = 5;
    fill.style.width = p + '%';
    clearInterval(win.progressTimer);
    win.progressTimer = setInterval(() => {
      p = Math.min(90, p + Math.random() * 18);
      fill.style.width = p + '%';
    }, 120);
  }

  function finishProgress(text) {
    clearInterval(win.progressTimer);
    const bar = $('.rb-progress');
    bar.firstElementChild.style.width = '100%';
    setStatus(text);
    setTimeout(() => { if (win && !win.active.loading) bar.classList.remove('rb-on'); }, 300);
  }

  function onKey(e) {
    if (e.key === 'F5') { e.preventDefault(); reload(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.altKey && e.key === 'Home') { e.preventDefault(); navigate(config.homepage); }
  }

  // ------------------------------------------------------------------- API

  function init(options = {}) {
    Object.assign(config, options);
    if (config.launcher) {
      document.querySelectorAll(config.launcher).forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('dblclick', () => open());
      });
    }
    // Clippy can open and close the browser, and MSN lives inside it.
    window.addEventListener('clippy:open-app', e => {
      const id = (e.detail || {}).id;
      if (id === 'browser') open();
      const site = sites.find(s => s.app && s.app === id);
      if (!site) return;
      const showing = win && win.tabs.find(t => t.app === id);
      if (showing) { selectTab(showing); restore(); focusWindow(); }
      else open(site.address);
    });
    window.addEventListener('clippy:close-app', e => {
      const id = (e.detail || {}).id;
      if (!win) return;
      if (id === 'browser') close();
      else win.tabs.filter(t => t.app === id).forEach(closeTab);
    });
    if (window.Clippy) {
      window.Clippy.registerApp({ id: 'browser', name: config.name, aliases: ['browser', 'internet', 'web', 'firefox', 'mozilla', 'web browser', 'internet explorer', 'ie'] });
    }
    return window.RetroBrowser;
  }

  window.RetroBrowser = {
    init,
    open,
    close,
    navigate: address => (win ? navigate(address) : open(address)),
    newTab: address => (win ? newTab(address || config.homepage) : open(address)),
    registerSite,
    get sites() { return sites.map(s => ({ ...s })); },
  };
})();
