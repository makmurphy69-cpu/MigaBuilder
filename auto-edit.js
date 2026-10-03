/* MigaBuilder Auto Edit engine (used by Clip Forge).
 *
 * Turns several raw clips into an edit plan: a list of shots
 * {clip, in, out, why}. Everything is measured locally in the browser:
 *   - analyzeClip(file)      samples frames (motion, light, sharpness, scene
 *                            cuts) and the sound level of a clip,
 *   - analyzeReference(file) measures how often a video the visitor likes
 *                            cuts (its rhythm), so a new edit can copy it,
 *   - detectBeats(file)      finds the beat of a music track (the onset idea
 *                            Jam Forge uses to hear a clap, kept going),
 *   - planLocal(...)         picks moments with the editing rules in TASTE,
 *   - planFromAi(...)        checks an AI answer against the real moments,
 *   - snapToBeats(...)       moves every cut onto the nearest beat.
 * The AI only chooses among moments that were measured here, so a bad answer
 * can never point at footage that does not exist.
 */
(function (window, document) {
  'use strict';

  // What viewers reward, distilled from short-form retention research and
  // editing practice. Sent to the AI as its brief; planLocal follows it too.
  const TASTE = [
    'Open on the strongest, most visual moment: viewers decide in the first 1-3 seconds whether to keep watching. Start mid-action, never on a slow establishing shot.',
    'The opening on-screen text is a hook of at most 7 words: a question, a bold claim or the payoff.',
    'Keep shots short for short-form: about 1-2 s each for fast TikTok/Reels pacing, 2-3 s for ads, 3-5 s for calm or cinematic edits.',
    'Every cut should show something new: change the clip, the angle or the action. Avoid two near-identical shots back to back.',
    'Cut out dead air, dark, blurry or shaky moments. Prefer sharp, well-lit footage with movement.',
    'Do not cut someone off mid-sentence; when people talk, keep the whole phrase and cut in the pauses.',
    'Follow a simple story: hook, then problem or setup, then demo or proof, then payoff and a clear call to action at the end.',
    'Ads work best at 9-15 s, social posts at 15-30 s. Shorter beats longer when in doubt.',
    'Cut on the beat of the music; no slow dissolves in the first 5 seconds.',
    'Many people watch muted, so the message must work with on-screen text alone.'
  ];

  const STYLES = {
    fast: { shot: 1.4, label: 'Fast and punchy' },
    balanced: { shot: 2.4, label: 'Balanced' },
    calm: { shot: 4.2, label: 'Calm and cinematic' }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round2 = v => Math.round(v * 100) / 100;
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    return s[clamp(Math.floor(p * (s.length - 1)), 0, s.length - 1)];
  }
  function median(arr) { return percentile(arr, 0.5); }

  // ---------- browser helpers ----------
  let actx = null;
  function audioCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }
  function waitFor(el, ev, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms || 8000);
      function ok() { cleanup(); resolve(); }
      function bad() { cleanup(); reject(new Error('This file could not be read as a video.')); }
      function cleanup() { clearTimeout(t); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
      el.addEventListener(ev, ok); el.addEventListener('error', bad);
    });
  }
  async function openVideo(url) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await waitFor(v, 'loadeddata', 20000);
    let d = v.duration;
    if (!isFinite(d)) { // MediaRecorder WebM files report Infinity until you seek to the end
      v.currentTime = 1e7; await waitFor(v, 'seeked', 8000).catch(() => {});
      d = v.duration; v.currentTime = 0; await waitFor(v, 'seeked', 8000).catch(() => {});
    }
    return { v, duration: isFinite(d) ? d : 0 };
  }
  async function seek(v, t) {
    if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return;
    v.currentTime = t;
    await waitFor(v, 'seeked', 8000).catch(() => {});
  }

  // Sound level every 0.1 s (null when there is no sound track).
  async function loudness(file, maxBytes) {
    if (file.size > (maxBytes || 400 * 1048576)) return null;
    let buf;
    try { buf = await audioCtx().decodeAudioData(await file.arrayBuffer()); } catch (e) { return null; }
    const data = buf.getChannelData(0), sr = buf.sampleRate, win = Math.round(sr * 0.1), out = [];
    for (let p = 0; p + win <= data.length; p += win) {
      let e = 0; for (let k = p; k < p + win; k += 4) e += data[k] * data[k];
      out.push(Math.sqrt(e / (win / 4)));
    }
    return out;
  }

  const GW = 48, GH = 27;
  // Samples frames: brightness, sharpness, motion and a small thumbnail.
  async function sampleFrames(url, opts) {
    opts = opts || {};
    const { v, duration } = await openVideo(url);
    const canvas = document.createElement('canvas'); canvas.width = GW; canvas.height = GH;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const thumb = document.createElement('canvas'); thumb.width = 112; thumb.height = 64;
    const tg = thumb.getContext('2d');
    const step = Math.max(opts.minStep || 0.25, duration / (opts.maxSamples || 160));
    const samples = []; let prev = null;
    for (let t = Math.min(0.05, duration / 2); t < duration; t += step) {
      if (opts.signal && opts.signal.aborted) throw new Error('Cancelled.');
      await seek(v, t);
      g.drawImage(v, 0, 0, GW, GH);
      const px = g.getImageData(0, 0, GW, GH).data, Y = new Float32Array(GW * GH);
      let sum = 0;
      for (let i = 0; i < Y.length; i++) { Y[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; sum += Y[i]; }
      let grad = 0;
      for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
        const i = y * GW + x; grad += Math.abs(Y[i] - Y[i + 1]) + Math.abs(Y[i] - Y[i + GW]);
      }
      let diff = 0;
      if (prev) for (let i = 0; i < Y.length; i++) diff += Math.abs(Y[i] - prev[i]);
      const s = { t: round2(t), bright: sum / Y.length / 255, sharp: grad / ((GW - 1) * (GH - 1) * 2) / 255, motion: prev ? diff / Y.length / 255 : 0 };
      if (opts.thumbs) { tg.drawImage(v, 0, 0, thumb.width, thumb.height); s.thumb = thumb.toDataURL('image/jpeg', 0.6); }
      samples.push(s); prev = Y;
      if (opts.onProgress) opts.onProgress(Math.min(1, t / duration));
    }
    const out = { duration, width: v.videoWidth, height: v.videoHeight, step, samples };
    v.removeAttribute('src'); v.load();
    return out;
  }

  // A cut is a frame change far above this clip's usual movement.
  function findCuts(samples) {
    const m = samples.map(s => s.motion), base = median(m.slice(1)) || 0.01, cuts = [];
    for (let i = 1; i < samples.length; i++) {
      if (m[i] > 0.12 && m[i] > base * 3.5 && (!cuts.length || samples[i].t - cuts[cuts.length - 1] > 0.3)) cuts.push(samples[i].t);
    }
    return cuts;
  }

  async function analyzeClip(file, opts) {
    const url = URL.createObjectURL(file);
    try {
      const frames = await sampleFrames(url, Object.assign({ thumbs: true }, opts));
      const level = await loudness(file);
      return Object.assign(frames, { level, cuts: findCuts(frames.samples) });
    } finally { URL.revokeObjectURL(url); }
  }

  // How a video the visitor likes is paced: its shot lengths.
  async function analyzeReference(file, opts) {
    const url = URL.createObjectURL(file);
    try {
      const f = await sampleFrames(url, Object.assign({ minStep: 0.12, maxSamples: 400 }, opts));
      return rhythmFrom(findCuts(f.samples), f.duration);
    } finally { URL.revokeObjectURL(url); }
  }
  function rhythmFrom(cuts, duration) {
    const edges = [0].concat(cuts, [duration]), shots = [];
    for (let i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] > 0.2) shots.push(round2(edges[i] - edges[i - 1]));
    if (!shots.length) return null;
    return { duration: round2(duration), cuts: cuts.length, shots, average: round2(shots.reduce((a, b) => a + b, 0) / shots.length), first: shots[0] };
  }

  // ---------- beat detection ----------
  async function detectBeats(file) {
    let buf;
    try { buf = await audioCtx().decodeAudioData(await file.arrayBuffer()); } catch (e) { return null; }
    const data = buf.getChannelData(0), sr = buf.sampleRate;
    return beatsFromSamples(data.subarray(0, Math.min(data.length, sr * 90)), sr, buf.duration);
  }
  function beatsFromSamples(data, sr, totalDuration) {
    const hop = 256, env = [];
    let prevE = 0;
    for (let p = 0; p + hop <= data.length; p += hop) {
      let e = 0; for (let k = p; k < p + hop; k++) e += data[k] * data[k];
      const le = Math.log(1e-6 + e);
      env.push(Math.max(0, le - prevE)); prevE = le;
    }
    if (env.length < 64) return null;
    const fps = sr / hop;
    let best = null;
    for (let bpm = 70; bpm <= 180; bpm += 0.5) {
      const lag = fps * 60 / bpm, li = Math.floor(lag), fr = lag - li;
      let s = 0;
      for (let i = 0; i + li + 1 < env.length; i++) s += env[i] * (env[i + li] * (1 - fr) + env[i + li + 1] * fr);
      s /= (env.length - lag);
      const pref = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.7, 2)); // mild preference for common tempos
      if (!best || s * pref > best.score) best = { bpm, score: s * pref };
    }
    // Fine-tune tempo and phase together with a comb over the onsets.
    const comb = (period, phase) => { let s = 0; for (let x = phase; x < env.length; x += period) s += env[Math.round(x)] || 0; return s; };
    let fine = { bpm: best.bpm, phase: 0, score: -1 };
    for (let bpm = best.bpm - 2; bpm <= best.bpm + 2; bpm += 0.05) {
      const period = fps * 60 / bpm;
      for (let o = 0; o < period; o += 0.5) { const s = comb(period, o); if (s > fine.score) fine = { bpm, phase: o, score: s }; }
    }
    best.bpm = fine.bpm;
    const beats = [], p = 60 / fine.bpm;
    for (let t = fine.phase / fps; t < totalDuration; t += p) beats.push(round2(t));
    return { bpm: Math.round(best.bpm), beats };
  }

  // ---------- moments ----------
  // Each clip is cut into scored windows ("moments") about one shot long.
  function moments(clips, shotLen) {
    const allMotion = [], allLevel = [];
    clips.forEach(c => { c.samples.forEach(s => allMotion.push(s.motion)); (c.level || []).forEach(l => allLevel.push(l)); });
    const mRef = percentile(allMotion, 0.9) || 0.05, lRef = percentile(allLevel, 0.95) || 0.1;
    const sharpRef = percentile([].concat(...clips.map(c => c.samples.map(s => s.sharp))), 0.9) || 0.05;
    const out = [];
    clips.forEach((c, ci) => {
      const len = Math.min(shotLen, c.duration);
      const stride = Math.max(0.25, len / 2);
      const wins = [];
      for (let start = 0; start + len <= c.duration + 0.01; start += stride) wins.push(start);
      if (!wins.length) wins.push(0);
      const scored = wins.map(start => {
        const end = Math.min(c.duration, start + len);
        const ss = c.samples.filter(s => s.t >= start && s.t < end);
        const use = ss.length ? ss : [c.samples.reduce((a, s) => Math.abs(s.t - start) < Math.abs(a.t - start) ? s : a, c.samples[0])];
        const avg = k => use.reduce((a, s) => a + s[k], 0) / use.length;
        const motion = clamp(avg('motion') / mRef, 0, 1.5);
        const sharp = clamp(avg('sharp') / sharpRef, 0, 1.2);
        const bright = avg('bright');
        const exposure = bright < 0.08 ? -1 : 1 - Math.min(1, Math.abs(bright - 0.5) * 2);
        let sound = 0, quietEnds = 0, voice = false;
        if (c.level) {
          const a = Math.floor(start * 10), b = Math.max(a + 1, Math.floor(end * 10));
          const seg = c.level.slice(a, b);
          sound = seg.length ? clamp(seg.reduce((x, y) => x + y, 0) / seg.length / lRef, 0, 1.2) : 0;
          const edge = i => (c.level[i] || 0) / lRef < 0.25;
          quietEnds = (edge(a) ? 0.5 : 0) + (edge(b - 1) ? 0.5 : 0);
          // Speech rises and falls with every syllable; steady music or wind does not.
          if (seg.length > 4) {
            const mean = seg.reduce((x, y) => x + y, 0) / seg.length;
            const sd = Math.sqrt(seg.reduce((x, y) => x + (y - mean) * (y - mean), 0) / seg.length);
            voice = sound > 0.35 && mean > 0 && sd / mean > 0.45;
          }
        }
        const cutInside = (c.cuts || []).some(t => t > start + 0.3 && t < end - 0.3);
        const score = 0.36 * motion + 0.2 * sound + 0.2 * sharp + 0.2 * exposure + 0.06 * quietEnds - (cutInside ? 0.25 : 0) - (bright < 0.08 ? 0.5 : 0);
        return { clip: ci, in: round2(start), out: round2(end), score: round2(score), motion: round2(motion), sound: round2(sound), sharp: round2(sharp), bright: round2(bright), dark: bright < 0.12, talking: voice };
      });
      // Keep the best non-overlapping windows of this clip.
      scored.sort((a, b) => b.score - a.score);
      const kept = [];
      scored.forEach(w => { if (!kept.some(k => w.in < k.out - 0.05 && w.out > k.in + 0.05)) kept.push(w); });
      kept.sort((a, b) => a.in - b.in).forEach(w => out.push(w));
    });
    out.forEach((m, i) => { m.id = i + 1; });
    return out;
  }

  function shotLengthFor(style, rhythm) {
    if (style === 'reference' && rhythm) return clamp(rhythm.average, 0.6, 8);
    return (STYLES[style] || STYLES.balanced).shot;
  }

  // ---------- local planner ----------
  function planLocal(clips, opts) {
    const target = clamp(opts.length || 15, 3, 600);
    const shotLen = shotLengthFor(opts.style, opts.rhythm);
    const total = clips.reduce((a, c) => a + c.duration, 0);
    const ms = moments(clips, shotLen);
    let shots;
    if (total <= target * 1.1) {
      // Not much footage: use all of it, in order, without dead air at the ends.
      shots = ms.slice().sort((a, b) => a.clip - b.clip || a.in - b.in).filter(m => !(m.dark && m.motion < 0.1));
      if (!shots.length) shots = ms.slice();
    } else {
      const n = Math.max(2, Math.round(target / shotLen));
      const pool = ms.filter(m => !(m.dark && m.motion < 0.2)).sort((a, b) => b.score - a.score);
      const pick = [];
      // Every clip gets its best moment first (if there is room), then the strongest moments overall.
      clips.forEach((c, ci) => { const best = pool.find(m => m.clip === ci); if (best && pick.length < n) pick.push(best); });
      pool.forEach(m => { if (pick.length < n && pick.indexOf(m) < 0) pick.push(m); });
      shots = pick;
    }
    const hook = shots.reduce((a, m) => (m.score > a.score ? m : a), shots[0]);
    const rest = shots.filter(m => m !== hook).sort((a, b) => a.clip - b.clip || a.in - b.in);
    const plan = [Object.assign({}, hook, { why: 'Hook: the strongest moment opens the video' })]
      .concat(rest.map(m => Object.assign({}, m, { why: whyFor(m) })));
    return fitLength(spreadVariety(plan), clips, target, opts);
  }
  function whyFor(m) {
    if (m.talking) return 'Someone talking or lively sound';
    if (m.motion > 0.8) return 'Lots of movement';
    if (m.sharp > 0.9 && m.motion < 0.3) return 'Sharp, steady shot';
    if (m.sound > 0.8) return 'Strong sound';
    return 'Good light and focus';
  }
  // Avoid the same clip twice in a row when another order is possible (keeps the hook first).
  function spreadVariety(plan) {
    const out = plan.slice();
    for (let i = 1; i < out.length; i++) {
      if (out[i].clip === out[i - 1].clip) {
        const j = out.findIndex((m, k) => k > i && m.clip !== out[i - 1].clip);
        if (j > 0) { const tmp = out[j]; out.splice(j, 1); out.splice(i, 0, tmp); }
      }
    }
    return out;
  }
  // Make the shots add up to the target length: reference rhythm if given, otherwise even shots,
  // with a slightly longer final shot so the call to action has room.
  function fitLength(plan, clips, target, opts) {
    if (!plan.length) return [];
    const ref = opts.style === 'reference' && opts.rhythm ? opts.rhythm.shots : null;
    const totalAvail = plan.reduce((a, s) => a + (s.out - s.in), 0);
    if (totalAvail <= target) return plan.map(s => cleanShot(s));
    let lens;
    if (ref) lens = plan.map((s, i) => ref[i % ref.length]);
    else lens = plan.map((s, i) => (i === plan.length - 1 ? 1.4 : i === 0 ? 0.85 : 1));
    const scale = target / lens.reduce((a, b) => a + b, 0);
    lens = lens.map(l => clamp(l * scale, 0.6, 30));
    // Drop shots from the end while there are far more than the target needs.
    let out = plan.map((s, i) => resize(s, lens[i], clips));
    let sum = out.reduce((a, s) => a + (s.out - s.in), 0);
    while (out.length > 2 && sum - (out[out.length - 2].out - out[out.length - 2].in) >= target) {
      sum -= out[out.length - 2].out - out[out.length - 2].in; out.splice(out.length - 2, 1);
    }
    return out.map(s => cleanShot(s));
  }
  function resize(s, len, clips) {
    const dur = clips[s.clip].duration, mid = (s.in + s.out) / 2;
    len = Math.min(len, dur);
    let a = mid - len / 2;
    a = clamp(a, 0, Math.max(0, dur - len));
    return Object.assign({}, s, { in: round2(a), out: round2(Math.min(dur, a + len)) });
  }
  function cleanShot(s) { return { clip: s.clip, in: round2(s.in), out: round2(s.out), why: s.why || '', id: s.id }; }

  // ---------- AI ----------
  function aiPrompt(clips, names, opts) {
    const shotLen = shotLengthFor(opts.style, opts.rhythm);
    const ms = moments(clips, shotLen);
    const lines = ms.map(m => '#' + m.id + ' clip ' + (m.clip + 1) + ' "' + names[m.clip] + '" ' + m.in + '-' + m.out + 's' +
      ' motion ' + m.motion + ', sound ' + m.sound + ', sharpness ' + m.sharp + ', brightness ' + m.bright + (m.talking ? ', sound rises and falls like speech' : '') + (m.dark ? ', TOO DARK' : '') + ', score ' + m.score);
    const system = 'You are a senior short-form video editor. Pick and order moments from the raw clips to make one edit that people watch to the end. Rules you edit by:\n- ' + TASTE.join('\n- ') +
      '\nAnswer with JSON only: {"hook":"on-screen opening text, max 7 words","cta":"closing call to action, max 8 words, or empty","shots":[{"id":moment number,"why":"max 8 words"}]}. Use only the moment numbers listed. The first shot is the hook.';
    const user = 'Goal: ' + (opts.goalLabel || 'social video') + '. Target length about ' + opts.length + ' s. Style: ' + (opts.style === 'reference' && opts.rhythm ? 'copy a reference video that cuts every ' + opts.rhythm.average + ' s on average' : (STYLES[opts.style] || STYLES.balanced).label + ', shots about ' + shotLen + ' s') + '.' +
      (opts.about ? '\nWhat the video is about: ' + opts.about : '') + (opts.cta ? '\nCall to action the owner wants: ' + opts.cta : '') +
      (opts.beats ? '\nMusic: ' + opts.beats.bpm + ' BPM; cuts will be moved onto its beat.' : '') +
      '\nClips: ' + names.map((n, i) => (i + 1) + ' "' + n + '" ' + round2(clips[i].duration) + ' s').join('; ') +
      '\nMeasured moments (motion/sound/sharpness 0-1 relative to these clips, higher is livelier):\n' + lines.join('\n') +
      (opts.withImages ? '\nFrames from the middle of the strongest moments are attached, each labelled with its moment number.' : '') +
      '\nPick about ' + Math.max(2, Math.round(opts.length / shotLen)) + ' shots.';
    return { system, user, moments: ms };
  }
  function planFromAi(answer, ms, clips, opts) {
    const shotsIn = answer && Array.isArray(answer.shots) ? answer.shots : [];
    const byId = new Map(ms.map(m => [m.id, m]));
    const seen = new Set(), plan = [];
    shotsIn.forEach(s => {
      const id = parseInt(s && (s.id != null ? s.id : s), 10), m = byId.get(id);
      if (!m || seen.has(id)) return;
      seen.add(id);
      plan.push(Object.assign({}, m, { why: String((s && s.why) || '').slice(0, 80) || whyFor(m) }));
    });
    if (plan.length < 2) return null;
    return {
      shots: fitLength(plan, clips, clamp(opts.length || 15, 3, 600), opts),
      hook: String(answer.hook || '').split(/\s+/).slice(0, 9).join(' ').trim(),
      cta: String(answer.cta || '').split(/\s+/).slice(0, 10).join(' ').trim()
    };
  }

  // A frame from the middle of a moment, for AI providers that can see pictures.
  async function framesFor(files, ms, width) {
    const out = [], byClip = {};
    ms.forEach(m => { (byClip[m.clip] = byClip[m.clip] || []).push(m); });
    const canvas = document.createElement('canvas'), g = canvas.getContext('2d');
    for (const ci of Object.keys(byClip)) {
      const url = URL.createObjectURL(files[ci]);
      try {
        const { v } = await openVideo(url);
        canvas.width = width || 320; canvas.height = Math.round(canvas.width * (v.videoHeight || 9) / (v.videoWidth || 16));
        for (const m of byClip[ci]) {
          await seek(v, (m.in + m.out) / 2);
          g.drawImage(v, 0, 0, canvas.width, canvas.height);
          out.push({ id: m.id, data: canvas.toDataURL('image/jpeg', 0.7).split(',')[1] });
        }
        v.removeAttribute('src'); v.load();
      } finally { URL.revokeObjectURL(url); }
    }
    return out.sort((a, b) => a.id - b.id);
  }

  // ---------- beat sync ----------
  // Moves each cut to the nearest beat (within half a shot), then trims or extends shots to match.
  function snapToBeats(plan, beats, clips) {
    if (!beats || !beats.beats || beats.beats.length < 2 || plan.length < 2) return plan;
    const B = beats.beats, cuts = [];
    let acc = 0;
    plan.forEach(s => { acc += s.out - s.in; cuts.push(acc); });
    const newCuts = [], beatGap = B[1] - B[0];
    let last = 0;
    cuts.forEach((c, i) => {
      if (i === cuts.length - 1) { newCuts.push(Math.max(last + 0.6, c)); return; }
      const len = plan[i].out - plan[i].in;
      let best = c, d = Infinity;
      B.forEach(b => { if (Math.abs(b - c) < d && b - last >= Math.max(0.5, beatGap * 0.9) - 0.01) { d = Math.abs(b - c); best = b; } });
      if (d > Math.max(len / 2, beatGap)) best = c;
      newCuts.push(best); last = best;
    });
    let prev = 0;
    return plan.map((s, i) => {
      const len = newCuts[i] - prev; prev = newCuts[i];
      const dur = clips[s.clip].duration;
      let a = s.in, b = s.in + len;
      if (b > dur) { b = dur; a = Math.max(0, dur - len); }
      return Object.assign({}, s, { in: round2(a), out: round2(b) });
    });
  }

  window.AutoEdit = {
    TASTE, STYLES, analyzeClip, analyzeReference, detectBeats, moments, planLocal, aiPrompt, planFromAi, framesFor, snapToBeats,
    _test: { rhythmFrom, findCuts, beatsFromSamples, fitLength }
  };
})(window, document);
