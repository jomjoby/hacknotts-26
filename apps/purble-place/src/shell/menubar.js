// Windows-7-style "Game  Help" menu bar. Built from a declarative model so a host
// that draws its own window chrome can render the very same menus:
//
//   app.getMenuModel() -> [{ label, items: [{ label, shortcut?, checked?, disabled?, action?, submenu?, separator? }] }]

import { h, listen } from '../core/dom.js';

export class Menubar {
  /**
   * @param {HTMLElement} root       element the popups are attached to (the app root)
   * @param {() => Array} getModel   called every time a menu opens so check marks are fresh
   */
  constructor(root, getModel, { onAction } = {}) {
    this.root = root;
    this.getModel = getModel;
    this.onAction = onAction;
    this.el = h('div', { class: 'pp-menubar', role: 'menubar' });
    this.openIndex = -1;
    this.popup = null;
    this._offs = [
      listen(root, 'pointerdown', (e) => {
        if (this.openIndex >= 0 && !e.target.closest?.('.pp-menubar, .pp-menu-pop')) this.close();
      }, true),
    ];
    this.refresh();
  }

  get isOpen() { return this.openIndex >= 0; }

  /** Rebuild the titles (call after a language change). */
  refresh() {
    this.el.replaceChildren();
    this.getModel().forEach((menu, i) => {
      const btn = h('button', {
        class: 'pp-menu-title', type: 'button', role: 'menuitem', 'aria-haspopup': 'true', 'aria-expanded': 'false',
        onClick: () => (this.openIndex === i ? this.close() : this.open(i)),
        onPointerEnter: () => { if (this.isOpen && this.openIndex !== i) this.open(i); },
      }, menu.label);
      this.el.append(btn);
    });
  }

  open(index) {
    this.close();
    const model = this.getModel()[index];
    if (!model) return;
    this.openIndex = index;
    const title = this.el.children[index];
    title.classList.add('is-open');
    title.setAttribute('aria-expanded', 'true');
    this.popup = this.buildPopup(model.items);
    this.popup.style.left = `${title.offsetLeft + this.el.offsetLeft}px`;
    this.popup.style.top = `${this.el.offsetTop + this.el.offsetHeight}px`;
    this.root.append(this.popup);
    this.popup.querySelector('.pp-menu-item:not([disabled])')?.focus({ preventScroll: true });
  }

  close() {
    if (this.popup) { this.popup.remove(); this.popup = null; }
    [...this.el.children].forEach((c) => { c.classList.remove('is-open'); c.setAttribute('aria-expanded', 'false'); });
    this.openIndex = -1;
  }

  buildPopup(items, nested = false) {
    const pop = h('div', { class: ['pp-menu-pop', nested && 'is-nested'], role: 'menu' });
    for (const item of items) {
      if (item.hidden) continue;
      if (item.separator) { pop.append(h('hr', { class: 'pp-menu-sep', role: 'separator' })); continue; }
      const btn = h('button', {
        class: ['pp-menu-item', item.submenu && 'has-sub', item.checked && 'is-checked'],
        type: 'button', role: item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem',
        'aria-checked': item.checked === undefined ? null : String(!!item.checked),
        disabled: item.disabled || null,
      },
      h('span', { class: 'pp-menu-check' }, item.checked ? '✓' : ''),
      h('span', { class: 'pp-menu-label' }, item.label),
      h('span', { class: 'pp-menu-key' }, item.submenu ? '▸' : item.shortcut || ''));
      if (item.submenu) {
        btn.append(this.buildPopup(item.submenu, true));
        btn.addEventListener('click', (e) => { e.stopPropagation(); btn.classList.toggle('is-sub-open'); });
      } else {
        btn.addEventListener('click', () => {
          this.close();
          this.onAction?.();
          item.action?.();
        });
      }
      pop.append(btn);
    }
    return pop;
  }

  destroy() {
    this.close();
    this._offs.forEach((off) => off());
    this.el.remove();
  }
}
