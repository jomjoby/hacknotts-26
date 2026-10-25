/*
 * RetroBrowser: a Firefox-on-Windows-7 style web browser for the HackNotts 26 OS.
 *
 * "Websites" are HTML files in this repo, registered with an address
 * (e.g. www.funforum.co.uk -> addons/forum/fhome.html) and shown in iframes, one per tab.
 * Unknown addresses get a retro "Server not found" page; anything that isn't
 * an address goes to a fake search engine.
 *
 * Usage (at the end of <body>):
 *   <link rel="stylesheet" href="addons/browser/browser.css">
 *   <script src="addons/browser/browser.js"></script>
 *   <script>RetroBrowser.init({ launcher: '.desktop-icon', icon: 'images/Mozilla_Firefox_logo_2004.webp' });</script>
 */
(function () {
  'use strict';

  const config = {
    name: 'Mozilla Firefox',
    icon: '',                     // image used for the window, taskbar button and title bar
    homepage: 'www.nottsnet.co.uk',
    launcher: null,               // CSS selector for desktop icons that open the browser on double-click
    taskbar: null,                // CSS selector for a taskbar to add a button to while open (optional)
    bottom: 80,                   // space to leave for the taskbar
    base: '',                     // prefix for site file paths, if the OS isn't at the site root
    year: 2006,                   // real websites are shown as they were in this year (via the Wayback Machine)
  };

  // Real websites can't be shown live: almost all of them (Google, Bing...) tell browsers not to
  // display them inside another page. The Wayback Machine's archived copies can be, which also
  // makes them look properly 2000s. Famous sites get a shortcut and their best retro year.
  const FAMOUS = {
    google: ['www.google.com', 2005, 'Google'],
    myspace: ['www.myspace.com', 2006, 'MySpace'],
    bebo: ['www.bebo.com', 2007, 'Bebo'],
    facebook: ['www.facebook.com', 2006, 'Facebook'],
    wikipedia: ['www.wikipedia.org', 2005, 'Wikipedia'],
    bbc: ['news.bbc.co.uk', 2005, 'BBC News'],
    yahoo: ['www.yahoo.com', 2005, 'Yahoo!'],
    amazon: ['www.amazon.co.uk', 2005, 'Amazon.co.uk'],
    ebay: ['www.ebay.co.uk', 2005, 'eBay'],
    neopets: ['www.neopets.com', 2004, 'Neopets'],
    hotmail: ['www.hotmail.com', 2004, 'Hotmail'],
    geocities: ['www.geocities.com', 2004, 'GeoCities'],
  };

  const famousFor = address => {
    const domain = normalise(address).split('/')[0];
    return Object.values(FAMOUS).find(([host]) => host === domain || host.replace(/^www\./, '') === domain.replace(/^www\./, ''));
  };

  // The few real sites that allow being shown live inside another page.
  const LIVE_HOSTS = /(^|\.)wikipedia\.org$/;

  // "if_" asks for the archived page without the Wayback Machine's own toolbar.
  const waybackUrl = entry => `https://web.archive.org/web/${entry.year}if_/http://${entry.address}${entry.address.includes('/') ? '' : '/'}`;
  const liveUrl = entry => 'https://' + entry.address;
  const favicon = address => `https://icons.duckduckgo.com/ip3/${hostOf(address)}.ico`;

  // ------------------------------------------------------------------ sites

  const sites = [];

  // "HTTP://WWW.Example.com/Some_Page/" -> "www.example.com/Some_Page" (paths keep their case).
  const normalise = address => {
    const a = address.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '');
    const slash = a.indexOf('/');
    return slash < 0 ? a.toLowerCase() : a.slice(0, slash).toLowerCase() + a.slice(slash);
  };
  const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };
  const hostOf = address => normalise(address).split('/')[0];
  const looksLikeAddress = text => !/\s/.test(text.trim()) && /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(normalise(text));

  // { address, aliases, title, src, description, icon, app, paths }
  // app: an app id (like 'forum') announced to Clippy while the site is on screen.
  // paths: true if the page handles its own sub-pages. Then "site.com/watch?v=1" opens the page
  //   with "#watch?v=1" on the end, and the page can tell the browser when it changes (see site.js).
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
    src: 'addons/browser/sites/home.html',
    description: 'The finest portal on the information superhighway. News, chat, search and more.',
  });

  // A 2006-style YouTube with real videos that play (YouTube's embed player is allowed in other
  // pages; the archived 2006 site's Flash player can't play anything any more).
  registerSite({
    address: 'www.youtube.com',
    aliases: ['youtube', 'youtube.com', 'www.youtube.co.uk', 'youtube.co.uk', 'you tube'],
    title: 'YouTube - Broadcast Yourself',
    src: 'addons/browser/sites/youtube.html',
    description: 'Watch the classics: Evolution of Dance, Charlie bit my finger, Keyboard Cat and more. Or paste any YouTube link.',
    paths: true,
  });

  // FunForum: the team's community forum and chat (addons/forum/). It took
  // over from MSN Messenger, so the old MSN addresses lead here too. Each page gets its own
  // address so the address bar follows the forum's own links.
  const FORUM_DESCRIPTION = 'The friendliest community chat on the web. General, Games, Movies & TV and Sports channels.';
  registerSite({
    address: 'www.funforum.co.uk',
    aliases: ['funforum', 'fun forum', 'forum', 'funforum.co.uk', 'www.funforum.com', 'funforum.com',
      'msn', 'msn.com', 'www.msn.com', 'messenger', 'msn messenger', 'messenger.msn.com', 'chat'],
    title: 'FunForum',
    src: 'addons/forum/fhome.html',
    description: FORUM_DESCRIPTION,
    app: 'forum',
  });
  registerSite({ address: 'www.funforum.co.uk/forum', title: 'FunForum - Forum', src: 'addons/forum/forum.html', description: FORUM_DESCRIPTION, app: 'forum' });
  registerSite({ address: 'www.funforum.co.uk/news', title: 'FunForum - News', src: 'addons/forum/fabout.html', description: FORUM_DESCRIPTION, app: 'forum' });
  registerSite({ address: 'www.funforum.co.uk/login', title: 'FunForum - Login', src: 'addons/forum/flog.html', description: FORUM_DESCRIPTION, app: 'forum' });

  // -------------------------------------------------------------- helpers

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Added to our own pages' addresses so browsers don't show stale copies while we're editing them.
  const FRESH = '?v=' + Date.now();
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

  function errorPage(address, offline) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${offline ? 'Offline' : 'Server not found'}</title><style>${PAGE_STYLE}
      .box { border-left: 6px solid #e8a33c; }
      .icon { float: left; margin: 0 16px 8px 0; font: bold 40px Georgia, serif; color: #e8a33c; }</style></head>
      <body><div class="box"><div class="icon">!</div><h1>${offline ? "You're offline" : 'Server not found'}</h1>
      <p>${offline
        ? `${escapeHtml(config.name)} needs an internet connection to visit <b>${escapeHtml(address)}</b>.`
        : `${escapeHtml(config.name)} can't find the server at <b>${escapeHtml(address)}</b>.`}</p>
      <ul>
        <li>Check the address for typing errors such as <b>ww</b>.example.com instead of <b>www</b>.example.com.</li>
        <li>Check your modem is plugged in, and that nobody has picked up the phone.</li>
        <li>Our own sites always work: try <a data-goto="www.nottsnet.co.uk">NottsNet</a> or <a data-goto="www.funforum.co.uk">FunForum</a>.</li>
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

  // Made-up sites from our pages: these get "Server not found" rather than a Wayback lookup.
  const FAKE_SITES = new Set(JOKE_RESULTS.map(r => r.address));

  async function getJson(url, timeout = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  const plainText = html => new DOMParser().parseFromString(html, 'text/html').body.textContent;
  const shorten = (text, max = 180) => (text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '...' : text);

  // Real results with no account or key: DuckDuckGo instant answers (a topic's official site),
  // a Wayback check for www.<word>.com, and Wikipedia search. Anything that fails is skipped.
  async function webResults(query) {
    if (navigator.onLine === false) return [];
    const q = encodeURIComponent(query);
    const word = /^[a-z0-9-]+$/i.test(query) ? query.toLowerCase() : null;
    const [ddg, wiki, guess] = await Promise.all([
      getJson(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`),
      getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&origin=*&srlimit=6`),
      word ? getJson(`https://archive.org/wayback/available?url=${word}.com&timestamp=${config.year}`) : null,
    ]);

    const results = [];
    for (const r of (ddg && ddg.Results) || []) {
      const host = hostOf(r.FirstURL);
      results.push({
        title: `${ddg.Heading || host} - Official Site`,
        address: host,
        description: shorten(ddg.AbstractText || r.Text || `The official ${ddg.Heading || host} website.`),
      });
    }
    const snapshot = guess && guess.archived_snapshots && guess.archived_snapshots.closest;
    if (snapshot && snapshot.available) {
      results.push({
        title: `www.${word}.com`,
        address: `www.${word}.com`,
        description: `The ${word} website, as it looked in ${snapshot.timestamp.slice(0, 4)}.`,
      });
    }
    for (const page of (wiki && wiki.query && wiki.query.search) || []) {
      results.push({
        title: `${page.title} - Wikipedia`,
        address: 'en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
        description: shorten(plainText(page.snippet)),
      });
    }
    return results;
  }

  async function searchPage(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const ours = sites
      .filter(s => words.some(w => [s.title, s.address, s.description, ...s.aliases].join(' ').toLowerCase().includes(w)))
      .map(s => ({ title: s.title, address: s.address, description: s.description, ours: true }));
    const famous = Object.entries(FAMOUS)
      .filter(([key, [host, , name]]) => words.some(w => key.includes(w) || host.includes(w) || name.toLowerCase().includes(w)))
      .map(([, [host, year, name]]) => ({ title: `${name} (${year})`, address: host, description: `Visit ${name} as it was in ${year}, courtesy of the Wayback Machine.` }));
    const web = await webResults(query.trim());

    const addresses = new Set();
    const results = [...ours, ...famous, ...web].filter(r => !addresses.has(r.address) && addresses.add(r.address));
    const all = [...results, JOKE_RESULTS[Math.floor(Math.random() * JOKE_RESULTS.length)]];

    const item = r => `
      <a class="result" data-goto="${escapeHtml(r.address)}">
        <img src="${r.ours ? GLOBE : escapeHtml(favicon(r.address))}" alt="" onerror="this.src='${GLOBE}'">
        <span class="text">
          <span class="title">${escapeHtml(r.title)}</span>
          <span class="url">http://${escapeHtml(decode(r.address))}${r.address.includes('/') ? '' : '/'}</span>
          <span class="desc">${escapeHtml(r.description)}</span>
        </span>
      </a>`;

    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(query)} - Notts Search</title><style>
      body { margin: 0; min-height: 100vh; font: 13px "Segoe UI", Tahoma, sans-serif; color: #1e395b;
        background: linear-gradient(#d8e7f6, #f4f8fc 220px, #ffffff 420px); }
      header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 18px; padding: 12px 22px;
        background: linear-gradient(rgba(255,255,255,.75), rgba(214,231,248,.75)); backdrop-filter: blur(8px);
        border-bottom: 1px solid #a9c4e2; box-shadow: 0 1px 0 #fff inset, 0 2px 8px rgba(30,57,91,.12); }
      .logo { font: 26px "Segoe UI Light", "Segoe UI", sans-serif; color: #1e5ab0; letter-spacing: -1px; }
      .logo b { color: #f07c00; font-weight: 600; }
      form { display: flex; flex: 1; max-width: 520px; }
      input { flex: 1; height: 30px; padding: 0 12px; border: 1px solid #8eb4da; border-right: 0; border-radius: 15px 0 0 15px;
        font: 14px "Segoe UI", sans-serif; background: #fff; box-shadow: inset 0 1px 3px rgba(0,0,0,.12); outline: none; }
      input:focus { border-color: #3c7fb1; box-shadow: inset 0 1px 3px rgba(0,0,0,.12), 0 0 6px #8ec7f2; }
      button { width: 46px; height: 32px; border: 1px solid #2a5d9a; border-radius: 0 15px 15px 0; cursor: pointer;
        background: radial-gradient(circle at 50% 20%, #bfe0ff, #5c9fe3 45%, #2466b8 75%, #3d86d6); box-shadow: inset 0 1px 0 rgba(255,255,255,.7); }
      button svg { width: 15px; height: 15px; fill: #fff; filter: drop-shadow(0 1px 0 rgba(0,0,0,.4)); }
      main { max-width: 680px; padding: 14px 22px 30px; }
      .stats { margin-bottom: 8px; color: #5b7392; font-size: 12px; }
      .result { display: flex; gap: 10px; margin: 6px -10px; padding: 10px; border: 1px solid transparent; border-radius: 4px;
        text-decoration: none; color: inherit; cursor: pointer; }
      .result:hover { border-color: #7da2ce; background: linear-gradient(#f2f9fd, #dceffd); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); }
      .result img { flex: none; width: 16px; height: 16px; margin-top: 3px; }
      .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .title { font-size: 16px; color: #0645ad; }
      .result:hover .title { text-decoration: underline; }
      .url { overflow: hidden; color: #1e8a3a; font-size: 12px; white-space: nowrap; text-overflow: ellipsis; }
      .desc { color: #333; line-height: 1.45; }
      .note { padding: 10px 12px; border: 1px solid #e3c96a; border-radius: 4px; background: linear-gradient(#fffbe6, #fff3c4); }
    </style></head><body>
      <header>
        <div class="logo">Notts<b>Search</b></div>
        <form data-search><input name="q" value="${escapeHtml(query)}" aria-label="Search">
          <button aria-label="Search">${ICONS.search}</button></form>
      </header>
      <main>
        <div class="stats">Results 1 - ${all.length} for <b>${escapeHtml(query)}</b> (0.${Math.floor(Math.random() * 90 + 10)} seconds on dial-up)</div>
        ${web.length || navigator.onLine !== false ? '' : '<p class="note">You seem to be offline, so only our own sites turned up.</p>'}
        ${all.map(item).join('')}
      </main>
    </body></html>`;
  }

  // ---------------------------------------------------------------- window

  let win = null; // the one browser window: { el, tabs, active, ... }
  let tabCounter = 0;
  // Windows from the OS and the browser share one stack: whichever was clicked last is on top.
  const topZ = () => Math.max(100, ...[...document.querySelectorAll('[data-app-window]')].map(w => Number(w.style.zIndex) || 0));
  const isTop = () => win && Number(win.el.style.zIndex) >= topZ();

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
    { label: 'FunForum', address: 'www.funforum.co.uk' },
    { label: 'Google', address: 'www.google.com' },
    { label: 'YouTube', address: 'www.youtube.com' },
    { label: 'MySpace', address: 'www.myspace.com' },
    { label: 'BBC News', address: 'news.bbc.co.uk' },
    { label: 'Free Ringtones!!!', address: 'www.ringtones4u.co.uk' },
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
    $('.rb-url-icon').addEventListener('error', e => { e.target.src = GLOBE; });
    $('.rb-min').addEventListener('click', minimise);
    $('.rb-max').addEventListener('click', toggleMaximise);
    $('.rb-close').addEventListener('click', close);
    $('.rb-newtab').addEventListener('click', () => newTab(config.homepage));
    $('.rb-back').addEventListener('click', () => step(-1));
    $('.rb-forward').addEventListener('click', () => step(1));
    $('.rb-reload').addEventListener('click', () => (win.active.loading ? stop() : reload()));
    $('.rb-home').addEventListener('click', () => navigate(config.homepage));
    $('.rb-urlbar').addEventListener('submit', e => {
      e.preventDefault();
      const typed = $('.rb-url').value;
      $('.rb-url').blur(); // so the address bar shows the tidied-up address
      navigate(typed);
    });
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
    const el = win.el;
    win.tabs.forEach(t => announceApp(t, null));
    if (win.taskbarBtn) win.taskbarBtn.remove();
    win = null;
    el.classList.add('rb-closing');
    el.addEventListener('animationend', e => {
        if (e.target === el) el.remove();
    });
}

  function minimise() {
    const el = win.el;
    const btn = win.taskbarBtn;
    if (!btn) { el.classList.add('rb-minimized'); updateTaskbarButton(); return; }
    if (el.classList.contains('rb-minimising')) return;
    const w = el.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    el.style.setProperty('--min-x', (b.left + b.width / 2) - (w.left + w.width / 2) + 'px');
    el.style.setProperty('--min-y', (b.top + b.height / 2) - (w.top + w.height / 2) + 'px');
    el.classList.add('rb-minimising');

    const done = e => {
        if (e.target !== el) return;
        el.removeEventListener('animationend', done);
        el.classList.remove('rb-minimising');
        el.classList.add('rb-minimized');
        updateTaskbarButton();
  };
    el.addEventListener('animationend', done);
  }

  function restore() {
    const el = win.el;
    const wasMinimised = el.classList.contains('rb-minimized');
    el.classList.remove('rb-minimized');
    if (wasMinimised && win.taskbarBtn) { // only animate back from the taskbar if it was actually minimised
        const w = el.getBoundingClientRect();
        const b = win.taskbarBtn.getBoundingClientRect();
        const dx = (b.left + b.width / 2) - (w.left + w.width / 2);
        const dy = (b.top + b.height / 2) - (w.top + w.height / 2);
        el.animate([
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.1)` },
            { opacity: 1, transform: 'none' }
        ], { duration: 250, easing: 'ease-out' });
    }
    updateTaskbarButton();
  }

  function focusWindow() {
    if (!win) return;
    if (!win.el.style.zIndex || !isTop()) win.el.style.zIndex = topZ() + 1;
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

  // If asked to, put a button on the OS taskbar while the browser is open: click to minimise or restore.
  // Without one, RetroBrowser.open() (or the launcher icon) brings a minimised browser back.
  function addTaskbarButton() {
    const taskbar = config.taskbar && document.querySelector(config.taskbar);
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
      else if (isTop()) minimise();
      else focusWindow();
    });
    taskbar.insertBefore(btn, taskbar.querySelector('.taskbar-clock')); // keep the OS clock at the far right
    win.taskbarBtn = btn;
  }

  function updateTaskbarButton() {
    if (win && win.taskbarBtn) {
      win.taskbarBtn.classList.toggle('rb-focused', !win.el.classList.contains('rb-minimized') && isTop());
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
    tab.tabEl.querySelector('.rb-tab-icon').addEventListener('error', e => { e.target.src = GLOBE; });
    $('.rb-tabstrip').insertBefore(tab.tabEl, $('.rb-newtab'));

    tab.frame = null;
    makeFrame(tab, {});
    tab.overlay = document.createElement('div');
    tab.overlay.className = 'rb-connecting';
    tab.overlay.hidden = true;
    $('.rb-viewport').appendChild(tab.overlay);

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
      t.overlay.hidden = t !== tab || !t.connecting;
    }
    updateChrome();
  }

  // Each page gets a fresh iframe, with its address set before it goes in the page, so the old
  // page disappears straight away and we can tell when a slow real website actually arrives.
  function makeFrame(tab, { src, srcdoc, sandboxed }) {
    const frame = document.createElement('iframe');
    frame.title = 'Web page';
    if (sandboxed) frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    if (srcdoc != null) frame.srcdoc = srcdoc;
    else if (src) frame.src = src;
    frame.hidden = win.active !== tab;
    frame.addEventListener('load', () => onFrameLoad(tab));
    if (tab.frame) tab.frame.replaceWith(frame);
    else $('.rb-viewport').appendChild(frame);
    tab.frame = frame;
    return frame;
  }

  function showConnecting(tab, title, text, actions = []) {
    tab.connecting = true;
    tab.overlay.innerHTML = `<div class="rb-connecting-box"><img class="rb-connecting-icon" alt="">
      <div><b></b><p></p><div class="rb-connecting-actions"></div></div></div>`;
    tab.overlay.querySelector('img').src = GLOBE;
    tab.overlay.querySelector('b').textContent = title;
    tab.overlay.querySelector('p').textContent = text;
    tab.overlay.querySelector('.rb-connecting-actions').append(...actions.map(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      return button;
    }));
    tab.overlay.hidden = tab !== win.active;
  }

  function hideConnecting(tab) {
    tab.connecting = false;
    tab.overlay.hidden = true;
  }

  // A real website has arrived once its page belongs to another site, and we can no longer look inside it.
  function watchArrival(tab, loadId, entry) {
    const started = Date.now();
    const timer = setInterval(() => {
      if (!win || tab.loadId !== loadId) { clearInterval(timer); return; }
      if (arrived(tab)) {
        clearInterval(timer);
        hideConnecting(tab);
        onFrameLoad(tab);
      } else if (Date.now() - started > 30000) {
        clearInterval(timer);
        showConnecting(tab, 'This is taking ages...', entry.kind === 'web'
          ? `The Wayback Machine might be busy, or it may not have a copy of ${entry.address}.`
          : `${entry.address} isn't responding.`, [
          ['Try again', () => load(tab)],
          ['Open in a real tab', () => window.open(entry.kind === 'web' ? waybackUrl(entry).replace('if_/', '/') : liveUrl(entry), '_blank', 'noopener')],
        ]);
        if (tab === win.active) finishProgress('Timed out');
      }
    }, 250);
  }

  function arrived(tab) {
    try { return !tab.frame.contentDocument; } catch { return true; }
  }

  function closeTab(tab) {
    if (win.tabs.length === 1) { close(); return; }
    announceApp(tab, null);
    const i = win.tabs.indexOf(tab);
    win.tabs.splice(i, 1);
    tab.tabEl.remove();
    tab.frame.remove();
    tab.overlay.remove();
    if (win.active === tab) selectTab(win.tabs[Math.min(i, win.tabs.length - 1)]);
  }

  // ------------------------------------------------------------- navigation

  const searchEntry = query => ({ kind: 'search', query, address: 'search.nottsnet.co.uk/?q=' + encodeURIComponent(query) });

  // Turn whatever was typed into a history entry:
  //   site    one of ours (a file in this repo)
  //   web     a real website, shown as it was in the 2000s via the Wayback Machine
  //   live    a real website that allows being shown live (Wikipedia)
  //   search  Notts Search results
  //   missing / error   pages we haven't built, made-up sites
  function entryFor(input) {
    const text = input.trim();
    if (!text) return null;
    const site = findSite(text);
    if (site) return { kind: 'site', address: site.address };
    const search = normalise(text).match(/^search\.nottsnet\.co\.uk\/\?q=(.*)$/);
    if (search) return searchEntry(decode(search[1]));
    const shortcut = FAMOUS[text.toLowerCase()];
    if (shortcut) return { kind: 'web', address: shortcut[0], year: shortcut[1], title: `${shortcut[2]} (${shortcut[1]})` };
    if (!looksLikeAddress(text)) return searchEntry(text);

    const address = normalise(text);
    const host = hostOf(address);
    const owner = findSite(host);
    if (owner && owner.paths) return { kind: 'site', site: owner.address, address, hash: address.slice(address.indexOf('/') + 1) };
    if (owner) return { kind: 'missing', address }; // a page we haven't built on a site we have
    if (FAKE_SITES.has(host)) return { kind: 'error', address };
    if (LIVE_HOSTS.test(host)) return { kind: 'live', address, title: decode(address.split('/').pop()).replace(/_/g, ' ') };
    const famous = famousFor(address);
    const year = famous ? famous[1] : config.year;
    return { kind: 'web', address, year, title: `${famous ? famous[2] : host} (${year})` };
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
    hideConnecting(tab);
    finishProgress('Stopped');
    updateChrome();
  }

  async function load(tab) {
    const entry = tab.history[tab.index];
    const loadId = (tab.loadId = (tab.loadId || 0) + 1);
    tab.loading = true;
    tab.expectedSrc = null;
    if (tab === win.active) {
      startProgress(entry.kind === 'web' ? `Dialling up ${entry.address} in ${entry.year} (via the Wayback Machine)...`
        : entry.kind === 'search' ? `Searching for "${entry.query}"...`
          : 'Opening page http://' + entry.address + '/...');
    }
    if (entry.kind === 'web' || entry.kind === 'live') tab.title = entry.title || entry.address;
    updateChrome();
    if (entry.kind === 'web' || entry.kind === 'live') {
      showConnecting(tab, `Connecting to ${decode(entry.address)}...`, entry.kind === 'web'
        ? `Fetching the ${entry.year} version from the Wayback Machine. Old sites can take a little while.`
        : 'Fetching the page.');
    } else {
      hideConnecting(tab);
    }

    let html = null, src = null;
    const site = entry.kind === 'site' && findSite(entry.site || entry.address);
    const external = entry.kind === 'web' || entry.kind === 'live';
    if (site) {
      src = config.base + site.src + FRESH + (entry.hash ? '#' + entry.hash : '');
      if (!(await fileExists(src))) html = missingPage(site);
    } else if (external) {
      if (navigator.onLine === false) html = errorPage(entry.address, true);
      else src = entry.kind === 'web' ? waybackUrl(entry) : liveUrl(entry);
    } else if (entry.kind === 'search') {
      html = await searchPage(entry.query);
    } else if (entry.kind === 'missing') {
      html = missingPage({ title: 'This page' });
    } else {
      html = errorPage(entry.address);
    }

    await sleep(250 + Math.random() * 450); // the authentic dial-up wait
    if (!win || tab.loadId !== loadId) return;

    hideConnecting(tab);
    tab.expectedSrc = site && !html ? src : null;
    // Real websites run in a sandbox, so old "break out of frames" scripts can't take over the whole OS.
    makeFrame(tab, html ? { srcdoc: html } : { src, sandboxed: external });
    if (external && !html) {
      showConnecting(tab, `Connecting to ${decode(entry.address)}...`, entry.kind === 'web'
        ? `Fetching the ${entry.year} version from the Wayback Machine. Old sites can take a little while.`
        : 'Fetching the page.');
      watchArrival(tab, loadId, entry);
    }
  }

  function onFrameLoad(tab) {
    // Ignore the empty about:blank load every new iframe fires.
    if (!win || !tab.history.length || !(tab.frame.hasAttribute('src') || tab.frame.hasAttribute('srcdoc'))) return;
    const current = tab.history[tab.index];
    const external = current.kind === 'web' || current.kind === 'live';
    if (external && !arrived(tab)) return; // still the blank frame, not the real site yet
    let doc = null;
    if (!external) {
      try { doc = tab.frame.contentDocument; } catch { /* cross-origin page */ }
    }

    // If the page followed an ordinary link to another of our sites, keep the address bar in step.
    if (doc && tab.expectedSrc) {
      const path = tab.frame.contentWindow.location.pathname;
      const current = tab.history[tab.index];
      const landed = sites.find(s => path.endsWith('/' + s.src));
      if (landed && (current.site || current.address) !== landed.address) {
        tab.history = tab.history.slice(0, tab.index + 1);
        tab.history.push({ kind: 'site', address: landed.address });
        tab.index++;
      }
    }

    const entry = tab.history[tab.index];
    const site = entry.kind === 'site' && findSite(entry.site || entry.address);
    tab.title = (doc && doc.title) || (site && site.title) || entry.title || entry.address;
    tab.icon = (site && site.icon) || (entry.kind === 'web' || entry.kind === 'live' ? favicon(entry.address) : GLOBE);
    tab.loading = false;
    if (doc) hookPage(tab, doc);
    announceApp(tab, site && site.app, site && site.title);
    if (tab === win.active) finishProgress('Done');
    updateChrome();
  }

  // Make links and search forms inside pages drive the browser.
  //   <a data-goto="www.funforum.co.uk"> opens one of our sites
  //   <a href="http://...">             goes through the browser too (usually "Server not found")
  //   <form data-search><input name="q"> searches Notts Search
  function hookPage(tab, doc) {
    doc.defaultView.retroBrowserHooked = true; // tells sites/site.js it doesn't need to step in
    doc.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a');
      if (!a || e.defaultPrevented) return;
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

  // Pages the browser can't reach into (e.g. when the OS is opened straight from a file, every
  // page counts as a different site) ask it to navigate by message instead. See sites/site.js.
  function onPageMessage(e) {
    const msg = e.data;
    if (!win || !msg || msg.source !== 'retrobrowser-page') return;
    const tab = win.tabs.find(t => t.frame.contentWindow === e.source);
    if (!tab) return;
    if (msg.action === 'navigate' && msg.address) {
      if (msg.newTab) newTab(String(msg.address));
      else navigate(String(msg.address), tab);
    } else if (msg.action === 'visited' && msg.address) {
      // The page moved to one of its own sub-pages without reloading: record it, don't reload.
      const entry = entryFor(String(msg.address));
      const current = tab.history[tab.index];
      if (!entry) return;
      if (current && current.address === entry.address) { // same page, maybe a better title
        if (msg.title) { tab.title = String(msg.title); updateChrome(); }
        return;
      }
      tab.history = tab.history.slice(0, tab.index + 1);
      tab.history.push(entry);
      tab.index++;
      if (msg.title) tab.title = String(msg.title);
      updateChrome();
    } else if (msg.action === 'search' && msg.query) {
      go(tab, searchEntry(String(msg.query)));
    }
  }

  // Tell Clippy (and anything else listening) when an app like FunForum is on screen in a tab.
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
    if (document.activeElement !== $('.rb-url')) {
      $('.rb-url').value = entry ? 'http://' + decode(entry.address) + (entry.kind === 'search' || entry.address.includes('/') ? '' : '/') : '';
    }
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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init(options));
      return window.RetroBrowser;
    }
    Object.assign(config, options);
    window.addEventListener('message', onPageMessage);
    if (config.launcher) {
      document.querySelectorAll(config.launcher).forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('dblclick', () => open());
      });
    }
    // Clippy can open and close the browser, and FunForum lives inside it.
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
    // For the Control Panel: change the home page or the year real websites come from.
    configure: options => { Object.assign(config, options); return { homepage: config.homepage, year: config.year }; },
    get settings() { return { homepage: config.homepage, year: config.year }; },
  };
})();
