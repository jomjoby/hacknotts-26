# Retro Browser

A Firefox-on-Windows-7 style web browser for the OS: Aero glass window, tabs, back/forward/reload/home, address bar, a fake search engine (Notts Search), bookmarks bar, a green progress bar and a status bar. Double-click the Firefox icon on the desktop to open it.

What you can visit:

- **Our own sites**: HTML files in this repo, registered with an address, so typing `funforum` opens FunForum (`fhome.html`).
- **Real websites, as they were in the 2000s**: type any address (or just `google`, `youtube`, `myspace`, `bebo`, `bbc`...) and it opens that site's archived copy from the [Wayback Machine](https://web.archive.org), e.g. Google in 2005. Real sites can't be shown live: almost all of them (Google, Bing, DuckDuckGo...) tell browsers not to display them inside another page, but the Wayback Machine's copies are allowed. The year is the `year` setting (default 2006); famous sites use their best year.
- **YouTube that actually plays**: `youtube` opens our own 2006-style YouTube (`browser/sites/youtube.html`) with classic 2000s videos, and you can paste any YouTube link into its search box or the address bar (`youtube.com/watch?v=...`). Videos play through YouTube's embeddable player. The archived 2006 site can't play anything: its Flash player fetched videos from servers that no longer exist, so even a Flash emulator like Ruffle would have nothing to play. YouTube's player needs the OS served over http (it rejects pages opened as a file).
- **Wikipedia, live**: Wikipedia allows being shown inside other pages, so its articles open for real.
- **Notts Search**: anything that isn't an address is searched. Results are real, with no account or key: the topic's official site (DuckDuckGo instant answers), `www.<word>.com` if an old copy exists, and Wikipedia articles, plus one joke result.

Real websites need an internet connection and run in a sandbox, so their old scripts can't break out of the browser.

## Adding it to the OS

One line in the `<head>` of `index.html` loads both the browser and Clippy:

```html
<script src="addons/addons.js" defer></script>
```

All the settings live in [`addons/addons.js`](../addons/addons.js), so changing them never touches the OS's files. To test the browser on its own, open `browser/demo.html` instead (through a local server, e.g. `python3 -m http.server 8026` then http://localhost:8026/browser/demo.html).

## Settings

`addons/addons.js` calls `RetroBrowser.init({...})` with:

| Option     | Default              | Meaning |
| ---------- | -------------------- | ------- |
| `launcher` | none                 | CSS selector for icons that open the browser on double-click |
| `taskbar`  | none                 | CSS selector for a taskbar to add a minimise/restore button to while open. Leave it out if the OS manages its own taskbar buttons. |
| `icon`     | a globe              | Image for the title bar and taskbar button |
| `name`     | `Mozilla Firefox`    | Shown in the title bar |
| `homepage` | `www.nottsnet.co.uk` | Home button and new tabs |
| `bottom`   | `80`                 | Space left for the taskbar when maximised |
| `base`     | `''`                 | Prefix for site paths, if the page isn't at the repo root |

Or open it from anywhere in code (a start menu entry, say): `RetroBrowser.open()`, `RetroBrowser.open('www.funforum.co.uk')`. Also `navigate(address)`, `newTab(address?)`, `close()`, `registerSite({...})`. Calling `open()` also brings back a minimised browser.

The window has `data-app-window="browser"`, so Clippy notices it, and Clippy can open and close it.

## FunForum

The team's forum (`fhome.html`, `forum.html`, `fabout.html`, `flog.html` at the repo root, images in `images/`) is registered at **`http://www.funforum.co.uk/`**, with `/forum`, `/news` and `/login` for its other pages. It replaced MSN Messenger, so typing `msn`, `msn.com` or `messenger` opens it too, as do `funforum`, `forum`, the FunForum bookmark, the NottsNet home page and asking Clippy to "open funforum". Logins and chat go through Supabase, so they need the internet.

Pages shown in the browser run inside an iframe that fills the browser window, share `localStorage` with the whole OS (so prefix your keys), and can link to our other sites with `<a data-goto="www.nottsnet.co.uk">NottsNet</a>`. Include `<script src="browser/sites/site.js"></script>` (path relative to the page) so those links also work when the OS is opened straight from a file.

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
