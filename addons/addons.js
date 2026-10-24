/*
 * Loads our add-ons into the OS, which all live in this addons/ folder: Clippy, the retro browser,
 * the Control Panel (settings/), Paint and Purble Place (opened by index.js). FunForum (forum/) is a
 * website shown inside the browser.
 * The OS only needs this one line in index.html:
 *
 *   <script src="addons/addons.js" defer></script>
 *
 * Everything else (styles, scripts, settings) lives here, so changes to the
 * add-ons never touch the OS's own files.
 */
(function () {
  'use strict';

  // The repo root, worked out from where this file was loaded from.
  const root = document.currentScript.src.replace(/addons\/addons\.js(\?.*)?$/, '');
  // Always fetch fresh copies, so browsers don't keep running old versions of the add-ons.
  const fresh = '?v=' + Date.now();

  function addStyle(path) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = root + path + fresh;
    document.head.appendChild(link);
  }

  function addScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = root + path + fresh;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + path));
      document.head.appendChild(script);
    });
  }

  addStyle('addons/clippy/clippy.css');
  addStyle('addons/browser/browser.css');
  addStyle('addons/settings/settings.css');
  addStyle('addons/paint/paint.css');

  Promise.all([addScript('addons/clippy/clippy.js'), addScript('addons/browser/browser.js'), addScript('addons/settings/settings.js'), addScript('addons/paint/paint.js')])
    .then(() => {
      // Settings that match the OS: its taskbar is 80px tall. The OS's openApp('firefox')
      // in index.js opens the browser when its Internet icon is clicked.
      window.Clippy.init({ bottom: 80 });
      window.Clippy.registerApp({
        id: 'paint',
        name: 'Paint',
        aliases: ['paint', 'ms paint', 'mspaint', 'microsoft paint', 'drawing', 'draw'],
        tips: [
          { text: "It looks like you're drawing! Tip: right-click paints with Color 2." },
          { text: 'Tip: the fill bucket fills everything that is exactly the same colour. Close your shapes first!' },
          { text: 'Masterpiece in progress? Ctrl+Z undoes, and the Paint menu saves it as a PNG.' },
        ],
      });
      window.Clippy.registerApp({
        id: 'control-panel',
        name: 'Control Panel',
        aliases: ['control panel', 'control-panel', 'settings app', 'preferences', 'personalisation', 'personalization'],
        tips: [
          { text: 'It looks like you are changing settings! Try a new window colour under Personalization.' },
          { text: 'Tip: the year of the web, under Internet Options, changes which year real websites come from.' },
        ],
      });
      window.Clippy.registerApp({
        id: 'purble-place',
        name: 'Purble Place',
        aliases: ['purble place', 'purble', 'purple place', 'purple', 'game', 'games', 'cakes'],
        tips: [
          { text: 'Ooh, Purble Place! Tip: in Atrium Cakes, Ctrl+Z undoes a wrong icing. Baking is forever, though.' },
          { text: 'Crack the Code tip: a gold peg means right colour, right spot. White means right colour, wrong spot.' },
          { text: 'Pair Programming tip: in Final Year, every fourth miss a merge conflict swaps two tiles. Very realistic.' },
        ],
      });
      window.RetroBrowser.init({
        taskbar: '.taskbar',
        icon: root + 'images/Mozilla_Firefox_logo_2004.webp',
        bottom: 80,
        base: root,
      });
      window.SettingsApp.applySaved();
    })
    .catch(err => console.error('Add-ons failed to load:', err));
})();
