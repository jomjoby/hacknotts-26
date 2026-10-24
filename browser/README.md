# Retro Browser

A Firefox-on-Windows-7 style web browser for the OS: Aero glass window, tabs, back/forward/reload/home, address bar, a fake search engine (Notts Search), bookmarks bar, a green progress bar and a status bar. Double-click the Firefox icon on the desktop to open it.

The "web" is made of HTML files in this repo. Each one is registered with an address, so typing `msn.com` opens `msn/index.html`. Unknown addresses get a retro "Server not found" page, and anything that isn't an address goes to Notts Search.

## Trying it

The browser isn't wired into the OS's `index.html` (that's the OS owner's file). To test it on its own, run a local server from the repo root and open the test desktop:

```bash
python3 -m http.server 8026
```

Then go to http://localhost:8026/browser/demo.html and double-click the icon.

## For the OS: adding it to `index.html`

At the end of `<body>`:

```html
<link rel="stylesheet" href="browser/browser.css">
<script src="browser/browser.js"></script>
<script>
  RetroBrowser.init({
    launcher: '.desktop-icon',                       // double-click this to open the browser
    taskbar: '.taskbar',                             // optional: add a button here while it's open
    icon: 'images/Mozilla_Firefox_logo_2004.webp',
  });
</script>
```

| Option     | Default              | Meaning |
| ---------- | -------------------- | ------- |
| `launcher` | none                 | CSS selector for icons that open the browser on double-click |
| `taskbar`  | none                 | CSS selector for a taskbar to add a minimise/restore button to while open. Leave it out if the OS manages its own taskbar buttons. |
| `icon`     | a globe              | Image for the title bar and taskbar button |
| `name`     | `Mozilla Firefox`    | Shown in the title bar |
| `homepage` | `www.nottsnet.co.uk` | Home button and new tabs |
| `bottom`   | `80`                 | Space left for the taskbar when maximised |
| `base`     | `''`                 | Prefix for site paths, if the page isn't at the repo root |

Or open it from anywhere in code (a start menu entry, say): `RetroBrowser.open()`, `RetroBrowser.open('msn.com')`. Also `navigate(address)`, `newTab(address?)`, `close()`, `registerSite({...})`. Calling `open()` also brings back a minimised browser.

The window has `data-app-window="browser"`, so Clippy notices it, and Clippy can open and close it.

## For the MSN Messenger page

1. Build it as a normal web page at **`msn/index.html`** (CSS/JS next to it, e.g. `msn/msn.css`). Until that file exists, the browser shows an "Under Construction" page at `messenger.msn.com`.
2. It opens in a browser tab at `http://messenger.msn.com/` (also reachable by typing `msn`, `msn.com` or `messenger`, the MSN bookmark, or asking Clippy to "open msn").
3. It runs inside an iframe that fills the browser window, so make the layout fill its window (e.g. `height: 100vh`) and cope with being resized.
4. Use paths relative to the page (`msn.css`, not `/msn/msn.css`).
5. To link to another of our sites, use `<a data-goto="www.nottsnet.co.uk">NottsNet</a>`.
6. Clippy can suggest cringey 2000s personal messages. To receive them:
   ```js
   parent.addEventListener('clippy:msn-status', e => setPersonalMessage(e.detail.text));
   ```
7. The page shares `localStorage` with the whole OS, so prefix your keys (e.g. `msn:contacts`).

## Adding more sites

Put the page somewhere in the repo and register it after `RetroBrowser.init(...)`:

```js
RetroBrowser.registerSite({
  address: 'www.clippyfans.org',          // what shows in the address bar
  aliases: ['clippyfans', 'clippy fans'], // other things people might type
  title: "Clippy's Fan Club",
  src: 'sites/clippyfans/index.html',     // path from the OS root
  description: 'Shown in Notts Search results.',
});
```

The home page is `browser/sites/home.html`. In any page, `<form data-search><input name="q"></form>` searches Notts Search.
