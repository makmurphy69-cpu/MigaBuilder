/* MigaBuilder command palette — press Ctrl+K (⌘K on Mac) on any page to jump to a tool.
 * Also offers quick actions (dark mode, on-screen keyboard, install as an app) and remembers
 * the tools you open most recently. Everything stays in this browser.
 */
(function () {
  'use strict';
  if (window.__migaPalette) return; window.__migaPalette = true;
  // [page, icon, name, what it does, extra search words]
  const TOOLS = [
    ["website-builder.html", "🌐", "Website Builder", "Generate a complete multi-page business site.", ""],
    ["game-forge.html", "🥷", "Game Forge", "Turn a prompt into a playable browser game.", ""],
    ["3d-game-forge.html", "🕹️", "3D Game Forge", "Describe a 3D game and play it: runner, racer, maze, platformer, arena or open world — edit the level and share it.", "3d game maker 3d game generator ai game three.js endless runner racing kart racer maze first person platformer arena shooter open world level editor share game no code"],
    ["cartoon-forge.html", "🎞️", "Cartoon Forge", "Create an animated story and record it as video.", ""],
    ["3d-cartoon.html", "🧸", "3D Cartoon", "Describe a story and watch it play as a 3D cartoon with talking characters.", "3d cartoon animation cel shaded toon movie three.js story characters ai video"],
    ["app-forge.html", "📱", "App Forge", "Build a self-contained browser app.", ""],
    ["bot-forge.html", "🤖", "Bot Forge", "Make a website FAQ and chat widget.", ""],
    ["bug-scanner.html", "🐞", "Bug Scanner", "Find, explain and fix bugs in any code — and preview what it builds.", "bug scanner code checker debug debugger error fix code review syntax python javascript html java c++ security lint"],
    ["video-forge.html", "🎬", "Video Forge", "Turn drawings and images into motion.", ""],
    ["talk-forge.html", "🗣️", "Talk Forge", "Make a photo speak with your audio.", ""],
    ["clip-forge.html", "✂️", "Clip Forge", "Trim, caption and translate video.", ""],
    ["merge-forge.html", "🧩", "Merge Forge", "Combine clips, images, text and music.", ""],
    ["music-forge.html", "🎵", "Music Forge", "Generate original browser-made music.", ""],
    ["record-forge.html", "⏺️", "Record Forge", "Record your screen with narration.", ""],
    ["media-convert.html", "🔄", "Media Convert", "Turn video into GIF, extract audio and transcribe speech.", ""],
    ["audio-forge.html", "🎚️", "Audio Forge", "Trim, join, fade, speed up and convert audio to MP3 or WAV.", "audio editor trim cut join merge mp3 wav fade volume speed reverse voice recorder cutter"],
    ["logo-forge.html", "🎨", "Logo Forge", "Create a logo, favicon and brand kit.", ""],
    ["slide-forge.html", "📊", "Slide Forge", "Generate a downloadable PowerPoint.", ""],
    ["invoice-forge.html", "🧾", "Invoice Forge", "Make quotes and printable invoices.", ""],
    ["contract-forge.html", "📜", "Contract Forge", "Draft straightforward agreements.", ""],
    ["cv-forge.html", "📄", "CV Forge", "Create a professional CV and download it as PDF.", ""],
    ["name-forge.html", "✨", "Name Forge", "Find business names and domains.", ""],
    ["post-forge.html", "📣", "Post Forge", "Prepare and publish social posts.", ""],
    ["repurpose-forge.html", "♻️", "Repurpose Forge", "Turn one idea into a complete publishing pack.", ""],
    ["form-forge.html", "📝", "Form Forge", "Create private downloadable forms and surveys.", ""],
    ["document-forge.html", "📄", "Document Forge", "Convert documents, images and PDFs privately.", ""],
    ["pdf-forge.html", "📕", "PDF Forge", "Merge, split, number, watermark and create PDFs.", ""],
    ["pdf-edit-forge.html", "✍️", "Sign Documents", "Sign PDFs, Word files and photos — draw, type or upload your signature.", ""],
    ["pdf-compress.html", "🗜️", "Compress PDF", "Shrink PDFs for email and upload limits.", ""],
    ["ocr-forge.html", "🔎", "OCR Forge", "Extract editable text from images privately.", ""],
    ["grammar-forge.html", "✓", "Grammar Forge", "Check writing privately in six languages with actionable suggestions.", ""],
    ["text-compare.html", "⚖️", "Text Compare", "See exactly what changed between two versions of a text.", "text compare diff checker difference compare documents versions changes contract"],
    ["geo-forge.html", "🗺️", "Geography Forge", "Explore every country on a world map, then generate a quiz.", ""],
    ["sim-forge.html", "🚦", "Vehicle Simulator", "Learn to drive, ride and steer, and fly a 3D plane or helicopter with a real instrument panel.", ""],
    ["reasoning-test.html", "🧠", "Reasoning Test", "Practice progressive reasoning questions with worked explanations.", ""],
    ["pattern-lab.html", "🔷", "Work Pattern Test", "Practise employer-style patterns and learn from worked explanations.", ""],
    ["strength-compass.html", "🧭", "Strength Compass", "Discover your top five personal strengths privately.", ""],
    ["big-five.html", "🧩", "Big Five Personality", "Explore five personality dimensions with a private 50-question report.", ""],
    ["code-forge.html", "🧑‍💻", "Code Forge", "Learn Python and JavaScript.", ""],
    ["alphabet-forge.html", "🔤", "Alphabet Forge", "Hear, learn, write and type the world’s alphabets — with an on-screen keyboard.", "alphabet letters writing script language learn thai arabic chinese mandarin japanese hiragana katakana korean hangul greek russian cyrillic hebrew hindi devanagari georgian pronunciation keyboard typing on-screen keyboard"],
    ["idea-atlas.html", "🏛️", "Idea Atlas", "Explore philosophies and ideologies, their thinkers and connections, then play the quiz.", "philosophy politics ideology history thinkers quiz game liberalism socialism conservatism stoicism marxism feminism"],
    ["exam-checker.html", "📝", "Exam Checker", "Print answer sheets, photograph each student's paper and download everyone's marks.", "exam checker test marking grading grade answer sheet bubble sheet omr scan photo teacher quiz multiple choice zipgrade gradescope results excel"],
    ["biology-map.html", "🧬", "Biology Map", "Tree of life and shared DNA, how DNA is built, gene expression, mutations, evolution and human diversity.", "biology dna genes genetics evolution tree of life species animals human chimpanzee similarity gene expression protein codon mutation natural selection ancestry ethnic groups human diversity migration neanderthal quiz"],
    ["chemistry-map.html", "⚗️", "Chemistry Map", "Interactive periodic table: every element’s atom, forms, uses and compounds, mixing, materials and quizzes.", "chemistry periodic table elements atoms atomic number symbols compounds molecules bonds ionic covalent metals materials alloys steel glass plastic battery molar mass formula calculator science quiz"],
    ["body-map.html", "🫀", "Body Map", "Explore organs, bones, muscles, tendons and skin: how they work, illnesses and care, digestion, fasting and quizzes.", "human body anatomy skeleton bones muscles tendons skin organs biology health illness disease symptoms treatment heart brain lungs liver digestion fasting nutrition quiz"],
    ["flashcard-forge.html", "🗂️", "Flashcard Forge", "AI flashcards, Anki-style spaced repetition, games, stats and share links.", "flashcards flash cards study spaced repetition memorize revise quiz anki quizlet vocabulary cloze matching game stats share"],
    ["memory-forge.html", "🧠", "Memory Forge", "Memory training with levels: number and symbol cards, timed or untimed, chimp test, pairs and n-back.", "memory training brain game memorize numbers symbols cards digit span chimp test n-back dual n-back pairs concentration corsi sequence levels timer working memory memory palace"],
    ["paint-forge.html", "🖌️", "Paint Forge", "Edit images with layers in the browser.", ""],
    ["file-forge.html", "🖼️", "Image Forge", "Batch-convert, resize, compress and clean image metadata.", ""],
    ["image-studio.html", "🪄", "Image Studio", "Remove backgrounds with AI, make collages, memes and thumbnails.", ""],
    ["picture-forge.html", "🌄", "Picture Forge", "Turn a written description into an original AI picture.", "text to image art photo illustration gemini"],
    ["everyday-forge.html", "📈", "Everyday Forge", "Create charts, improve writing, generate passwords and convert values.", ""],
    ["utility-forge.html", "🧰", "Utility Forge", "Convert CSV/JSON, combine text and verify files.", ""],
    ["site-checkup.html", "✅", "Website Checkup", "Check HTML for SEO and accessibility problems.", ""],
    ["project-hub.html", "🗂️", "Project Hub", "Manage and back up projects stored on this device.", ""],
    ["model-forge.html", "🧊", "Model Forge", "Design 3D models and printable forms.", ""],
    ["cad-forge.html", "🏠", "CAD Forge", "Draw a floor plan and get a 3D house, drawings and a material list.", "cad house building design floor plan architecture walls roof framing elevation dxf blueprint"],
    ["boat-forge.html", "⛵", "Boat Forge", "Design a boat hull, see it float in 3D, check stability and speed, and get plywood panels.", "boat design hull designer build a boat naval architecture dinghy skiff canoe kayak sailboat catamaran pontoon stitch and glue plywood panels lines plan hydrostatics stability displacement 3d dxf stl"],
    ["palette-forge.html", "🌈", "Palette Forge", "Build accessible color systems.", ""],
    ["qr-forge.html", "▦", "QR Forge", "Create downloadable QR codes.", ""],
    ["screen-forge.html", "🤝", "Screen Share Forge", "Get live remote help.", ""],
    ["meet-forge.html", "👥", "Meet Forge", "Host group video rooms and topic communities.", ""],
    ["media-convert-forge.html", "🎞️", "Media Convert Forge", "Trim, rotate, resize and compress video, or make a GIF or MP3.", "ffmpeg video compress trim cut rotate gif mp3 resize"],
    ["templates.html", "🧰", "Templates", "Ready-made starting points for the tools.", "templates starter examples"],
    ["sample-viewer.html", "🎬", "Samples & video guides", "Watch every tool being used and open the sample it made.", "samples videos tutorials guides help"],
    ["feedback.html", "💬", "Send feedback", "Report a bug or suggest an idea.", "feedback bug report idea contact help"]
  ];
  const SYN = { site: 'website web page', web: 'website', homepage: 'website', resume: 'cv', photo: 'image picture', pic: 'image', movie: 'video', film: 'video', clip: 'video',
    mp4: 'video', mp3: 'audio', sound: 'audio music', song: 'music', voice: 'audio record talk', sign: 'signature pdf', scan: 'ocr', bill: 'invoice', receipt: 'invoice',
    deck: 'slide powerpoint', ppt: 'slide powerpoint', play: 'game', draw: 'paint', '3d': 'model cad', house: 'cad', map: 'geography', quiz: 'flashcard geography',
    translate: 'clip grammar', chat: 'bot meet', letter: 'writing document', word: 'document writing', gif: 'media convert', compress: 'pdf media' };
  const HISTORY = 'migabuilder-tool-history';
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // Remember this visit so the palette (and the home page's "Recently used") can offer it first.
  if (TOOLS.some(t => t[0] === here)) {
    try { const h = read(HISTORY).filter(x => x !== here); h.unshift(here); localStorage.setItem(HISTORY, JSON.stringify(h.slice(0, 12))); } catch (e) {}
  }

  // ---------- install as an app (PWA) ----------
  let installEvent = null;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; document.dispatchEvent(new CustomEvent('miga-installable')); });
  window.addEventListener('appinstalled', () => { installEvent = null; document.dispatchEvent(new CustomEvent('miga-installable')); });
  async function install() {
    if (installEvent) { installEvent.prompt(); try { await installEvent.userChoice; } catch (e) {} installEvent = null; document.dispatchEvent(new CustomEvent('miga-installable')); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(standalone() ? 'MigaBuilder is already installed and running as an app.' : ios
      ? 'On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”. MigaBuilder then opens like an app and the tools you have used work offline.'
      : 'Use your browser menu: “Install MigaBuilder…” or “Add to Home screen”. (In Chrome and Edge it is also the small install icon at the right of the address bar.) Tools you have opened once then work offline.');
  }
  window.MigaInstall = { install, available: () => !!installEvent, installed: standalone };
  async function saveOffline() {
    const sw = 'serviceWorker' in navigator && await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]);
    if (!sw || !sw.active) { alert('Offline saving needs a browser with service workers, on https://migabuilder.com.'); return; }
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:10001;background:#0E2A47;color:#EDEAE0;border:1px solid rgba(111,209,224,.5);border-radius:10px;padding:10px 14px;font:14px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
    toast.textContent = '⏳ Saving ' + TOOLS.length + ' tools for offline use…';
    document.body.appendChild(toast);
    const ch = new MessageChannel();
    ch.port1.onmessage = e => {
      toast.textContent = '✓ ' + e.data.saved + ' of ' + e.data.total + ' tools saved. They now open without internet (AI features and big add-ons still need one online visit).';
      setTimeout(() => toast.remove(), 7000);
    };
    sw.active.postMessage({ type: 'precache', urls: ['/', '/index.html'].concat(TOOLS.map(t => '/' + t[0])) }, [ch.port2]);
  }

  // ---------- palette UI ----------
  const css = '.mp-back{position:fixed;inset:0;z-index:10000;background:rgba(4,12,20,.55);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:12vh 12px 12px}' +
    '.mp-box{width:min(620px,100%);background:#0E2A47;color:#EDEAE0;border:1px solid rgba(111,209,224,.4);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;font:15px "IBM Plex Sans",system-ui,sans-serif}' +
    '.mp-box input{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid rgba(111,209,224,.25);color:#EDEAE0;font:inherit;font-size:17px;padding:16px 18px;outline:none}' +
    '.mp-box input::placeholder{color:rgba(237,234,224,.45)}' +
    '.mp-list{max-height:min(420px,60vh);overflow:auto;margin:0;padding:6px;list-style:none}' +
    '.mp-list li{display:flex;gap:12px;align-items:center;padding:9px 12px;border-radius:8px;cursor:pointer}' +
    '.mp-list li[aria-selected=true]{background:rgba(111,209,224,.16)}' +
    '.mp-list .mp-ic{width:28px;text-align:center;font-size:19px;flex:none}.mp-list b{font-weight:600}.mp-list small{display:block;color:rgba(237,234,224,.6);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.mp-list .mp-txt{min-width:0;flex:1}.mp-list .mp-tag{font-size:11px;color:#6FD1E0;border:1px solid rgba(111,209,224,.35);border-radius:999px;padding:1px 7px;flex:none}' +
    '.mp-head{padding:8px 12px 2px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(237,234,224,.45);cursor:default!important}' +
    '.mp-foot{display:flex;gap:14px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid rgba(111,209,224,.18);font-size:11.5px;color:rgba(237,234,224,.5)}.mp-foot kbd{font:inherit;border:1px solid rgba(237,234,224,.3);border-radius:4px;padding:0 5px}' +
    '.mp-empty{padding:18px;color:rgba(237,234,224,.6);text-align:center}';
  let back = null, input, list, items = [], sel = 0, lastFocus = null;
  function actions() {
    const a = [];
    const theme = document.querySelector('.miga-theme');
    if (theme) a.push({ icon: '🌓', name: 'Switch dark / light mode', desc: 'Easier on the eyes at night', words: 'dark light theme night mode', run: () => theme.click() });
    const kb = Array.from(document.querySelectorAll('.miga-bar button')).find(b => /Keyboard/.test(b.textContent));
    if (kb) a.push({ icon: '⌨️', name: 'Open the on-screen keyboard', desc: 'Type in Arabic, Russian, Chinese, Hindi, Korean, accents…', words: 'keyboard language alphabet type accents', run: () => kb.click() });
    if (!standalone()) a.push({ icon: '📲', name: 'Install MigaBuilder as an app', desc: installEvent ? 'Adds it to your computer or phone — works offline' : 'Add it to your home screen or desktop — works offline', words: 'install app pwa offline desktop home screen download', run: install });
    a.push({ icon: '✈️', name: 'Save every tool for offline use', desc: 'Download all tool pages now so they open on a plane or with no signal', words: 'offline save cache download airplane plane no internet', run: saveOffline });
    if (here !== 'index.html') a.push({ icon: '🏠', name: 'All tools (home page)', desc: 'Browse every tool by category', words: 'home all tools start index', go: 'index.html' });
    return a;
  }
  function score(item, words) {
    if (!words.length) return 1;
    const name = item.name.toLowerCase(), hay = (item.name + ' ' + item.desc + ' ' + (item.words || '')).toLowerCase();
    let total = 0;
    for (const w of words) {
      let s = 0;
      if (name.startsWith(w)) s = 12; else if (name.split(/\s+/).some(x => x.startsWith(w))) s = 10;
      else if (hay.includes(w)) s = 6;
      else if ((SYN[w] || '').split(' ').some(x => x && hay.includes(x))) s = 5;
      else { let i = 0; for (const ch of name) if (ch === w[i]) i++; if (w.length >= 2 && i === w.length) s = 3; } // letters in order: "wbb" → Website Builder
      if (!s) return 0;
      total += s;
    }
    return total;
  }
  function build() {
    const q = input.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    const tools = TOOLS.map(t => ({ icon: t[1], name: t[2], desc: t[3], words: t[4] + ' ' + t[0].replace(/[-.]/g, ' '), go: t[0] }));
    const recent = read(HISTORY).filter(h => h !== here);
    const rank = it => { const r = recent.indexOf(it.go); return r < 0 ? 99 : r; };
    let groups;
    if (!words.length) {
      const rec = recent.map(h => tools.find(t => t.go === h)).filter(Boolean).slice(0, 5);
      groups = [['Recent', rec], ['Actions', actions()], ['All tools', tools.filter(t => !rec.includes(t))]];
    } else {
      const found = tools.concat(actions()).map(it => ({ it, s: score(it, words) })).filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s || rank(a.it) - rank(b.it) || a.it.name.localeCompare(b.it.name)).map(x => x.it);
      groups = [['Results', found]];
    }
    items = []; list.innerHTML = '';
    groups.forEach(([title, arr]) => {
      if (!arr.length) return;
      if (!words.length) { const h = document.createElement('li'); h.className = 'mp-head'; h.textContent = title; h.setAttribute('role', 'presentation'); list.appendChild(h); }
      arr.forEach(it => {
        const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = 'mp-o' + items.length;
        li.innerHTML = '<span class="mp-ic"></span><span class="mp-txt"><b></b><small></small></span>' + (it.go === here ? '<span class="mp-tag">you are here</span>' : it.run ? '<span class="mp-tag">action</span>' : '');
        li.querySelector('.mp-ic').textContent = it.icon; li.querySelector('b').textContent = it.name; li.querySelector('small').textContent = it.desc;
        const n = items.length; li.addEventListener('mousemove', () => { if (sel !== n) { sel = n; mark(); } });
        li.addEventListener('click', e => choose(n, e.ctrlKey || e.metaKey || e.button === 1));
        items.push({ it, li }); list.appendChild(li);
      });
    });
    if (!items.length) list.innerHTML = '<li class="mp-empty" role="presentation">No tool matches “' + q.replace(/[<>&]/g, '') + '”. Try “pdf”, “video”, “cv” or “game”.</li>';
    sel = 0; mark();
  }
  function mark() {
    items.forEach((x, i) => x.li.setAttribute('aria-selected', String(i === sel)));
    const cur = items[sel]; if (cur) { cur.li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', cur.li.id); }
  }
  function choose(i, newTab) {
    const x = items[i]; if (!x) return;
    close();
    if (x.it.run) { x.it.run(); return; }
    if (newTab) window.open(x.it.go, '_blank', 'noopener'); else location.href = x.it.go;
  }
  function open() {
    if (back) return;
    if (!document.getElementById('mp-style')) { const st = document.createElement('style'); st.id = 'mp-style'; st.textContent = css; document.head.appendChild(st); }
    lastFocus = document.activeElement;
    back = document.createElement('div'); back.className = 'mp-back';
    back.innerHTML = '<div class="mp-box" role="dialog" aria-modal="true" aria-label="Jump to a tool"><input type="text" role="combobox" aria-expanded="true" aria-controls="mp-list" aria-autocomplete="list" placeholder="Search tools and actions — try “web”, “pdf”, “game”…" autocomplete="off" spellcheck="false" data-no-autosave>' +
      '<ul class="mp-list" id="mp-list" role="listbox"></ul><div class="mp-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> new tab</span><span><kbd>Esc</kbd> close</span></div></div>';
    document.body.appendChild(back);
    input = back.querySelector('input'); list = back.querySelector('.mp-list');
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    input.addEventListener('input', build);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(sel, e.ctrlKey || e.metaKey); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') e.preventDefault();
    });
    build(); input.focus();
  }
  function close() {
    if (!back) return;
    back.remove(); back = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); back ? close() : open(); }
  });
  window.MigaPalette = { open, close };
})();
