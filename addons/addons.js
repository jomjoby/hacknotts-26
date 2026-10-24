/*
 * Loads our add-ons into the OS: Clippy, the retro browser and the Control Panel (settings/).
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

  addStyle('clippy/clippy.css');
  addStyle('browser/browser.css');
  addStyle('settings/settings.css');

  Promise.all([addScript('clippy/clippy.js'), addScript('browser/browser.js'), addScript('settings/settings.js')])
    .then(() => {
      // Settings that match the OS: its taskbar is 80px tall. The OS's openApp('firefox')
      // in index.js opens the browser when its Internet icon is clicked.
      window.Clippy.init({ bottom: 80 });
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
