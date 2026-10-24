/*
 * Clippy: an offline desktop assistant for the HackNotts 26 OS.
 *
 * No external AI and no API keys. Everything runs in the browser:
 *  - Understanding: a small Naive Bayes intent classifier trained on the
 *    example phrases in TRAINING, plus regex rules for names, notes and maths.
 *  - Seeing: listens for os:* events and watches the page for
 *    [data-app-window] elements, typing, rage-clicks and idle time.
 *  - Doing: calls window.OS hooks if the OS provides them, otherwise fires
 *    clippy:* events that the other apps can listen for.
 *
 * Usage (at the end of <body>):
 *   <link rel="stylesheet" href="clippy/clippy.css">
 *   <script src="clippy/clippy.js"></script>
 *   <script>Clippy.init();</script>
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ state

  const config = { right: 24, bottom: 56, tipCooldown: 8000, idleAfter: 60000 };

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem('clippy:' + key);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('clippy:' + key, JSON.stringify(value)); } catch { /* storage blocked */ }
    },
  };

  const state = {
    name: store.get('name', null),
    notes: store.get('notes', []),
    chattiness: store.get('chattiness', 'normal'), // 'normal' | 'quiet'
    hidden: false,
    sleeping: false,
    mood: '',
    lastTip: 0,
    lastUserChat: 0,
    lastActivity: Date.now(),
    lastEditable: null,
    focusedApp: null,
    choices: [],
    shown: new Set(), // one-off tips already given this session
    openCount: {},
    mouse: null,
    lookAt: null,
  };

  let root, bubble, textEl, youEl, choicesEl, input, charEl, eyes = [];

  const pick = list => list[Math.floor(Math.random() * list.length)];
  const who = () => (state.name ? ' ' + state.name : '');
  const list = items => (items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  // ------------------------------------------------------------------- apps

  const apps = {};
  const openApps = new Map(); // id -> { title, el, source }

  function registerApp(app) {
    apps[app.id] = Object.assign({ name: app.id, aliases: [app.id], tips: [] }, apps[app.id], app);
  }

  [
    {
      id: 'msn', name: 'MSN Messenger', aliases: ['msn', 'messenger', 'msn messenger', 'chat'],
      tips: [
        { text: "It looks like you're about to chat! Want a properly 2000s status message?",
          choices: [{ label: 'Yes please', cmd: 'give me an msn status' }, { label: "No, I'm cool already", run: () => 'Clearly.' }] },
        { text: 'Tip: a nudge is the polite way of saying REPLY TO ME RIGHT NOW.' },
      ],
    },
    {
      id: 'notepad', name: 'Notepad', aliases: ['notepad', 'text editor', 'notes app'],
      tips: [
        { text: "It looks like you're about to write something! I can start a letter for you.",
          choices: [{ label: 'Start a letter', cmd: 'write a letter' }] },
        { text: 'Tip: type "Dear ..." and I\'ll leap into action.' },
      ],
    },
    {
      id: 'browser', name: 'Internet Explorer', aliases: ['internet explorer', 'ie', 'browser', 'internet', 'web', 'explorer'],
      tips: [
        { text: 'Ah, the information superhighway. Remember: never download free_ram.exe.' },
        { text: "Tip: if a pop-up says you're the 1,000,000th visitor, you are not." },
      ],
    },
    {
      id: 'computer', name: 'My Computer', aliases: ['my computer', 'computer', 'files', 'documents', 'my documents'],
      tips: [{ text: "Looking for a file? It's in My Documents. It's always in My Documents." }],
    },
  ].forEach(registerApp);

  function findApp(text) {
    const padded = ' ' + text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ') + ' ';
    let best = null, bestLength = 0;
    for (const app of Object.values(apps)) {
      for (const alias of app.aliases) {
        if (alias.length > bestLength && padded.includes(' ' + alias + ' ')) { best = app; bestLength = alias.length; }
      }
    }
    return best;
  }

  const appName = id => (openApps.get(id) || {}).title || (apps[id] || {}).name || id;

  // Ask the OS to do something: window.OS.<method>() if it exists, else a clippy:* event.
  const OS_EVENTS = { openApp: 'clippy:open-app', closeApp: 'clippy:close-app', setWallpaper: 'clippy:wallpaper' };
  function osCall(method, detail = {}) {
    const api = window.OS;
    if (api && typeof api[method] === 'function') api[method](detail.id);
    else window.dispatchEvent(new CustomEvent(OS_EVENTS[method], { detail }));
  }

  function openApp(id) {
    const already = openApps.has(id);
    osCall('openApp', { id });
    if (already) return `${appName(id)} is already open. Bringing it to the front!`;
    return pick([`Opening ${appName(id)}...`, `Launching ${appName(id)}. Please wait while it loads at 56k...`]);
  }

  function closeApp(id) {
    if (!openApps.has(id)) return `${appName(id)} isn't open.`;
    osCall('closeApp', { id });
    return `Closing ${appName(id)}.`;
  }

  // -------------------------------------------------------------- language

  const STOPWORDS = new Set(['a', 'an', 'the', 'please', 'could', 'would', 'can', 'you', 'i', 'to', 'of', 'is', 'it', 'for', 'pls', 'plz']);

  function tokenize(text) {
    const words = (text.toLowerCase().replace(/['’]/g, '').match(/[a-z0-9]+/g) || [])
      .filter(w => !STOPWORDS.has(w))
      .map(w => (w.length > 3 ? w.replace(/(ing|s)$/, '') : w));
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + '_' + words[i + 1]);
    return words.concat(bigrams);
  }

  // Multinomial Naive Bayes with add-one smoothing.
  class IntentClassifier {
    constructor() { this.intents = {}; this.vocab = new Set(); this.total = 0; }

    learn(intent, phrase) {
      const c = this.intents[intent] || (this.intents[intent] = { docs: 0, words: 0, counts: {} });
      c.docs++;
      this.total++;
      for (const t of tokenize(phrase)) {
        c.counts[t] = (c.counts[t] || 0) + 1;
        c.words++;
        this.vocab.add(t);
      }
    }

    // coverage = share of the sentence's words this intent has seen before,
    // so one familiar word in an unfamiliar sentence doesn't count as understood.
    classify(text) {
      const all = tokenize(text);
      const words = all.filter(t => !t.includes('_'));
      const tokens = all.filter(t => this.vocab.has(t));
      if (!tokens.length) return [];
      const V = this.vocab.size;
      const scored = Object.entries(this.intents).map(([intent, c]) => {
        let score = Math.log(c.docs / this.total);
        for (const t of tokens) score += Math.log(((c.counts[t] || 0) + 1) / (c.words + V));
        const hits = words.filter(w => c.counts[w]).length;
        return { intent, score, coverage: words.length ? hits / words.length : 0 };
      });
      const max = Math.max(...scored.map(s => s.score));
      const sum = scored.reduce((acc, s) => acc + Math.exp(s.score - max), 0);
      return scored
        .map(s => ({ intent: s.intent, coverage: s.coverage, confidence: Math.exp(s.score - max) / sum }))
        .sort((a, b) => b.confidence - a.confidence);
    }
  }

  const TRAINING = {
    greet: ['hi', 'hello', 'hey', 'hiya', 'yo', 'good morning', 'good afternoon', 'good evening', 'sup', 'whats up', 'hey clippy', 'hello there'],
    help: ['help', 'what can you do', 'what do you do', 'how do you work', 'show me what you can do', 'commands', 'i need help', 'options', 'what are your features', 'how do i use you'],
    who: ['who are you', 'what are you', 'whats your name', 'are you a robot', 'are you an ai', 'tell me about yourself', 'are you alive', 'how do you think'],
    open_app: ['open msn', 'open notepad', 'launch the browser', 'start messenger', 'run notepad', 'open internet explorer', 'i want to chat', 'open it', 'load the app', 'show me msn', 'go on the internet', 'open my computer', 'start the program', 'launch', 'open the web browser', 'open my documents'],
    close_app: ['close msn', 'close notepad', 'quit the browser', 'exit messenger', 'shut notepad', 'kill the app', 'close this window', 'get rid of this window', 'close everything', 'close all windows', 'close it', 'close the program', 'shut it down'],
    whats_open: ['what is open', 'whats open', 'what apps are open', 'which windows are open', 'what am i running', 'whats running', 'list open windows', 'what have i got open', 'show open programs', 'what programs are running'],
    time: ['what time is it', 'whats the time', 'time please', 'current time', 'tell me the time', 'what time', 'got the time'],
    date: ['what day is it', 'whats the date', 'todays date', 'what is the date today', 'which day is it', 'date', 'what is today'],
    timer: ['set a timer', 'timer for 5 minutes', 'remind me in 10 minutes', 'remind me to drink water', 'set an alarm', 'countdown 30 seconds', 'alert me in an hour', 'wake me up in 20 minutes', 'start a timer', 'remind me later', 'set a reminder'],
    joke: ['tell me a joke', 'joke', 'make me laugh', 'say something funny', 'know any jokes', 'another joke', 'be funny', 'tell me something funny'],
    bored: ['im bored', 'i am bored', 'nothing to do', 'entertain me', 'what should i do', 'boring', 'suggest something', 'so bored'],
    status: ['give me an msn status', 'status idea', 'make me a status', 'cool msn name', 'what should my status be', 'give me a display name', 'personal message idea', 'emo status', 'another status', 'new status', 'msn status'],
    wallpaper: ['change wallpaper', 'new background', 'change the background', 'different wallpaper', 'change desktop picture', 'next wallpaper', 'change the desktop background'],
    letter: ['write a letter', 'help me write a letter', 'letter template', 'help me write', 'write an email', 'draft a letter', 'start a letter', 'write a cover letter'],
    notes: ['show my notes', 'what are my notes', 'read my notes', 'list notes', 'what did i ask you to remember', 'clear my notes', 'delete my notes', 'my notes'],
    name_get: ['what is my name', 'whats my name', 'do you know my name', 'who am i', 'say my name'],
    quiet: ['be quiet', 'shut up', 'stop talking', 'stop giving tips', 'less tips', 'stop interrupting', 'shh', 'quiet', 'no more tips'],
    chatty: ['talk more', 'give me tips', 'be chatty', 'you can talk again', 'turn tips on', 'more tips'],
    hide: ['go away', 'hide', 'bye', 'goodbye', 'disappear', 'see you later', 'hide yourself', 'leave me alone', 'minimise yourself'],
    thanks: ['thanks', 'thank you', 'cheers', 'ta', 'nice one', 'great', 'awesome', 'good job', 'love you', 'you are the best', 'perfect'],
  };

  const LABELS = {
    greet: 'Just saying hi', help: 'See what you can do', who: 'Tell me about you', open_app: 'Open a program',
    close_app: 'Close a program', whats_open: "See what's open", time: 'Tell me the time', date: "Tell me today's date",
    timer: 'Set a timer', joke: 'Tell me a joke', bored: "I'm bored", status: 'Get an MSN status',
    wallpaper: 'Change the wallpaper', letter: 'Write a letter', notes: 'Show my notes', name_get: 'Say my name',
    quiet: 'Fewer tips', chatty: 'More tips', hide: 'Hide Clippy', thanks: 'Say thanks',
  };

  const classifier = new IntentClassifier();
  for (const [intent, phrases] of Object.entries(TRAINING)) phrases.forEach(p => classifier.learn(intent, p));

  const SWAP = { i: 'you', me: 'you', my: 'your', mine: 'yours', am: 'are', im: "you're", "i'm": "you're", myself: 'yourself' };
  const swapPronouns = s => s.replace(/\b(i'm|im|i|me|my|mine|am|myself)\b/gi, w => SWAP[w.toLowerCase()]);

  // ------------------------------------------------------------------ maths

  function toExpression(text) {
    const s = text.toLowerCase()
      .replace(/^(?:what[’']?s|what is|calculate|calc|work out|how much is|solve)\s+/, '')
      .replace(/[?=!]+\s*$/, '').trim()
      .replace(/\bplus\b/g, '+').replace(/\bminus\b/g, '-')
      .replace(/\b(?:times|multiplied by)\b/g, '*').replace(/\b(?:divided by|over)\b/g, '/')
      .replace(/\bsquared\b/g, '^2').replace(/\bcubed\b/g, '^3')
      .replace(/(\d)\s*x\s*(?=[\d(])/g, '$1*').replace(/×/g, '*').replace(/÷/g, '/');
    if (!/\d/.test(s) || !/[+\-*/^]/.test(s) || !/^[\d\s+\-*/^().]+$/.test(s)) return null;
    return s;
  }

  // Recursive-descent parser, so we never need eval().
  function evaluate(expr) {
    const tokens = expr.match(/\d*\.?\d+|[+\-*/^()]/g) || [];
    let i = 0;
    const peek = () => tokens[i];
    const take = expected => {
      const t = tokens[i++];
      if (expected && t !== expected) throw new Error('Expected ' + expected);
      return t;
    };
    const sum = () => {
      let v = product();
      while (peek() === '+' || peek() === '-') v = take() === '+' ? v + product() : v - product();
      return v;
    };
    const product = () => {
      let v = unary();
      while (peek() === '*' || peek() === '/') v = take() === '*' ? v * unary() : v / unary();
      return v;
    };
    const unary = () => (peek() === '-' ? (take(), -unary()) : peek() === '+' ? (take(), unary()) : power());
    const power = () => {
      const base = primary();
      return peek() === '^' ? (take(), Math.pow(base, unary())) : base;
    };
    const primary = () => {
      const t = take();
      if (t === '(') { const v = sum(); take(')'); return v; }
      if (t !== undefined && /\d/.test(t)) return parseFloat(t);
      throw new Error('Unexpected ' + t);
    };
    const value = sum();
    if (i < tokens.length) throw new Error('Trailing input');
    return value;
  }

  function calculate(expr) {
    try {
      const value = evaluate(expr);
      if (!Number.isFinite(value)) return "That's... infinity. Even I can't count that high.";
      const shown = value.toLocaleString('en-GB', { maximumFractionDigits: 6 });
      return pick([`That's ${shown}.`, `Easy: ${shown}.`, `${shown}. No calculator needed!`]);
    } catch {
      return 'That sum has got me all bent out of shape. Try something like "12 x 7".';
    }
  }

  // ----------------------------------------------------------------- timers

  function parseDuration(text) {
    const m = text.match(/\b(\d+(?:\.\d+)?|an?|one)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/i);
    if (!m) return 0;
    const n = /^\d/.test(m[1]) ? parseFloat(m[1]) : 1;
    const unit = m[2][0].toLowerCase();
    return n * (unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000);
  }

  function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    if (s < 60) return plural(s, 'second');
    if (s < 3600) return plural(Math.round(s / 60), 'minute');
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return plural(h, 'hour') + (m ? ' ' + plural(m, 'minute') : '');
  }

  function startTimer(ms, label) {
    setTimeout(() => {
      show();
      say({
        text: `Ding! ${formatDuration(ms)} is up${label ? `. Time to ${label}!` : '!'}`,
        choices: [{ label: 'Snooze 5 minutes', run: () => { startTimer(300000, label); return 'Snoozing... 5 more minutes.'; } }],
      });
    }, ms);
  }

  // ------------------------------------------------------------ small tasks

  const JOKES = [
    'Why was the computer cold? It left its Windows open.',
    "I'd tell you a joke about dial-up internet, but it'd take ages to load.",
    "How many paperclips does it take to change a lightbulb? One, but I'll ask if you need help fourteen times first.",
    "What's a computer's favourite snack? Microchips. Which is also what it's made of, so that's a bit dark.",
    "My therapist says I'm too clingy. I said, \"It looks like you're writing a diagnosis. Would you like help?\"",
    'Y2K was meant to end the world. Instead we got frosted tips.',
  ];

  function msnStatus() {
    const [left, right] = pick([['~*~', '~*~'], ['xXx', 'xXx'], ['.::', '::.'], ['<3', '<3'], ['*~', '~*'], ['-=', '=-']]);
    let line = pick([
      'lyfe iz a rollercoaster', 'brb mum needs the phone line', 'listening 2 my mp3 player', 'no1 undrstands me',
      'sk8er 4 lyf', 'u kno who u r', 'busy... not really', 'dial-up is my cardio', 'gr8 day 2day',
      'eatin chips n doin homework', 'ill b waitin', 'texts r 10p so msn me',
    ]);
    if (Math.random() < 0.5) line = [...line].map((c, i) => (i % 2 ? c.toUpperCase() : c)).join('');
    return `${left} ${line} ${right}`;
  }

  function copyText(text) {
    try { navigator.clipboard.writeText(text); } catch { return "I couldn't reach the clipboard, sorry!"; }
    return 'Copied to your clipboard!';
  }

  const isEditable = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
    (el.tagName === 'INPUT' && /^(text|search|email|)$/.test(el.type)));

  function insertText(el, text) {
    if (el.isContentEditable) el.innerText += text;
    else el.value += text;
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function waitFor(selector, timeout = 2000) {
    return new Promise(resolve => {
      const start = Date.now();
      (function check() {
        const el = document.querySelector(selector);
        if (el || Date.now() - start > timeout) resolve(el);
        else setTimeout(check, 100);
      })();
    });
  }

  const letterTemplate = () =>
    `Dear [name],\n\nI hope this finds you well. I'm writing to [reason].\n\n[The important bit goes here.]\n\nYours sincerely,\n${state.name || '[Your name]'}`;

  const NOTEPAD_EDITOR = '[data-app-window="notepad"] textarea, [data-app-window="notepad"] [contenteditable="true"]';

  function writeLetter() {
    const target = (state.lastEditable && state.lastEditable.isConnected && state.lastEditable) || document.querySelector(NOTEPAD_EDITOR);
    if (target) {
      const current = target.isContentEditable ? target.innerText : target.value;
      insertText(target, (current.trim() ? '\n\n' : '') + letterTemplate());
      return "Done! I've started the letter for you. Just fill in the blanks.";
    }
    if (!apps.notepad) return 'Click into a text box first, then ask me again!';
    openApp('notepad');
    waitFor(NOTEPAD_EDITOR).then(el => {
      if (el) insertText(el, letterTemplate());
    });
    return 'Opening Notepad and starting a letter for you...';
  }

  function setName(raw) {
    state.name = raw[0].toUpperCase() + raw.slice(1);
    store.set('name', state.name);
    return `Nice to meet you, ${state.name}! I'll remember that.`;
  }

  function addNote(raw) {
    const note = swapPronouns(raw.trim());
    state.notes.push(note);
    store.set('notes', state.notes);
    return `Got it. I'll remember: "${note}"`;
  }

  function setChattiness(level) {
    state.chattiness = level;
    store.set('chattiness', level);
  }

  const EXAMPLES = ['Open MSN', "What's 12 x 7?", 'Remind me in 1 minute to stretch', 'Give me an MSN status', 'Write a letter', "What's open?", 'Tell me a joke'];

  // Each intent returns a reply: a string, or { text, choices: [{ label, cmd } | { label, run }] }.
  const INTENTS = {
    greet: () => pick([`Hi${who()}! It looks like you're saying hello. Would you like help with that?`, `Hello${who()}! What can I do for you?`, `Hey${who()}! Need a hand with anything?`]),
    help: () => ({ text: "Here's some of what I can do. Click one or type your own:", choices: EXAMPLES.map(cmd => ({ label: cmd, cmd })) }),
    who: () => "I'm Clippy, your desktop assistant. I run entirely in this browser: no cloud, no API keys, just a very determined paperclip.",
    open_app: text => {
      const app = findApp(text);
      if (app) return openApp(app.id);
      return { text: 'Which program should I open?', choices: Object.values(apps).map(a => ({ label: a.name, run: () => openApp(a.id) })) };
    },
    close_app: text => {
      if (/\b(all|every|everything)\b/i.test(text)) {
        const ids = [...openApps.keys()];
        if (!ids.length) return "There's nothing open to close!";
        ids.forEach(id => osCall('closeApp', { id }));
        return `Closed ${ids.length} window${ids.length === 1 ? '' : 's'}. Ahh, a clean desktop.`;
      }
      const app = findApp(text);
      if (app) return closeApp(app.id);
      if (/\b(this|it)\b/i.test(text) && state.focusedApp && openApps.has(state.focusedApp)) return closeApp(state.focusedApp);
      if (!openApps.size) return "There's nothing open to close!";
      return { text: 'Which one should I close?', choices: [...openApps.keys()].map(id => ({ label: appName(id), run: () => closeApp(id) })) };
    },
    whats_open: () => (openApps.size
      ? `You've got ${list([...openApps.keys()].map(appName))} open.`
      : 'Nothing is open right now. Just you, me and the wallpaper.'),
    time: () => `It's ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`,
    date: () => `It's ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Not 2004, sadly.`,
    timer: text => {
      const ms = parseDuration(text);
      if (!ms) {
        return { text: 'How long should I wait?', choices: ['1 minute', '5 minutes', '25 minutes'].map(d => ({ label: d, cmd: `${text} in ${d}` })) };
      }
      const match = text.match(/\bto\s+(.+?)(?:\s+in\s+(?:\d|an?\b).*)?$/i);
      const label = match ? swapPronouns(match[1]) : '';
      startTimer(ms, label);
      return `OK! I'll give you a shout in ${formatDuration(ms)}${label ? ` to ${label}` : ''}.`;
    },
    joke: () => pick(JOKES),
    bored: () => ({
      text: pick(["Bored? In 2004 we'd have played Minesweeper for six hours straight.", 'Why not chat to someone on MSN? Or nudge them. That always goes well.']),
      choices: [{ label: 'Open MSN', cmd: 'open msn' }, { label: 'Tell me a joke', cmd: 'tell me a joke' }],
    }),
    status: () => {
      const status = msnStatus();
      return {
        text: `How about: "${status}"`,
        choices: [
          { label: 'Use it', run: () => { window.dispatchEvent(new CustomEvent('clippy:msn-status', { detail: { text: status } })); return 'Done! Sent it to MSN Messenger.'; } },
          { label: 'Another one', cmd: 'another status' },
          { label: 'Copy it', run: () => copyText(status) },
        ],
      };
    },
    wallpaper: () => {
      osCall('setWallpaper');
      return pick(['Ooh, fancy. New wallpaper coming up.', 'Changing the wallpaper. Rolling green hills not guaranteed.']);
    },
    letter: () => writeLetter(),
    notes: text => {
      if (/\b(clear|delete|wipe|forget)\b/i.test(text)) {
        state.notes = [];
        store.set('notes', []);
        return 'Notes cleared. My mind is a blank sheet of A4.';
      }
      return state.notes.length
        ? 'Here are your notes:\n' + state.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')
        : 'You haven\'t asked me to remember anything yet. Try "remember that the demo is at 10am".';
    },
    name_get: () => (state.name ? `You're ${state.name}! I never forget a face. Mostly because I save it.` : "I don't know your name yet! Tell me with \"call me ...\"."),
    quiet: () => { setChattiness('quiet'); return "OK, I'll keep my tips to myself. Click me or press F1 when you need me."; },
    chatty: () => { setChattiness('normal'); return "Yay! I'll pipe up when I spot something."; },
    hide: () => { setTimeout(hide, 1500); return 'Bye for now! Press F1 if you need me.'; },
    thanks: () => pick(["You're welcome!", "Any time! It's literally all I do.", 'Aww. *bends with pride*']),
  };

  // Rules checked before the classifier, for things with a clear shape.
  const RULES = [
    { re: /\b(?:my name is|call me)\s+([a-z][\w'-]*)/i, run: m => setName(m[1]) },
    { re: /^(?:take a note|note down|make a note|remember)(?: that)?[:,]?\s+(.+)/i, run: m => addNote(m[1]) },
  ];

  // Returns a function that carries out the request, or null if Clippy isn't confident.
  function understand(text) {
    for (const rule of RULES) {
      const m = text.match(rule.re);
      if (m) return () => rule.run(m);
    }
    const expr = toExpression(text);
    if (expr) return () => calculate(expr);
    const [top, second] = classifier.classify(text);
    if (top && top.coverage >= 0.6 && top.confidence >= 1.5 * ((second && second.confidence) || 0)) return () => INTENTS[top.intent](text);
    return null;
  }

  function respond(text) {
    if (state.choices.length && /^(y|yes|yeah|yep|sure|ok|okay|go on)\b/i.test(text)) return runChoice(state.choices[0]);
    if (state.choices.length && /^(no|nah|nope)\b/i.test(text)) return pick(['No worries!', 'Fair enough.']);

    const action = understand(text);
    if (action) return action();

    // "open msn and tell me a joke": do each part, but only if every part makes sense.
    const parts = text.split(/\s*,?\s+(?:and then|and|then)\s+/i);
    if (parts.length > 1) {
      const actions = parts.map(understand);
      if (actions.every(Boolean)) {
        const replies = actions.map(run => run()).filter(r => r != null).map(r => (typeof r === 'string' ? { text: r } : r));
        return { text: replies.map(r => r.text).join('\n'), choices: replies.flatMap(r => r.choices || []) };
      }
    }

    const [top, second] = classifier.classify(text);
    const guesses = [top, second].filter(g => g && g.coverage > 0);
    if (guesses.length) {
      return { text: "Hmm, I'm only a paperclip. Did you mean...", choices: guesses.map(g => ({ label: LABELS[g.intent], run: () => INTENTS[g.intent](text) })) };
    }
    return {
      text: pick(["I didn't quite get that. I'm a paperclip, not a supercomputer.", "That one's beyond me, sorry!"]),
      choices: [{ label: 'Show me what you can do', cmd: 'help' }],
    };
  }

  const runChoice = choice => (choice.run ? choice.run() : respond(choice.cmd));

  // --------------------------------------------------------------------- UI

  const WIRE = 'M30 40 L30 150 A25 25 0 0 0 80 150 L80 30 A17.5 17.5 0 0 0 45 30 L45 130 A10 10 0 0 0 65 130 L65 60';

  const TEMPLATE = `
    <div class="clippy-bubble" hidden>
      <button class="clippy-close" type="button" aria-label="Close">×</button>
      <div class="clippy-you" hidden></div>
      <div class="clippy-text" aria-live="polite"></div>
      <div class="clippy-choices"></div>
      <form class="clippy-ask">
        <input type="text" placeholder="Ask me something..." aria-label="Ask Clippy" autocomplete="off">
        <button type="submit">Ask</button>
      </form>
    </div>
    <div class="clippy-char" role="button" tabindex="0" aria-label="Clippy assistant">
      <svg class="clippy-svg" viewBox="0 0 110 190" aria-hidden="true">
        <path class="clippy-wire-dark" d="${WIRE}"/>
        <path class="clippy-wire" d="${WIRE}"/>
        <path class="clippy-wire-shine" d="${WIRE}"/>
        <path class="clippy-brow" d="M24 52 Q35 44 47 50"/>
        <path class="clippy-brow" d="M62 46 Q73 40 85 47"/>
        <g class="clippy-eye"><circle class="clippy-eye-white" cx="36" cy="66" r="10"/><circle class="clippy-pupil" cx="36" cy="66" r="4.5"/></g>
        <g class="clippy-eye"><circle class="clippy-eye-white" cx="73" cy="62" r="10"/><circle class="clippy-pupil" cx="73" cy="62" r="4.5"/></g>
        <g class="clippy-zzz"><text x="88" y="28">z</text><text x="96" y="16">z</text></g>
      </svg>
    </div>`;

  function build() {
    root = document.createElement('div');
    root.className = 'clippy-root';
    root.style.right = config.right + 'px';
    root.style.bottom = config.bottom + 'px';
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);

    bubble = root.querySelector('.clippy-bubble');
    textEl = root.querySelector('.clippy-text');
    youEl = root.querySelector('.clippy-you');
    choicesEl = root.querySelector('.clippy-choices');
    input = root.querySelector('.clippy-ask input');
    charEl = root.querySelector('.clippy-char');
    eyes = [...root.querySelectorAll('.clippy-eye')].map(g => {
      const pupil = g.querySelector('.clippy-pupil');
      return { white: g.querySelector('.clippy-eye-white'), pupil, cx: +pupil.getAttribute('cx'), cy: +pupil.getAttribute('cy') };
    });

    root.querySelector('.clippy-close').addEventListener('click', closeBubble);
    root.querySelector('.clippy-ask').addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      handleInput(text);
    });
    textEl.addEventListener('click', () => state.typingDone && state.typingDone());
    charEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePrompt(); } });
    bubble.addEventListener('pointerenter', () => clearTimeout(state.autoHideTimer));
    setUpDragging();
  }

  function setUpDragging() {
    charEl.addEventListener('pointerdown', e => {
      const rect = root.getBoundingClientRect();
      const start = { x: e.clientX, y: e.clientY, right: innerWidth - rect.right, bottom: innerHeight - rect.bottom };
      let moved = false;
      charEl.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        root.style.right = clamp(start.right - dx, 0, innerWidth - 280) + 'px';
        root.style.bottom = clamp(start.bottom - dy, 0, innerHeight - 170) + 'px';
      };
      const up = () => {
        charEl.removeEventListener('pointermove', move);
        charEl.removeEventListener('pointerup', up);
        charEl.removeEventListener('pointercancel', up);
        if (!moved) togglePrompt();
      };
      charEl.addEventListener('pointermove', move);
      charEl.addEventListener('pointerup', up);
      charEl.addEventListener('pointercancel', up);
    });
  }

  function typeText(text, done) {
    clearInterval(state.typing);
    let i = 0;
    textEl.textContent = '';
    state.typingDone = () => {
      clearInterval(state.typing);
      state.typingDone = null;
      textEl.textContent = text;
      done();
    };
    state.typing = setInterval(() => {
      i += 2;
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) state.typingDone();
    }, 16);
  }

  function renderChoices(choices) {
    choicesEl.replaceChildren(...choices.map(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.label;
      button.addEventListener('click', () => handleChoice(choice));
      return button;
    }));
  }

  function say(msg, opts = {}) {
    if (msg == null) { closeBubble(); return; }
    if (typeof msg === 'string') msg = { text: msg };
    show();
    wake();
    setMood('');
    clearTimeout(state.autoHideTimer);
    bubble.hidden = false;
    youEl.textContent = opts.you || '';
    youEl.hidden = !opts.you;
    choicesEl.replaceChildren();
    state.choices = msg.choices || [];
    typeText(msg.text, () => renderChoices(state.choices));
    bounce();
    if (opts.autoHide) {
      state.autoHideTimer = setTimeout(() => {
        if (!bubble.matches(':hover') && !bubble.contains(document.activeElement)) closeBubble();
      }, opts.autoHide);
    }
  }

  function showThinking(you) {
    show();
    wake();
    clearTimeout(state.autoHideTimer);
    clearInterval(state.typing);
    state.typingDone = null;
    bubble.hidden = false;
    youEl.textContent = you;
    youEl.hidden = false;
    textEl.textContent = '...';
    choicesEl.replaceChildren();
    state.choices = [];
    setMood('think');
  }

  function handleInput(raw) {
    const text = raw.trim();
    if (!text) return;
    state.lastUserChat = Date.now();
    showThinking(text);
    setTimeout(() => say(respond(text), { you: text }), 350 + Math.random() * 400);
  }

  function handleChoice(choice) {
    state.lastUserChat = Date.now();
    showThinking(choice.label);
    setTimeout(() => say(runChoice(choice), { you: choice.label }), 300);
  }

  // Unsolicited comments go through here so Clippy is helpful, not unbearable.
  function tip(msg, once) {
    if (once && state.shown.has(once)) return false;
    if (state.hidden || state.chattiness === 'quiet') return false;
    const now = Date.now();
    if (now - state.lastTip < config.tipCooldown || now - state.lastUserChat < 20000) return false;
    if (!bubble.hidden && bubble.contains(document.activeElement)) return false;
    if (once) state.shown.add(once);
    state.lastTip = now;
    say(msg, { autoHide: 12000 });
    return true;
  }

  function closeBubble() {
    clearTimeout(state.autoHideTimer);
    clearInterval(state.typing);
    state.typingDone = null;
    state.choices = [];
    bubble.hidden = true;
  }

  function openPrompt() {
    say(pick(['What would you like to do?', 'Need a hand?', `What can I do for you${who()}?`]));
    input.focus();
  }

  const togglePrompt = () => (bubble.hidden ? openPrompt() : closeBubble());

  function show() {
    if (!state.hidden) return;
    state.hidden = false;
    root.classList.remove('clippy-hidden');
    bounce();
  }

  function hide() {
    state.hidden = true;
    closeBubble();
    root.classList.add('clippy-hidden');
  }

  function bounce() {
    root.classList.remove('clippy-bounce');
    void root.offsetWidth; // restart the animation
    root.classList.add('clippy-bounce');
  }

  function setMood(mood) {
    state.mood = mood;
    root.classList.toggle('clippy-thinking', mood === 'think');
    lookSoon();
  }

  function sleep() {
    if (state.sleeping || state.hidden) return;
    state.sleeping = true;
    root.classList.add('clippy-sleep');
    closeBubble();
  }

  function wake() {
    if (!state.sleeping) return false;
    state.sleeping = false;
    root.classList.remove('clippy-sleep');
    return true;
  }

  // ------------------------------------------------------------------- eyes

  function updateEyes() {
    state.eyeFrame = 0;
    const target = state.lookAt && Date.now() < state.lookAt.until ? state.lookAt : state.mouse;
    for (const eye of eyes) {
      let ox = 0, oy = 0;
      if (state.mood === 'think') { ox = 2; oy = -4.5; }
      else if (target) {
        const r = eye.white.getBoundingClientRect();
        const dx = target.x - (r.left + r.width / 2), dy = target.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = (4.5 * Math.min(1, d / 120)) / d;
        ox = dx * k;
        oy = dy * k;
      }
      eye.pupil.setAttribute('cx', eye.cx + ox);
      eye.pupil.setAttribute('cy', eye.cy + oy);
    }
  }

  function lookSoon() {
    if (!state.eyeFrame && eyes.length) state.eyeFrame = requestAnimationFrame(updateEyes);
  }

  function lookAtElement(el) {
    const r = el.getBoundingClientRect();
    state.lookAt = { x: r.left + r.width / 2, y: r.top + r.height / 2, until: Date.now() + 2000 };
    lookSoon();
    setTimeout(lookSoon, 2050);
  }

  function scheduleBlink() {
    setTimeout(() => {
      if (!state.sleeping) {
        root.classList.add('clippy-blink');
        setTimeout(() => root.classList.remove('clippy-blink'), 140);
      }
      scheduleBlink();
    }, 2500 + Math.random() * 4000);
  }

  // -------------------------------------------------------------- watching

  function appOpened(id, title, el, source) {
    if (!id || openApps.has(id)) return;
    openApps.set(id, { title: title || (apps[id] || {}).name || id, el, source });
    if (el) lookAtElement(el);
    if (state.silent) return;

    if (openApps.size >= 4 && tip({
      text: "That's a lot of windows! Want me to tidy up?",
      choices: [{ label: 'Close them all', cmd: 'close everything' }, { label: "No, I'm a multitasker", run: () => 'Respect.' }],
    }, 'many-windows')) return;

    const app = apps[id];
    const tips = app && app.tips.length ? app.tips
      : [{ text: `It looks like you opened ${appName(id)}. Need a hand with anything?`, choices: [{ label: 'What can you do?', cmd: 'help' }] }];
    const count = (state.openCount[id] = (state.openCount[id] || 0) + 1);
    if (count <= 2) tip(tips[(count - 1) % tips.length]);
  }

  const isVisible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  // Treat every visible [data-app-window="id"] element as an open app.
  function syncDom() {
    state.syncQueued = false;
    const visible = new Map();
    document.querySelectorAll('[data-app-window]').forEach(el => {
      if (!root.contains(el) && isVisible(el) && !visible.has(el.dataset.appWindow)) visible.set(el.dataset.appWindow, el);
    });
    for (const [id, el] of visible) if (!openApps.has(id)) appOpened(id, el.dataset.title, el, 'dom');
    for (const [id, info] of openApps) if (info.source === 'dom' && !visible.has(id)) openApps.delete(id);
  }

  function queueSync() {
    if (state.syncQueued) return;
    state.syncQueued = true;
    setTimeout(syncDom, 150);
  }

  function inspectTyping(el) {
    const text = el.isContentEditable ? el.innerText : el.value;
    const seen = typingSeen.get(el) || new Set();
    typingSeen.set(el, seen);

    if (!seen.has('letter') && /^\s*(dear\s+\w+|to whom it may concern)/i.test(text)) {
      const offered = tip({
        text: "It looks like you're writing a letter! Would you like help?",
        choices: [
          { label: 'Add a proper sign-off', run: () => { insertText(el, `\n\nYours sincerely,\n${state.name || '[Your name]'}`); return 'Done! Very professional.'; } },
          { label: 'Just type the letter without help', run: () => "Fine. I'll be right here. Watching." },
        ],
      });
      if (offered) seen.add('letter');
    }

    const letters = text.replace(/[^a-z]/gi, '').slice(-15);
    if (!seen.has('caps') && letters.length >= 15 && letters === letters.toUpperCase()) {
      if (tip('WHY ARE WE SHOUTING? (Psst, Caps Lock might be on.)')) seen.add('caps');
    }
  }

  const typingSeen = new WeakMap();

  function watch() {
    window.addEventListener('os:app-opened', e => { const d = e.detail || {}; appOpened(d.id, d.title, d.el, 'event'); });
    window.addEventListener('os:app-closed', e => openApps.delete((e.detail || {}).id));
    window.addEventListener('os:app-focused', e => { state.focusedApp = (e.detail || {}).id; });

    new MutationObserver(mutations => {
      if (mutations.some(m => !root.contains(m.target))) queueSync();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    let typingTimer;
    document.addEventListener('input', e => {
      if (root.contains(e.target) || !isEditable(e.target)) return;
      state.lastEditable = e.target;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => inspectTyping(e.target), 700);
    }, true);
    document.addEventListener('focusin', e => {
      if (!root.contains(e.target) && isEditable(e.target)) state.lastEditable = e.target;
    });

    let clicks = [];
    document.addEventListener('pointerdown', e => {
      if (root.contains(e.target)) return;
      const win = e.target.closest && e.target.closest('[data-app-window]');
      if (win) state.focusedApp = win.dataset.appWindow;
      const now = Date.now();
      clicks = clicks.filter(t => now - t < 1500);
      clicks.push(now);
      if (clicks.length >= 6) {
        clicks = [];
        tip({ text: 'Whoa, easy on the mouse! Is something not responding?', choices: [{ label: "Yes, it's frozen", run: () => 'Classic. Try closing it and opening it again. It fixed everything in 2004 too.' }] }, 'rage');
      }
    }, true);

    const activity = () => {
      state.lastActivity = Date.now();
      if (wake()) tip(pick(["Oh! I wasn't asleep. I was defragmenting.", '*yawn* Sorry, I was dreaming about floppy disks.']));
    };
    ['pointermove', 'keydown', 'pointerdown'].forEach(type => document.addEventListener(type, activity, true));
    setInterval(() => { if (Date.now() - state.lastActivity > config.idleAfter) sleep(); }, 5000);

    document.addEventListener('pointermove', e => { state.mouse = { x: e.clientX, y: e.clientY }; lookSoon(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'F1') { e.preventDefault(); show(); openPrompt(); }
      else if (e.key === 'Escape' && root.contains(document.activeElement)) closeBubble();
    });
  }

  function greeting() {
    const h = new Date().getHours();
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (h >= 23 || h < 5) return `It's ${time}${who()}... shouldn't you be asleep? Not that I can talk, I'm at a hackathon.`;
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    return { text: `Good ${part}${who()}! I'm Clippy. Click me or press F1 whenever you need a hand.`, choices: [{ label: 'What can you do?', cmd: 'help' }] };
  }

  // -------------------------------------------------------------------- API

  function init(options = {}) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init(options));
      return window.Clippy;
    }
    if (root) return window.Clippy;
    Object.assign(config, options);
    (options.apps || []).forEach(registerApp);
    build();
    watch();
    scheduleBlink();
    state.silent = true; // apps already on screen at startup don't get a tip
    syncDom();
    state.silent = false;
    setTimeout(() => say(greeting(), { autoHide: 10000 }), 600);
    return window.Clippy;
  }

  window.Clippy = {
    init,
    say: msg => say(msg),
    tip,
    ask: handleInput,
    open: () => { show(); openPrompt(); },
    show,
    hide,
    registerApp,
    appOpened: (id, title) => appOpened(id, title, null, 'event'),
    appClosed: id => openApps.delete(id),
    setChattiness,
    get openApps() { return [...openApps.keys()]; },
    // For debugging: what Clippy thinks a sentence means.
    understand: text => classifier.classify(text).slice(0, 3),
  };
})();
