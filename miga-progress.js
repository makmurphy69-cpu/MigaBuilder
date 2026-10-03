/* MigaBuilder shared progress panel for long jobs (video, OCR, big files).
 *
 *   const job = MigaProgress.create(container, { onCancel: () => worker.terminate() });
 *   job.start('Loading the engine…');      // shows the panel, starts the clock, shows Cancel
 *   job.update(0.42, 'Converting…');       // fraction 0–1 (or null when unknown) and a label
 *   job.done('Finished — it is in your downloads.');
 *   job.fail(error, ['Try a shorter clip', 'Close other tabs']);  // plain message plus what to try
 *
 * Every tool gets the same bar, elapsed time, time-left estimate, Cancel button
 * and "what to try" list, so long jobs look and behave the same everywhere.
 */
(function (window, document) {
  'use strict';
  const CSS = '.mp-panel{margin:12px 0;padding:12px 14px;border:1px solid rgba(22,32,43,.16);border-radius:8px;background:rgba(14,42,71,.04)}' +
    '.mp-panel[hidden]{display:none}.mp-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.mp-label{font-weight:700}.mp-time{font-size:13px;opacity:.7;font-variant-numeric:tabular-nums}' +
    '.mp-bar{height:10px;border-radius:999px;background:rgba(22,32,43,.12);overflow:hidden;margin:10px 0 4px}' +
    '.mp-bar i{display:block;height:100%;width:0;background:#4e9e73;border-radius:inherit;transition:width .3s}' +
    '.mp-bar.mp-unknown i{width:35%!important;animation:mpSlide 1.2s ease-in-out infinite}@keyframes mpSlide{from{transform:translateX(-100%)}to{transform:translateX(290%)}}' +
    '.mp-cancel{font:inherit;font-size:13px;padding:5px 12px;border-radius:6px;border:1px solid rgba(22,32,43,.25);background:#fff;color:#16202b;cursor:pointer}' +
    '.mp-panel.mp-ok{border-color:rgba(78,158,115,.5);background:rgba(78,158,115,.08)}.mp-panel.mp-err{border-color:rgba(224,122,111,.6);background:rgba(224,122,111,.08)}' +
    '.mp-panel.mp-ok .mp-bar,.mp-panel.mp-err .mp-bar{display:none}.mp-tips{margin:8px 0 0;padding-left:20px;font-size:14px}' +
    '@media (prefers-reduced-motion:reduce){.mp-bar.mp-unknown i{animation:none}}';
  function injectCss() {
    if (document.getElementById('miga-progress-css')) return;
    const s = document.createElement('style');
    s.id = 'miga-progress-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function clock(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function message(err) {
    const m = String((err && (err.message || err)) || 'Something went wrong.');
    if (/out of memory|memory access out of bounds|allocation failed|RangeError: Array buffer/i.test(m)) return 'This device ran out of memory for this file.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'A part of the tool could not be downloaded. Check your internet connection.';
    return m;
  }

  function create(container, opts) {
    injectCss();
    opts = opts || {};
    const panel = document.createElement('div');
    panel.className = 'mp-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<div class="mp-head"><span class="mp-label"></span><span class="mp-time"></span>' +
      '<button type="button" class="mp-cancel">Cancel</button></div>' +
      '<div class="mp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><ul class="mp-tips" hidden></ul>';
    container.appendChild(panel);
    const label = panel.querySelector('.mp-label'), time = panel.querySelector('.mp-time');
    const bar = panel.querySelector('.mp-bar'), fill = bar.querySelector('i');
    const cancelBtn = panel.querySelector('.mp-cancel'), tips = panel.querySelector('.mp-tips');
    let started = 0, fraction = null, timer = 0, running = false;

    function tick() {
      const elapsed = (Date.now() - started) / 1000;
      let text = clock(elapsed) + ' elapsed';
      // Only estimate once there is enough progress for the guess to mean something.
      if (fraction && fraction > 0.04 && fraction < 1 && elapsed > 3) text += ' · about ' + clock(elapsed / fraction - elapsed) + ' left';
      time.textContent = text;
    }
    function stop() { running = false; clearInterval(timer); cancelBtn.hidden = true; }
    cancelBtn.addEventListener('click', function () {
      if (!running) return;
      stop();
      panel.classList.add('mp-err');
      label.textContent = 'Cancelled.';
      if (typeof opts.onCancel === 'function') { try { opts.onCancel(); } catch (e) { /* already stopped */ } }
    });

    return {
      get running() { return running; },
      start(text) {
        panel.hidden = false;
        panel.classList.remove('mp-ok', 'mp-err');
        tips.hidden = true; tips.innerHTML = '';
        cancelBtn.hidden = typeof opts.onCancel !== 'function';
        started = Date.now(); running = true;
        this.update(null, text);
        clearInterval(timer); timer = setInterval(tick, 1000); tick();
      },
      update(f, text) {
        if (text) label.textContent = text;
        fraction = typeof f === 'number' && isFinite(f) ? Math.max(0, Math.min(1, f)) : null;
        bar.classList.toggle('mp-unknown', fraction === null);
        if (fraction !== null) { fill.style.width = Math.round(fraction * 100) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100))); }
        else bar.removeAttribute('aria-valuenow');
      },
      done(text) {
        stop();
        panel.classList.add('mp-ok');
        label.textContent = text || 'Done.';
        time.textContent = 'took ' + clock((Date.now() - started) / 1000);
      },
      fail(err, advice) {
        stop();
        panel.classList.add('mp-err');
        label.textContent = message(err);
        const list = (advice || []).filter(Boolean);
        tips.innerHTML = list.map(t => '<li></li>').join('');
        Array.from(tips.children).forEach((li, i) => { li.textContent = list[i]; });
        tips.hidden = !list.length;
      },
      hide() { stop(); panel.hidden = true; }
    };
  }

  window.MigaProgress = { create: create, message: message };
})(window, document);
