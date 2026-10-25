# Control Panel

A Windows 7 style Control Panel for the OS. Open it from the start menu's **Control Panel** (`openApp('control-panel')` in `index.js`), or ask Clippy to "open control panel".

| Page | What you can change |
| --- | --- |
| Personalization | Desktop background (Default, which is whatever `index.html` sets, Rolling Hills, Purble Place, or generated Harmony, Aurora, Sunset and Solid Blue); Windows 7 window colours (Sky, Twilight, Sea, Leaf, Lime, Sun, Pumpkin, Blush, Violet, Lavender, Taupe, Chocolate, Slate, Frost), transparency and colour intensity |
| Clippy | Show or hide him, tips on or off, and read replies aloud |
| Internet Options | The browser's home page, and the year real websites come from (2004 to 2010) |
| Desktop | Put the desktop icons back in their original places |
| System | Information about the computer, and the team |

Choices are saved in `localStorage` (`settings:prefs`) and applied every time the OS loads (`addons/addons.js` calls `SettingsApp.applySaved()`).

Window colours tint `.os-window`, `.rb-window`, `.taskbar` and `.start-menu` through CSS variables in `settings.css` (`--glass-tint`, `--glass-tint-dark`, `--glass-opacity`). Until a colour, the transparency or the intensity is changed, the OS keeps its own look.

To add a page, add an entry to `PAGES` in `settings.js` (and to `PAGE_TITLES` for the side pane).
