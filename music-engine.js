/* MigaBuilder music engine: describe music in plain words, get an original track.
 *
 * Everything runs in the browser with the Web Audio API (OfflineAudioContext); nothing is
 * uploaded and no AI or key is needed. The music is composed from simple music-theory rules
 * with a seeded random generator, so the same description + seed gives the same track and a
 * new seed gives a new variation.
 *
 *   MigaMusic.parse(text)            -> { spec, understood[] }   words -> settings
 *   MigaMusic.render(spec, opts)     -> Promise<AudioBuffer>      opts.only = 'drums'|'bass'|'chords'|'melody'
 *   MigaMusic.describe(spec)         -> short summary line
 *   MigaMusic.sfx(name)              -> Promise<AudioBuffer>      small sound effects
 *   MigaMusic.finish(buffer, edits)  -> Promise<AudioBuffer>      trim, fades, volume, normalise
 *   MigaMusic.toWav(buffer) / toMp3(buffer) -> Promise<Blob>
 */
(function (window) {
  'use strict';
  const SR = 44100;
  const AC = () => window.OfflineAudioContext || window.webkitOfflineAudioContext;

  function rng(seed) { let s = Math.imul((seed >>> 0) ^ 0x9E3779B9, 2654435761) >>> 0 || 1; const next = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; next(); next(); return next; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ------------------------------------------------------------------ styles */
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10] };
  // Chord progressions as scale degrees (0 = the key's home chord). Several per style so
  // regenerating gives different harmony, not just different notes.
  const PROGS = {
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3], [0, 3, 5, 4], [3, 4, 0, 5], [0, 2, 3, 4]],
    minor: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 5, 6, 0], [5, 6, 0, 0], [0, 6, 5, 6], [0, 3, 6, 2]],
    jazz: [[1, 4, 0, 0], [0, 5, 1, 4], [2, 5, 1, 4], [3, 6, 2, 5]],
    kids: [[0, 3, 4, 0], [0, 4, 0, 4], [0, 3, 0, 4]]
  };
  // One entry per genre chip. bpm = typical range, the rest picks instruments and patterns.
  const GENRES = {
    pop:        { label: 'Pop', emoji: '🎤', bpm: [100, 124], scale: 'major', prog: 'major', drums: 'pop', bass: 'octave', chords: 'piano', lead: 'lead', pad: true, reverb: 0.25, swing: 0 },
    rock:       { label: 'Rock', emoji: '🎸', bpm: [110, 140], scale: 'major', prog: 'major', drums: 'rock', bass: 'root8', chords: 'guitar', lead: 'lead', pad: false, reverb: 0.15, swing: 0 },
    electronic: { label: 'Electronic', emoji: '🪩', bpm: [118, 128], scale: 'minor', prog: 'minor', drums: 'four', bass: 'synth', chords: 'pluck', lead: 'lead', pad: true, reverb: 0.3, swing: 0 },
    ambient:    { label: 'Ambient', emoji: '🌫️', bpm: [60, 76], scale: 'major', prog: 'major', drums: 'none', bass: 'pedal', chords: 'pad', lead: 'bell', pad: true, reverb: 0.6, swing: 0 },
    cinematic:  { label: 'Cinematic', emoji: '🎬', bpm: [70, 92], scale: 'minor', prog: 'minor', drums: 'epic', bass: 'pedal', chords: 'strings', lead: 'strings', pad: true, reverb: 0.5, swing: 0 },
    hiphop:     { label: 'Hip-hop', emoji: '🧢', bpm: [84, 96], scale: 'minor', prog: 'minor', drums: 'boombap', bass: 'b808', chords: 'epiano', lead: 'bell', pad: false, reverb: 0.2, swing: 0.16 },
    trap:       { label: 'Trap', emoji: '💎', bpm: [130, 150], scale: 'minor', prog: 'minor', drums: 'trap', bass: 'b808', chords: 'pad', lead: 'bell', pad: true, reverb: 0.25, swing: 0 },
    lofi:       { label: 'Lo-fi', emoji: '☕', bpm: [72, 88], scale: 'dorian', prog: 'jazz', drums: 'lofi', bass: 'root', chords: 'epiano', lead: 'epiano', pad: false, reverb: 0.3, swing: 0.2, lofi: true, sevenths: true },
    kids:       { label: 'Kids', emoji: '🧸', bpm: [104, 124], scale: 'major', prog: 'kids', drums: 'kids', bass: 'root', chords: 'piano', lead: 'bell', pad: false, reverb: 0.15, swing: 0 },
    background: { label: 'Background', emoji: '🎧', bpm: [96, 112], scale: 'major', prog: 'major', drums: 'soft', bass: 'root', chords: 'piano', lead: 'none', pad: true, reverb: 0.3, swing: 0 },
    chiptune:   { label: 'Game / 8-bit', emoji: '👾', bpm: [132, 160], scale: 'major', prog: 'major', drums: 'chip', bass: 'chip', chords: 'chip', lead: 'chip', pad: false, reverb: 0.05, swing: 0 },
    jazz:       { label: 'Jazz', emoji: '🎷', bpm: [96, 132], scale: 'major', prog: 'jazz', drums: 'jazz', bass: 'walking', chords: 'epiano', lead: 'flute', pad: false, reverb: 0.25, swing: 0.22, sevenths: true },
    piano:      { label: 'Piano', emoji: '🎹', bpm: [64, 84], scale: 'major', prog: 'major', drums: 'none', bass: 'none', chords: 'piano', lead: 'piano', pad: false, reverb: 0.4, swing: 0 },
    orchestral: { label: 'Orchestral', emoji: '🎻', bpm: [80, 108], scale: 'major', prog: 'major', drums: 'epic', bass: 'root8', chords: 'strings', lead: 'flute', pad: true, reverb: 0.45, swing: 0 }
  };
  const MOODS = {
    happy:     { label: 'Happy', emoji: '😄', scale: 'major', bpm: 8, energy: 0.1 },
    calm:      { label: 'Calm', emoji: '😌', bpm: -14, energy: -0.3, reverb: 0.15 },
    sad:       { label: 'Sad', emoji: '😢', scale: 'minor', bpm: -16, energy: -0.2, reverb: 0.1 },
    epic:      { label: 'Epic', emoji: '🏔️', energy: 0.3, pad: true, reverb: 0.15 },
    energetic: { label: 'Energetic', emoji: '⚡', bpm: 14, energy: 0.3 },
    dark:      { label: 'Dark', emoji: '🌑', scale: 'minor', bpm: -6, energy: 0, dark: true },
    dreamy:    { label: 'Dreamy', emoji: '💭', bpm: -8, energy: -0.15, reverb: 0.3, pad: true },
    romantic:  { label: 'Romantic', emoji: '❤️', scale: 'major', bpm: -10, energy: -0.1, sevenths: true },
    funny:     { label: 'Funny', emoji: '🤪', scale: 'major', bpm: 10, energy: 0.1, bouncy: true },
    tense:     { label: 'Tense', emoji: '😬', scale: 'minor', bpm: 4, energy: 0.1, dark: true }
  };
  const INSTRUMENTS = { piano: 'Piano', guitar: 'Guitar', strings: 'Strings', synth: 'Synth', bells: 'Bells', flute: 'Flute', organ: 'Organ', epiano: 'Electric piano' };
  const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  /* ------------------------------------------------------------------ words -> settings */
  // Words people use for a scene or purpose, mapped to a style and mood.
  const LEXICON = [
    [/\b(pop|catchy|radio)\b/, { genre: 'pop' }],
    [/\b(rock|guitar riff|punk|grunge|metal|power chords?)\b/, { genre: 'rock' }],
    [/\b(edm|electronic|house|techno|dance|club|synthwave|trance|disco)\b/, { genre: 'electronic' }],
    [/\b(ambient|atmospheric|meditation|meditate|spa|yoga|sleep|drone)\b/, { genre: 'ambient', mood: 'calm' }],
    [/\b(cinematic|film|movie|trailer|score|soundtrack|documentary)\b/, { genre: 'cinematic' }],
    [/\b(orchestra|orchestral|symphon\w*|classical)\b/, { genre: 'orchestral' }],
    [/\b(hip[\s-]?hop|rap|boom[\s-]?bap|beat tape)\b/, { genre: 'hiphop' }],
    [/\b(trap|drill)\b/, { genre: 'trap' }],
    [/\b(lo[\s-]?fi|lofi|chillhop|vinyl|study|studying|homework|focus)\b/, { genre: 'lofi', mood: 'calm' }],
    [/\b(kids?|children'?s?|nursery|toddler|playground|cartoon|school)\b/, { genre: 'kids', mood: 'happy' }],
    [/\b(background|corporate|podcast|presentation|explainer|tutorial|vlog|youtube|tiktok|advert\w*|commercial|ad music|business)\b/, { genre: 'background' }],
    [/\b(8[\s-]?bit|chiptune|retro game|arcade|pixel|video ?game|game music|platformer)\b/, { genre: 'chiptune' }],
    [/\b(jazz|jazzy|swing|bossa|lounge|cafe|café|coffee shop)\b/, { genre: 'jazz' }],
    [/\b(piano only|solo piano|piano ballad|ballad)\b/, { genre: 'piano' }],
    [/\b(happy|joyful|cheerful|upbeat|sunny|summer|fun|bright|birthday|celebrat\w*|party|wedding)\b/, { mood: 'happy' }],
    [/\b(calm|relax\w*|peaceful|gentle|soft|chill|chilled|soothing|quiet|rain|rainy)\b/, { mood: 'calm' }],
    [/\b(sad|melanchol\w*|lonely|emotional|heartbreak|goodbye|memorial|nostalgic)\b/, { mood: 'sad' }],
    [/\b(epic|heroic|battle|victory|triumph\w*|powerful|dragon|boss fight|anthem|adventure)\b/, { mood: 'epic' }],
    [/\b(energetic|workout|gym|running|sport|fast[- ]paced|hype|intense|action|chase|race|racing)\b/, { mood: 'energetic' }],
    [/\b(dark|scary|horror|spooky|halloween|creepy|villain|night|mysterious|mystery)\b/, { mood: 'dark' }],
    [/\b(dreamy|magical|fairy|space|stars|floating|ethereal|wonder)\b/, { mood: 'dreamy' }],
    [/\b(romantic|love|valentine|tender)\b/, { mood: 'romantic' }],
    [/\b(funny|silly|comic|comedy|goofy|quirky|playful)\b/, { mood: 'funny' }],
    [/\b(tense|suspense|thriller|stealth|danger)\b/, { mood: 'tense' }]
  ];

  function parse(text) {
    const t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, "'") + ' ';
    const s = {}, understood = [];
    for (const [re, v] of LEXICON) if (re.test(t)) { if (v.genre && !s.genre) s.genre = v.genre; if (v.mood && !s.mood) s.mood = v.mood; }
    let m;
    if ((m = t.match(/(\d{2,3})\s*(bpm|beats per minute)/))) s.bpm = clamp(+m[1], 50, 190);
    else if (/\b(very fast|super fast)\b/.test(t)) s.bpmShift = 26;
    else if (/\b(fast|quick|upbeat|uptempo|driving)\b/.test(t)) s.bpmShift = 14;
    else if (/\b(very slow)\b/.test(t)) s.bpmShift = -26;
    else if (/\b(slow|slowly|laid[- ]back|lazy)\b/.test(t)) s.bpmShift = -14;
    if ((m = t.match(/(\d+):(\d{2})/))) s.seconds = +m[1] * 60 + +m[2];
    else if ((m = t.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b(?:\s*(?:and\s*)?(\d+)\s*(?:seconds?|secs?|s)\b)?/))) s.seconds = Math.round(+m[1] * 60 + (m[3] ? +m[3] : 0));
    else if ((m = t.match(/(\d+)\s*(seconds?|secs?|s)\b/))) s.seconds = +m[1];
    else if (/\bhalf a minute\b/.test(t)) s.seconds = 30;
    if ((m = t.match(/\b(?:in\s+)?([a-g])\s*(#|sharp|b|flat)?\s*(major|minor)\b/))) {
      const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]] + (m[2] === '#' || m[2] === 'sharp' ? 1 : m[2] === 'b' || m[2] === 'flat' ? -1 : 0);
      s.key = (base + 12) % 12; s.scale = m[3];
    } else if (/\bminor\b/.test(t)) s.scale = 'minor'; else if (/\bmajor\b/.test(t)) s.scale = 'major';
    const inst = [];
    if (/\bpiano\b/.test(t)) inst.push('piano');
    if (/\b(acoustic |electric )?guitars?\b/.test(t)) inst.push('guitar');
    if (/\b(strings|violins?|cellos?|orchestra)\b/.test(t)) inst.push('strings');
    if (/\b(synths?|synthesizers?)\b/.test(t)) inst.push('synth');
    if (/\b(bells?|glockenspiel|music box|chimes?|xylophone|marimba)\b/.test(t)) inst.push('bells');
    if (/\b(flutes?|whistle|recorder)\b/.test(t)) inst.push('flute');
    if (/\b(organ)\b/.test(t)) inst.push('organ');
    if (/\b(rhodes|electric piano|e-piano|keys)\b/.test(t)) inst.push('epiano');
    if (inst.length) s.instruments = inst;
    if (/\b(no|without)\s+(drums?|beats?|percussion)\b/.test(t)) s.drums = 'off';
    else if (/\b(drums?|beat|percussion)\b/.test(t)) s.drums = 'on';
    if (/\b(no|without)\s+(bass)\b/.test(t)) s.noBass = true;
    if (/\b(loop|looping|loopable|seamless|repeat\w*)\b/.test(t)) s.structure = 'loop';
    else if (/\b(intro|opener|opening|sting|jingle|logo|ident)\b/.test(t)) s.structure = 'intro';
    else if (/\b(outro|ending|credits)\b/.test(t)) s.structure = 'outro';
    else if (/\b(build|builds|building|crescendo|rising)\b/.test(t)) s.structure = 'build';
    else if (/\b(steady|constant|under ?(a )?voice|underscore|background)\b/.test(t)) s.structure = 'steady';
    if (/\b(soft|quiet|gentle|minimal|sparse)\b/.test(t)) s.energy = -0.2;
    if (/\b(powerful|loud|big|huge|intense|full)\b/.test(t)) s.energy = 0.25;
    if (s.genre) understood.push(GENRES[s.genre].label);
    if (s.mood) understood.push(MOODS[s.mood].label);
    if (s.bpm) understood.push(s.bpm + ' BPM'); else if (s.bpmShift) understood.push(s.bpmShift > 0 ? 'faster' : 'slower');
    if (s.seconds) understood.push(fmtTime(s.seconds));
    if (s.key != null) understood.push(KEYS[s.key] + ' ' + s.scale); else if (s.scale) understood.push(s.scale);
    if (s.instruments) understood.push(s.instruments.map(i => INSTRUMENTS[i].toLowerCase()).join(', '));
    if (s.drums) understood.push(s.drums === 'off' ? 'no drums' : 'drums');
    if (s.structure) understood.push({ loop: 'seamless loop', intro: 'short intro', outro: 'outro', build: 'builds up', steady: 'steady background' }[s.structure]);
    return { spec: s, understood };
  }
  function fmtTime(sec) { sec = Math.round(sec); return sec >= 60 ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' min' : sec + ' s'; }

  // Fill in everything the description left open. Explicit choices win over word guesses.
  function resolve(spec) {
    const r = rng(spec.seed || 1);
    const g = GENRES[spec.genre] || GENRES[pick(r, ['pop', 'background', 'lofi', 'electronic', 'cinematic'])];
    const genreKey = spec.genre && GENRES[spec.genre] ? spec.genre : Object.keys(GENRES).find(k => GENRES[k] === g);
    const mood = MOODS[spec.mood] || {};
    const scale = spec.scale || mood.scale || g.scale;
    let bpm = spec.bpm || spec.bpmSoft || Math.round(g.bpm[0] + r() * (g.bpm[1] - g.bpm[0]) + (mood.bpm || 0) + (spec.bpmShift || 0));
    if (!spec.bpm && !spec.bpmSoft) bpm = clamp(bpm, Math.round(g.bpm[0] * 0.82), Math.round(g.bpm[1] * 1.12)); // stay in the style's tempo range
    bpm = clamp(bpm, 50, 190);
    const structure = spec.structure || (genreKey === 'background' ? 'steady' : 'song');
    const seconds = clamp(spec.seconds || (structure === 'intro' ? 8 : structure === 'outro' ? 12 : 30), 3, 300);
    // Fit whole bars into the requested length so the track is exactly as long as asked (important
    // when it has to end with a video). The tempo moves a little, unless the user set it.
    const loopy = structure === 'loop', ring = loopy ? 0 : Math.min(2, Math.max(0.6, seconds * 0.12));
    let bars = Math.max(loopy ? 2 : 1, Math.round((seconds - ring) * bpm / 240));
    if (loopy) bars = Math.max(2, Math.round(bars / 2) * 2);
    if (!spec.bpm) { const fit = bars * 240 / (seconds - ring); if (fit >= 45 && fit <= 200) bpm = fit; }
    const energy = clamp(0.6 + (mood.energy || 0) + (spec.energy || 0) + (genreKey === 'ambient' || genreKey === 'piano' ? -0.25 : 0), 0.15, 1);
    let drums = g.drums;
    if (spec.drums === 'off') drums = 'none';
    else if (spec.drums === 'on' && drums === 'none') drums = genreKey === 'ambient' ? 'soft' : 'pop';
    if (mood === MOODS.calm && drums !== 'none' && drums !== 'lofi') drums = 'soft';
    const inst = spec.instruments || [];
    const chordVoice = inst.includes('guitar') ? 'guitar' : inst.includes('strings') ? 'strings' : inst.includes('organ') ? 'organ' : inst.includes('epiano') ? 'epiano' : inst.includes('piano') ? 'piano' : inst.includes('synth') ? 'pluck' : g.chords;
    const leadVoice = inst.includes('bells') ? 'bell' : inst.includes('flute') ? 'flute' : inst.includes('synth') ? 'lead' : inst.includes('piano') && chordVoice !== 'piano' ? 'piano' : (g.lead === 'none' && spec.instruments ? 'piano' : g.lead);
    const progPool = scale === 'minor' || scale === 'dorian' ? (g.prog === 'jazz' ? PROGS.jazz : PROGS.minor) : PROGS[g.prog] || PROGS.major;
    return {
      genre: genreKey, mood: spec.mood || '', scale, bpm, bars, seconds, structure, energy, drums,
      key: spec.key != null ? spec.key : Math.floor(r() * 12),
      bass: spec.noBass ? 'none' : g.bass, chords: chordVoice, lead: leadVoice, pad: g.pad || !!mood.pad,
      reverb: clamp(g.reverb + (mood.reverb || 0), 0, 0.8), swing: g.swing, lofi: !!g.lofi, dark: !!mood.dark,
      sevenths: !!(g.sevenths || mood.sevenths), bouncy: !!mood.bouncy,
      prog: pick(r, progPool), bridgeProg: pick(r, progPool), seed: spec.seed || 1,
      cues: Array.isArray(spec.cues) ? spec.cues.filter(c => c > 1 && c < seconds - 1).sort((a, b) => a - b) : []
    };
  }
  function describe(spec) {
    const x = resolve(spec);
    return [GENRES[x.genre].label, x.mood ? MOODS[x.mood].label : null, Math.round(x.bpm) + ' BPM', KEYS[x.key] + ' ' + (x.scale === 'dorian' ? 'minor' : x.scale === 'mixolydian' ? 'major' : x.scale), fmtTime(x.seconds),
      { song: 'intro · verse · chorus · ending', loop: 'seamless loop', intro: 'short intro', outro: 'outro', build: 'builds up', steady: 'steady background' }[x.structure],
      [x.chords, x.lead !== 'none' && x.lead !== x.chords ? x.lead : null, x.bass !== 'none' ? 'bass' : null, x.drums !== 'none' ? 'drums' : null].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  }

  /* ------------------------------------------------------------------ sound sources */
  function noiseBuffer(ctx, sec) { const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } return b; }
  function envGain(ctx, dest, t, a, peak, hold, rel) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + rel); g.connect(dest); return g;
  }
  function osc(ctx, type, f, t, end, dest, detune) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end + 0.05); return o; }
  function lp(ctx, f, q, dest) { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  // One node shared by every note of a voice (a filter or an amp), so long tracks need far
  // fewer audio nodes. With an envelope gain given, that gain is re-routed through it.
  function shared(c, d, name, make, g) {
    const k = '__' + name; if (!d[k]) d[k] = make();
    if (g) { g.disconnect(); g.connect(d[k]); return g; }
    return d[k];
  }

  // Tonal voices: (ctx, dest, midi, t, dur, vel)
  const VOICES = {
    piano(c, d, m, t, dur, v) { const rel = Math.min(2.2, dur + 0.9); const g = envGain(c, d, t, 0.004, 0.34 * v, 0, rel); wave(c, 'piano', hz(m), t, t + rel, g); },
    epiano(c, d, m, t, dur, v) { const rel = Math.min(2, dur + 0.6); const g = envGain(c, d, t, 0.006, 0.3 * v, 0, rel); wave(c, 'epiano', hz(m), t, t + rel, g); },
    pluck(c, d, m, t, dur, v) { const rel = Math.min(0.9, dur + 0.25); const g = envGain(c, d, t, 0.004, 0.2 * v, 0, rel); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(420, t + rel); f.connect(g); osc(c, 'sawtooth', hz(m), t, t + rel, f); },
    pad(c, d, m, t, dur, v) { const a = Math.min(0.6, dur * 0.3), rel = 0.8; const g = envGain(c, d, t, a, 0.14 * v, Math.max(0, dur - a), rel); osc(c, 'sawtooth', hz(m), t, t + dur + rel, shared(c, d, 'padlp', () => lp(c, 1300, 0.4, d), g), (m % 3 - 1) * 6); },
    strings(c, d, m, t, dur, v) { const a = Math.min(0.35, dur * 0.3), rel = 0.7; const g = envGain(c, d, t, a, 0.13 * v, Math.max(0, dur - a), rel); const f = shared(c, d, 'strlp', () => lp(c, 2400, 0.5, d), g); osc(c, 'sawtooth', hz(m), t, t + dur + rel, f, -8); osc(c, 'sawtooth', hz(m), t, t + dur + rel, f, 8); },
    organ(c, d, m, t, dur, v) { const g = envGain(c, d, t, 0.02, 0.16 * v, Math.max(0, dur - 0.02), 0.12); wave(c, 'organ', hz(m), t, t + dur + 0.15, g); },
    guitar(c, d, m, t, dur, v) { const rel = Math.min(1.2, dur + 0.2); const amp = shared(c, d, 'amp', () => { const ws = c.createWaveShaper(); ws.curve = DRIVE; ws.connect(lp(c, 3200, 0.8, d)); return ws; }); const g = envGain(c, amp, t, 0.004, 0.2 * v, Math.max(0, dur * 0.6), rel); [0, 7].forEach(iv => osc(c, 'sawtooth', hz(m + iv), t, t + dur + rel, g, iv ? 4 : -4)); },
    bell(c, d, m, t, dur, v) { const rel = 1.6; const g = envGain(c, d, t, 0.002, 0.16 * v, 0, rel); osc(c, 'sine', hz(m + 12), t, t + rel, g); const g2 = envGain(c, d, t, 0.002, 0.05 * v, 0, rel * 0.4); osc(c, 'sine', hz(m + 12) * 3.5, t, t + rel, g2); },
    lead(c, d, m, t, dur, v) { const rel = 0.18; const g = envGain(c, d, t, 0.01, 0.1 * v, Math.max(0, dur - 0.05), rel); const f = lp(c, 2800, 1, g); const o = osc(c, 'square', hz(m), t, t + dur + rel, f); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = 9; l.connect(lg).connect(o.detune); l.start(t); l.stop(t + dur + rel); },
    flute(c, d, m, t, dur, v) { const rel = 0.2; const g = envGain(c, d, t, 0.05, 0.18 * v, Math.max(0, dur - 0.06), rel); wave(c, 'flute', hz(m + 12), t, t + dur + rel, g); },
    chip(c, d, m, t, dur, v) { const g = envGain(c, d, t, 0.002, 0.09 * v, Math.max(0, dur * 0.7), 0.05); osc(c, 'square', hz(m), t, t + dur + 0.06, g); }
  };
  // Harmonic mixes (1st, 2nd, 3rd … partial) so one oscillator gives a fuller tone.
  const SHAPES = { piano: [0, 1, 0.42, 0.2, 0.12, 0.06, 0.04], epiano: [0, 1, 0.08, 0.22, 0.02, 0.05], organ: [0, 1, 0.55, 0.3, 0.2, 0, 0.12], flute: [0, 1, 0.12, 0.05] };
  function wave(c, name, f, t, end, dest) {
    const k = '__w' + name; if (!c[k]) { const h = SHAPES[name]; c[k] = c.createPeriodicWave(new Float32Array(h.length), new Float32Array(h)); }
    const o = c.createOscillator(); o.setPeriodicWave(c[k]); o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end + 0.05); return o;
  }
  const DRIVE = (function () { const n = 2048, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(x * 3.2); } return a; })();

  const BASS = {
    root(c, d, m, t, dur, v) { const rel = Math.min(0.5, dur); const g = envGain(c, d, t, 0.01, 0.23 * v, Math.max(0, dur - rel), rel); shared(c, d, 'basslp', () => lp(c, 900, 0.6, d), g); osc(c, 'triangle', hz(m), t, t + dur, g); },
    synth(c, d, m, t, dur, v) { const g = envGain(c, d, t, 0.005, 0.22 * v, Math.max(0, dur * 0.5), dur * 0.5 + 0.05); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(260, t + dur); f.connect(g); osc(c, 'sawtooth', hz(m), t, t + dur + 0.1, f); osc(c, 'sine', hz(m), t, t + dur, g); },
    b808(c, d, m, t, dur, v) { const rel = Math.min(1.6, dur + 0.3); const g = envGain(c, d, t, 0.004, 0.5 * v, 0, rel); const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(hz(m + 7), t); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.06); const ws = c.createWaveShaper(); ws.curve = DRIVE; o.connect(ws); const sg = c.createGain(); sg.gain.value = 0.45; ws.connect(sg).connect(g); o.start(t); o.stop(t + rel + 0.05); },
    chip(c, d, m, t, dur, v) { const g = envGain(c, d, t, 0.002, 0.16 * v, Math.max(0, dur * 0.8), 0.04); osc(c, 'triangle', hz(m + 12), t, t + dur + 0.05, g); }
  };

  const DRUMS = {
    kick(c, d, t, v, big) { const g = envGain(c, d, t, 0.002, 0.9 * v, 0, big ? 0.45 : 0.28); const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(big ? 120 : 160, t); o.frequency.exponentialRampToValueAtTime(big ? 38 : 48, t + 0.13); o.connect(g); o.start(t); o.stop(t + 0.5); },
    snare(c, d, t, v, nb) { const g = envGain(c, d, t, 0.001, 0.4 * v, 0, 0.17); shared(c, d, 'snbp', () => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8; bp.connect(d); return bp; }, g); const s = c.createBufferSource(); s.buffer = nb; s.connect(g); s.start(t); s.stop(t + 0.2); const g2 = envGain(c, d, t, 0.001, 0.22 * v, 0, 0.09); osc(c, 'triangle', 190, t, t + 0.1, g2); },
    clap(c, d, t, v, nb) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2; const g = c.createGain(); g.gain.value = 0.0001; bp.connect(g).connect(d); [0, 0.012, 0.024].forEach((o, i) => { g.gain.setValueAtTime(0.35 * v, t + o); g.gain.exponentialRampToValueAtTime(0.02, t + o + (i === 2 ? 0.16 : 0.011)); }); const s = c.createBufferSource(); s.buffer = nb; s.connect(bp); s.start(t); s.stop(t + 0.22); },
    hat(c, d, t, v, nb, open) { const g = envGain(c, d, t, 0.001, 0.13 * v, 0, open ? 0.28 : 0.045); shared(c, d, 'hathp', () => { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200; hp.connect(d); return hp; }, g); const s = c.createBufferSource(); s.buffer = nb; s.connect(g); s.start(t); s.stop(t + (open ? 0.3 : 0.06)); },
    crash(c, d, t, v, nb) { const g = envGain(c, d, t, 0.002, 0.12 * v, 0, 1.6); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500; hp.connect(g); const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(hp); s.start(t); s.stop(t + 1.7); },
    boom(c, d, t, v, nb) { DRUMS.kick(c, d, t, v * 0.9, true); const g = envGain(c, d, t, 0.005, 0.25 * v, 0, 0.9); const f = lp(c, 180, 0.8, g); const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(f); s.start(t); s.stop(t + 1); },
    shaker(c, d, t, v, nb) { const g = envGain(c, d, t, 0.01, 0.06 * v, 0, 0.06); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; hp.connect(g); const s = c.createBufferSource(); s.buffer = nb; s.connect(hp); s.start(t); s.stop(t + 0.1); },
    rim(c, d, t, v) { const g = envGain(c, d, t, 0.001, 0.18 * v, 0, 0.04); osc(c, 'square', 1700, t, t + 0.05, lp(c, 3000, 1, g)); }
  };
  // 16 steps per bar. K kick, S snare, C clap, H closed hat, O open hat, B boom, R rim, X shaker.
  const PATTERNS = {
    pop:     { K: 'x.......x.x.....', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.' },
    rock:    { K: 'x.....x.x.......', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.', O: '..............x.' },
    four:    { K: 'x...x...x...x...', C: '....x.......x...', H: '..x...x...x...x.', O: '..x...x...x...x.' },
    boombap: { K: 'x.....x...x.....', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.' },
    trap:    { K: 'x......x..x.....', C: '........x.......', H: 'x.xxx.x.x.xxx.xx' },
    lofi:    { K: 'x......x..x.....', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.' },
    kids:    { K: 'x.......x.......', S: '....x.......x...', X: '..x...x...x...x.' },
    soft:    { K: 'x.......x.......', R: '....x.......x...', X: 'x.x.x.x.x.x.x.x.' },
    chip:    { K: 'x...x...x...x...', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.' },
    jazz:    { K: 'x.........x.....', R: '....x.......x...', H: 'x..x..x.x..x..x.' },
    epic:    { B: 'x.......x.....x.', S: '............x...' },
    none: {}
  };

  /* ------------------------------------------------------------------ composing */
  function chordNotes(x, degree, octaveMidi) {
    const sc = SCALES[x.scale] || SCALES.major, n = x.sevenths ? 4 : 3, out = [];
    for (let i = 0; i < n; i++) { const d = degree + i * 2; out.push(octaveMidi + x.key + sc[d % 7] + 12 * Math.floor(d / 7)); }
    return out;
  }
  function scaleNote(x, degree, base) { const sc = SCALES[x.scale] || SCALES.major; const o = Math.floor(degree / 7), d = ((degree % 7) + 7) % 7; return base + x.key + sc[d] + 12 * o; }

  // Split the length into sections with an energy level each.
  function plan(x) {
    const barSec = 240 / x.bpm; let bars = x.bars || Math.max(1, Math.round(x.seconds / barSec));
    const S = [];
    if (x.structure === 'loop') { bars = Math.max(2, Math.round(bars / 2) * 2); for (let i = 0; i < bars; i++) S.push({ kind: i < bars / 2 ? 'A' : 'B', e: x.energy, prog: 'main' }); return { bars, barSec, S }; }
    if (x.structure === 'intro' || x.structure === 'outro') { for (let i = 0; i < bars; i++) S.push({ kind: 'A', e: x.structure === 'intro' ? clamp(x.energy * (0.55 + 0.45 * (i + 1) / bars), 0.3, 1) : clamp(x.energy * (1 - 0.5 * i / bars), 0.3, 1), prog: 'main', last: i === bars - 1 }); return { bars, barSec, S }; }
    if (x.structure === 'build') { for (let i = 0; i < bars; i++) S.push({ kind: i < bars / 2 ? 'A' : 'B', e: clamp(0.2 + 0.85 * i / Math.max(1, bars - 1), 0.2, 1), prog: 'main', last: i === bars - 1 }); return { bars, barSec, S }; }
    if (x.structure === 'steady' || bars < 6) { for (let i = 0; i < bars; i++) S.push({ kind: i % 8 < 4 ? 'A' : 'B', e: bars < 6 && i === 0 ? x.energy * 0.7 : x.energy * 0.85, prog: 'main', last: i === bars - 1 }); return { bars, barSec, S }; }
    // Following a video: a new section (with a crash) starts on the bar nearest each scene change.
    if (x.cues && x.cues.length && x.structure !== 'loop') {
      const starts = [0];
      x.cues.forEach(c => { const b = Math.round(c / barSec); if (b > starts[starts.length - 1] && b < bars - 1) starts.push(b); });
      const kinds = ['verse', 'chorus', 'bridge', 'chorus', 'verse', 'chorus'];
      for (let k = 0; k < starts.length; k++) {
        const end = k + 1 < starts.length ? starts[k + 1] : bars, kind = k === 0 && end <= 2 ? 'intro' : kinds[(k - (starts[1] <= 2 ? 1 : 0) + kinds.length) % kinds.length];
        for (let i = starts[k]; i < end; i++) S.push({ kind, e: kind === 'intro' ? x.energy * 0.5 : kind === 'chorus' ? Math.min(1, x.energy + 0.2) : kind === 'bridge' ? x.energy * 0.6 : x.energy * 0.8, prog: kind === 'bridge' ? 'bridge' : 'main', cue: i === starts[k] && k > 0, last: i === bars - 1 });
      }
      return { bars, barSec, S };
    }
    // A song: intro, verse, chorus (and a bridge when there is room), ending.
    const intro = bars >= 16 && barSec < 3 ? 2 : 1, outro = bars >= 12 ? 2 : 1; let body = bars - intro - outro;
    for (let i = 0; i < intro; i++) S.push({ kind: 'intro', e: x.energy * 0.45, prog: 'main' });
    const unit = body >= 24 ? 8 : 4; let k = 0;
    while (body > 0) {
      const len = Math.min(unit, body);
      const bridge = k === 4 && body > unit;
      const chorus = !bridge && k % 2 === 1;
      for (let i = 0; i < len; i++) S.push({ kind: bridge ? 'bridge' : chorus ? 'chorus' : 'verse', e: bridge ? x.energy * 0.6 : chorus ? Math.min(1, x.energy + 0.2) : x.energy * 0.8, prog: bridge ? 'bridge' : 'main' });
      body -= len; k++;
    }
    for (let i = 0; i < outro; i++) S.push({ kind: 'outro', e: x.energy * 0.6, prog: 'main', last: i === outro - 1 });
    return { bars, barSec, S };
  }

  // A two-bar melody idea as [step (16ths), length (16ths), scale degree offset from the chord root].
  function motif(r, bouncy) {
    const rhythms = [[0, 4, 8, 12, 16, 20, 24], [0, 3, 6, 8, 12, 16, 22], [0, 2, 4, 8, 16, 18, 20, 24], [0, 6, 8, 14, 16, 24], [0, 4, 6, 8, 12, 16, 20, 22, 24, 28]];
    const steps = pick(r, rhythms), notes = []; let deg = pick(r, [0, 2, 4]);
    for (let i = 0; i < steps.length; i++) {
      const next = i + 1 < steps.length ? steps[i + 1] : 32, len = Math.max(1, next - steps[i] - (bouncy ? 1 : 0));
      notes.push([steps[i], Math.min(len, 8), deg]);
      deg += pick(r, steps[i] % 8 === 0 ? [-2, 0, 2, 2, 4] : [-1, 1, 1, -1, 2, -2]); deg = clamp(deg, -2, 9);
    }
    return notes;
  }

  async function render(spec, opts) {
    opts = opts || {};
    const A = AC(); if (!A) throw new Error('This browser cannot make audio. Try a recent Chrome, Edge, Firefox or Safari.');
    const x = resolve(spec), P = plan(x), r = rng(x.seed * 7 + 3);
    const step = P.barSec / 16, loop = x.structure === 'loop';
    const musicEnd = P.bars * P.barSec, tail = loop ? 2.5 : Math.max(0.3, x.seconds - musicEnd);
    const ctx = new A(2, Math.ceil(SR * (musicEnd + tail)), SR);
    const nb = noiseBuffer(ctx, 1.2);
    // Mix bus: groups -> (reverb send) -> compressor -> destination.
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.knee.value = 8; comp.attack.value = 0.008; comp.release.value = 0.2; comp.connect(ctx.destination);
    let bus = ctx.createGain(); bus.connect(comp);
    if (x.lofi || x.dark) { const f = lp(ctx, x.lofi ? 3600 : 5200, 0.5, comp); bus.disconnect(); bus.connect(f); }
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.8, x.seed); const wet = ctx.createGain(); wet.gain.value = x.reverb * 0.55; verb.connect(wet).connect(comp);
    const only = opts.only, want = name => !only || only === name;
    const group = name => { const g = ctx.createGain(); g.gain.value = only && only !== name ? 0 : 1; g.connect(bus); const s = ctx.createGain(); s.gain.value = name === 'drums' ? 0.25 : 1; g.connect(s).connect(verb); return g; };
    const G = { drums: group('drums'), bass: group('bass'), chords: group('chords'), melody: group('melody') };
    G.drums.gain.value *= 0.95; G.bass.gain.value *= 0.72; G.chords.gain.value *= 0.75; G.melody.gain.value *= 0.8;
    const chordV = VOICES[x.chords] || VOICES.piano, leadV = VOICES[x.lead], padV = VOICES.pad, bassV = BASS[x.bass === 'root8' || x.bass === 'octave' || x.bass === 'walking' || x.bass === 'pedal' ? 'root' : x.bass];
    const pat = PATTERNS[x.drums] || {};
    const swingT = s => (s % 2 === 1 ? x.swing * step * 2 : 0);
    const motifs = { A: motif(r, x.bouncy), B: motif(r, x.bouncy), chorus: motif(r, x.bouncy), bridge: motif(r, x.bouncy) };
    motifs.verse = motifs.A; motifs.intro = motifs.A; motifs.outro = motifs.A;

    // Notes are added one bar ahead while the offline render runs (suspend/resume). Creating every
    // note up front makes long tracks render far slower, because waiting notes still cost time.
    const scheduleBar = (sec, bar) => {
      const t0 = bar * P.barSec, e = sec.e, prog = sec.prog === 'bridge' ? x.bridgeProg : x.prog;
      const deg = prog[bar % prog.length], chord = chordNotes(x, deg, 48), root = chord[0];
      const final = !loop && sec.last;
      // Chords: sustained for pads/strings/organ, rhythmic for the others.
      const sustained = x.chords === 'strings' || x.chords === 'pad' || x.chords === 'organ';
      if (want('chords')) {
        if (sustained || final) chord.forEach(n => chordV(ctx, G.chords, n + 12, t0, final ? P.barSec + 0.8 : P.barSec, final ? 0.38 + 0.2 * e : 0.55 + 0.35 * e));
        else if ((x.chords === 'piano' || x.chords === 'epiano') && x.bpm < 88) {
          // Broken chords in eighth notes keep slow piano music flowing instead of long gaps.
          const order = [0, 1, 2, 1, x.sevenths ? 3 : 2, 1, 2, 0];
          order.forEach((ci, i) => chordV(ctx, G.chords, chord[Math.min(ci, chord.length - 1)] + 12 + (i === 4 ? 12 : 0), t0 + i * 2 * step + swingT(i * 2), step * 4, (i === 0 ? 0.75 : 0.5) * (0.6 + 0.4 * e)));
          if (x.chords === 'piano') chordV(ctx, G.chords, root, t0, P.barSec, 0.55);
        } else {
          const hits = x.chords === 'guitar' ? (e > 0.7 ? [0, 3, 6, 8, 11, 14] : [0, 6, 8, 14]) : x.chords === 'chip' ? [0, 2, 4, 6, 8, 10, 12, 14] : x.chords === 'pluck' ? [0, 3, 6, 10, 12] : e > 0.55 ? [0, 6, 8, 12] : [0, 8];
          hits.forEach((h, i) => {
            if (x.chords === 'chip') chordV(ctx, G.chords, chord[i % chord.length] + 24, t0 + h * step, step * 1.6, 0.8);
            else if (x.chords === 'guitar') chordV(ctx, G.chords, root + 12, t0 + h * step, step * (h === 0 ? 3 : 2), 0.8);
            else chord.forEach(n => chordV(ctx, G.chords, n + 12, t0 + h * step + swingT(h) + i * 0.004, step * (x.chords === 'pluck' ? 2 : 4), 0.5 + 0.35 * e));
          });
        }
        if (x.pad && x.chords !== 'pad' && e < 0.95) chord.forEach(n => padV(ctx, G.chords, n + 12, t0, P.barSec, 0.35 + 0.3 * (1 - e)));
      }
      // Bass from moderate energy up (the pedal bass holds the home note under everything).
      const build = x.structure === 'build', intro = sec.kind === 'intro';
      if (want('bass') && bassV && (build ? e >= 0.3 : !intro || x.energy > 0.85)) {
        const b = root - 12;
        if (final) bassV(ctx, G.bass, b, t0, P.barSec, 0.9);
        else if (x.bass === 'pedal') bassV(ctx, G.bass, x.key + 36, t0, P.barSec, 0.7);
        else if (x.bass === 'walking') [0, 4, 8, 12].forEach((h, i) => bassV(ctx, G.bass, i === 0 ? b : scaleNote(x, deg + [0, 1, 2, 4][i], 36), t0 + h * step + swingT(h), step * 3.6, 0.8));
        else if (x.bass === 'octave') [0, 4, 8, 10, 12].forEach((h, i) => bassV(ctx, G.bass, b + (i % 2 ? 12 : 0), t0 + h * step, step * 2, 0.8));
        else if (x.bass === 'root8') for (let h = 0; h < 16; h += 2) bassV(ctx, G.bass, b, t0 + h * step, step * 1.8, 0.75);
        else if (x.bass === 'b808') [0, 7, 10].forEach(h => bassV(ctx, G.bass, b, t0 + h * step, step * (h === 0 ? 6 : 3), 0.9));
        else if (x.bass === 'synth') [2, 6, 10, 14].forEach(h => bassV(ctx, G.bass, b, t0 + h * step, step * 1.8, 0.85));
        else if (x.bass === 'chip') [0, 4, 8, 12].forEach((h, i) => bassV(ctx, G.bass, b + (i % 2 ? 7 : 0), t0 + h * step, step * 3, 0.8));
        else [0, 8].forEach(h => bassV(ctx, G.bass, b, t0 + h * step, step * 8, 0.85));
      }
      // Drums from a little more energy up; lighter patterns at lower energy.
      if (want('drums') && x.drums !== 'none' && (build ? e >= 0.42 : !intro || x.energy > 0.85)) {
        const light = e < 0.62;
        for (const k of Object.keys(pat)) {
          const p = pat[k];
          for (let s = 0; s < 16; s++) {
            if (p[s] !== 'x') continue;
            if (light && (k === 'O' || (k === 'H' && s % 4 !== 0) || (k === 'S' && x.drums === 'epic'))) continue;
            if (final && s > 0) continue;
            const tt = t0 + s * step + swingT(s), vel = (s % 4 === 0 ? 1 : 0.75) * (0.6 + 0.4 * e) * (x.drums === 'lofi' || x.drums === 'soft' ? 0.7 : 1);
            if (k === 'K') DRUMS.kick(ctx, G.drums, tt, vel, x.drums === 'trap');
            else if (k === 'S') DRUMS.snare(ctx, G.drums, tt, vel, nb);
            else if (k === 'C') DRUMS.clap(ctx, G.drums, tt, vel, nb);
            else if (k === 'H') DRUMS.hat(ctx, G.drums, tt, vel, nb, false);
            else if (k === 'O') DRUMS.hat(ctx, G.drums, tt, vel * 0.8, nb, true);
            else if (k === 'B') DRUMS.boom(ctx, G.drums, tt, vel, nb);
            else if (k === 'R') DRUMS.rim(ctx, G.drums, tt, vel);
            else if (k === 'X') DRUMS.shaker(ctx, G.drums, tt, vel, nb);
          }
        }
        // A crash or big hit at the start of each chorus and on the final chord.
        const prev = P.S[bar - 1];
        if ((sec.kind === 'chorus' && (!prev || prev.kind !== 'chorus')) || sec.cue || final) DRUMS.crash(ctx, G.drums, t0, final ? 0.55 : 0.9, nb);
        if (final && x.drums === 'epic') DRUMS.boom(ctx, G.drums, t0, 1, nb);
        // A crash exactly on each scene change of the video (the section itself starts on the nearest bar).
        (x.cues || []).forEach(c => { if (c >= t0 && c < t0 + P.barSec) DRUMS.crash(ctx, G.drums, c, 0.85, nb); });
        // Small fill into a new section.
        const next = P.S[bar + 1];
        if (next && next.kind !== sec.kind && !loop && x.drums !== 'epic' && x.drums !== 'soft') [12, 13, 14, 15].forEach(s => DRUMS.snare(ctx, G.drums, t0 + s * step, 0.35 + 0.1 * (s - 12), nb));
      }
      // Melody on top when there is enough energy (and always in the chorus).
      if (want('melody') && leadV && x.lead !== 'none' && !final && !intro && (build ? e >= 0.5 : sec.kind !== 'outro' && (sec.kind !== 'A' || x.structure !== 'steady'))) {
        const mot = motifs[sec.kind] || motifs.A, half = bar % 2, lift = sec.kind === 'chorus' ? 2 : 0;
        mot.forEach(([s, len, d]) => {
          if ((s >= 16) !== !!half) return;
          const st = s % 16, n = scaleNote(x, deg + d + lift, 72);
          leadV(ctx, G.melody, n, t0 + st * step + swingT(st), len * step * 0.95, 0.75);
        });
      }
    };
    const AHEAD = 2;
    P.S.slice(0, AHEAD).forEach(scheduleBar);
    for (let b = AHEAD; b < P.S.length; b++) {
      if (typeof ctx.suspend !== 'function') { scheduleBar(P.S[b], b); continue; }
      const at = Math.floor((b - 1) * P.barSec * SR / 128) * 128 / SR;
      ctx.suspend(at).then(() => { scheduleBar(P.S[b], b); ctx.resume(); });
    }
    if (x.lofi) { const g = ctx.createGain(); g.gain.value = only && only !== 'drums' ? 0 : 0.012; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; hp.connect(g).connect(ctx.destination); const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = 0.5; s.connect(hp); s.start(0); s.stop(musicEnd + tail); }

    let buf = await ctx.startRendering();
    if (loop) buf = foldTail(buf, Math.round(musicEnd * SR));
    else buf = fadeTail(buf, Math.round((musicEnd + tail) * SR), Math.round(Math.min(1.6, Math.max(0.4, tail)) * SR));
    // Even loudness from style to style: a quiet piano piece and a busy rock track come out at a
    // similar level, then a limiter keeps every peak under -1 dBFS so nothing clips.
    const quiet = x.energy < 0.45 || x.genre === 'ambient' || x.genre === 'piano';
    const gain = opts.gain != null ? opts.gain : loudGain(buf, quiet ? -19 : -16);
    scale(buf, gain); limit(buf, 0.89);
    buf.__gain = gain; buf.__spec = x;
    return buf;
  }

  // Reverb tail that fades out, generated from seeded noise.
  function impulse(ctx, sec, seed) { const r = rng(seed * 13 + 5), n = Math.ceil(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 2.6); } return b; }
  // Seamless loop: the reverb/release tail past the loop point is mixed back into the start.
  function foldTail(buf, len) {
    const out = new AudioBuffer({ length: len, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
    for (let c = 0; c < buf.numberOfChannels; c++) { const src = buf.getChannelData(c), d = out.getChannelData(c); d.set(src.subarray(0, len)); for (let i = len; i < src.length && i - len < len; i++) d[i - len] += src[i]; }
    return out;
  }
  function fadeTail(buf, len, fade) { for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < fade; i++) { const k = len - fade + i; if (k >= 0 && k < d.length) d[k] *= Math.pow(1 - i / fade, 2); } } return buf; }
  // Gain that brings the average level of the audible parts to targetDb (RMS, dBFS).
  function loudGain(buf, targetDb) {
    const d = buf.getChannelData(0), w = Math.floor(buf.sampleRate * 0.05); let sum = 0, n = 0;
    for (let s0 = 0; s0 + w <= d.length; s0 += w) { let e = 0; for (let i = s0; i < s0 + w; i++) e += d[i] * d[i]; e /= w; if (e > 1e-5) { sum += e; n++; } }
    if (!n) return 1; const rms = Math.sqrt(sum / n);
    return Math.min(8, Math.pow(10, targetDb / 20) / rms);
  }
  // Look-ahead peak limiter: gain ramps down over 5 ms before a peak and recovers over 120 ms.
  function limit(buf, ceil) {
    const n = buf.length, ch = []; for (let c = 0; c < buf.numberOfChannels; c++) ch.push(buf.getChannelData(c));
    const g = new Float32Array(n); let any = false;
    for (let i = 0; i < n; i++) { let a = 0; for (const d of ch) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > a) a = v; } g[i] = a > ceil ? ceil / a : 1; if (g[i] < 1) any = true; }
    if (!any) return;
    const att = 1 / Math.round(buf.sampleRate * 0.005), rel = 1 / Math.round(buf.sampleRate * 0.12);
    for (let i = n - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] + att);
    for (let i = 1; i < n; i++) g[i] = Math.min(g[i], g[i - 1] + rel);
    for (const d of ch) for (let i = 0; i < n; i++) d[i] *= g[i];
  }
  function peakOf(buf) { let p = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > p) p = a; } } return p; }
  function normGain(buf, target) { const p = peakOf(buf); return p > 0 ? target / p : 1; }
  function scale(buf, g) { if (g === 1) return; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; } }

  /* ------------------------------------------------------------------ sound effects */
  const SFX = {
    whoosh: ['Whoosh', 1.2, (c, d, nb) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(300, 0); f.frequency.exponentialRampToValueAtTime(4000, 0.6); f.frequency.exponentialRampToValueAtTime(600, 1.1); const g = c.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.9, 0.55); g.gain.exponentialRampToValueAtTime(0.0001, 1.15); f.connect(g).connect(d); const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(f); s.start(0); s.stop(1.2); }],
    riser: ['Riser', 3, (c, d, nb) => { const g = c.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.5, 2.9); g.gain.linearRampToValueAtTime(0, 3); g.connect(d); const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, 0); o.frequency.exponentialRampToValueAtTime(1760, 2.95); const f = lp(c, 2500, 2, g); o.connect(f); o.start(0); o.stop(3); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(800, 0); hp.frequency.exponentialRampToValueAtTime(8000, 2.9); hp.connect(g); const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(hp); s.start(0); s.stop(3); }],
    impact: ['Impact', 2.5, (c, d, nb) => { DRUMS.boom(c, d, 0.01, 1.2, nb); DRUMS.crash(c, d, 0.01, 1, nb); }],
    coin: ['Coin', 0.6, (c, d) => { const g = envGain(c, d, 0, 0.002, 0.35, 0.08, 0.4); const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(988, 0); o.frequency.setValueAtTime(1319, 0.08); o.connect(lp(c, 5000, 0.7, g)); o.start(0); o.stop(0.6); }],
    jump: ['Jump', 0.5, (c, d) => { const g = envGain(c, d, 0, 0.004, 0.3, 0.12, 0.25); const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(220, 0); o.frequency.exponentialRampToValueAtTime(880, 0.22); o.connect(lp(c, 3000, 0.7, g)); o.start(0); o.stop(0.5); }],
    success: ['Success', 1.6, (c, d) => { [72, 76, 79, 84].forEach((m, i) => VOICES.bell(c, d, m - 12, i * 0.1, 0.4, 0.9)); }],
    fail: ['Try again', 1.4, (c, d) => { [67, 66, 65, 62].forEach((m, i) => VOICES.lead(c, d, m - 12, i * 0.22, i === 3 ? 0.6 : 0.2, 0.8)); }],
    click: ['Click', 0.15, (c, d) => { DRUMS.rim(c, d, 0.001, 1.2); }],
    notify: ['Notification', 0.9, (c, d) => { VOICES.bell(c, d, 76, 0, 0.2, 0.9); VOICES.bell(c, d, 83, 0.13, 0.3, 0.9); }],
    drumroll: ['Drum roll', 2.4, (c, d, nb) => { for (let i = 0; i < 40; i++) DRUMS.snare(c, d, i * 0.05, 0.35 + i / 60, nb); DRUMS.crash(c, d, 2.0, 1, nb); DRUMS.kick(c, d, 2.0, 1); }]
  };
  async function sfx(name) {
    const e = SFX[name]; if (!e) throw new Error('Unknown sound effect');
    const A = AC(), ctx = new A(2, Math.ceil(SR * e[1]), SR), nb = noiseBuffer(ctx, 1.2);
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    e[2](ctx, comp, nb);
    const buf = await ctx.startRendering(); scale(buf, normGain(buf, 0.89)); limit(buf, 0.89); return buf;
  }

  /* ------------------------------------------------------------------ finishing + export */
  // edits: { start, end (seconds), fadeIn, fadeOut (seconds), gainDb, normalize }
  async function finish(buf, e) {
    e = e || {};
    const sr = buf.sampleRate, s0 = clamp(Math.round((e.start || 0) * sr), 0, buf.length - 1), s1 = clamp(Math.round((e.end != null ? e.end : buf.length / sr) * sr), s0 + 1, buf.length);
    const len = s1 - s0, out = new AudioBuffer({ length: len, numberOfChannels: buf.numberOfChannels, sampleRate: sr });
    const fi = Math.min(len, Math.round((e.fadeIn || 0) * sr)), fo = Math.min(len, Math.round((e.fadeOut || 0) * sr));
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const src = buf.getChannelData(c), d = out.getChannelData(c); d.set(src.subarray(s0, s1));
      for (let i = 0; i < fi; i++) d[i] *= i / fi;
      for (let i = 0; i < fo; i++) d[len - 1 - i] *= i / fo;
    }
    let g = Math.pow(10, (e.gainDb || 0) / 20);
    if (e.normalize) g *= normGain(out, 0.89);
    const p = peakOf(out) * g; if (p > 0.99) g *= 0.99 / p; // never clip
    scale(out, g);
    return out;
  }
  function toWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, b = new ArrayBuffer(44 + len * ch * 2), v = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * ch * 2, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44; for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = clamp(chans[c][i], -1, 1); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2; }
    return new Blob([b], { type: 'audio/wav' });
  }
  let lameP = null;
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load the MP3 encoder. Check your internet connection, or download WAV instead.')); document.head.appendChild(s); }); }
  async function toMp3(buf, kbps) {
    lameP = lameP || loadScript('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js');
    await lameP;
    const ch = Math.min(2, buf.numberOfChannels), enc = new window.lamejs.Mp3Encoder(ch, buf.sampleRate, kbps || 192), parts = [];
    const conv = d => { const o = new Int16Array(d.length); for (let i = 0; i < d.length; i++) { const s = clamp(d[i], -1, 1); o[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; } return o; };
    const L = conv(buf.getChannelData(0)), R = ch > 1 ? conv(buf.getChannelData(1)) : null, block = 1152;
    for (let i = 0; i < L.length; i += block) {
      const out = R ? enc.encodeBuffer(L.subarray(i, i + block), R.subarray(i, i + block)) : enc.encodeBuffer(L.subarray(i, i + block));
      if (out.length) parts.push(new Uint8Array(out));
      if (i % (block * 400) === 0) await new Promise(r => setTimeout(r)); // keep the page responsive
    }
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    return new Blob(parts, { type: 'audio/mpeg' });
  }

  // One drum or bass hit as a short sample (used by the Beat maker's built-in sounds).
  const HITS = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hi-hat', openhat: 'Open hi-hat', rim: 'Rim', shaker: 'Shaker', boom: 'Boom', crash: 'Crash', b808: '808 bass' };
  async function hit(name) {
    const len = { crash: 1.8, boom: 1.2, b808: 1.4, openhat: 0.4 }[name] || 0.5, A = AC(), ctx = new A(1, Math.ceil(SR * len), SR), nb = noiseBuffer(ctx, 1.2);
    const d = ctx.destination, t = 0.001;
    if (name === 'openhat') DRUMS.hat(ctx, d, t, 1, nb, true); else if (name === 'hat') DRUMS.hat(ctx, d, t, 1, nb, false);
    else if (name === 'b808') BASS.b808(ctx, d, 48, t, 0.9, 1); else DRUMS[name](ctx, d, t, 1, nb);
    const buf = await ctx.startRendering(); scale(buf, normGain(buf, 0.8)); return buf;
  }
  window.MigaMusic = { parse, resolve, plan: spec => plan(resolve(spec)), describe, render, sfx, hit, HITS, finish, toWav, toMp3, peakOf, limit, loudGain, GENRES, MOODS, INSTRUMENTS, SFX: Object.fromEntries(Object.entries(SFX).map(([k, v]) => [k, v[0]])), fmtTime };
})(window);
