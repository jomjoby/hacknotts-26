# Clippy

An offline desktop assistant for our Windows 7-style OS. No AI API or keys: it understands requests with its own small intent classifier (Naive Bayes, trained on example phrases in `clippy.js`), watches what you do on the desktop, and can do small tasks for you.

`demo.html` is a throwaway test desktop for trying Clippy on its own. It is **not** the real OS.

## Adding Clippy to the OS

One line in the `<head>` of `index.html` loads Clippy (and the retro browser):

```html
<script src="addons/addons.js" defer></script>
```

Clippy's settings (like `Clippy.init({ bottom: 80 })`, its distance from the screen bottom) live in [`addons/addons.js`](../addons/addons.js), so they never touch the OS's files.

## How Clippy sees what's open

Pick either option (or both):

1. **Zero effort:** give each app window the attribute `data-app-window="<id>"`. Clippy notices when one appears, disappears or is hidden.
   ```html
   <div class="window" data-app-window="forum">...</div>
   ```
2. **Events:** fire these on `window` when things happen:
   ```js
   window.dispatchEvent(new CustomEvent('os:app-opened', { detail: { id: 'forum', title: 'FunForum' } }));
   window.dispatchEvent(new CustomEvent('os:app-closed', { detail: { id: 'forum' } }));
   window.dispatchEvent(new CustomEvent('os:app-focused', { detail: { id: 'forum' } }));
   ```

Built-in app ids: `forum` (FunForum, also answers to "msn"), `notepad`, `browser`, `computer`. Register new apps (e.g. the third app) so Clippy can open them by name and give tips:

```js
Clippy.registerApp({
  id: 'paint', name: 'Paint', aliases: ['paint', 'drawing'],
  tips: [{ text: 'It looks like you\'re drawing! Want a tip?', choices: [{ label: 'Yes', cmd: 'help' }] }],
});
```

## How Clippy does things

Expose these on `window.OS` and Clippy will call them. If they're missing, Clippy fires the event instead.

| Clippy wants to...  | Calls                    | Or fires event                      |
| ------------------- | ------------------------ | ----------------------------------- |
| Open an app         | `OS.openApp(id)`         | `clippy:open-app` `{ id }`          |
| Close an app        | `OS.closeApp(id)`        | `clippy:close-app` `{ id }`         |
| Change wallpaper    | `OS.setWallpaper()`      | `clippy:wallpaper`                  |

For "write a letter", Clippy types into the focused text box, or into a `textarea` inside `[data-app-window="notepad"]`.

## Things to try

- "Open FunForum and tell me a joke"
- "What's 12 x (7 + 3)?"
- "Remind me in 5 minutes to drink my water"
- "Give me something to post" (a 2000s-style message, then "Copy it" or "Post it on FunForum")
- "Make a thread called best Wii games in Games" (opens FunForum's new-thread form, filled in)
- "Open a random YouTube video", "Search YouTube for cats", "Search the web for Nottingham", "Show me the news"
- "Play cakes" / "Play pairs" / "Play crack the code" (opens Purble Place straight into that game)
- "Make the windows pumpkin" (Aero colour), "Change the wallpaper"
- "Write a letter", or type "Dear Sam," in any text box
- "Call me Anand", "Remember that the demo is at 10am", "Show my notes"
- "What's open?", "Close everything"
- "Be quiet" / "Talk more" / "Go away" (press **F1** to bring Clippy back)

- Typos are fine: "opne notpad" works
- "Turn on your voice" (or the speaker button) reads replies aloud using the browser's built-in speech

It also notices you opening apps, typing in caps, rage-clicking and going idle (it falls asleep), and its eyes follow your mouse. It chimes when it pipes up on its own.

## It learns

When Clippy isn't sure, it asks "did you mean...". Picking an answer teaches it that phrase, saved in the browser, so it understands next time.

## Adding voice lines

Everything Clippy says is in the `LINES` table at the top of `clippy.js`. Add lines to any list; `{placeholders}` like `{app}` or `{who}` are filled in automatically. Lines are shuffled so none repeats until the whole list has been used.

## Other JS API

`Clippy.say(text)`, `Clippy.ask(text)`, `Clippy.open()`, `Clippy.show()`, `Clippy.hide()`, `Clippy.understand(text)` (debug: shows what Clippy thinks a sentence means).

## Running the test desktop

The scripts need to be served over http rather than opened as a file:

```bash
python3 -m http.server 8026
```

Then open http://localhost:8026/addons/clippy/demo.html
