# HackNotts 26

## Running it

Run it from a local web server rather than opening `index.html` as a file. YouTube videos in the browser only play that way (and Purble Place needs it in some browsers).

- Windows: double-click `start.bat`
- Mac: double-click `Start OS (Mac).command`
- Linux: run `sh start.sh` (or right-click it in your file manager and choose "Run as a Program")

They all start a server on port 8000 (or just reopen the OS if it's already running) and open http://localhost:8000/ in your browser. They need Python installed.

## What's where

| | |
| --- | --- |
| `index.html`, `index.js`, `styles.css` | The OS itself: desktop, taskbar, start menu, windows |
| `images/` | Shared images (wallpapers, icons, logos) |
| `addons/addons.js` | Loads the add-ons into the OS (one `<script>` line in `index.html`) |
| `addons/clippy/` | Clippy, the desktop assistant |
| `addons/browser/` | The retro Firefox-style browser and its built-in sites (NottsNet, YouTube) |
| `addons/forum/` | FunForum, shown inside the browser at www.funforum.co.uk |
| `addons/purble-place/` | Purble Place (`addons/purble-place-bundle.js` is a one-file copy for pages opened as a file) |
| `addons/paint/` | Paint |
| `addons/settings/` | The Control Panel |
| `start.sh`, `start.bat`, `Start OS (Mac).command`, `addons/serve.py` | Run the OS from a local server |
