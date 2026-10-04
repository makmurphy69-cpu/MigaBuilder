/* MigaBuilder layer engine (used by Clip Forge).
 *
 * Draws one frame of an edit made of tracks on a 2D canvas:
 *   - the main video (the "base"), which can be moved, zoomed and rotated,
 *   - any number of layers on top of it: video, pictures or text, each with
 *     its own time on the timeline, opacity, blend mode and in/out transition,
 *   - keyframes on the base and on every layer: x, y, size, rotation and
 *     opacity are animated between keyframes with an easing curve,
 *   - a colour-grade stack: adjustments applied in order, top to bottom.
 * Positions are percentages of the frame, so the same edit draws the same at
 * any size (the small preview and the full-size render).
 */
(function (window, document) {
  'use strict';

  const PROPS = ['x', 'y', 'scale', 'rotation', 'opacity'];
  const DEFAULTS = { x: 50, y: 50, scale: 100, rotation: 0, opacity: 100 };

  const EASES = {
    linear: { label: 'Linear', f: p => p },
    in: { label: 'Ease in', f: p => p * p * p },
    out: { label: 'Ease out', f: p => 1 - Math.pow(1 - p, 3) },
    inout: { label: 'Ease in and out', f: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) },
    back: { label: 'Overshoot', f: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); } },
    hold: { label: 'Hold (jump)', f: () => 0 }
  };

  const TRANSITIONS = {
    none: 'None', fade: 'Fade', 'slide-left': 'Slide from the right', 'slide-right': 'Slide from the left',
    'slide-up': 'Slide up from below', 'slide-down': 'Slide down from above', zoom: 'Zoom', wipe: 'Wipe', spin: 'Spin'
  };

  const BLENDS = {
    'source-over': 'Normal', screen: 'Screen (lighten)', multiply: 'Multiply (darken)', overlay: 'Overlay',
    'soft-light': 'Soft light', lighter: 'Add (glow)', difference: 'Difference'
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // The values of x, y, scale, rotation and opacity at time t (seconds from
  // the start of the item). Without keyframes the item's own values are used.
  function valuesAt(item, t) {
    const kfs = (item.keyframes || []).slice().sort((a, b) => a.t - b.t);
    const own = {};
    PROPS.forEach(p => { own[p] = item[p] == null ? DEFAULTS[p] : item[p]; });
    if (!kfs.length) return own;
    if (t <= kfs[0].t) return pick(kfs[0], own);
    const last = kfs[kfs.length - 1];
    if (t >= last.t) return pick(last, own);
    let i = 0;
    while (i < kfs.length - 1 && kfs[i + 1].t <= t) i++;
    const a = kfs[i], b = kfs[i + 1];
    const span = b.t - a.t;
    const e = (EASES[a.ease] || EASES.linear).f(span > 0 ? (t - a.t) / span : 1);
    const out = {}, va = pick(a, own), vb = pick(b, own);
    PROPS.forEach(p => { out[p] = va[p] + (vb[p] - va[p]) * e; });
    return out;
  }
  function pick(kf, own) { const o = {}; PROPS.forEach(p => { o[p] = kf[p] == null ? own[p] : kf[p]; }); return o; }

  // How the in/out transitions change the item at time t of an item `len` long.
  function transitionAt(item, t, len, cw, ch) {
    const r = { alpha: 1, dx: 0, dy: 0, scale: 1, rot: 0, wipe: 1 };
    apply(item.transIn, t);
    apply(item.transOut, len - t);
    return r;
    function apply(tr, since) {
      if (!tr || !tr.type || tr.type === 'none') return;
      const dur = Math.max(0.05, tr.dur || 0.5);
      if (since >= dur) return;
      const e = EASES.out.f(clamp(since / dur, 0, 1)), q = 1 - e;
      switch (tr.type) {
        case 'fade': r.alpha *= e; break;
        case 'slide-left': r.dx += q * cw; break;
        case 'slide-right': r.dx -= q * cw; break;
        case 'slide-up': r.dy += q * ch; break;
        case 'slide-down': r.dy -= q * ch; break;
        case 'zoom': r.scale *= 0.3 + 0.7 * e; r.alpha *= e; break;
        case 'wipe': r.wipe = Math.min(r.wipe, e); break;
        case 'spin': r.rot -= q * 180; r.scale *= Math.max(0.01, e); break;
      }
    }
  }

  // The main video: black behind it, then the cropped picture, moved by its keyframes.
  function drawBase(g, video, crop, cw, ch, base, t, len) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, cw, ch);
    if (!video || !video.videoWidth || video.readyState < 2) return;
    const v = valuesAt(base, t), tr = transitionAt(base, t, len, cw, ch);
    g.save();
    g.globalAlpha = clamp(v.opacity / 100 * tr.alpha, 0, 1);
    g.translate(v.x / 100 * cw + tr.dx, v.y / 100 * ch + tr.dy);
    g.rotate((v.rotation + tr.rot) * Math.PI / 180);
    const s = v.scale / 100 * tr.scale;
    g.scale(s, s);
    if (tr.wipe < 1) { g.beginPath(); g.rect(-cw / 2, -ch / 2, cw * tr.wipe, ch); g.clip(); }
    g.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, -cw / 2, -ch / 2, cw, ch);
    g.restore();
  }

  function textLines(g, text, maxWidth) {
    const out = [];
    String(text || '').split('\n').forEach(par => {
      let line = '';
      par.split(/\s+/).forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (line && g.measureText(test).width > maxWidth) { out.push(line); line = word; } else line = test;
      });
      out.push(line);
    });
    return out;
  }

  // One layer, if it is on screen at time t. Video and picture sizes are a
  // percentage of the frame width; text size is a percentage of a quarter of the height.
  function drawLayer(g, L, t, cw, ch) {
    if (L.hidden || t < L.start || t >= L.end) return;
    const local = t - L.start, len = L.end - L.start;
    const v = valuesAt(L, local), tr = transitionAt(L, local, len, cw, ch);
    let w, h;
    if (L.kind === 'video' || L.kind === 'image') {
      const el = L.el;
      const nw = L.kind === 'video' ? el && el.videoWidth : el && el.naturalWidth;
      const nh = L.kind === 'video' ? el && el.videoHeight : el && el.naturalHeight;
      if (!nw || !nh || (L.kind === 'video' && el.readyState < 2)) return;
      w = v.scale / 100 * cw; h = w * nh / nw;
    }
    g.save();
    g.globalAlpha = clamp(v.opacity / 100 * tr.alpha, 0, 1);
    g.globalCompositeOperation = BLENDS[L.blend] ? L.blend : 'source-over';
    g.translate(v.x / 100 * cw + tr.dx, v.y / 100 * ch + tr.dy);
    g.rotate((v.rotation + tr.rot) * Math.PI / 180);
    g.scale(tr.scale, tr.scale);
    if (L.kind === 'text') {
      const size = Math.max(6, v.scale / 100 * ch / 4);
      g.font = '700 ' + Math.round(size) + 'px "IBM Plex Sans", "Space Grotesk", sans-serif';
      const lines = textLines(g, L.text, cw * 0.9);
      const lh = size * 1.2, bh = lines.length * lh;
      let bw = 0;
      lines.forEach(l => { bw = Math.max(bw, g.measureText(l).width); });
      w = bw + size * 0.8; h = bh + size * 0.5;
      if (tr.wipe < 1) { g.beginPath(); g.rect(-w / 2, -h / 2, w * tr.wipe, h); g.clip(); }
      if (L.box) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-w / 2, -h / 2, w, h); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (!L.box) { g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.25; g.shadowOffsetY = size * 0.05; }
      g.fillStyle = L.color || '#ffffff';
      lines.forEach((l, i) => g.fillText(l, 0, -bh / 2 + lh * (i + 0.5)));
    } else {
      if (tr.wipe < 1) { g.beginPath(); g.rect(-w / 2, -h / 2, w * tr.wipe, h); g.clip(); }
      g.drawImage(L.el, -w / 2, -h / 2, w, h);
    }
    g.restore();
  }

  // Keeps each video layer playing the right moment: playing when the edit
  // plays, or parked on the exact frame while scrubbing.
  function syncVideos(layers, t, playing) {
    layers.forEach(L => {
      if (L.kind !== 'video' || !L.el) return;
      const el = L.el, on = !L.hidden && t >= L.start && t < L.end;
      if (!on) { if (!el.paused) el.pause(); return; }
      const dur = el.duration || 0;
      const want = Math.min(Math.max(0, (L.srcIn || 0) + t - L.start), dur ? dur - 0.04 : Infinity);
      if (playing) {
        if (Math.abs(el.currentTime - want) > 0.3) el.currentTime = want;
        if (el.paused && want < dur - 0.05) el.play().catch(() => {});
      } else {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - want) > 0.04 && !el.seeking) el.currentTime = want;
      }
    });
  }

  // ---------- colour grade ----------
  // css: a canvas filter (fast). paint: drawn over the picture with a blend mode.
  const GRADE = {
    exposure: { label: 'Exposure', min: -100, max: 100, def: 15, css: a => 'brightness(' + (1 + a / 100) + ')' },
    contrast: { label: 'Contrast', min: -100, max: 100, def: 20, css: a => 'contrast(' + (1 + a / 100) + ')' },
    saturation: { label: 'Saturation', min: -100, max: 100, def: 25, css: a => 'saturate(' + (1 + a / 100) + ')' },
    temperature: { label: 'Temperature (cool ↔ warm)', min: -100, max: 100, def: 30,
      paint: (g, cw, ch, a) => fill(g, cw, ch, a > 0 ? 'rgb(255,138,36)' : 'rgb(36,118,255)', 'soft-light', Math.abs(a) / 100 * 0.6) },
    tint: { label: 'Tint (green ↔ magenta)', min: -100, max: 100, def: 20,
      paint: (g, cw, ch, a) => fill(g, cw, ch, a > 0 ? 'rgb(255,60,200)' : 'rgb(60,230,90)', 'soft-light', Math.abs(a) / 100 * 0.5) },
    split: { label: 'Teal shadows, orange highlights', min: 0, max: 100, def: 45,
      paint: (g, cw, ch, a) => { fill(g, cw, ch, 'rgb(0,90,110)', 'screen', a / 100 * 0.35); fill(g, cw, ch, 'rgb(255,196,140)', 'multiply', a / 100 * 0.45); } },
    hue: { label: 'Hue shift', min: -180, max: 180, def: 20, css: a => 'hue-rotate(' + a + 'deg)' },
    fade: { label: 'Faded blacks (matte)', min: 0, max: 100, def: 30, paint: (g, cw, ch, a) => fill(g, cw, ch, 'rgb(70,70,78)', 'screen', a / 100 * 0.7) },
    sepia: { label: 'Sepia', min: 0, max: 100, def: 40, css: a => 'sepia(' + a / 100 + ')' },
    bw: { label: 'Black and white', min: 0, max: 100, def: 100, css: a => 'grayscale(' + a / 100 + ')' },
    blur: { label: 'Soft focus (blur)', min: 0, max: 100, def: 15, css: (a, cw) => 'blur(' + (a / 100 * cw / 160).toFixed(2) + 'px)' },
    vignette: { label: 'Vignette', min: 0, max: 100, def: 35, paint: vignette },
    grain: { label: 'Film grain', min: 0, max: 100, def: 25, paint: grain }
  };

  const GRADE_PRESETS = {
    cinematic: { label: 'Cinematic (teal and orange)', items: [['contrast', 20], ['saturation', -10], ['split', 50], ['vignette', 35]] },
    warm: { label: 'Warm film', items: [['temperature', 35], ['fade', 30], ['saturation', -5], ['grain', 25]] },
    moody: { label: 'Moody', items: [['exposure', -10], ['contrast', 30], ['saturation', -35], ['temperature', -20], ['vignette', 45]] },
    clean: { label: 'Bright and clean', items: [['exposure', 12], ['contrast', 8], ['saturation', 15]] },
    bw: { label: 'Black and white', items: [['bw', 100], ['contrast', 25], ['grain', 20]] },
    vintage: { label: 'Vintage', items: [['sepia', 45], ['fade', 35], ['vignette', 30], ['grain', 30]] }
  };

  function fill(g, cw, ch, colour, op, alpha) {
    if (alpha <= 0) return;
    g.save(); g.globalCompositeOperation = op; g.globalAlpha = clamp(alpha, 0, 1); g.fillStyle = colour; g.fillRect(0, 0, cw, ch); g.restore();
  }
  function vignette(g, cw, ch, a) {
    const r = Math.hypot(cw, ch) / 2, grad = g.createRadialGradient(cw / 2, ch / 2, r * 0.35, cw / 2, ch / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,' + clamp(a / 100 * 0.85, 0, 1) + ')');
    g.save(); g.fillStyle = grad; g.fillRect(0, 0, cw, ch); g.restore();
  }
  let noise = null;
  function grain(g, cw, ch, a) {
    if (!noise) {
      noise = document.createElement('canvas'); noise.width = noise.height = 192;
      const n = noise.getContext('2d'), img = n.createImageData(192, 192);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      n.putImageData(img, 0, 0);
    }
    g.save();
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = clamp(a / 100 * 0.5, 0, 1);
    g.fillStyle = g.createPattern(noise, 'repeat');
    g.translate(-Math.random() * 192, -Math.random() * 192);
    g.fillRect(0, 0, cw + 192, ch + 192);
    g.restore();
  }

  // Applies the grade to what is already on the canvas, one adjustment after
  // another. Neighbouring filter adjustments are combined into one pass.
  let scratch = null;
  function applyGrade(g, cw, ch, items) {
    const on = (items || []).filter(it => it.on !== false && GRADE[it.type]);
    if (!on.length) return;
    let css = [];
    const flush = () => {
      if (!css.length) return;
      if (!scratch) scratch = document.createElement('canvas');
      if (scratch.width !== cw || scratch.height !== ch) { scratch.width = cw; scratch.height = ch; }
      const s = scratch.getContext('2d');
      s.clearRect(0, 0, cw, ch);
      s.drawImage(g.canvas, 0, 0, cw, ch, 0, 0, cw, ch);
      g.save(); g.filter = css.join(' '); g.globalCompositeOperation = 'copy'; g.drawImage(scratch, 0, 0); g.restore();
      css = [];
    };
    on.forEach(it => {
      const def = GRADE[it.type], a = Number(it.amount) || 0;
      if (def.css) css.push(def.css(a, cw));
      else { flush(); def.paint(g, cw, ch, a); }
    });
    flush();
  }

  window.ClipLayers = { PROPS, DEFAULTS, EASES, TRANSITIONS, BLENDS, GRADE, GRADE_PRESETS, valuesAt, transitionAt, drawBase, drawLayer, syncVideos, applyGrade };
})(window, document);
