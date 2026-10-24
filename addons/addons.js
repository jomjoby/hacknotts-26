/*
 * Loads our add-ons into the OS: Clippy and the retro browser.
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

  function addStyle(path) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = root + path;
    document.head.appendChild(link);
  }

  function addScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = root + path;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + path));
      document.head.appendChild(script);
    });
  }

  addStyle('clippy/clippy.css');
  addStyle('browser/browser.css');

  Promise.all([addScript('clippy/clippy.js'), addScript('browser/browser.js')])
    .then(() => {
      // Settings that match the OS: its taskbar is 80px tall, and its Firefox desktop icon opens the browser.
      window.Clippy.init({ bottom: 80 });
      window.RetroBrowser.init({
        launcher: '.desktop-icon',
        taskbar: '.taskbar',
        icon: root + 'images/Mozilla_Firefox_logo_2004.webp',
        bottom: 80,
        base: root,
      });
    })
    .catch(err => console.error('Add-ons failed to load:', err));
})();
