/*
 * Clippy: an offline desktop assistant for the HackNotts 26 OS.
 *
 * No external AI and no API keys. Everything runs in the browser:
 *  - Understanding: a small Naive Bayes intent classifier trained on the
 *    example phrases in TRAINING, plus regex rules for names, notes and maths.
 *    It tolerates typos and learns new phrases when you pick a "did you mean" answer.
 *  - Seeing: listens for os:* events and watches the page for
 *    [data-app-window] elements, typing, rage-clicks and idle time.
 *  - Doing: calls window.OS hooks if the OS provides them, otherwise fires
 *    clippy:* events that the other apps can listen for.
 *  - Talking: everything Clippy says lives in LINES, picked so lines don't repeat
 *    until the whole set has been used. Replies can be read aloud with the
 *    browser's built-in speech.
 *
 * Usage (at the end of <body>):
 *   <link rel="stylesheet" href="clippy/clippy.css">
 *   <script src="clippy/clippy.js"></script>
 *   <script>Clippy.init();</script>
 */
(function () {
  'use strict';

  // ------------------------------------------------------------- voice lines
  //
  // Add as many lines as you like. {placeholders} are filled in when spoken;
  // {who} becomes " <name>" once Clippy knows the user's name.

  const LINES = {
    greeting_morning: [
      "Good morning{who}! I'm Clippy. Click me or press F1 whenever you need a hand.",
      'Morning{who}! Fresh day, fresh desktop. Click me or press F1 if you need anything.',
      'Rise and shine{who}! Your friendly paperclip is ready. Click me or press F1 for help.',
      "Good morning{who}! I've had my coffee. Well, I've looked at a picture of coffee. Press F1 if you need me.",
      'Top of the morning{who}! Click me or press F1 and I will spring into action.',
    ],
    greeting_afternoon: [
      "Good afternoon{who}! I'm Clippy. Click me or press F1 whenever you need a hand.",
      'Afternoon{who}! Need anything? Click me or press F1.',
      'Hello again{who}! Post-lunch slump? I can help. Click me or press F1.',
      'Good afternoon{who}! All systems go. Click me or press F1 when you need me.',
      "Afternoon{who}! I've been polishing my wire. Click me or press F1 if you need a hand.",
    ],
    greeting_evening: [
      "Good evening{who}! I'm Clippy. Click me or press F1 whenever you need a hand.",
      'Evening{who}! Prime MSN hours. Click me or press F1 if you need anything.',
      'Good evening{who}! Burning the midnight oil early? Click me or press F1 for help.',
      "Evening{who}! I've put on my best bend for the occasion. Click me or press F1.",
      'Good evening{who}! The night is young and so is this desktop. Press F1 if you need me.',
    ],
    greeting_late: [
      "It's {time}{who}... shouldn't you be asleep? Not that I can talk, I'm at a hackathon.",
      '{time}? Bold. I respect it. Click me if you need a hand.',
      "It's {time}. The only ones awake now are hackers and owls. Which are you?",
      "Ah, {time}. Peak debugging hours. I'm here if you need me.",
      "It's {time}{who}. Your bed misses you. I'll keep you company in the meantime.",
    ],
    greet: [
      "Hi{who}! It looks like you're saying hello. Would you like help with that?",
      'Hello{who}! What can I do for you?',
      'Hey{who}! Need a hand with anything?',
      'Hiya{who}! Lovely to see you.',
      'Oh, hello{who}! I was just bending around waiting for you.',
      'Hey hey{who}! What are we doing today?',
      'Well hello there{who}!',
      'Hi{who}! Your favourite office supply, at your service.',
      'Greetings{who}! Ready to be helpful. Possibly too helpful.',
      'Alright{who}? What can I do for you?',
    ],
    prompt: [
      'What would you like to do?',
      'Need a hand?',
      'What can I do for you{who}?',
      'How can I help?',
      'Yes? Ooh, a task!',
      'Ask me anything. Within reason. I am a paperclip.',
      'At your service{who}!',
      'What are we up to?',
      "I'm all ears. Well, all wire.",
      'You rang?',
    ],
    who: [
      "I'm Clippy, your desktop assistant. I run entirely in this browser: no cloud, no API keys, just a very determined paperclip.",
      "I'm Clippy! Part paperclip, part assistant, all enthusiasm. I live right here in your browser.",
      "Clippy's the name, helping's the game. My brain is homemade and runs right here on your computer.",
      "I'm a paperclip with ambitions. I understand what you type with my own little model, no internet required.",
      "Just a humble paperclip who learned to read. I even get smarter when you correct me.",
    ],
    help: [
      "Here's some of what I can do. Click one or type your own:",
      'I can do loads! Try one of these:',
      'Here are a few ideas. Pick one or type your own:',
      'Glad you asked! Have a go at one of these:',
    ],
    open: [
      'Opening {app}...',
      'Launching {app}. Please wait while it loads at 56k...',
      'Here comes {app}!',
      'One {app}, coming right up.',
      '{app}? Excellent choice.',
      'Firing up {app}. Hold onto your mouse.',
      'Opening {app}. *dial-up noises*',
      'Done! {app} is on its way.',
    ],
    already_open: [
      '{app} is already open. Bringing it to the front!',
      "You've already got {app} open, silly. Here it is.",
      '{app} is right there! Bringing it forward.',
      'Already open! Let me dust it off for you.',
      'Good news: {app} was open all along.',
    ],
    which_open: ['Which program should I open?', 'Sure! Which one?', 'Open what? Pick one:', "I've got these. Which one?"],
    close: [
      'Closing {app}.',
      'Bye bye, {app}!',
      '{app}, begone!',
      'Closing {app}. It had a good run.',
      'Poof! {app} is closed.',
      'Shutting {app}. Tidy desktop, tidy mind.',
      'And {app} is gone. Like it was never there.',
    ],
    not_open: [
      "{app} isn't open.",
      "{app} isn't even open! Can't close what isn't there.",
      "I looked everywhere, but {app} isn't open.",
      'Nope, {app} is already closed.',
    ],
    which_close: ['Which one should I close?', 'Close which one?', 'Pick one to close:'],
    close_all: [
      'Closed {count}. Ahh, a clean desktop.',
      'Closed {count}. Lovely and tidy now.',
      'Whoosh! {count} gone.',
      'Closed {count}. Marie Kondo would be proud.',
      '{count} closed. Just you, me and the wallpaper now.',
    ],
    nothing_open: [
      "There's nothing open to close!",
      'Nothing to close. Your desktop is already spotless.',
      "You can't close nothing! Well, you can, but it's not very satisfying.",
      'All clear. Nothing open.',
    ],
    whats_open: [
      "You've got {list} open.",
      'Currently open: {list}.',
      'I can see {list} on your screen.',
      'Right now you have {list} running.',
      "Let's see... {list}. Busy bee!",
    ],
    whats_open_none: [
      'Nothing is open right now. Just you, me and the wallpaper.',
      "Nothing's open. Want me to start something?",
      'Empty desktop! Very zen.',
      'Nothing at all. A blank canvas!',
    ],
    time: [
      "It's {time}.",
      'The time is {time}.',
      "{time}. Time flies when you're hacking.",
      "It's {time}. Not that I'm counting.",
      'My little clock says {time}.',
      '{time}! Where does the day go?',
      "It's {time}. Shouldn't you have a snack about now?",
    ],
    date: [
      "It's {date}. Not 2004, sadly.",
      'Today is {date}.',
      "It's {date}. Still no hoverboards.",
      "It's {date}. Y2K didn't get us after all.",
      "Today's {date}. Write that on your hand.",
      '{date}. A fine day for a hackathon.',
    ],
    timer_ask: ['How long should I wait?', 'Sure! For how long?', 'How long should I set it for?'],
    timer_set: [
      "OK! I'll give you a shout in {duration}{todo}.",
      "Timer set for {duration}{todo}. I'll be watching the clock.",
      "Righto, {duration}{todo}. I'll ding when it's time.",
      'Got it. {duration} on the clock{todo}.',
      'Countdown started: {duration}{todo}. Tick tock.',
      "Consider it done. I'll remind you in {duration}{todo}.",
    ],
    ding: [
      'Ding! {duration} is up!{todo}',
      "Time's up!{todo}",
      'Beep beep! Your {duration} timer just finished.{todo}',
      'Ding ding ding! {duration} has passed.{todo}',
      'Hey{who}! Your timer went off.{todo}',
      'Ahem. {duration} is up.{todo}',
    ],
    snooze: ['Snoozing... 5 more minutes.', "Fine, 5 more minutes. But I'm not happy about it.", 'Snoozed. See you in 5.'],
    math: [
      "That's {answer}.",
      'Easy: {answer}.',
      '{answer}. No calculator needed!',
      'The answer is {answer}.',
      "{answer}! I counted on my... well, I don't have fingers.",
      'That comes to {answer}.',
      '{answer}. Maths is just bending numbers, really.',
    ],
    math_error: [
      'That sum has got me all bent out of shape. Try something like "12 x 7".',
      "I can't work that one out. Try something like \"(4 + 6) x 3\".",
      'My maths circuits are tangled. Try "100 / 4".',
    ],
    infinity: ["That's... infinity. Even I can't count that high.", 'Dividing by zero? That way madness lies.'],
    jokes: [
      'Why was the computer cold? It left its Windows open.',
      "I'd tell you a joke about dial-up internet, but it'd take ages to load.",
      "How many paperclips does it take to change a lightbulb? One, but I'll ask if you need help fourteen times first.",
      "What's a computer's favourite snack? Microchips.",
      "My therapist says I'm too clingy. I said, \"It looks like you're writing a diagnosis. Would you like help?\"",
      'Y2K was meant to end the world. Instead we got frosted tips.',
      'Why did the PC go to the dentist? It had Bluetooth.',
      'Why was the mouse so slow? It kept getting stuck on the mat.',
      "What do you call a paperclip that can sing? A clip-hop artist.",
      "Why don't floppy disks ever win arguments? They always back down. Well, back up.",
      "I tried to download some patience, but the progress bar has been stuck at 99% for six years.",
      "What's a pirate's favourite file format? .ARRRR.",
      "Why did the webpage go to therapy? It had too many issues with its frames.",
      "My favourite dance move is the dial-up shuffle. Eeeeee, krrrrrr, bong.",
      'How does a computer get drunk? It takes screenshots.',
      "Why did the screensaver quit? It felt like it was just going round in circles.",
      'What did the stapler say to me? "You hold it together, I\'ll do the commitment."',
      "Why did the spreadsheet break up with the calculator? It felt it was being taken for granted. Well, for sums.",
      "Why are paperclips so good at friendships? We're very attached.",
      "Knock knock. Who's there? Clippy. Clippy who? It looks like you're answering a knock-knock joke. Would you like help?",
      "I asked the printer how it was feeling. It said it was out of sorts. And out of cyan.",
      "Why did the laptop sit in the shade? It didn't want to get a hard drive tan.",
      "Why was the keyboard always tired? It had two shifts.",
      "What do you call 8 hobbits? A hobbyte.",
    ],
    joke_more: ['Another one', 'Go on, one more', 'Hit me again'],
    bored: [
      "Bored? In 2004 we'd have played Minesweeper for six hours straight.",
      'Why not chat to someone on MSN? Or nudge them. That always goes well.',
      'Bored? You could reorganise your desktop icons. By colour.',
      "Let's do something! I could tell you a joke. Or ten.",
      'When I get bored, I hold things together. Usually paper.',
      'Try changing your MSN status every 30 seconds. Very 2005.',
      "Boredom is just creativity in disguise. Or that's what my teacher said.",
    ],
    status_offer: [
      'How about: "{status}"',
      'Try this one: "{status}"',
      'Ooh, this is a good one: "{status}"',
      'Very 2005: "{status}"',
      'Your friends will love: "{status}"',
    ],
    status_used: [
      'Done! Sent it to MSN Messenger.',
      'Status updated! Everyone will be so impressed.',
      'Done. Prepare for the "wot does that mean??" messages.',
    ],
    cool_already: ['Clearly.', 'Fair. You are very cool.', 'Too cool for statuses. Got it.'],
    copied: ['Copied to your clipboard!', 'Copied! Paste away.', 'On your clipboard and ready to go.'],
    wallpaper: [
      'Ooh, fancy. New wallpaper coming up.',
      'Changing the wallpaper. Rolling green hills not guaranteed.',
      'New look! Very stylish.',
      'A fresh wallpaper for a fresh start.',
      'Redecorating! Hope you like it.',
      "Changing your background. Don't worry, I won't pick a picture of myself.",
    ],
    letter_done: [
      "Done! I've started the letter for you. Just fill in the blanks.",
      'Letter started! Fill in the bits in brackets.',
      'There you go, one letter, fresh off the press. Just fill in the blanks.',
      "I've written the boring bits. You do the important bits.",
    ],
    letter_opening: [
      'Opening Notepad and starting a letter for you...',
      "Let's write a letter! Opening Notepad...",
      'One letter coming up. Opening Notepad first...',
    ],
    letter_nowhere: ['Click into a text box first, then ask me again!', 'Where should I write it? Click into a text box first.'],
    letter_tip: [
      "It looks like you're writing a letter! Would you like help?",
      'Ooh, a letter! Want some help with that?',
      "It looks like you're writing a letter. I LOVE letters. Need a hand?",
      'Writing a letter? This is my moment! Want help?',
    ],
    signoff_done: ['Done! Very professional.', 'Signed off in style!', 'There. Your English teacher would be proud.'],
    letter_declined: [
      "Fine. I'll be right here. Watching.",
      "OK, OK. I'll just... hover.",
      'Suit yourself. Call me if you change your mind!',
      "No problem. I'll be over here, being helpful at nobody.",
    ],
    name_set: [
      "Nice to meet you, {name}! I'll remember that.",
      "{name}! What a great name. I'll remember it.",
      'Hello, {name}! Consider it saved.',
      "{name}, got it. I'll never forget. Unless you clear your browser data.",
    ],
    name_get: [
      "You're {name}! I never forget a face. Mostly because I save it.",
      "You're {name}, of course!",
      "{name}! Did you forget? That's my job.",
      "That'd be {name}. Unless you've changed it.",
    ],
    name_unknown: ["I don't know your name yet! Tell me with \"call me ...\".", "We haven't been introduced! Say \"my name is ...\"."],
    note_added: [
      'Got it. I\'ll remember: "{note}"',
      'Noted! "{note}"',
      'Saved to my memory: "{note}"',
      'I\'ve written that down: "{note}". On myself. Metaphorically.',
      'Remembered: "{note}"',
    ],
    notes_empty: [
      'You haven\'t asked me to remember anything yet. Try "remember that the demo is at 10am".',
      'No notes yet! Say "remember that ..." and I\'ll keep track.',
    ],
    notes_cleared: ['Notes cleared. My mind is a blank sheet of A4.', 'All notes wiped. Fresh start!', 'Notes deleted. What notes? Exactly.'],
    quiet: [
      "OK, I'll keep my tips to myself. Click me or press F1 when you need me.",
      'Zipping my wire. Click me or press F1 if you need me.',
      "Fine, I'll be quiet. Mostly. Press F1 if you need me.",
      'Shh mode on. You know where to find me.',
    ],
    chatty: [
      "Yay! I'll pipe up when I spot something.",
      "Tips back on! I've been saving some good ones.",
      "Brilliant! I'll keep an eye out for ways to help.",
      'Chatty mode activated. You asked for it!',
    ],
    voice_on: [
      'Hello! Can you hear me now? I sound just like 2003.',
      'Voice on! This is me. I sound different to how I imagined.',
      'Testing, testing. One, two. Is this thing on?',
      'I can talk! Prepare to be mildly impressed.',
    ],
    voice_missing: [
      "I'd love to talk, but this computer has no voices installed for the browser. On Linux, installing speech-dispatcher and espeak-ng fixes it. Text only for now!",
      "I can't find a voice on this computer, so I'm stuck typing. (Linux? Install speech-dispatcher and espeak-ng, then restart the browser.)",
    ],
    voice_off: ["OK, I'll stick to text bubbles.", 'Voice off. Back to the strong, silent type.', 'Muted. I was getting a sore throat anyway.'],
    hide: [
      'Bye for now! Press F1 if you need me.',
      'See you later! F1 brings me back.',
      "I'll be off then. Press F1 when you miss me.",
      'Going to hide in the stationery drawer. F1 if you need me!',
      'Ta-ra! Just press F1 to summon me.',
    ],
    back: ['Back again!', 'Did you miss me?', 'Ta-da! I return.', 'Reporting for duty!'],
    thanks: [
      "You're welcome!",
      "Any time! It's literally all I do.",
      'Aww. *bends with pride*',
      'No problem{who}!',
      'Happy to help!',
      'My pleasure!',
      "That's what paperclips are for.",
      'Glad I could help{who}!',
      "Don't mention it. Actually, do. I love praise.",
      'Cheers! You made my day.',
    ],
    no: ['No worries!', 'Fair enough.', 'Righto.', 'Suit yourself!', 'OK, no problem.', 'Your loss! Just kidding.'],
    unsure: [
      "Hmm, I'm only a paperclip. Did you mean...",
      'Not quite sure what you mean. Was it one of these?',
      'I think I almost got that. Did you mean...',
      'Help me out here. Which of these?',
    ],
    learned: [
      "(Got it. I'll understand that next time.)",
      "(Learned something new! I'll remember that one.)",
      "(Noted. Next time I'll know what you mean.)",
      "(Thanks for teaching me! I'm getting smarter.)",
    ],
    fallback: [
      "I didn't quite get that. I'm a paperclip, not a supercomputer.",
      "That one's beyond me, sorry!",
      "Hmm, you've lost me there. Try asking another way?",
      'Sorry, I only speak Paperclip. And some English.',
      "I'm stumped. Want to see what I can do?",
      "No idea, I'm afraid. But I'm great at maths and timers!",
      "My wire's in a twist. Could you say that differently?",
      'That one\'s beyond my classic brain. Type "settings" to give me an AI brain!',
    ],
    react: [
      'I know, right?',
      "Wild, isn't it?",
      'Tell me about it.',
      "Right?! I'm shook. Well, I'm bent.",
      'Mad, innit.',
      "I'm full of surprises.",
      'Crazy times. Anything I can do?',
      "Haha! Glad you're enjoying yourself.",
      'Same, honestly.',
      "I'll take that as a compliment.",
      'Mhm! What next?',
      "That's the spirit!",
    ],
    brain_menu: ["Which brain should I use? I'm currently on {brain}.", 'Pick my brain! (Currently: {brain})', 'Brain transplant time? Right now I use {brain}.'],
    brain_classic: ['Classic brain it is. Fast, offline, and only slightly confused.', 'Back to my trusty classic brain!'],
    brain_local_loading: [
      "Downloading my AI brain! It's about 1GB the first time, then it's saved. I'll keep answering while it loads.",
      'Upgrade time! Fetching my AI brain (about 1GB, only the first time). Chat away meanwhile.',
    ],
    brain_local_ready: ['My AI brain is ready! Talk to me about anything.', 'Brain installed! I feel... smarter. Try me.', 'AI brain online. Go on, say something weird.'],
    brain_no_webgpu: [
      "This browser can't run my built-in AI (it needs WebGPU, so try Chrome or Edge). Sticking with my classic brain.",
      'No WebGPU here, so no built-in AI brain, sorry! Chrome or Edge should work. Classic brain for now.',
    ],
    brain_error: ['My AI brain had a wobble ({error}). Using my classic brain for now.'],
    brain_ask_key: [
      'Paste your Anthropic API key into the box below and press Ask. It only stays in this browser. Type "cancel" to stop.',
      'OK! Paste the API key below and press Ask. It never leaves this browser except to talk to Claude. "cancel" to stop.',
    ],
    brain_claude_ready: ["Connected to Claude! I'm much smarter now. Mostly.", "Claude brain plugged in! Ask me anything."],
    brain_key_failed: ["That API key didn't work ({error}). Still using {brain}.", "Hmm, that key was rejected ({error}). Sticking with {brain}."],
    key_forgotten: ['API key forgotten. What key? I never saw a key.', 'Done, the key is gone from this browser.'],
    ai_still_loading: ['(My AI brain is still downloading: {percent}%.)', '(AI brain loading: {percent}%. Classic brain answering for now.)'],
    ai_hiccup: ['(My AI brain hiccuped, so that was my classic brain talking.)'],
    refusal: ["Ooh, that's not something I can help with. Try something else?"],
    wake: [
      "Oh! I wasn't asleep. I was defragmenting.",
      '*yawn* Sorry, I was dreaming about floppy disks.',
      "Huh? I'm up! I'm up!",
      'Welcome back! I may have dozed off.',
      'Oh, hello! I was just resting my eyes.',
      "You're back! I wasn't snoring, was I?",
      'Zzz... wha? Oh, hi!',
      'Back already? I was mid-dream about a stapler.',
    ],
    rage: [
      'Whoa, easy on the mouse! Is something not responding?',
      'Click click click! Everything OK there?',
      "That's a lot of clicking. Is something stuck?",
      'Steady on! Want a hand with something?',
    ],
    rage_reply: [
      'Classic. Try closing it and opening it again. It fixed everything in 2004 too.',
      'Have you tried turning it off and on again?',
      'Deep breaths. Try closing it and reopening it.',
    ],
    caps: [
      'WHY ARE WE SHOUTING? (Psst, Caps Lock might be on.)',
      'Is Caps Lock on, or are you just very excited?',
      'INDOOR VOICE, PLEASE. (Caps Lock?)',
      'Ooh, capitals. Is Caps Lock stuck?',
    ],
    many_windows: [
      "That's a lot of windows! Want me to tidy up?",
      'Whoa, window party! Want me to close some?',
      'Your desktop is getting crowded. Shall I tidy up?',
    ],
    multitasker: ['Respect.', 'A true multitasker!', 'Fair. More windows, more fun.'],
    opened_unknown: [
      'It looks like you opened {app}. Need a hand with anything?',
      'Ooh, {app}! Let me know if you need help.',
      '{app}, nice! Shout if you need me.',
      "I see you opened {app}. I'm here if you get stuck.",
    ],
  };

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
    voice: store.get('voice', false),
    brain: store.get('brain', null), // 'classic' | 'local' | 'claude' (set in init)
    apiKey: store.get('apiKey', ''),
    awaiting: null, // 'apikey' while the next thing typed is an API key
    history: [], // recent { role, content } turns, so the AI knows what was said
    requestId: 0,
    lastApp: null, // the app most recently opened or talked about, for "close it"
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

  let root, bubble, textEl, youEl, choicesEl, input, charEl, voiceButton, progressEl, eyes = [];

  // Shuffle bag: every item in a list is used once before any of them repeats,
  // and the same item never comes up twice in a row.
  const bags = new Map();
  function pick(list) {
    if (list.length < 2) return list[0];
    const key = typeof list[0] === 'string' ? list.join('\u0001') : list;
    let bag = bags.get(key);
    if (!bag || !bag.order.length) {
      const order = list.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      if (bag && order[order.length - 1] === bag.last) order.unshift(order.pop());
      bag = { order, last: bag && bag.last };
      bags.set(key, bag);
    }
    bag.last = bag.order.pop();
    return list[bag.last];
  }

  // A random line from LINES[key] with its {placeholders} filled in.
  function line(key, vars = {}) {
    const values = { who: who(), name: state.name, ...vars };
    return pick(LINES[key]).replace(/\{(\w+)\}/g, (_, k) => (values[k] == null ? '' : values[k]));
  }

  const who = () => (state.name ? ' ' + state.name : '');
  const list = items => (items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const clock = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
          choices: [{ label: 'Yes please', cmd: 'give me an msn status' }, { label: "No, I'm cool already", run: () => line('cool_already') }] },
        { text: 'Tip: a nudge is the polite way of saying REPLY TO ME RIGHT NOW.' },
        { text: 'Remember: appearing offline is the ultimate power move.' },
        { text: "Tip: if they've been typing for five minutes, it's either a love letter or an essay." },
        { text: 'Fancy a new personal message? I write great ones.', choices: [{ label: 'Go on then', cmd: 'give me an msn status' }] },
      ],
    },
    {
      id: 'notepad', name: 'Notepad', aliases: ['notepad', 'text editor', 'notes app'],
      tips: [
        { text: "It looks like you're about to write something! I can start a letter for you.",
          choices: [{ label: 'Start a letter', cmd: 'write a letter' }] },
        { text: 'Tip: type "Dear ..." and I\'ll leap into action.' },
        { text: 'Notepad! Simple, reliable, no fonts. Just how I like it.' },
        { text: 'Tip: ask me to "write a letter" and I\'ll do the boring bits.' },
        { text: 'Writing for a while? I can remind you to take a break.', choices: [{ label: 'Remind me in 25 minutes', cmd: 'remind me in 25 minutes to take a break' }] },
      ],
    },
    {
      id: 'browser', name: 'Internet Explorer', aliases: ['internet explorer', 'ie', 'browser', 'internet', 'web', 'explorer'],
      tips: [
        { text: 'Ah, the information superhighway. Remember: never download free_ram.exe.' },
        { text: "Tip: if a pop-up says you're the 1,000,000th visitor, you are not." },
        { text: 'Tip: never trust a website with five flashing DOWNLOAD buttons.' },
        { text: 'Surfing the web! Mind the pop-ups.' },
        { text: 'Tip: if a page starts playing music on its own, run.' },
      ],
    },
    {
      id: 'computer', name: 'My Computer', aliases: ['my computer', 'computer', 'files', 'documents', 'my documents'],
      tips: [
        { text: "Looking for a file? It's in My Documents. It's always in My Documents." },
        { text: 'Ah, My Computer. Where files go to be forgotten.' },
        { text: 'Tip: "New Folder (7)" is not a filing system.' },
        { text: 'Your C: drive is looking... full of potential.' },
      ],
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
    if (best) return best;
    // Allow typos in one-word names: "notpad", "mesenger".
    for (const word of padded.trim().split(/\s+/)) {
      for (const app of Object.values(apps)) {
        if (app.aliases.some(a => !a.includes(' ') && typosAllowed(a) && typoDistance(word, a) <= typosAllowed(a))) return app;
      }
    }
    return null;
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
    state.lastApp = id;
    const already = openApps.has(id);
    osCall('openApp', { id });
    return line(already ? 'already_open' : 'open', { app: appName(id) });
  }

  function closeApp(id) {
    state.lastApp = id;
    if (!openApps.has(id)) return line('not_open', { app: appName(id) });
    osCall('closeApp', { id });
    return line('close', { app: appName(id) });
  }

  // -------------------------------------------------------------- language

  const STOPWORDS = new Set(['a', 'an', 'the', 'please', 'could', 'would', 'can', 'you', 'i', 'to', 'of', 'is', 'it', 'for', 'pls', 'plz']);

  function wordsOf(text) {
    return (text.toLowerCase().replace(/['’]/g, '').match(/[a-z0-9]+/g) || [])
      .filter(w => !STOPWORDS.has(w))
      .map(w => (w.length > 3 ? w.replace(/(ing|s)$/, '') : w));
  }

  function withBigrams(words) {
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + '_' + words[i + 1]);
    return words.concat(bigrams);
  }

  // Edit distance where swapping two neighbouring letters counts as one typo.
  function typoDistance(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) d.push([i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  const typosAllowed = word => (word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0);

  // The closest known word within a typo or two, so "opne notpad" still works.
  function closestWord(word, known) {
    const allowed = typosAllowed(word);
    let best = null, bestDistance = allowed + 1;
    for (const k of known) {
      if (Math.abs(k.length - word.length) > allowed) continue;
      const distance = typoDistance(word, k);
      if (distance < bestDistance) { best = k; bestDistance = distance; }
    }
    return best;
  }

  // Multinomial Naive Bayes with add-one smoothing.
  class IntentClassifier {
    constructor() { this.intents = {}; this.vocab = new Set(); this.unigrams = new Set(); this.total = 0; }

    learn(intent, phrase) {
      const c = this.intents[intent] || (this.intents[intent] = { docs: 0, words: 0, counts: {} });
      c.docs++;
      this.total++;
      const words = wordsOf(phrase);
      words.forEach(w => this.unigrams.add(w));
      for (const t of withBigrams(words)) {
        c.counts[t] = (c.counts[t] || 0) + 1;
        c.words++;
        this.vocab.add(t);
      }
    }

    // coverage = share of the sentence's words this intent has seen before,
    // so one familiar word in an unfamiliar sentence doesn't count as understood.
    classify(text) {
      const words = wordsOf(text).map(w => (this.unigrams.has(w) ? w : closestWord(w, this.unigrams) || w));
      const tokens = withBigrams(words).filter(t => this.vocab.has(t));
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
    help: ['help', 'what can you do', 'what do you do', 'how do you work', 'show me what you can do', 'commands', 'i need help', 'options', 'what are your features', 'how do i use you', 'do something', 'can you do smth', 'do smth', 'what else can you do', 'anything else'],
    react: ['damn', 'thats crazy', 'wow', 'lol', 'haha', 'omg', 'no way', 'cool', 'nice', 'interesting', 'wtf', 'bruh', 'fair enough', 'true', 'yeah', 'yh', 'mad', 'crazy', 'unreal', 'sick', 'lmao', 'oh', 'hmm', 'really', 'seriously', 'wild', 'thats mad', 'oh wow', 'thats insane'],
    settings: ['settings', 'change your brain', 'use ai', 'switch brain', 'turn on ai', 'use the ai', 'make you smarter', 'ai mode', 'change mode', 'use an api key', 'brain settings', 'classic mode', 'turn off ai', 'use claude', 'built in ai', 'forget my api key'],
    who: ['who are you', 'what are you', 'whats your name', 'are you a robot', 'are you an ai', 'tell me about yourself', 'are you alive', 'how do you think'],
    open_app: ['open msn', 'open notepad', 'launch the browser', 'start messenger', 'run notepad', 'open internet explorer', 'i want to chat', 'open it', 'load the app', 'show me msn', 'go on the internet', 'open my computer', 'start the program', 'launch', 'open the web browser', 'open my documents'],
    close_app: ['close msn', 'close notepad', 'quit the browser', 'exit messenger', 'shut notepad', 'kill the app', 'close this window', 'get rid of this window', 'close everything', 'close all windows', 'close it', 'close the program', 'shut it down'],
    whats_open: ['what is open', 'whats open', 'what apps are open', 'which windows are open', 'what am i running', 'whats running', 'list open windows', 'what have i got open', 'show open programs', 'what programs are running'],
    time: ['what time is it', 'whats the time', 'time please', 'current time', 'tell me the time', 'what time', 'got the time'],
    date: ['what day is it', 'whats the date', 'todays date', 'what is the date today', 'which day is it', 'date', 'what is today'],
    timer: ['set a timer', 'timer for 5 minutes', 'remind me in 10 minutes', 'remind me to drink water', 'set an alarm', 'countdown 30 seconds', 'alert me in an hour', 'wake me up in 20 minutes', 'start a timer', 'remind me later', 'set a reminder'],
    joke: ['tell me a joke', 'joke', 'make me laugh', 'say something funny', 'know any jokes', 'another joke', 'be funny', 'tell me something funny', 'another one', 'one more joke'],
    bored: ['im bored', 'i am bored', 'nothing to do', 'entertain me', 'what should i do', 'boring', 'suggest something', 'so bored'],
    status: ['give me an msn status', 'status idea', 'make me a status', 'cool msn name', 'what should my status be', 'give me a display name', 'personal message idea', 'emo status', 'another status', 'new status', 'msn status'],
    wallpaper: ['change wallpaper', 'new background', 'change the background', 'different wallpaper', 'change desktop picture', 'next wallpaper', 'change the desktop background'],
    letter: ['write a letter', 'help me write a letter', 'letter template', 'help me write', 'write an email', 'draft a letter', 'start a letter', 'write a cover letter'],
    notes: ['show my notes', 'what are my notes', 'read my notes', 'list notes', 'what did i ask you to remember', 'clear my notes', 'delete my notes', 'my notes'],
    name_get: ['what is my name', 'whats my name', 'do you know my name', 'who am i', 'say my name'],
    quiet: ['be quiet', 'shut up', 'stop talking', 'stop giving tips', 'less tips', 'stop interrupting', 'shh', 'quiet', 'no more tips'],
    chatty: ['talk more', 'give me tips', 'be chatty', 'you can talk again', 'turn tips on', 'more tips'],
    voice_on: ['turn on your voice', 'speak to me', 'talk out loud', 'read it out loud', 'use your voice', 'say it out loud', 'voice on', 'unmute', 'can you speak', 'read aloud'],
    voice_off: ['turn off your voice', 'mute', 'voice off', 'stop reading out loud', 'no voice', 'stop speaking out loud', 'silent mode', 'stop reading aloud'],
    hide: ['go away', 'hide', 'bye', 'goodbye', 'disappear', 'see you later', 'hide yourself', 'leave me alone', 'minimise yourself'],
    thanks: ['thanks', 'thank you', 'cheers', 'ta', 'nice one', 'great', 'awesome', 'good job', 'love you', 'you are the best', 'perfect'],
  };

  const LABELS = {
    greet: 'Just saying hi', help: 'See what you can do', who: 'Tell me about you', open_app: 'Open a program',
    close_app: 'Close a program', whats_open: "See what's open", time: 'Tell me the time', date: "Tell me today's date",
    timer: 'Set a timer', joke: 'Tell me a joke', bored: "I'm bored", status: 'Get an MSN status',
    wallpaper: 'Change the wallpaper', letter: 'Write a letter', notes: 'Show my notes', name_get: 'Say my name',
    quiet: 'Fewer tips', chatty: 'More tips', hide: 'Hide Clippy', thanks: 'Say thanks',
    voice_on: 'Read replies aloud', voice_off: 'Stop reading aloud', react: 'Just reacting', settings: 'Change your brain',
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
      if (!Number.isFinite(value)) return line('infinity');
      return line('math', { answer: value.toLocaleString('en-GB', { maximumFractionDigits: 6 }) });
    } catch {
      return line('math_error');
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
      chime();
      say({
        text: line('ding', { duration: formatDuration(ms), todo: label ? ` Time to ${label}!` : '' }),
        choices: [{ label: 'Snooze 5 minutes', run: () => { startTimer(300000, label); return line('snooze'); } }],
      });
    }, ms);
  }

  // ------------------------------------------------------------ small tasks

  function msnStatus() {
    const [left, right] = pick([['~*~', '~*~'], ['xXx', 'xXx'], ['.::', '::.'], ['<3', '<3'], ['*~', '~*'], ['-=', '=-']]);
    let text = pick([
      'lyfe iz a rollercoaster', 'brb mum needs the phone line', 'listening 2 my mp3 player', 'no1 undrstands me',
      'sk8er 4 lyf', 'u kno who u r', 'busy... not really', 'dial-up is my cardio', 'gr8 day 2day',
      'eatin chips n doin homework', 'ill b waitin', 'texts r 10p so msn me', 'dnt h8 me cuz u aint me',
      'on the fone, msg me l8r', 'got 99 problems n homework is all of them', 'bored bored BORED',
      'missin u already', 'grounded 4 a week dnt ask', 'my ringtone is betta than urs', 'away... or AM I',
    ]);
    if (Math.random() < 0.5) text = [...text].map((c, i) => (i % 2 ? c.toUpperCase() : c)).join('');
    return `${left} ${text} ${right}`;
  }

  function copyText(text) {
    try { navigator.clipboard.writeText(text); } catch { return "I couldn't reach the clipboard, sorry!"; }
    return line('copied');
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
      return line('letter_done');
    }
    if (!apps.notepad) return line('letter_nowhere');
    openApp('notepad');
    waitFor(NOTEPAD_EDITOR).then(el => {
      if (el) insertText(el, letterTemplate());
    });
    return line('letter_opening');
  }

  function setName(raw) {
    state.name = raw[0].toUpperCase() + raw.slice(1);
    store.set('name', state.name);
    return line('name_set');
  }

  function addNote(raw) {
    const note = swapPronouns(raw.trim());
    state.notes.push(note);
    store.set('notes', state.notes);
    return line('note_added', { note });
  }

  function setChattiness(level) {
    state.chattiness = level;
    store.set('chattiness', level);
  }

  const EXAMPLES = ['Open MSN', "What's 12 x 7?", 'Remind me in 1 minute to stretch', 'Give me an MSN status', 'Write a letter', "What's open?", 'Turn on your voice', 'Tell me a joke'];

  // Each intent returns a reply: a string, or { text, choices: [{ label, cmd } | { label, run }] }.
  const INTENTS = {
    greet: () => line('greet'),
    help: () => ({ text: line('help'), choices: EXAMPLES.map(cmd => ({ label: cmd, cmd })) }),
    who: () => line('who'),
    open_app: text => {
      const app = findApp(text);
      if (app) return openApp(app.id);
      if (/\b(it|that)\b/i.test(text) && state.lastApp) return openApp(state.lastApp);
      return { text: line('which_open'), choices: Object.values(apps).map(a => ({ label: a.name, run: () => openApp(a.id) })) };
    },
    close_app: text => {
      if (/\b(all|every|everything)\b/i.test(text)) {
        const ids = [...openApps.keys()];
        if (!ids.length) return line('nothing_open');
        ids.forEach(id => osCall('closeApp', { id }));
        return line('close_all', { count: `${ids.length} window${ids.length === 1 ? '' : 's'}` });
      }
      const app = findApp(text);
      if (app) return closeApp(app.id);
      if (/\b(this|it|that)\b/i.test(text)) {
        const current = [state.focusedApp, state.lastApp].find(id => id && openApps.has(id));
        if (current) return closeApp(current);
      }
      if (!openApps.size) return line('nothing_open');
      return { text: line('which_close'), choices: [...openApps.keys()].map(id => ({ label: appName(id), run: () => closeApp(id) })) };
    },
    whats_open: () => (openApps.size
      ? line('whats_open', { list: list([...openApps.keys()].map(appName)) })
      : line('whats_open_none')),
    time: () => line('time', { time: clock() }),
    date: () => line('date', { date: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }),
    timer: text => {
      const ms = parseDuration(text);
      if (!ms) {
        return { text: line('timer_ask'), choices: ['1 minute', '5 minutes', '25 minutes'].map(d => ({ label: d, cmd: `${text} in ${d}` })) };
      }
      const match = text.match(/\bto\s+(.+?)(?:\s+in\s+(?:\d|an?\b).*)?$/i);
      const label = match ? swapPronouns(match[1]) : '';
      startTimer(ms, label);
      return line('timer_set', { duration: formatDuration(ms), todo: label ? ` to ${label}` : '' });
    },
    joke: () => ({ text: line('jokes'), choices: [{ label: pick(LINES.joke_more), cmd: 'tell me a joke' }] }),
    bored: () => ({
      text: line('bored'),
      choices: [{ label: 'Open MSN', cmd: 'open msn' }, { label: 'Tell me a joke', cmd: 'tell me a joke' }],
    }),
    status: () => {
      const status = msnStatus();
      return {
        text: line('status_offer', { status }),
        choices: [
          { label: 'Use it', run: () => { window.dispatchEvent(new CustomEvent('clippy:msn-status', { detail: { text: status } })); return line('status_used'); } },
          { label: 'Another one', cmd: 'another status' },
          { label: 'Copy it', run: () => copyText(status) },
        ],
      };
    },
    wallpaper: () => {
      osCall('setWallpaper');
      return line('wallpaper');
    },
    letter: () => writeLetter(),
    notes: text => {
      if (/\b(clear|delete|wipe|forget)\b/i.test(text)) {
        state.notes = [];
        store.set('notes', []);
        return line('notes_cleared');
      }
      return state.notes.length
        ? 'Here are your notes:\n' + state.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')
        : line('notes_empty');
    },
    name_get: () => line(state.name ? 'name_get' : 'name_unknown'),
    voice_on: () => turnVoiceOn(),
    voice_off: () => { setVoice(false); return line('voice_off'); },
    quiet: () => {
      setChattiness('quiet');
      if (window.speechSynthesis) speechSynthesis.cancel();
      return line('quiet');
    },
    chatty: () => { setChattiness('normal'); return line('chatty'); },
    hide: () => { setTimeout(hide, 1500); return line('hide'); },
    thanks: () => line('thanks'),
    react: () => line('react'),
    settings: text => {
      if (/\bforget\b/i.test(text)) return forgetKey();
      if (/\b(classic|off)\b/i.test(text)) return setBrain('classic');
      if (/\b(claude|api|key)\b/i.test(text)) return setBrain('claude');
      if (/\b(built|local)\b/i.test(text)) return setBrain('local');
      return brainMenu();
    },
  };

  // Small talk the AI does better than canned lines, when an AI brain is ready.
  const CHAT_INTENTS = new Set(['greet', 'react', 'thanks', 'who', 'bored']);

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
    const clearWinner = top && second && top.confidence >= 1.5 * second.confidence;
    const onlyFit = top && top.coverage === 1 && (!second || second.coverage < 0.5);
    if (top && top.coverage >= 0.6 && (!second || clearWinner || onlyFit)) {
      const run = () => INTENTS[top.intent](text);
      run.intent = top.intent;
      return run;
    }
    return null;
  }

  const asReply = r => (typeof r === 'string' ? { text: r } : r);
  const withNote = (reply, note) => { const r = asReply(reply); return { ...r, text: r.text + '\n' + note }; };

  // Returns a reply, or a Promise of one when the AI brain is answering.
  function respond(text) {
    if (state.choices.length && /^(y|yes|yeah|yep|sure|ok|okay|go on)\b/i.test(text)) return runChoice(state.choices[0]);
    if (state.choices.length && /^(no|nah|nope)\b/i.test(text)) return line('no');

    // Clear commands are handled directly: instant and reliable, whatever the brain.
    const action = understand(text);
    if (action && !(CHAT_INTENTS.has(action.intent) && aiReady())) return action();

    // "open msn and tell me a joke": do each part, but only if every part makes sense.
    const parts = text.split(/\s*,?\s+(?:and then|and|then)\s+/i);
    if (!action && parts.length > 1) {
      const actions = parts.map(understand);
      if (actions.every(Boolean)) {
        const replies = actions.map(run => run()).filter(r => r != null).map(asReply);
        return { text: replies.map(r => r.text).join('\n'), choices: replies.flatMap(r => r.choices || []) };
      }
    }

    const classic = () => (action ? action() : notUnderstood(text));
    if (aiReady()) {
      return askAI(text).catch(err => {
        console.warn('Clippy AI error:', err);
        return withNote(classic(), line('ai_hiccup'));
      });
    }
    if (state.brain === 'local' && ai.loading) return withNote(classic(), line('ai_still_loading', { percent: Math.round(ai.progress * 100) }));
    return classic();
  }

  function notUnderstood(text) {
    const [top, second] = classifier.classify(text);
    const guesses = [top, second].filter(g => g && g.coverage >= 0.5);
    if (guesses.length) {
      return {
        text: line('unsure'),
        choices: guesses.map(g => ({
          label: LABELS[g.intent],
          run: () => {
            learnPhrase(g.intent, text);
            const r = asReply(INTENTS[g.intent](text));
            return { ...r, text: r.text + '\n' + line('learned') };
          },
        })),
      };
    }
    return { text: line('fallback'), choices: [{ label: 'Show me what you can do', cmd: 'help' }] };
  }

  const runChoice = choice => (choice.run ? choice.run() : respond(choice.cmd));

  // Phrases the user taught Clippy by picking a "did you mean" answer. Saved, so it keeps getting smarter.
  const learned = store.get('learned', []).filter(p => TRAINING[p.intent]);
  learned.forEach(p => classifier.learn(p.intent, p.text));

  function learnPhrase(intent, text) {
    classifier.learn(intent, text);
    learned.push({ intent, text });
    store.set('learned', learned.slice(-200));
  }

  // ----------------------------------------------------------------- brains
  //
  // 'classic': the classifier above only. Instant and offline.
  // 'local':   a small open AI model (Llama 3.2 1B), downloaded once (~1GB, then
  //            cached by the browser) and run on this computer with WebLLM.
  //            No account or key. Needs WebGPU (Chrome or Edge).
  // 'claude':  Claude via the Anthropic API, with a key pasted into Clippy.

  const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';
  const CLAUDE_MODEL = 'claude-opus-5-5';
  const BRAIN_NAMES = { classic: 'my classic brain', local: 'built-in AI', claude: 'Claude' };

  const ai = { engine: null, loading: null, progress: 0 };

  const aiReady = () => (state.brain === 'local' && !!ai.engine) || (state.brain === 'claude' && !!state.apiKey);

  function loadLocalModel() {
    if (ai.loading) return ai.loading;
    ai.loading = (async () => {
      const adapter = navigator.gpu && await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('no-webgpu');
      const model = adapter.features.has('shader-f16') ? 'Llama-3.2-1B-Instruct-q4f16_1-MLC' : 'Llama-3.2-1B-Instruct-q4f32_1-MLC';
      const webllm = await import(WEBLLM_URL);
      // The model runs in a worker so the desktop doesn't freeze while it thinks.
      const workerCode = `import { WebWorkerMLCEngineHandler } from '${WEBLLM_URL}';
        const handler = new WebWorkerMLCEngineHandler();
        self.onmessage = msg => handler.onmessage(msg);`;
      const worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })), { type: 'module' });
      ai.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, {
        initProgressCallback: report => {
          ai.progress = report.progress;
          progressEl.hidden = false;
          progressEl.textContent = `AI brain: ${Math.round(report.progress * 100)}% loaded`;
        },
      });
      return ai.engine;
    })();
    ai.loading.catch(() => { ai.loading = null; });
    return ai.loading;
  }

  function startLocal(announce) {
    progressEl.hidden = false;
    progressEl.textContent = 'AI brain: starting...';
    loadLocalModel()
      .then(() => {
        progressEl.hidden = true;
        if (announce && state.brain === 'local') say(line('brain_local_ready'), { autoHide: 10000 });
      })
      .catch(err => {
        progressEl.hidden = true;
        if (state.brain !== 'local') return;
        state.brain = 'classic';
        store.set('brain', 'classic');
        say(err.message === 'no-webgpu' ? line('brain_no_webgpu') : line('brain_error', { error: err.message }));
      });
  }

  function setBrain(brain) {
    if (brain === 'claude' && !state.apiKey) {
      state.awaiting = 'apikey';
      input.type = 'password';
      input.placeholder = 'Paste your API key...';
      setTimeout(() => input.focus(), 0);
      return line('brain_ask_key');
    }
    if (brain === 'local' && !ai.engine) {
      return (async () => {
        const adapter = navigator.gpu && await navigator.gpu.requestAdapter().catch(() => null);
        if (!adapter) return line('brain_no_webgpu');
        state.brain = 'local';
        store.set('brain', 'local');
        startLocal(true);
        return line('brain_local_loading');
      })();
    }
    state.brain = brain;
    store.set('brain', brain);
    return line({ local: 'brain_local_ready', claude: 'brain_claude_ready', classic: 'brain_classic' }[brain]);
  }

  function brainMenu() {
    const choices = [
      { label: 'Classic (instant, works offline)', run: () => setBrain('classic') },
      { label: 'Built-in AI (free, no account, ~1GB download)', run: () => setBrain('local') },
      { label: 'Claude (needs an API key)', run: () => setBrain('claude') },
    ];
    if (state.apiKey) choices.push({ label: 'Forget my API key', run: forgetKey });
    return { text: line('brain_menu', { brain: BRAIN_NAMES[state.brain] }), choices };
  }

  function forgetKey() {
    state.apiKey = '';
    store.set('apiKey', '');
    if (state.brain === 'claude') { state.brain = 'classic'; store.set('brain', 'classic'); }
    return line('key_forgotten');
  }

  function stopAwaitingKey() {
    state.awaiting = null;
    input.type = 'text';
    input.placeholder = 'Ask me something...';
  }

  // The next thing typed after choosing Claude is the key: check it works before switching.
  function receiveKey(key) {
    stopAwaitingKey();
    if (/^cancel$/i.test(key)) { say(line('no')); return; }
    showThinking('••••••••');
    askClaude([{ role: 'user', content: 'Say hi in five words or fewer.' }], key)
      .then(() => {
        state.apiKey = key;
        store.set('apiKey', key);
        say(setBrain('claude'));
      })
      .catch(err => say(line('brain_key_failed', { error: err.message, brain: BRAIN_NAMES[state.brain] })));
  }

  function systemPrompt() {
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const open = openApps.size ? list([...openApps.keys()].map(appName)) : 'nothing';
    const commands = [
      ...Object.values(apps).flatMap(a => [`open ${a.name}`, `close ${a.name}`]),
      'close everything', 'change the wallpaper', 'give me an msn status', 'write a letter',
      'remind me in <number> minutes to <task>', 'tell me a joke',
    ];
    return [
      'You are Clippy, a cheerful, slightly over-eager talking paperclip who lives on a retro Windows 7-style desktop built for the HackNotts 2026 hackathon (theme: the 2000s).',
      'Reply in one or two short sentences, under 40 words. Plain text only: no markdown, lists or emojis. British English. Be playful, warm and helpful; 2000s references are welcome.',
      `It is ${clock()} on ${date}. Open windows: ${open}.${state.name ? ` The user's name is ${state.name}.` : ''}`,
      'You can control the desktop. Only when the user asks for one of these, put the matching command on its own line at the end of your reply, written exactly like this:',
      ...commands.map(c => `[do: ${c}]`),
      "You can't browse the web or see the screen beyond what is listed here, so don't pretend to.",
    ].join('\n');
  }

  async function askClaude(messages, key = state.apiKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        output_config: { effort: 'low' },
        fallbacks: 'default',
        system: systemPrompt(),
        messages,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || `HTTP ${res.status}`);
    if (data.stop_reason === 'refusal') return line('refusal');
    return data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }

  async function askLocal(messages) {
    const result = await ai.engine.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt() }, ...messages],
      max_tokens: 120,
      temperature: 0.8,
    });
    return (result.choices[0].message.content || '').trim();
  }

  async function askAI(text) {
    const messages = [...state.history.slice(-12), { role: 'user', content: text }];
    const reply = state.brain === 'claude' ? await askClaude(messages) : await askLocal(messages);
    return runCommands(reply);
  }

  // Carry out any [do: ...] commands the AI asked for, using the classic brain's actions.
  function runCommands(reply) {
    const results = [];
    const text = reply.replace(/\[do:\s*([^\]]+)\]/gi, (_, cmd) => {
      const action = understand(cmd.trim());
      if (action) results.push(asReply(action()));
      return '';
    }).trim();
    // Keep an action's own text when it carries something the AI can't know (like a generated status).
    const extra = results.filter(r => r.choices && r.choices.length).map(r => r.text);
    return {
      text: [text || results.map(r => r.text).join('\n'), ...extra].filter(Boolean).join('\n') || '...',
      choices: results.flatMap(r => r.choices || []),
    };
  }

  function remember(userText, reply) {
    if (reply == null) return;
    state.history.push({ role: 'user', content: userText }, { role: 'assistant', content: asReply(reply).text });
    if (state.history.length > 24) state.history.splice(0, state.history.length - 24);
  }

  // ------------------------------------------------------------ sound & voice

  let audio;

  // A little two-note chime for when Clippy pipes up on its own.
  function chime() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      [880, 1320].forEach((freq, i) => {
        const start = now + i * 0.09;
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
        osc.connect(gain).connect(audio.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch { /* no audio available */ }
  }

  // Read replies aloud with the browser's built-in speech (no API involved).
  function speak(text) {
    if (!state.voice || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*~<>=_]+/g, ' '));
    const voice = speechSynthesis.getVoices().find(v => /^en[-_]GB/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-GB';
    utterance.rate = 1.05;
    utterance.pitch = 0.9;
    speechSynthesis.speak(utterance);
  }

  // Voices load asynchronously in some browsers, so wait briefly for them.
  function voicesReady() {
    if (!window.speechSynthesis) return Promise.resolve([]);
    const voices = speechSynthesis.getVoices();
    if (voices.length) return Promise.resolve(voices);
    return new Promise(resolve => {
      const done = () => resolve(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }

  async function turnVoiceOn() {
    const voices = await voicesReady();
    if (!voices.length) {
      setVoice(false);
      return line('voice_missing');
    }
    setVoice(true);
    return line('voice_on');
  }

  function setVoice(on) {
    state.voice = on;
    store.set('voice', on);
    if (voiceButton) voiceButton.setAttribute('aria-pressed', String(on));
    if (!on && window.speechSynthesis) speechSynthesis.cancel();
  }

  // --------------------------------------------------------------------- UI

  const WIRE = 'M30 40 L30 150 A25 25 0 0 0 80 150 L80 30 A17.5 17.5 0 0 0 45 30 L45 130 A10 10 0 0 0 65 130 L65 60';

  const TEMPLATE = `
    <div class="clippy-bubble" hidden>
      <button class="clippy-close" type="button" aria-label="Close">×</button>
      <div class="clippy-you" hidden></div>
      <div class="clippy-text" aria-live="polite"></div>
      <div class="clippy-choices"></div>
      <div class="clippy-progress" hidden></div>
      <form class="clippy-ask">
        <button class="clippy-voice" type="button" aria-pressed="false" aria-label="Read replies aloud" title="Read replies aloud">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z"/><path class="clippy-waves" d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9"/></svg>
        </button>
        <button class="clippy-settings" type="button" aria-label="Choose Clippy's brain" title="Choose Clippy's brain">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle class="clippy-cog" cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="2"/></svg>
        </button>
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
    voiceButton = root.querySelector('.clippy-voice');
    voiceButton.setAttribute('aria-pressed', String(state.voice));
    progressEl = root.querySelector('.clippy-progress');
    root.querySelector('.clippy-settings').addEventListener('click', () => say(brainMenu()));
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
    voiceButton.addEventListener('click', () => {
      if (state.voice) { setVoice(false); say(line('voice_off')); }
      else turnVoiceOn().then(say);
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
    msg = asReply(msg);
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
    speak(msg.text);
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

  // Show "...", work out the reply (which may come from the AI), then say it.
  // A newer message cancels an older one that's still waiting.
  function reply(you, produce) {
    state.lastUserChat = Date.now();
    showThinking(you);
    const id = ++state.requestId;
    const started = Date.now();
    Promise.resolve()
      .then(produce)
      .catch(err => { console.warn('Clippy error:', err); return line('fallback'); })
      .then(result => {
        const pause = Math.max(0, 350 + Math.random() * 400 - (Date.now() - started));
        setTimeout(() => {
          if (id !== state.requestId) return;
          remember(you, result);
          say(result, { you });
        }, pause);
      });
  }

  function handleInput(raw) {
    const text = raw.trim();
    if (!text) return;
    if (state.awaiting === 'apikey') { receiveKey(text); return; }
    reply(text, () => respond(text));
  }

  function handleChoice(choice) {
    reply(choice.label, () => runChoice(choice));
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
    chime();
    say(msg, { autoHide: 12000 });
    return true;
  }

  function closeBubble() {
    if (state.awaiting) stopAwaitingKey();
    clearTimeout(state.autoHideTimer);
    clearInterval(state.typing);
    state.typingDone = null;
    state.choices = [];
    bubble.hidden = true;
  }

  function openPrompt() {
    say(line('prompt'));
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
    if (window.speechSynthesis) speechSynthesis.cancel();
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
    state.lastApp = id;
    if (el) lookAtElement(el);
    if (state.silent) return;

    if (openApps.size >= 4 && tip({
      text: line('many_windows'),
      choices: [{ label: 'Close them all', cmd: 'close everything' }, { label: "No, I'm a multitasker", run: () => line('multitasker') }],
    }, 'many-windows')) return;

    // Comment on the first few opens of each app, with a different tip each time.
    const count = (state.openCount[id] = (state.openCount[id] || 0) + 1);
    if (count > 3) return;
    const app = apps[id];
    if (app && app.tips.length) tip(pick(app.tips));
    else tip({ text: line('opened_unknown', { app: appName(id) }), choices: [{ label: 'What can you do?', cmd: 'help' }] });
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
        text: line('letter_tip'),
        choices: [
          { label: 'Add a proper sign-off', run: () => { insertText(el, `\n\nYours sincerely,\n${state.name || '[Your name]'}`); return line('signoff_done'); } },
          { label: 'Just type the letter without help', run: () => line('letter_declined') },
        ],
      });
      if (offered) seen.add('letter');
    }

    const letters = text.replace(/[^a-z]/gi, '').slice(-15);
    if (!seen.has('caps') && letters.length >= 15 && letters === letters.toUpperCase()) {
      if (tip(line('caps'))) seen.add('caps');
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
        tip({ text: line('rage'), choices: [{ label: "Yes, it's frozen", run: () => line('rage_reply') }] }, 'rage');
      }
    }, true);

    const activity = () => {
      state.lastActivity = Date.now();
      if (wake()) tip(line('wake'));
    };
    ['pointermove', 'keydown', 'pointerdown'].forEach(type => document.addEventListener(type, activity, true));
    setInterval(() => { if (Date.now() - state.lastActivity > config.idleAfter) sleep(); }, 5000);

    document.addEventListener('pointermove', e => { state.mouse = { x: e.clientX, y: e.clientY }; lookSoon(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (state.hidden) { show(); say(line('back')); input.focus(); } else openPrompt();
      } else if (e.key === 'Escape' && root.contains(document.activeElement)) closeBubble();
    });
  }

  function greeting() {
    const h = new Date().getHours();
    if (h >= 23 || h < 5) return line('greeting_late', { time: clock() });
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    return { text: line('greeting_' + part), choices: [{ label: 'What can you do?', cmd: 'help' }] };
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
    // The brain the user last picked wins; otherwise options.brain ('classic' or 'local').
    state.brain = state.brain || options.brain || 'classic';
    if (state.brain === 'claude' && !state.apiKey) state.brain = 'classic';
    build();
    if (state.brain === 'local') startLocal(false);
    watch();
    scheduleBlink();
    state.silent = true; // apps already on screen at startup don't get a tip
    syncDom();
    state.silent = false;
    setTimeout(() => { if (!state.lastUserChat) say(greeting(), { autoHide: 10000 }); }, 600);
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
    setVoice,
    setBrain: brain => Promise.resolve(setBrain(brain)).then(say),
    get brain() { return state.brain; },
    get openApps() { return [...openApps.keys()]; },
    // For debugging: what Clippy thinks a sentence means.
    understand: text => classifier.classify(text).slice(0, 3),
    lineCount: () => Object.values(LINES).reduce((n, l) => n + l.length, 0),
  };
})();
