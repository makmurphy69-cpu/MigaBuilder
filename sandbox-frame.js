/* MigaBuilder sandbox for generated pages (App Forge, Game Forge, Cartoon Forge).
 *
 * AI-written or pasted HTML must never run with this site's origin: a same-origin
 * preview could read a saved Gemini key from localStorage, the API key typed into
 * the page, or change the tool around it. So previews run in
 * <iframe sandbox="allow-scripts ..."> WITHOUT allow-same-origin, and the tool
 * talks to them only through postMessage.
 *
 * MigaSandbox.prepare(html) adds two small scripts to the page:
 *   - an in-memory localStorage/sessionStorage (a sandboxed page has no storage,
 *     and many generated games keep high scores there);
 *   - a bridge that answers the tool's requests: read a global, set a value,
 *     call an allowed function, or record the canvas to a video.
 * MigaSandbox.call(frame, op, args) sends one request and resolves with the reply.
 * Replies come from untrusted code, so callers treat them as plain data only.
 */
(function (window) {
  'use strict';
  const SHIM = '(function(){function M(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){var ok=false;try{ok=!!window[n]}catch(e){}if(!ok){try{Object.defineProperty(window,n,{value:M(),configurable:true})}catch(e){}}})})();';

  // Runs inside the sandboxed page.
  function bridge() {
    var CALLS = ['cartoonController.replay', 'cartoonController.play', 'cartoonController.pause', 'cartoonController.getDuration'];
    function lookup(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, window); }
    function plain(v) { try { return v === undefined ? null : JSON.parse(JSON.stringify(v)); } catch (e) { return null; } }
    function record(a) {
      return new Promise(function (resolve, reject) {
        var c = window.cartoonController || {};
        var canvas = (c.getCanvas && c.getCanvas()) || document.querySelector('canvas');
        if (!canvas || !canvas.captureStream || !window.MediaRecorder) { reject(new Error('This browser cannot record the generated canvas. Try Chrome or Edge.')); return; }
        var stream = new MediaStream(canvas.captureStream(30).getVideoTracks());
        var own = null; try { own = c.getAudioStream && c.getAudioStream(); } catch (e) { own = null; }
        var music = null, ctx = null;
        if (a.music) {
          // Background music and the cartoon's own sound are mixed, because MediaRecorder keeps one audio track.
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          var dest = ctx.createMediaStreamDestination();
          music = new Audio(URL.createObjectURL(a.music)); music.loop = true;
          var gain = ctx.createGain(); gain.gain.value = typeof a.volume === 'number' ? a.volume : 1;
          ctx.createMediaElementSource(music).connect(gain); gain.connect(ctx.destination); gain.connect(dest);
          if (own && own.getAudioTracks && own.getAudioTracks().length) { try { ctx.createMediaStreamSource(own).connect(dest); } catch (e) { /* cartoon sound unavailable */ } }
          dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
          if (ctx.state === 'suspended') ctx.resume();
          music.play().catch(function () {});
        } else if (own && own.getAudioTracks) {
          own.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        }
        var mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
        var rec = new MediaRecorder(stream, { mimeType: mime }), chunks = [];
        rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () { if (music) music.pause(); if (ctx) ctx.close(); resolve(new Blob(chunks, { type: 'video/webm' })); };
        try { c.replay && c.replay(); } catch (e) { /* keep recording what is on screen */ }
        rec.start(250);
        var seconds = Number(c.getDuration && c.getDuration()) || Number(a.seconds) || 10;
        setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, Math.min(600, seconds + 1) * 1000);
      });
    }
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== window.parent || !m || m.__migaSandbox !== 1 || typeof m.id !== 'number') return;
      var a = m.args || {};
      Promise.resolve().then(function () {
        if (m.op === 'get') return plain(lookup(String(a.name)));
        if (m.op === 'set') { var o = lookup(String(a.name)); if (o && typeof o === 'object' && typeof a.value === 'number') o[String(a.key)] = a.value; return null; }
        if (m.op === 'assign') { var t = lookup(String(a.name)); if (t && typeof t === 'object' && a.value && typeof a.value === 'object') Object.assign(t, a.value); return null; }
        if (m.op === 'assets') { window.GAME_ASSETS = window.GAME_ASSETS || {}; window.GAME_ASSETS[String(a.name)] = String(a.value || ''); return null; }
        if (m.op === 'call') {
          if (CALLS.indexOf(a.name) < 0) throw new Error('Not allowed');
          var parts = String(a.name).split('.'), fn = lookup(a.name);
          if (typeof fn !== 'function') throw new Error('Missing ' + a.name);
          return plain(fn.call(lookup(parts.slice(0, -1).join('.'))));
        }
        if (m.op === 'record') return record(a);
        throw new Error('Unknown request');
      }).then(function (result) {
        window.parent.postMessage({ __migaSandbox: 2, id: m.id, result: result }, '*');
      }, function (err) {
        window.parent.postMessage({ __migaSandbox: 2, id: m.id, error: String((err && err.message) || err) }, '*');
      });
    });
  }

  function inject(html, code) {
    const tag = '<script>' + code + '<\/script>';
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + tag);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + tag);
    return tag + html;
  }

  let nextId = 1;
  const waiting = new Map();
  window.addEventListener('message', e => {
    const m = e.data;
    if (!m || m.__migaSandbox !== 2 || !waiting.has(m.id)) return;
    const w = waiting.get(m.id);
    if (e.source !== w.frame.contentWindow) return;
    waiting.delete(m.id); clearTimeout(w.timer);
    if (m.error) w.reject(new Error(m.error)); else w.resolve(m.result);
  });

  window.MigaSandbox = {
    // Sandbox tokens for previews. Never add allow-same-origin: with srcdoc it would give the page this site's origin.
    SANDBOX: 'allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock allow-downloads',
    prepare(html) { return inject(String(html || ''), SHIM + '(' + bridge.toString() + ')();'); },
    lock(frame) {
      frame.setAttribute('sandbox', this.SANDBOX);
      frame.setAttribute('allow', 'autoplay; fullscreen');
      return frame;
    },
    call(frame, op, args, timeout) {
      return new Promise((resolve, reject) => {
        if (!frame || !frame.contentWindow) { reject(new Error('No preview')); return; }
        const id = nextId++;
        const timer = setTimeout(() => { waiting.delete(id); reject(new Error('The preview did not answer')); }, timeout || 3000);
        waiting.set(id, { frame, resolve, reject, timer });
        frame.contentWindow.postMessage({ __migaSandbox: 1, id, op, args: args || {} }, '*');
      });
    }
  };
})(window);
