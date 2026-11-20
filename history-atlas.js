/* history-atlas.js — the shared engine of the history atlases (Weapons Atlas,
 * Surgery Atlas, Medicine & Disease Atlas, Castle Atlas, Invention Atlas,
 * Space Atlas). A page loads atlas-art.js, its data file and this file, then calls
 *   HistoryAtlas.init({ key, items, cats, eras, sections, word, … })
 * Item fields: id, n (name), c (category id), y (year, negative = BCE),
 * d (date as shown, optional), r (where), w (who), s (summary), one field per
 * entry of `sections` (text or an array of steps), f (fact), p (picture recipe
 * for atlas-art.js), x (links: ids in this atlas or ['page.html#id','Name']).
 * Everything runs in the browser; nothing is sent anywhere.
 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hexA = (hex, a) => { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, m => m + m) : h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
  function fmtYear(y) {
    if (y <= -100000) { const m = -y / 1e6; return m >= 1 ? 'c. ' + (Math.round(m * 10) / 10) + ' million years ago' : 'c. ' + Math.round(-y / 1000) + ',000 years ago'; }
    if (y <= -10000) return 'c. ' + Math.round(-y / 1000) + ',000 BCE';
    if (y < 0) return -y + ' BCE';
    return String(y);
  }

  function init(cfg) {
    const $ = id => document.getElementById(id);
    const root = $('atlas');
    const W = cfg.word || ['entry', 'entries'];
    const items = cfg.items.slice().sort((a, b) => a.y - b.y || a.n.localeCompare(b.n));
    const BY = {}; items.forEach((x, i) => { BY[x.id] = x; x._i = i; x._d = x.d || fmtYear(x.y); });
    const CATS = cfg.cats; // {id:[label,color,icon]}
    const eras = cfg.eras.map((e, i) => Object.assign({ i }, e));
    const eraOf = y => eras.find(e => y < e.to) || eras[eras.length - 1];
    items.forEach(x => { x._era = eraOf(x.y); x._t = hexA(CATS[x.c] ? CATS[x.c][1] : '#6FD1E0', .16); x._hay = (x.n + ' ' + (x.alt || '') + ' ' + (x.w || '') + ' ' + (x.r || '') + ' ' + x.s + ' ' + (CATS[x.c] || [''])[0]).toLowerCase(); });
    const art = (x, label) => window.AtlasArt ? AtlasArt.svg(x.p, label ? x.n : '') : '';
    let seen = new Set(store.get(cfg.key + 'Seen', [])), selected = null, catF = '', eraF = '', sortBy = 'old', q = '', view = 'cards';

    // ---------- layout
    const catCount = {}; items.forEach(x => catCount[x.c] = (catCount[x.c] || 0) + 1);
    root.innerHTML =
      '<div class="ha-stats"><span><b>' + items.length + '</b>' + esc(W[1]) + '</span><span><b>' + Object.keys(CATS).length + '</b>groups</span><span><b>' + eras.length + '</b>eras</span><span>' + esc(items[0]._d) + ' → ' + esc(items[items.length - 1]._d) + '</span><span>✓ <b id="haSeen">0</b>explored</span></div>' +
      '<div class="ha-bar"><div class="ha-search"><input id="haQ" type="search" autocomplete="off" placeholder="' + esc(cfg.searchHint || 'Search…') + '" aria-label="Search"></div>' +
      '<select id="haEra" aria-label="Era"><option value="">All eras</option>' + eras.map(e => '<option value="' + e.i + '">' + esc(e.n) + '</option>').join('') + '</select>' +
      '<select id="haSort" aria-label="Sort"><option value="old">Oldest first</option><option value="new">Newest first</option><option value="az">A–Z</option></select>' +
      '<button class="chip active" data-view="cards" aria-pressed="true">🗂️ Cards</button><button class="chip" data-view="tl" aria-pressed="false">🕰️ Timeline</button><button class="chip" id="haRandom">🎲 Surprise me</button></div>' +
      '<div class="ha-cats" id="haCats" role="group" aria-label="Groups"><button class="chip active" data-cat="">All<span class="n">' + items.length + '</span></button>' + Object.keys(CATS).map(k => '<button class="chip" data-cat="' + k + '"><i>' + CATS[k][2] + '</i>' + esc(CATS[k][0]) + '<span class="n">' + (catCount[k] || 0) + '</span></button>').join('') + '</div>' +
      '<p class="ha-count" id="haCount" aria-live="polite"></p>' +
      '<section class="ha-explorer"><div class="ha-listwrap" id="haList"><div class="ha-grid" id="haGrid"></div><div class="ha-tl hidden" id="haTl"></div><div class="ha-empty hidden" id="haNone">Nothing matches. Try another word or group.</div></div>' +
      '<article class="panel ha-info" id="haInfo" aria-live="polite" tabindex="-1"><div class="empty">' + (cfg.emptyIcon || '🧭') + '<br><strong>Pick any card</strong><br>or search above to read its history.<br>Everything you open counts toward the quiz.</div></article></section>' +
      '<section class="panel" id="quizPanel" style="margin-top:18px"><h2>🏆 Quiz game</h2><p>Make a quiz from everything, what you explored, one group or one era. <b>Challenge mode</b> gives 20 seconds per question, bonus points for speed and a multiplier for streaks.</p>' +
      '<div class="qgrid"><div class="field"><label for="qSource">Questions about</label><select id="qSource"><option value="all">Everything</option><option value="seen">What I explored</option>' + Object.keys(CATS).map(k => '<option value="c:' + k + '">' + esc(CATS[k][0]) + '</option>').join('') + eras.map(e => '<option value="e:' + e.i + '">' + esc(e.n) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="qCount">Number of questions</label><select id="qCount"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></div>' +
      '<div class="field"><label for="qMode">Mode</label><select id="qMode"><option value="challenge">Challenge — timed, points &amp; streaks</option><option value="practice">Practice — no timer</option></select></div></div>' +
      '<div class="checks" id="qTypes"><label><input type="checkbox" value="pic" checked> Name the picture</label><label><input type="checkbox" value="which" checked> Which one is described</label><label><input type="checkbox" value="when" checked> When</label>' + (cfg.noWho ? '' : '<label><input type="checkbox" value="who" checked> ' + esc(cfg.whoLabel || 'Who') + '</label>') + '<label><input type="checkbox" value="first" checked> Which came first</label><label><input type="checkbox" value="fact" checked> Did you know</label><label><input type="checkbox" value="kind"> Which group</label></div>' +
      '<div class="actions"><button class="primary" id="makeQuiz" data-primary>Generate quiz</button><button class="secondary" id="printQuiz">⬇ Printable quiz + answers</button></div>' +
      '<p class="muted" id="bestLine" style="margin-top:10px"></p>' +
      '<div id="quizArea" class="hidden" style="margin-top:14px"><div class="hud"><span id="qProg"></span><span id="qStreak"></span><span id="qScore"></span></div><div class="timer" id="timerBar"><i id="timerFill"></i></div><div class="quiz-q" id="qText"></div><div class="quiz-pic hidden" id="qPic"></div><div class="opts" id="qOpts"></div><div class="explain hidden" id="qExplain"></div>' +
      '<div class="actions" style="margin-top:10px"><button class="primary hidden" id="qNext">Next question →</button><button class="secondary" id="qQuit">End quiz</button></div></div>' +
      '<div id="quizDone" class="hidden" style="margin-top:14px"><h3 id="doneTitle" style="font:700 22px \'Space Grotesk\';margin:0 0 6px"></h3><p id="doneSub"></p><ol class="review" id="review"></ol><div class="actions"><button class="primary" id="newQuiz">New quiz</button><button class="secondary" id="retryWrong">Retry the ones I missed</button></div></div></section>' +
      (cfg.note ? '<p class="ha-note">' + cfg.note + '</p>' : '');
    $('haSeen').textContent = seen.size;

    // ---------- cards (built once, then shown, hidden and reordered)
    const grid = $('haGrid'), cardEl = {};
    const frag = document.createDocumentFragment();
    items.forEach(x => {
      const b = document.createElement('button');
      b.className = 'ha-card'; b.dataset.id = x.id; b.style.setProperty('--c', (CATS[x.c] || ['', '#6FD1E0'])[1]); b.style.setProperty('--t', x._t);
      b.innerHTML = '<span class="ha-thumb">' + art(x) + '</span><b>' + esc(x.n) + '</b><small>' + (seen.has(x.id) ? '<span class="seen">✓ </span>' : '') + esc(x._d) + ' · ' + esc((CATS[x.c] || [''])[0]) + '</small>';
      b.onclick = () => select(x.id);
      cardEl[x.id] = b; frag.appendChild(b);
    });
    grid.appendChild(frag);
    const matches = x => (!catF || x.c === catF) && (eraF === '' || x._era.i === +eraF) && (!q || q.split(/\s+/).every(w => x._hay.includes(w)));
    function ordered(list) { const l = list.slice(); if (sortBy === 'new') l.reverse(); else if (sortBy === 'az') l.sort((a, b) => a.n.localeCompare(b.n)); return l; }
    function refresh() {
      const vis = ordered(items.filter(matches));
      if (view === 'cards') { const set = new Set(vis.map(x => x.id)); items.forEach(x => cardEl[x.id].classList.toggle('hidden', !set.has(x.id))); vis.forEach(x => grid.appendChild(cardEl[x.id])); }
      else drawTimeline(vis);
      $('haNone').classList.toggle('hidden', !!vis.length);
      $('haCount').textContent = vis.length === items.length ? 'Showing all ' + items.length + ' ' + W[1] + '.' : 'Showing ' + vis.length + ' of ' + items.length + ' ' + W[1] + '.';
    }
    function drawTimeline(vis) {
      const list = sortBy === 'az' ? vis.slice().sort((a, b) => a.y - b.y) : vis;
      const groups = []; list.forEach(x => { const g = groups[groups.length - 1]; if (g && g.e === x._era) g.l.push(x); else groups.push({ e: x._era, l: [x] }); });
      $('haTl').innerHTML = groups.map(g => '<div class="ha-era"><h3>' + esc(g.e.n) + '</h3><span class="rng">' + esc(g.e.range || '') + ' · ' + g.l.length + ' ' + (g.l.length === 1 ? W[0] : W[1]) + '</span>' + (g.e.intro ? '<p>' + esc(g.e.intro) + '</p>' : '') +
        g.l.map(x => '<button class="ha-row' + (x.id === selected ? ' sel' : '') + '" data-id="' + x.id + '" style="--c:' + (CATS[x.c] || ['', '#6FD1E0'])[1] + '"><span class="yr">' + esc(x._d) + '</span><span class="dot"></span><span class="nm">' + (seen.has(x.id) ? '✓ ' : '') + esc(x.n) + '<small>' + (CATS[x.c] || ['', '', ''])[2] + ' ' + esc((CATS[x.c] || [''])[0]) + (x.r ? ' · ' + esc(x.r) : '') + '</small></span></button>').join('') + '</div>').join('');
      $('haTl').querySelectorAll('[data-id]').forEach(b => b.onclick = () => select(b.dataset.id));
    }

    // ---------- detail
    const info = $('haInfo'); let pushed = false;
    const mobile = () => matchMedia('(max-width:980px)').matches;
    function linkChip(l) {
      if (Array.isArray(l)) return '<a class="ext" href="' + esc(l[0]) + '">' + esc(l[1]) + ' ↗</a>';
      const t = BY[l]; return t ? '<button data-go="' + t.id + '">' + (CATS[t.c] || ['', '', ''])[2] + ' ' + esc(t.n) + '</button>' : '';
    }
    function select(id, opts) {
      opts = opts || {};
      const x = BY[id]; if (!x) return;
      if (selected && cardEl[selected]) cardEl[selected].classList.remove('sel');
      selected = id; cardEl[id].classList.add('sel');
      if (!seen.has(id)) { seen.add(id); store.set(cfg.key + 'Seen', [...seen]); $('haSeen').textContent = seen.size; const sm = cardEl[id].querySelector('small'); if (sm) sm.insertAdjacentHTML('afterbegin', '<span class="seen">✓ </span>'); }
      const cat = CATS[x.c] || ['', '#6FD1E0', ''];
      const same = items.filter(o => o.c === x.c), si = same.indexOf(x);
      const before = same[si - 1], after = same[si + 1];
      const secs = (cfg.sections || []).filter(s => x[s[0]]).map(s => { const v = x[s[0]]; return '<div class="ha-sect' + (s[2] ? ' ' + s[2] : '') + '"><h3>' + esc(s[1]) + '</h3>' + (Array.isArray(v) ? '<ol>' + v.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>' : '<p>' + esc(v) + '</p>') + '</div>'; }).join('');
      const links = (x.x || []).map(linkChip).join('');
      const idx = x._i, prev = items[idx - 1], next = items[idx + 1];
      info.innerHTML = '<div class="ha-close"><b>' + esc(x.n) + '</b><button class="secondary" id="haBack">✕ Close</button></div>' +
        '<div class="ha-hero" style="--c:' + cat[1] + ';--t:' + x._t + '">' + art(x, true) + '</div>' +
        '<span class="ha-badge" style="background:' + cat[1] + '">' + cat[2] + ' ' + esc(cat[0]) + '</span><span class="ha-erab">' + esc(x._era.n) + '</span>' +
        '<h2>' + esc(x.n) + '</h2>' + (x.alt ? '<div class="ha-meta"><i>Also called: ' + esc(x.alt) + '</i></div>' : '') +
        '<div class="ha-meta"><span>📅 ' + esc(x._d) + '</span>' + (x.r ? '<span>📍 ' + esc(x.r) + '</span>' : '') + (x.w ? '<span>👤 ' + esc(x.w) + '</span>' : '') + '</div>' +
        '<p class="ha-sum">' + esc(x.s) + '</p>' + secs +
        (x.f ? '<div class="ha-sect fact"><h3>💡 Did you know?</h3><p>' + esc(x.f) + '</p></div>' : '') +
        ((before || after) ? '<div class="ha-sect"><h3>Before and after, in ' + esc(cat[0]) + '</h3><div class="ha-links">' + (before ? '<button data-go="' + before.id + '">← ' + esc(before.n) + ' (' + esc(before._d) + ')</button>' : '') + (after ? '<button data-go="' + after.id + '">' + esc(after.n) + ' (' + esc(after._d) + ') →</button>' : '') + '</div></div>' : '') +
        (links ? '<div class="ha-sect"><h3>See also</h3><div class="ha-links">' + links + '</div></div>' : '') +
        '<div class="ha-nav"><button class="secondary" id="haPrev"' + (prev ? '' : ' disabled') + '>← Older</button><button class="secondary" id="haNext"' + (next ? '' : ' disabled') + '>Newer →</button><button class="primary" id="haQuizEra">🏆 Quiz me on this era</button></div>';
      info.querySelectorAll('[data-go]').forEach(b => b.onclick = () => select(b.dataset.go, { keep: true }));
      $('haPrev').onclick = () => prev && select(prev.id, { keep: true });
      $('haNext').onclick = () => next && select(next.id, { keep: true });
      $('haBack').onclick = closeInfo;
      $('haQuizEra').onclick = () => { closeInfo(); $('qSource').value = 'e:' + x._era.i; start(generate()); $('quizPanel').scrollIntoView({ behavior: 'smooth' }); };
      info.scrollTop = 0;
      if (view === 'tl') $('haTl').querySelectorAll('.ha-row').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
      if (mobile()) { const wasOpen = info.classList.contains('open'); info.classList.add('open'); document.body.classList.add('ha-lock'); try { if (!wasOpen && !opts.keep) { history.pushState({ ha: id }, '', '#' + id); pushed = true; } else history.replaceState(history.state, '', '#' + id); } catch (e) {} setTimeout(() => info.focus({ preventScroll: true }), 50); }
      else { try { history.replaceState(null, '', '#' + id); } catch (e) {} if (!opts.noScroll) { const r = cardEl[id].getBoundingClientRect(), lw = $('haList').getBoundingClientRect(); if (view === 'cards' && (r.top < lw.top || r.bottom > lw.bottom)) cardEl[id].scrollIntoView({ block: 'nearest' }); } }
    }
    function closeInfo() {
      if (!info.classList.contains('open')) return;
      info.classList.remove('open'); document.body.classList.remove('ha-lock');
      if (pushed) { pushed = false; try { history.back(); } catch (e) {} } else try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (selected && cardEl[selected] && view === 'cards') cardEl[selected].focus({ preventScroll: false });
    }
    window.addEventListener('popstate', () => { pushed = false; if (info.classList.contains('open')) { info.classList.remove('open'); document.body.classList.remove('ha-lock'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });
    window.addEventListener('resize', () => { if (!mobile() && info.classList.contains('open')) { info.classList.remove('open'); document.body.classList.remove('ha-lock'); } });

    // ---------- controls
    let qTimer = null;
    $('haQ').addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => { q = $('haQ').value.trim().toLowerCase(); refresh(); }, 120); });
    // Enter opens the best match: the name itself first, then names that start with or contain the words.
    const rank = x => { const n = x.n.toLowerCase(), a = (x.alt || '').toLowerCase(); return n === q || a === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) || a.includes(q) ? 2 : q.split(/\s+/).every(w => n.includes(w)) ? 3 : 4; };
    $('haQ').addEventListener('keydown', e => { if (e.key === 'Enter') { q = $('haQ').value.trim().toLowerCase(); refresh(); const hits = items.filter(matches).sort((a, b) => rank(a) - rank(b) || a.y - b.y); if (hits[0]) select(hits[0].id); } });
    $('haEra').onchange = () => { eraF = $('haEra').value; refresh(); };
    $('haSort').onchange = () => { sortBy = $('haSort').value; refresh(); };
    root.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { catF = b.dataset.cat; root.querySelectorAll('[data-cat]').forEach(o => o.classList.toggle('active', o === b)); refresh(); });
    root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; root.querySelectorAll('[data-view]').forEach(o => { o.classList.toggle('active', o === b); o.setAttribute('aria-pressed', o === b); }); $('haGrid').classList.toggle('hidden', view !== 'cards'); $('haTl').classList.toggle('hidden', view !== 'tl'); refresh(); });
    $('haRandom').onclick = () => { const pool = items.filter(matches); const l = pool.length ? pool : items; const un = l.filter(x => !seen.has(x.id)); select(rnd(un.length ? un : l).id); };

    // ---------- quiz generator
    const nameWords = x => (x.n + ' ' + (x.alt || '')).toLowerCase().split(/[^a-zà-ÿ0-9]+/i).filter(w => w.length > 3 && !/^(the|and|with|from|first|early|great|modern|surgery|disease|called|also)$/.test(w));
    const mask = (x, text) => { let t = text; [x.n, x.n.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...(x.alt ? x.alt.split(/,\s*/) : [])].filter(Boolean).sort((a, b) => b.length - a.length).forEach(n => { t = t.split(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join('…'); }); nameWords(x).forEach(w => { t = t.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'gi'), '…'); }); return t; };
    const leaks = (x, text) => nameWords(x).some(w => text.toLowerCase().includes(w));
    const distinctFrom = (vals, n, avoid) => { const out = [], seenV = new Set(avoid.map(v => v.toLowerCase())); shuffle(vals.slice()).forEach(v => { if (out.length < n && v && !seenV.has(v.toLowerCase())) { seenV.add(v.toLowerCase()); out.push(v); } }); return out; };
    const nameOpts = (x, n) => { const same = items.filter(o => o.c === x.c && o.id !== x.id), others = items.filter(o => o.id !== x.id); return distinctFrom((same.length >= n ? same : others).map(o => o.n), n, [x.n]); };
    const gap = (a, b) => { const d = Math.abs(a - b), base = Math.min(Math.abs(a), Math.abs(b)); return a < -5000 || b < -5000 ? d > Math.max(3000, base * .3) : a < 1500 || b < 1500 ? d >= 60 : d >= 12; };
    function makeQ(type, x) {
      if (x.nq && x.nq.includes(type)) return null; // e.g. no “when” questions about a castle part
      if (type === 'pic') { if (!x.p || x.p[0] === 'e') return null; return { q: cfg.picQ || 'What is shown in this picture?', pic: x.id, a: x.n, opts: nameOpts(x, 3), why: x.n + ' (' + x._d + '): ' + x.s, idea: x.id }; }
      if (type === 'which') { const t = mask(x, x.s); if (leaks(x, t)) return null; return { q: (cfg.whichQ || 'Which ' + W[0] + ' is this?') + ' “' + t + '”', a: x.n, opts: nameOpts(x, 3), why: x.n + ' — ' + x._d + (x.r ? ', ' + x.r : '') + '.', idea: x.id }; }
      if (type === 'fact') { if (!x.f) return null; const t = mask(x, x.f); if (leaks(x, t)) return null; return { q: 'Which ' + W[0] + ' is this about? “' + t + '”', a: x.n, opts: nameOpts(x, 3), why: x.f, idea: x.id }; }
      if (type === 'when') { if (/unknown|\?/i.test(x._d)) return null; const pool = items.filter(o => o.id !== x.id && gap(o.y, x.y) && !(o.nq && o.nq.includes('when'))).map(o => o._d); const opts = distinctFrom(pool.filter(d => !/unknown|\?/i.test(d)), 3, [x._d]); if (opts.length < 3) return null; return { q: (cfg.whenQ || 'When does the story of “{n}” begin?').replace('{n}', x.n), a: x._d, opts, why: x.n + ': ' + x._d + (x.r ? ', ' + x.r : '') + '. ' + x.s, idea: x.id }; }
      if (type === 'who') { if (!x.w) return null; const pool = items.filter(o => o.id !== x.id && o.w && !o.w.includes(x.w) && !x.w.includes(o.w)).map(o => o.w); const opts = distinctFrom(pool, 3, [x.w]); if (opts.length < 3) return null; return { q: (cfg.whoQ || 'Who is linked to “{n}”?').replace('{n}', x.n), a: x.w, opts, why: x.n + ' (' + x._d + '): ' + x.w + '.', idea: x.id }; }
      if (type === 'first') { const pick = [x]; shuffle(items.filter(o => o.id !== x.id)).forEach(o => { if (pick.length < 4 && pick.every(p => gap(p.y, o.y)) && !(o.nq && o.nq.includes('first')) && !pick.some(p => p.n === o.n)) pick.push(o); }); if (pick.length < 4) return null; const first = pick.slice().sort((a, b) => a.y - b.y)[0]; return { q: 'Which of these came first?', a: first.n, opts: pick.filter(p => p !== first).map(p => p.n), why: pick.slice().sort((a, b) => a.y - b.y).map(p => p.n + ' (' + p._d + ')').join(' → ') + '.', idea: first.id }; }
      if (type === 'kind') { const labels = Object.keys(CATS).filter(k => k !== x.c).map(k => CATS[k][0]); if (labels.length < 3) return null; return { q: 'Which group does “' + x.n + '” belong to?', a: CATS[x.c][0], opts: distinctFrom(labels, 3, [CATS[x.c][0]]), why: x.n + ' is in ' + CATS[x.c][0] + '. ' + x.s, idea: x.id }; }
      return null;
    }
    function sourceItems() {
      const s = $('qSource').value;
      if (s === 'seen') { const l = items.filter(x => seen.has(x.id)); return l.length >= 3 ? l : null; }
      if (s.startsWith('c:')) return items.filter(x => x.c === s.slice(2));
      if (s.startsWith('e:')) return items.filter(x => x._era.i === +s.slice(2));
      return items;
    }
    function generate() {
      const src = sourceItems(); if (!src) { alert('Explore at least 3 ' + W[1] + ' first, or choose another source.'); return null; }
      const types = [...document.querySelectorAll('#qTypes input:checked')].map(c => c.value); if (!types.length) { alert('Tick at least one question type.'); return null; }
      const n = +$('qCount').value, out = [], keys = new Set(), used = new Map(); let guard = 0;
      while (out.length < n && guard++ < 900) {
        const x = rnd(src); if ((used.get(x.id) || 0) >= (src.length > n ? 1 : 3)) continue;
        const qq = makeQ(rnd(types), x); if (!qq || qq.opts.length < 3) continue;
        const k = qq.q + '|' + qq.a; if (keys.has(k)) continue; keys.add(k); used.set(x.id, (used.get(x.id) || 0) + 1);
        qq.opts = shuffle([qq.a, ...qq.opts.slice(0, 3)]); out.push(qq);
      }
      return out.length ? out : null;
    }

    // ---------- quiz play
    let quiz = [], qi = 0, score = 0, points = 0, streak = 0, bestStreak = 0, answered = false, missed = [], timer = null, left = 0, challenge = true;
    function start(qs) { if (!qs) return; quiz = qs; qi = 0; score = 0; points = 0; streak = 0; bestStreak = 0; missed = []; challenge = $('qMode').value === 'challenge'; $('quizDone').classList.add('hidden'); $('quizArea').classList.remove('hidden'); $('timerBar').classList.toggle('hidden', !challenge); show(); }
    const mult = () => streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
    function show() {
      const qq = quiz[qi]; answered = false;
      $('qProg').textContent = 'Question ' + (qi + 1) + ' / ' + quiz.length; $('qScore').textContent = challenge ? '⭐ ' + points + ' points' : 'Score: ' + score; $('qStreak').textContent = streak >= 2 ? '🔥 Streak ' + streak + (challenge && mult() > 1 ? ' · ×' + mult() : '') : '';
      $('qText').textContent = qq.q; $('qExplain').classList.add('hidden'); $('qNext').classList.add('hidden');
      $('qPic').classList.toggle('hidden', !qq.pic); if (qq.pic) $('qPic').innerHTML = AtlasArt.svg(BY[qq.pic].p, 'Picture for the question');
      $('qOpts').innerHTML = qq.opts.map((o, i) => '<button class="opt" data-i="' + i + '">' + esc(o) + '</button>').join('');
      $('qOpts').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(qq.opts[+b.dataset.i], b));
      clearInterval(timer);
      if (challenge) { left = 20; $('timerFill').style.width = '100%'; $('timerFill').style.background = '#4E9E73'; timer = setInterval(() => { left -= .25; $('timerFill').style.width = Math.max(0, left / 20 * 100) + '%'; if (left < 6) $('timerFill').style.background = '#D8604A'; if (left <= 0) { clearInterval(timer); answer(null, null); } }, 250); }
    }
    function answer(choice, btn) {
      if (answered) return; answered = true; clearInterval(timer);
      const qq = quiz[qi], ok = choice === qq.a; let gained = 0;
      if (ok) { score++; streak++; bestStreak = Math.max(bestStreak, streak); if (challenge) { gained = Math.round((100 + Math.max(0, Math.ceil(left)) * 5) * mult()); points += gained; } } else { streak = 0; missed.push(qq); }
      qq.ok = ok; qq.given = choice;
      $('qOpts').querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (qq.opts[i] === qq.a) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
      $('qExplain').innerHTML = (ok ? '<span class="pop">✅ Correct' + (gained ? ' +' + gained : '') + '</span> ' : choice === null ? '⏱️ Time is up. ' : '❌ ') + esc(qq.why) + (qq.idea ? ' <a data-go="' + qq.idea + '">Open ' + esc(BY[qq.idea].n) + ' →</a>' : '');
      $('qExplain').classList.remove('hidden');
      const go = $('qExplain').querySelector('[data-go]'); if (go) go.onclick = () => { select(go.dataset.go, { noScroll: true }); if (!mobile()) info.scrollIntoView({ behavior: 'smooth' }); };
      $('qScore').textContent = challenge ? '⭐ ' + points + ' points' : 'Score: ' + score; $('qStreak').textContent = streak >= 2 ? '🔥 Streak ' + streak : '';
      $('qNext').textContent = qi < quiz.length - 1 ? 'Next question →' : 'See results'; $('qNext').classList.remove('hidden'); $('qNext').focus({ preventScroll: true });
    }
    $('qNext').onclick = () => { if (++qi < quiz.length) show(); else finish(); };
    $('qQuit').onclick = () => { clearInterval(timer); quiz = quiz.slice(0, qi + (answered ? 1 : 0)); if (!quiz.length) { $('quizArea').classList.add('hidden'); return; } finish(); };
    const RANKS = cfg.ranks || [[90, 'Expert 🏅'], [75, 'Historian 📜'], [55, 'Student 📘'], [0, 'Beginner 🌱']];
    function finish() {
      clearInterval(timer); $('quizArea').classList.add('hidden'); $('quizDone').classList.remove('hidden');
      const pct = Math.round(score / quiz.length * 100), rank = RANKS.find(r => pct >= r[0])[1];
      const best = store.get(cfg.key + 'Best', { points: 0, pct: 0 }); const newBest = challenge ? points > best.points : pct > best.pct;
      if (challenge && points > best.points) best.points = points; if (pct > best.pct) best.pct = pct; store.set(cfg.key + 'Best', best);
      $('doneTitle').textContent = score + ' / ' + quiz.length + ' correct (' + pct + '%) — ' + rank;
      $('doneSub').innerHTML = (challenge ? '<b>' + points + ' points</b> · best streak ' + bestStreak + ' · ' : '') + (newBest ? '🎉 New personal best!' : 'Personal best: ' + (challenge ? best.points + ' points' : best.pct + '%'));
      $('review').innerHTML = quiz.map(qq => '<li class="' + (qq.ok ? 'good' : 'bad') + '">' + (qq.ok ? '✓ ' : '✗ ') + esc(qq.q) + '<br><small>Answer: ' + esc(qq.a) + (qq.ok ? '' : ' · you chose: ' + (qq.given == null ? '(no answer)' : esc(qq.given))) + '</small></li>').join('');
      $('retryWrong').classList.toggle('hidden', !missed.length); showBest();
    }
    $('makeQuiz').onclick = () => start(generate()); $('newQuiz').onclick = () => start(generate());
    $('retryWrong').onclick = () => start(missed.map(qq => Object.assign({}, qq, { ok: undefined, given: undefined, opts: shuffle(qq.opts.slice()) })));
    function showBest() { const b = store.get(cfg.key + 'Best', null); $('bestLine').textContent = b ? 'Your best: ' + b.points + ' points in challenge mode · ' + b.pct + '% accuracy' : ''; }
    showBest();
    $('printQuiz').onclick = () => {
      const qs = generate(); if (!qs) return;
      const body = '<h1>' + esc(cfg.quizTitle) + '</h1><p>Name: ______________________ &nbsp; Date: ____________</p><ol>' + qs.map(qq => '<li><p>' + esc(qq.q) + '</p>' + (qq.pic ? '<div class="pic">' + AtlasArt.svg(BY[qq.pic].p) + '</div>' : '') + '<ol type="A">' + qq.opts.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol></li>').join('') + '</ol><h2 style="page-break-before:always">Answer key</h2><ol>' + qs.map(qq => '<li>' + String.fromCharCode(65 + qq.opts.indexOf(qq.a)) + ') ' + esc(qq.a) + ' — <small>' + esc(qq.why) + '</small></li>').join('') + '</ol><p><small>Made with MigaBuilder ' + esc(cfg.title) + ' · migabuilder.com/' + esc(cfg.page) + '</small></p>';
      const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(cfg.quizTitle) + '</title><style>body{font:15px/1.5 Georgia,serif;max-width:760px;margin:30px auto;padding:0 20px}li{margin-bottom:10px}.pic{width:220px;background:#eef3f6;border-radius:6px;overflow:hidden}.pic svg{display:block;width:100%}</style></head><body>' + body + '</body></html>';
      const a = document.createElement('a'), u = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.href = u; a.download = cfg.quizFile; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
    };

    // ---------- start
    refresh();
    const h = decodeURIComponent(location.hash.slice(1)); if (BY[h]) setTimeout(() => { if (mobile()) { /* open without adding a history step */ select(h, { keep: true }); } else select(h); }, 200);
    window.addEventListener('hashchange', () => { const k = decodeURIComponent(location.hash.slice(1)); if (BY[k] && (k !== selected || (mobile() && !info.classList.contains('open')))) select(k, { keep: true }); });
    return { select, items, BY };
  }
  window.HistoryAtlas = { init, fmtYear };
})();
