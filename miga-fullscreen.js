/* ⛶ Full screen for the big players and previews on MigaBuilder tool pages (loaded by miga-extras.js).
 *
 * TARGETS lists, per page, the elements that get a full-screen button in their corner: games,
 * cartoons, 3D models, maps, video editors and website previews. "^#id" means the parent of #id
 * (for iframes and canvases, which cannot hold a button themselves).
 *
 * The button uses the browser's real full screen where it exists. On iPhone, which only allows
 * that for videos, the element is stretched over the whole page instead. Either way the element
 * gets the class miga-fs, a resize event is sent so 3D views and games redraw at the new size,
 * and on phones wide players turn to landscape where the browser allows it. Esc or the ✕ button
 * goes back.
 */
(function () {
  'use strict';
  if (window.__migaFullscreen) return; window.__migaFullscreen = true;
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // [selector, wide] — wide players (games, cartoons, video) also try to turn the phone sideways.
  const TARGETS = {
    '3d-game-forge.html': [['#stage', 1]],
    '3d-cartoon.html': [['#stage', 1]],
    'game-forge.html': [['^#preview', 1]],
    'cartoon-forge.html': [['^#preview', 1]],
    'app-forge.html': [['#stageWrap']],
    'website-builder.html': [['^#preview']],
    'model-forge.html': [['.viewport-canvas-wrap']],
    'cad-forge.html': [['#view3dWrap']],
    'boat-forge.html': [['#view3d']],
    'sim-forge.html': [['#stage', 1]],
    'geo-forge.html': [['#mapbox']],
    'body-map.html': [['#viewBody'], ['#viewNet']],
    'idea-atlas.html': [['#viewNet'], ['#viewTl']],
    'physics-map.html': [['.mapbox']],
    'biology-map.html': [['.viewbox']],
    'chemistry-map.html': [['#ptable']],
    'mind-map.html': [['#wrap']],
    'sample-viewer.html': [['#stage', 1]],
    'video-forge.html': [['#stageWrap', 1]],
    'clip-forge.html': [['#stageWrap', 1]],
    'merge-forge.html': [['#stageWrap', 1]],
    'talk-forge.html': [['#stageWrap', 1]],
    'jam-forge.html': [['#stage', 1]],
    'image-studio.html': [['.preview']],
    'picture-forge.html': [['#preview']]
  };
  const list = TARGETS[file];
  if (!list) return;

  const st = document.createElement('style');
  st.textContent =
    '.miga-fs-host{position:relative}' +
    '.miga-fs-btn{position:absolute;top:8px;right:8px;z-index:30;width:38px;height:38px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(8,24,38,.72);color:#fff;font:600 19px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;opacity:.8;transition:opacity .15s}' +
    '.miga-fs-btn:hover,.miga-fs-btn:focus-visible{opacity:1;background:rgba(8,24,38,.92)}' +
    // Full screen: fill the screen whatever size the element normally has.
    '.miga-fs{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;margin:0!important;border-radius:0!important;background:#081826!important;overflow:auto!important}' +
    '.miga-fs>canvas,.miga-fs>iframe,.miga-fs>video,.miga-fs>img,.miga-fs>svg{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain}' +
    '.miga-fs>iframe{display:block}' +
    '.miga-fs .miga-fs-btn{position:fixed;top:12px;right:12px;opacity:1;width:44px;height:44px}' +
    'html.miga-fs-lock,html.miga-fs-lock body{overflow:hidden!important}';
  document.head.appendChild(st);

  let active = null, scrollY = 0;
  const nudge = () => [30, 250, 600].forEach(t => setTimeout(() => window.dispatchEvent(new Event('resize')), t));
  const nativeEl = () => document.fullscreenElement || document.webkitFullscreenElement;

  function enter(el, btn, wide) {
    if (active) exit();
    active = { el, btn };
    scrollY = window.scrollY;
    el.classList.add('miga-fs');
    document.documentElement.classList.add('miga-fs-lock');
    btn.textContent = '✕'; btn.title = 'Leave full screen (Esc)'; btn.setAttribute('aria-label', 'Leave full screen');
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => { if (wide && screen.orientation && screen.orientation.lock && matchMedia('(pointer:coarse)').matches) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {});
      } catch (e) { /* the page-filling version still works */ }
    }
    nudge();
  }
  function exit() {
    if (!active) return;
    const { el, btn } = active; active = null;
    el.classList.remove('miga-fs');
    document.documentElement.classList.remove('miga-fs-lock');
    btn.textContent = '⛶'; btn.title = 'Full screen'; btn.setAttribute('aria-label', 'Full screen');
    if (nativeEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    window.scrollTo(0, scrollY);
    nudge();
  }
  // Leaving the browser's full screen with Esc or the phone's back gesture also restores the page.
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { if (active && !nativeEl()) exit(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && active && !nativeEl()) exit(); });

  function attach(sel, wide) {
    const parent = sel[0] === '^';
    document.querySelectorAll(parent ? sel.slice(1) : sel).forEach(found => {
      const el = parent ? found.parentElement : found;
      if (!el || el.querySelector(':scope > .miga-fs-btn')) return;
      if (getComputedStyle(el).position === 'static') el.classList.add('miga-fs-host');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'miga-fs-btn'; btn.textContent = '⛶';
      btn.title = 'Full screen'; btn.setAttribute('aria-label', 'Full screen'); btn.setAttribute('data-no-i18n', '');
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (active && active.el === el) exit(); else enter(el, btn, !!wide); });
      // Pointer events on the button must not reach drawing boards, games or maps underneath.
      ['pointerdown', 'mousedown', 'touchstart', 'dblclick'].forEach(ev => btn.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
      el.appendChild(btn);
      // Players that rebuild themselves (a game restart clears its box) get the button back.
      new MutationObserver(() => { if (!el.contains(btn)) el.appendChild(btn); }).observe(el, { childList: true });
    });
  }
  const run = () => list.forEach(([sel, wide]) => attach(sel, wide));
  run();
  // Some pages build their player later (after a template loads or the AI answers).
  setTimeout(run, 1500); setTimeout(run, 5000);
  window.MigaFullscreen = { exit, get active() { return active && active.el; } };
})();
