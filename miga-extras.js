/* Shared extras for every MigaBuilder tool page (loaded by tutorials.js):
 *  - 🔒 a badge that says the tool runs in the browser;
 *  - 🌙 a dark-mode toggle, remembered on this device;
 *  - 💾 auto-save of what you type, with “Restore your work?” when you come back,
 *    plus Save work to a .miga file / Open a .miga file — no account needed;
 *  - 🔎 Ctrl/⌘+K jumps to any tool (miga-palette.js) and 📲 installs MigaBuilder as an app.
 * Tools that already keep their own drafts are skipped for the auto-save part.
 * Everything stays in this browser.
 */
(function () {
  'use strict';
  if (window.__migaExtras) return; window.__migaExtras = true;
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const nav = document.querySelector('.tool-nav');
  const root = document.querySelector('main') || document.body;
  const OWN_DRAFTS = ['alphabet-forge.html', 'flashcard-forge.html', 'exam-checker.html', 'cv-forge.html', 'contract-forge.html', 'form-forge.html', 'repurpose-forge.html', 'post-forge.html',
    'music-forge.html', 'video-forge.html', 'paint-forge.html', 'cad-forge.html', 'invoice-forge.html', 'meet-forge.html', 'project-hub.html', 'visits.html', 'sample-viewer.html', 'templates.html'];
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  const st = document.createElement('style');
  st.textContent = '.miga-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:auto}.miga-bar>*{font:600 12px "IBM Plex Sans",system-ui,sans-serif}' +
    '.miga-badge{color:#9fe0b8;border:1px solid rgba(159,224,184,.35);border-radius:999px;padding:3px 9px;white-space:nowrap}' +
    '.miga-bar button{background:transparent;color:#6fd1e0;border:1px solid rgba(111,209,224,.4);border-radius:999px;padding:3px 10px;cursor:pointer}.miga-bar button:hover{background:rgba(111,209,224,.12)}' +
    '.miga-menu{position:absolute;z-index:9998;background:#0E2A47;border:1px solid rgba(111,209,224,.35);border-radius:8px;padding:6px;display:grid;gap:4px;box-shadow:0 12px 30px rgba(0,0,0,.35);min-width:230px}' +
    '.miga-menu button{text-align:left;border-radius:6px!important;padding:8px 10px!important;color:#EDEAE0!important;border-color:transparent!important;font-size:13px!important}.miga-menu small{color:rgba(237,234,224,.6);padding:2px 10px 4px;font-size:11px}' +
    '.miga-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;background:#fff7e6;color:#16202B;border:1px solid #E2A63B;border-radius:8px;padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 20px);font:14px "IBM Plex Sans",system-ui,sans-serif}' +
    '.miga-toast button{border:0;border-radius:4px;padding:7px 12px;font-weight:700;cursor:pointer}.miga-toast .yes{background:#E2A63B;color:#3b2a0c}.miga-toast .no{background:#fff;border:1px solid rgba(22,32,43,.25);color:#16202B}' +
    // Dark mode: invert the light panels, then flip media back so photos and videos keep their colours.
    '.tool-nav{flex-wrap:wrap}html.miga-dark .panel{filter:invert(.92) hue-rotate(180deg)}' +
    'html.miga-dark .panel img,html.miga-dark .panel video,html.miga-dark .panel canvas,html.miga-dark .panel iframe,html.miga-dark .panel picture,html.miga-dark .panel svg image,html.miga-dark .panel [style*="background-image"],html.miga-dark .panel input[type=color]{filter:invert(1) hue-rotate(180deg)}' +
    'html.miga-dark .panel .panel{filter:none}' +
    // Pages with their own design get a small floating pill instead of the nav bar.
    '.miga-float{position:fixed;left:10px;bottom:10px;z-index:60;margin:0;background:rgba(8,24,38,.88);padding:4px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.3);opacity:.85}.miga-float:hover{opacity:1}' +
    '.miga-float .miga-badge{border:0;padding:3px 6px}' +
    '@media(max-width:620px){.miga-badge{display:none}}';
  document.head.appendChild(st);

  const bar = document.createElement('div'); bar.className = 'miga-bar' + (nav ? '' : ' miga-float');
  const lightPanels = !!document.querySelector('.panel');
  bar.innerHTML = '<span class="miga-badge" title="This tool works inside your browser. Your text and files are not uploaded unless you use an AI or sharing feature.">🔒 ' + (nav ? 'Private · runs in your browser' : 'Private') + '</span>' + (lightPanels ? '<button type="button" class="miga-theme" aria-label="Toggle dark mode"></button>' : '');
  (nav || document.body).appendChild(bar);

  // ---------- on-screen keyboard for any text field (loaded on demand) ----------
  let lastField = null;
  const typeable = el => el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' && /^(text|search|email|url|)$/i.test(el.type || '')) && !el.readOnly && !el.closest('.mkb');
  document.addEventListener('focusin', e => { if (typeable(e.target)) lastField = e.target; });
  const kbBtn = document.createElement('button'); kbBtn.type = 'button'; kbBtn.textContent = '⌨️ Keyboard'; kbBtn.title = 'On-screen keyboard for other languages and alphabets (Arabic, Russian, Chinese, Hindi, Korean, accents…)';
  kbBtn.addEventListener('pointerdown', e => e.preventDefault());
  kbBtn.onclick = () => {
    const go = () => {
      if (window.MigaKeyboard.isOpen()) { window.MigaKeyboard.close(); return; }
      const t = typeable(document.activeElement) ? document.activeElement : lastField || Array.from(root.querySelectorAll('textarea, input')).find(typeable);
      if (!t) { alert('Click in a text box first, then open the keyboard.'); return; }
      window.MigaKeyboard.open({ target: t });
    };
    if (window.MigaKeyboard) return go();
    const sc = document.createElement('script'); sc.src = 'script-keyboard.js'; sc.onload = go; document.head.appendChild(sc);
  };
  bar.insertBefore(kbBtn, bar.children[1] || null);

  // ---------- Ctrl+K tool search and "install as an app" ----------
  if (!document.querySelector('script[src*="miga-palette.js"]')) { const ps = document.createElement('script'); ps.src = 'miga-palette.js'; document.head.appendChild(ps); }
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const findBtn = document.createElement('button'); findBtn.type = 'button'; findBtn.textContent = '🔎 ' + (mac ? '⌘K' : 'Ctrl K'); findBtn.title = 'Jump to any MigaBuilder tool (' + (mac ? '⌘K' : 'Ctrl+K') + ')';
  findBtn.onclick = () => window.MigaPalette && window.MigaPalette.open();
  bar.insertBefore(findBtn, kbBtn);
  const installBtn = document.createElement('button'); installBtn.type = 'button'; installBtn.textContent = '📲 Install'; installBtn.title = 'Install MigaBuilder as an app — the tools you have used then work offline'; installBtn.hidden = true;
  installBtn.onclick = () => window.MigaInstall && window.MigaInstall.install();
  document.addEventListener('miga-installable', () => { installBtn.hidden = !(window.MigaInstall && window.MigaInstall.available()); });
  bar.appendChild(installBtn);

  // ---------- dark mode ----------
  const themeBtn = bar.querySelector('.miga-theme') || document.createElement('button');
  function applyTheme(dark) { document.documentElement.classList.toggle('miga-dark', dark && lightPanels); themeBtn.textContent = dark ? '☀️ Light' : '🌙 Dark'; }
  applyTheme(ls.get('migaTheme', '') === 'dark');
  themeBtn.onclick = () => { const dark = !document.documentElement.classList.contains('miga-dark'); ls.set('migaTheme', dark ? 'dark' : 'light'); applyTheme(dark); };

  // ---------- work auto-save ----------
  if (OWN_DRAFTS.includes(file) || document.body.hasAttribute('data-no-autosave')) return;
  const KEY = 'migaWork:' + file, MAX = 100000;
  const skip = el => !el.id || el.closest('.mkb,.miga-tutorial,.miga-menu,.miga-toast,.miga-bar,[data-no-autosave]') || /^(file|password|hidden|button|submit|reset|image)$/i.test(el.type || '');
  const fields = () => Array.from(root.querySelectorAll('input, textarea, select')).filter(el => !skip(el));
  const valueOf = el => el.type === 'checkbox' || el.type === 'radio' ? !!el.checked : el.value;
  const isText = el => el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' && /^(text|search|email|url|tel|number|)$/i.test(el.type || '');
  let defaults = null;
  function snapshot() {
    const v = {};
    fields().forEach(el => { const x = valueOf(el); if (typeof x === 'string' && x.length > MAX) return; v[el.id] = x; });
    return v;
  }
  // Only worth saving if something typed differs from how the page started.
  function meaningful(v) { return fields().some(el => isText(el) && typeof v[el.id] === 'string' && v[el.id].trim() && v[el.id] !== (defaults || {})[el.id]); }
  let timer = null, restoring = false;
  function save() {
    if (restoring || !defaults) return;
    const v = snapshot();
    if (meaningful(v)) ls.set(KEY, { t: Date.now(), v }); else ls.del(KEY);
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(save, 700); };
  document.addEventListener('input', e => { if (root.contains(e.target)) later(); }, true);
  document.addEventListener('change', e => { if (root.contains(e.target)) later(); }, true);
  window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); save(); } });

  function apply(v) {
    restoring = true;
    Object.keys(v || {}).forEach(id => {
      const el = document.getElementById(id); if (!el || skip(el) || !root.contains(el)) return;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked === !!v[id]) return; el.checked = !!v[id]; }
      else if (el.tagName === 'SELECT') { if (!Array.from(el.options).some(o => o.value === v[id]) || el.value === v[id]) return; el.value = v[id]; }
      else { if (el.value === v[id]) return; el.value = v[id]; }
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    restoring = false; later();
  }
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' day' + (m >= 2880 ? 's' : '') + ' ago'; };
  function toast(html, yes, no, yesLabel) {
    const t = document.createElement('div'); t.className = 'miga-toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + html + '</span><button type="button" class="yes">' + (yesLabel || 'Restore') + '</button><button type="button" class="no">Dismiss</button>';
    document.body.appendChild(t);
    t.querySelector('.yes').onclick = () => { t.remove(); yes && yes(); };
    t.querySelector('.no').onclick = () => { t.remove(); no && no(); };
    setTimeout(() => { if (t.isConnected) t.remove(); }, 30000);
  }

  // Menu: save / open a work file.
  const workBtn = document.createElement('button'); workBtn.type = 'button'; workBtn.textContent = '💾 My work'; workBtn.setAttribute('aria-haspopup', 'true');
  bar.appendChild(workBtn);
  let menu = null;
  workBtn.onclick = e => {
    e.stopPropagation();
    if (menu) { menu.remove(); menu = null; return; }
    menu = document.createElement('div'); menu.className = 'miga-menu miga-bar';
    menu.innerHTML = '<small>What you type here is auto-saved in this browser.</small><button type="button" data-a="save">💾 Save my work to a file (.miga)</button><button type="button" data-a="open">📂 Open a saved work file</button><button type="button" data-a="clear">🗑 Clear the auto-saved copy</button>';
    document.body.appendChild(menu);
    const r = workBtn.getBoundingClientRect();
    menu.style.top = (nav ? r.bottom + scrollY + 6 : r.top + scrollY - 150) + 'px'; menu.style.left = Math.max(8, Math.min(innerWidth - 250, r.right - 240)) + 'px';
    menu.onclick = ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      menu.remove(); menu = null;
      if (a.dataset.a === 'save') {
        const data = { app: 'MigaBuilder', tool: file, saved: new Date().toISOString(), fields: snapshot() };
        const u = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })), link = document.createElement('a');
        link.href = u; link.download = file.replace('.html', '') + '-' + new Date().toISOString().slice(0, 10) + '.miga'; link.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
      } else if (a.dataset.a === 'open') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.miga,.json';
        inp.onchange = async () => {
          const f = inp.files[0]; if (!f) return;
          try {
            const d = JSON.parse(await f.text());
            if (!d || !d.fields) throw new Error('not a work file');
            if (d.tool && d.tool !== file && !confirm('This file was saved from ' + d.tool + '. Load it here anyway?')) return;
            apply(d.fields);
          } catch (err) { alert('This is not a MigaBuilder work file.'); }
        };
        inp.click();
      } else { ls.del(KEY); }
    };
  };
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target) && e.target !== workBtn) { menu.remove(); menu = null; } });

  // Let the tool finish setting up, then remember its starting values and offer the saved copy.
  setTimeout(() => {
    defaults = snapshot();
    const saved = ls.get(KEY, null);
    if (!saved || !saved.v || !meaningful(saved.v)) return;
    const differs = Object.keys(saved.v).some(id => defaults[id] !== undefined && defaults[id] !== saved.v[id]);
    if (!differs) return;
    toast('📝 You have work from ' + ago(saved.t) + ' saved in this browser. Restore it?', () => apply(saved.v), () => ls.del(KEY));
  }, 900);
})();
