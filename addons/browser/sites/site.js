/*
 * Optional helper for pages shown in the retro browser. Include it in a site's page:
 *
 *   <script src="../browser/sites/site.js"></script>   (path relative to your page, e.g. from addons/forum/)
 *
 * Normally the browser makes <a data-goto="..."> links and <form data-search> work by
 * itself. When it can't reach into the page (e.g. the OS was opened straight from a
 * file rather than a local server), this script asks the browser by message instead.
 */
(function () {
  'use strict';
  if (window.parent === window) return;

  const send = message => window.parent.postMessage(Object.assign({ source: 'retrobrowser-page' }, message), '*');

  document.addEventListener('click', e => {
    if (window.retroBrowserHooked || e.defaultPrevented) return;
    const link = e.target.closest && e.target.closest('a[data-goto]');
    if (!link) return;
    e.preventDefault();
    send({ action: 'navigate', address: link.dataset.goto, newTab: link.target === '_blank' || e.ctrlKey || e.metaKey });
  });

  document.addEventListener('submit', e => {
    if (window.retroBrowserHooked || !e.target.matches('[data-search]')) return;
    e.preventDefault();
    send({ action: 'search', query: String(new FormData(e.target).get('q') || '') });
  });
})();
