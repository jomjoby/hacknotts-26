// <purble-place> custom element – drop-in usage with no JavaScript glue:
//
//   <script type="module" src="addons/purble-place/src/element.js"></script>
//   <purble-place style="width:800px;height:622px" game="purble-pairs" level="beginner"></purble-place>
//
// Attributes: game, level, muted, seed, no-menubar.
// Events (bubbling CustomEvents): purble-navigate, purble-game-start, purble-game-end, purble-settings.

import './games/index.js';
import { PurblePlace } from './shell/shell.js';

const FORWARD = { navigate: 'purble-navigate', 'game:start': 'purble-game-start', 'game:end': 'purble-game-end', settings: 'purble-settings' };

export class PurblePlaceElement extends HTMLElement {
  connectedCallback() {
    if (this.app) return;
    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{display:block;position:relative;min-height:240px;contain:content}.host{position:absolute;inset:0}</style><div class="host"></div>';
    const opts = {
      startGame: this.getAttribute('game') || undefined,
      startLevel: this.getAttribute('level') || undefined,
      seed: this.hasAttribute('seed') ? Number(this.getAttribute('seed')) : undefined,
      sound: !this.hasAttribute('muted'),
      menubar: !this.hasAttribute('no-menubar'),
      autoFocus: false,
      ...(this.options || {}),
    };
    this.app = new PurblePlace(shadow.querySelector('.host'), opts);
    for (const [from, to] of Object.entries(FORWARD)) {
      this.app.on(from, (detail) => this.dispatchEvent(new CustomEvent(to, { detail, bubbles: true, composed: true })));
    }
  }

  disconnectedCallback() {
    this.app?.destroy();
    this.app = null;
  }
}

if (!customElements.get('purble-place')) customElements.define('purble-place', PurblePlaceElement);
