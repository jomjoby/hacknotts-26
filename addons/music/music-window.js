/*
 * Opens the Media Player (music.html) in an Aero window like the other apps.
 * Opened with openApp('media-player') (start menu, or ask Clippy). Loaded by addons/addons.js.
 */
(function () {
  'use strict';

  let win = null;

  function open() {
    if (win) {
      win.restore();
      win.focus();
      return;
    }
    if (typeof window.makeWindow !== 'function') return;
    win = window.makeWindow({
      id: 'media-player', title: 'Windows Media Player', icon: 'images/music-player.png',
      width: 820, height: 520, minWidth: 560, minHeight: 360,
      onClose: () => { win = null; },
    });
    const frame = document.createElement('iframe');
    frame.style.cssText = 'display: block; width: 100%; height: 100%; border: 0;';
    frame.title = 'Windows Media Player';
    frame.src = 'addons/music/music.html';
    // Inside the OS there's no site to go back to, so hide the player's "Back to site" link.
    frame.addEventListener('load', () => {
      try {
        const back = frame.contentDocument.getElementById('back');
        if (back) back.hidden = true;
      } catch { /* opened as a file in a browser that blocks this: the link just stays */ }
    });
    win.body.appendChild(frame);
  }

  window.MusicApp = { open };
})();
