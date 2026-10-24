// Modal dialogs and toasts rendered inside the 800x600 stage.

import { h, clear } from './dom.js';
import { purble } from './purble.js';

const STAR_FULL = '★';
const STAR_EMPTY = '☆';

export function starsHTML(count, max = 3) {
  let out = '<span class="pp-stars" role="img" aria-label="' + count + ' of ' + max + ' stars">';
  for (let i = 0; i < max; i++) out += `<span class="${i < count ? 'is-on' : ''}">${i < count ? STAR_FULL : STAR_EMPTY}</span>`;
  return out + '</span>';
}

export class Overlay {
  /**
   * @param {HTMLElement} layer  absolutely-positioned element covering the stage
   * @param {object} deps        { sound }
   */
  constructor(layer, { sound } = {}) {
    this.layer = layer;
    this.sound = sound;
    this.stack = [];
    this.toastEl = null;
    this.toastTimer = 0;
  }

  get count() {
    return this.stack.length;
  }

  /**
   * @param {object} o
   * @param {string} o.title
   * @param {string|Node} [o.body]      HTML string or node
   * @param {Array<{label,primary?,value?,onClick?}>} [o.buttons]
   * @param {object} [o.mascot]         options for purble() shown beside the text
   * @param {boolean} [o.cancelable]    Esc / backdrop closes (default true)
   * @param {string} [o.className]
   * @param {Function} [o.onClose]      called with the reason ('button' | 'cancel' | 'api')
   */
  dialog({ title, body = '', buttons, mascot, cancelable = true, className = '', onClose } = {}) {
    const previousFocus = document.activeElement;
    const btns = buttons && buttons.length ? buttons : [{ label: 'OK', primary: true }];

    const text = h('div', { class: 'pp-dialog-text' });
    if (typeof body === 'string') text.innerHTML = body;
    else text.append(body);

    const btnRow = h('div', { class: 'pp-dialog-buttons' });
    const backdrop = h('div', { class: 'pp-backdrop' });
    const dlg = h('div', { class: ['pp-dialog', className], role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'pp-dialog-title' },
        h('span', { class: 'pp-dialog-icon', html: purble({ mood: 'happy' }) }),
        h('span', {}, title),
        cancelable ? h('button', { class: 'pp-dialog-close', type: 'button', 'aria-label': 'Close', onClick: () => handle.cancel() }, '✕') : null),
      h('div', { class: 'pp-dialog-body' },
        mascot ? h('div', { class: 'pp-dialog-mascot', html: purble(mascot) }) : null,
        text),
      btnRow);
    backdrop.append(dlg);

    let closed = false;
    const handle = {
      el: dlg,
      close: (reason = 'api') => {
        if (closed) return;
        closed = true;
        const i = this.stack.indexOf(handle);
        if (i >= 0) this.stack.splice(i, 1);
        backdrop.remove();
        if (previousFocus && previousFocus.focus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
        onClose?.(reason);
      },
      cancel: () => { if (cancelable) handle.close('cancel'); },
      cancelable,
    };

    let primaryBtn = null;
    for (const spec of btns) {
      const b = h('button', {
        class: ['pp-btn', spec.primary ? 'pp-btn-primary' : '', spec.className],
        type: 'button',
        onClick: () => {
          this.sound?.play('click');
          handle.close('button');
          spec.onClick?.(spec.value);
        },
      }, spec.label);
      if (spec.primary && !primaryBtn) primaryBtn = b;
      btnRow.append(b);
    }

    backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) handle.cancel(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...dlg.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    this.layer.append(backdrop);
    this.stack.push(handle);
    (primaryBtn || btnRow.firstElementChild)?.focus({ preventScroll: true });
    return handle;
  }

  /** Close the top-most dialog if it allows cancelling. Returns true if one closed. */
  closeTop() {
    const top = this.stack[this.stack.length - 1];
    if (!top || !top.cancelable) return false;
    top.cancel();
    return true;
  }

  closeAll() {
    [...this.stack].forEach((d) => d.close('api'));
  }

  toast(text, ms = 2200) {
    if (!this.toastEl) {
      this.toastEl = h('div', { class: 'pp-toast', role: 'status', 'aria-live': 'polite' });
      this.layer.append(this.toastEl);
    }
    clear(this.toastEl);
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('is-on');
    void this.toastEl.offsetWidth; // restart the animation
    this.toastEl.classList.add('is-on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl?.classList.remove('is-on'), ms);
  }

  destroy() {
    clearTimeout(this.toastTimer);
    this.closeAll();
    this.toastEl?.remove();
    this.toastEl = null;
  }
}
