/* Theory Forge music engine: notes, correctly spelled scales and chords, keys,
 * Roman numerals, chord shapes and tabs for fretted instruments, and pitch
 * detection. No DOM — the same file runs in the browser and in Node tests. */
(function (root) {
  'use strict';
  var LETTERS = 'CDEFGAB', NAT = [0, 2, 4, 5, 7, 9, 11];
  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ---------- notes ---------- */
  function parseNote(s) {
    var m = /^([A-Ga-g])(##|bb|#|b|♯|♭|x)?(-?\d)?$/.exec(String(s).trim());
    if (!m) return null;
    var L = LETTERS.indexOf(m[1].toUpperCase()), a = m[2] || '';
    var acc = { '': 0, '#': 1, '♯': 1, b: -1, '♭': -1, '##': 2, x: 2, bb: -2 }[a];
    var oct = m[3] == null ? null : +m[3];
    var pc = mod(NAT[L] + acc, 12);
    var midi = oct == null ? null : 12 * (oct + 1) + NAT[L] + acc;
    return { L: L, acc: acc, oct: oct, pc: pc, midi: midi, name: LETTERS[L] + accStr(acc) };
  }
  function accStr(a) { return a === 0 ? '' : a > 0 ? (a === 2 ? '##' : '#') : (a === -2 ? 'bb' : 'b'); }
  function pretty(name) { return String(name).replace(/##/g, '𝄪').replace(/bb/g, '𝄫').replace(/#/g, '♯').replace(/(^|[A-G])b/g, '$1♭'); }
  var SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  function pcName(pc, flat) { return (flat ? FLAT_NAMES : SHARP_NAMES)[mod(pc, 12)]; }
  function midiName(m, flat) { return pcName(m, flat) + (Math.floor(m / 12) - 1); }
  // Octave of a spelled note at a MIDI number (B#3 is MIDI 60, Cb5 is MIDI 71).
  function nameAt(midi, name) {
    var p = parseNote(name); if (!p) return midiName(midi);
    var oct = Math.floor((midi - NAT[p.L] - p.acc) / 12) - 1;
    return p.name + oct;
  }
  function freq(midi, a4) { return (a4 || 440) * Math.pow(2, (midi - 69) / 12); }

  /* ---------- intervals ---------- */
  var IV = [
    ['P1', 'unison', 'Same note'], ['m2', 'minor 2nd', '1 half step'], ['M2', 'major 2nd', '1 whole step'],
    ['m3', 'minor 3rd', '3 half steps'], ['M3', 'major 3rd', '4 half steps'], ['P4', 'perfect 4th', '5 half steps'],
    ['TT', 'tritone', '6 half steps'], ['P5', 'perfect 5th', '7 half steps'], ['m6', 'minor 6th', '8 half steps'],
    ['M6', 'major 6th', '9 half steps'], ['m7', 'minor 7th', '10 half steps'], ['M7', 'major 7th', '11 half steps'],
    ['P8', 'octave', '12 half steps']
  ];
  function interval(semis) { var s = Math.abs(semis); var i = s > 12 ? IV[mod(s, 12)] : IV[s]; return { short: i[0], name: i[1], steps: i[2], semis: s }; }
  // Degree label of an interval in a scale or chord: 1, ♭3, ♯4 …
  var MAJ_IV = [0, 2, 4, 5, 7, 9, 11];
  function degLabel(iv, deg) {
    var d = deg > 7 ? deg - 7 : deg, diff = mod(iv, 12) - MAJ_IV[d - 1];
    if (diff > 6) diff -= 12; if (diff < -6) diff += 12;
    return (diff < 0 ? (diff === -2 ? '𝄫' : '♭') : diff > 0 ? '♯' : '') + deg;
  }

  /* ---------- scales ---------- */
  var SCALES = {
    major: { name: 'Major (Ionian)', iv: [0, 2, 4, 5, 7, 9, 11], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Bright, happy, settled', use: 'Most pop, folk, children’s and classical melodies. The scale every other scale is compared with.' },
    minor: { name: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Sad, serious, dark', use: 'Ballads, rock, film music. Shares its notes with the major scale three half steps higher (A minor = C major).' },
    harmonic: { name: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Exotic, dramatic', use: 'Classical minor pieces, flamenco, metal solos. The raised 7th turns the v chord into a strong major V.' },
    melodic: { name: 'Melodic minor', iv: [0, 2, 3, 5, 7, 9, 11], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Smooth minor, jazzy', use: 'Jazz, and classical melodies going up (they often come down in natural minor).' },
    majpent: { name: 'Major pentatonic', iv: [0, 2, 4, 7, 9], deg: [1, 2, 3, 5, 6], mood: 'Open, happy, can’t sound wrong', use: 'Folk, country, pop hooks and many traditional songs worldwide. Five notes with no half steps, so nothing clashes.' },
    minpent: { name: 'Minor pentatonic', iv: [0, 3, 5, 7, 10], deg: [1, 3, 4, 5, 7], mood: 'Bluesy, cool, rock', use: 'The first scale most guitarists learn for solos: rock, blues, funk and soul.' },
    blues: { name: 'Blues', iv: [0, 3, 5, 6, 7, 10], deg: [1, 3, 4, 5, 5, 7], mood: 'Gritty, soulful', use: 'Minor pentatonic plus the “blue note” ♭5. Blues, rock and jazz solos over a 12-bar blues.' },
    dorian: { name: 'Dorian mode', iv: [0, 2, 3, 5, 7, 9, 10], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Minor but hopeful', use: 'Folk tunes, funk, jazz and Celtic music. A minor scale with a raised 6th (D to D on the white keys).' },
    phrygian: { name: 'Phrygian mode', iv: [0, 1, 3, 5, 7, 8, 10], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Spanish, tense', use: 'Flamenco and metal. The ♭2 right above the home note gives it its Spanish sound (E to E on the white keys).' },
    lydian: { name: 'Lydian mode', iv: [0, 2, 4, 6, 7, 9, 11], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Dreamy, floating', use: 'Film and video game music. A major scale with a raised 4th (F to F on the white keys).' },
    mixolydian: { name: 'Mixolydian mode', iv: [0, 2, 4, 5, 7, 9, 10], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Bluesy major, rock', use: 'Rock, blues, Celtic and folk songs. A major scale with a ♭7 (G to G on the white keys).' },
    locrian: { name: 'Locrian mode', iv: [0, 1, 3, 5, 6, 8, 10], deg: [1, 2, 3, 4, 5, 6, 7], mood: 'Unstable, unsettled', use: 'Rare as a home key because its tonic chord is diminished; heard in some metal and jazz (B to B on the white keys).' },
    wholetone: { name: 'Whole tone', iv: [0, 2, 4, 6, 8, 10], deg: [1, 2, 3, 4, 5, 6], mood: 'Dream sequence, mystery', use: 'Debussy and film dream scenes. Only whole steps, so no note feels like home.' },
    chromatic: { name: 'Chromatic', iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], deg: null, mood: 'Every note', use: 'All 12 notes. Used for runs, passing notes and learning where every note is.' }
  };
  var MODE_ORDER = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];

  // Preferred spelling: does this key use flats?
  function relMajorPc(rootPc, scaleKey) {
    var off = { minor: 3, harmonic: 3, melodic: 3, minpent: 3, blues: 3, dorian: 10, phrygian: 8, lydian: 7, mixolydian: 5, locrian: 1 }[scaleKey] || 0;
    return mod(rootPc + off, 12);
  }
  function prefersFlat(rootName, scaleKey) {
    var p = parseNote(rootName); if (!p) return false;
    if (p.acc < 0) return true; if (p.acc > 0) return false;
    var rel = relMajorPc(p.pc, scaleKey || 'major');
    return [5, 10, 3, 8, 1].indexOf(rel) >= 0; // F, B♭, E♭, A♭, D♭ major and their modes
  }
  function spell(rootName, ivs, degs) {
    var r = parseNote(rootName);
    if (!degs) { var flat = prefersFlat(rootName); return ivs.map(function (i) { return i === 0 ? r.name : pcName(r.pc + i, flat); }); }
    return ivs.map(function (iv, k) {
      var L = mod(r.L + degs[k] - 1, 7), pc = mod(r.pc + iv, 12), acc = pc - NAT[L];
      if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
      return LETTERS[L] + accStr(acc);
    });
  }
  function scale(rootName, key) {
    var S = SCALES[key], names = spell(rootName, S.iv, S.deg), r = parseNote(rootName);
    return S.iv.map(function (iv, k) {
      return { name: names[k], pc: mod(r.pc + iv, 12), iv: iv, deg: S.deg ? degLabel(iv, S.deg[k]) : String(k + 1), interval: interval(iv) };
    });
  }
  function stepPattern(ivs) {
    var out = [];
    for (var i = 0; i < ivs.length; i++) { var d = (i + 1 < ivs.length ? ivs[i + 1] : 12) - ivs[i]; out.push(d === 1 ? 'H' : d === 2 ? 'W' : d === 3 ? 'W+H' : d + 'H'); }
    return out;
  }
  // The scale as MIDI notes going up from octave `oct`, with spelled names.
  function scaleMidis(rootName, key, oct, octaves) {
    var r = parseNote(rootName), base = 12 * ((oct == null ? 4 : oct) + 1) + r.pc, sc = scale(rootName, key), out = [];
    for (var o = 0; o < (octaves || 1); o++) sc.forEach(function (n) { var m = base + 12 * o + n.iv; out.push({ midi: m, name: nameAt(m, n.name), deg: n.deg }); });
    var top = base + 12 * (octaves || 1); out.push({ midi: top, name: nameAt(top, sc[0].name), deg: '1' });
    return out;
  }

  /* ---------- chords ---------- */
  var CHORDS = {
    maj: { sym: '', name: 'major', iv: [0, 4, 7], deg: [1, 3, 5], mood: 'Happy, stable' },
    min: { sym: 'm', name: 'minor', iv: [0, 3, 7], deg: [1, 3, 5], mood: 'Sad, soft' },
    dim: { sym: 'dim', name: 'diminished', iv: [0, 3, 6], deg: [1, 3, 5], mood: 'Tense, unstable' },
    aug: { sym: 'aug', name: 'augmented', iv: [0, 4, 8], deg: [1, 3, 5], mood: 'Suspense, dreamy' },
    sus2: { sym: 'sus2', name: 'suspended 2nd', iv: [0, 2, 7], deg: [1, 2, 5], mood: 'Open, airy' },
    sus4: { sym: 'sus4', name: 'suspended 4th', iv: [0, 5, 7], deg: [1, 4, 5], mood: 'Waiting to resolve' },
    p5: { sym: '5', name: 'power chord', iv: [0, 7], deg: [1, 5], mood: 'Neutral, heavy with distortion' },
    dom7: { sym: '7', name: 'dominant 7th', iv: [0, 4, 7, 10], deg: [1, 3, 5, 7], mood: 'Bluesy, pulls home' },
    maj7: { sym: 'maj7', name: 'major 7th', iv: [0, 4, 7, 11], deg: [1, 3, 5, 7], mood: 'Smooth, jazzy, warm' },
    min7: { sym: 'm7', name: 'minor 7th', iv: [0, 3, 7, 10], deg: [1, 3, 5, 7], mood: 'Mellow, soulful' },
    m7b5: { sym: 'm7b5', name: 'half-diminished', iv: [0, 3, 6, 10], deg: [1, 3, 5, 7], mood: 'Dark jazz, leads to V' },
    dim7: { sym: 'dim7', name: 'diminished 7th', iv: [0, 3, 6, 9], deg: [1, 3, 5, 7], mood: 'Horror-movie tension' },
    maj6: { sym: '6', name: 'major 6th', iv: [0, 4, 7, 9], deg: [1, 3, 5, 6], mood: 'Sweet, old-time' },
    min6: { sym: 'm6', name: 'minor 6th', iv: [0, 3, 7, 9], deg: [1, 3, 5, 6], mood: 'Mysterious, spy film' },
    add9: { sym: 'add9', name: 'add 9', iv: [0, 4, 7, 14], deg: [1, 3, 5, 9], mood: 'Shimmering pop' },
    dom9: { sym: '9', name: 'dominant 9th', iv: [0, 4, 7, 10, 14], deg: [1, 3, 5, 7, 9], mood: 'Funky' }
  };
  var SYM_TO_Q = {}; Object.keys(CHORDS).forEach(function (k) { SYM_TO_Q[CHORDS[k].sym] = k; });
  Object.assign(SYM_TO_Q, { M: 'maj', min: 'min', '-': 'min', '°': 'dim', o: 'dim', '+': 'aug', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', 'ø': 'm7b5', 'ø7': 'm7b5', '°7': 'dim7', o7: 'dim7', 'm7♭5': 'm7b5', min7: 'min7' });
  function parseChord(sym) {
    var m = /^([A-G](?:#|b|♯|♭)?)(.*)$/.exec(String(sym).trim());
    if (!m) return null;
    var q = SYM_TO_Q[m[2]]; if (!q) return null;
    var root = parseNote(m[1]).name;
    return { root: root, q: q, sym: root + CHORDS[q].sym };
  }
  function chord(rootName, q) {
    var C = CHORDS[q], names = spell(rootName, C.iv, C.deg), r = parseNote(rootName);
    return {
      root: parseNote(rootName).name, q: q, sym: parseNote(rootName).name + C.sym, name: C.name, mood: C.mood,
      notes: names, pcs: C.iv.map(function (i) { return mod(r.pc + i, 12); }), iv: C.iv.slice(),
      degs: C.iv.map(function (iv, k) { return degLabel(iv, C.deg[k]); })
    };
  }
  function qualityOf(ivs) {
    var key = ivs.join(',');
    for (var q in CHORDS) if (CHORDS[q].iv.join(',') === key) return q;
    return null;
  }
  // Chords built from each note of a 7-note scale (stacking every other note).
  function diatonic(rootName, key, sevenths) {
    var sc = scale(rootName, key); if (sc.length !== 7) return [];
    return sc.map(function (n, i) {
      var tones = [0, 2, 4].concat(sevenths ? [6] : []).map(function (k) { return sc[(i + k) % 7]; });
      var ivs = tones.map(function (t) { return mod(t.pc - n.pc, 12); });
      var q = qualityOf(ivs) || 'maj';
      return Object.assign(chord(n.name, q), { degree: i + 1, roman: romanNumeral(i + 1, q) });
    });
  }
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function romanNumeral(deg, q, acc) {
    var lower = /^(min|dim|min7|m7b5|dim7|min6)$/.test(q), r = ROMAN[deg - 1];
    var suf = { dim: '°', aug: '+', dom7: '7', maj7: 'maj7', min7: '7', m7b5: 'ø7', dim7: '°7', maj6: '6', min6: '6', sus2: 'sus2', sus4: 'sus4', add9: 'add9', dom9: '9', p5: '5' }[q] || '';
    return (acc || '') + (lower ? r.toLowerCase() : r) + suf;
  }
  // Roman numeral of any chord in a key (♭VII, V7, iv …).
  function romanOf(chordSym, keyRoot, minor) {
    var c = parseChord(chordSym), k = parseNote(keyRoot); if (!c || !k) return '';
    var off = mod(parseNote(c.root).pc - k.pc, 12), ref = minor ? SCALES.minor.iv : SCALES.major.iv;
    var d = ref.indexOf(off), acc = '';
    if (d < 0) { d = ref.indexOf(off + 1); acc = '♭'; if (d < 0) { d = ref.indexOf(off - 1); acc = '♯'; } }
    // In minor keys the major V (raised 7th) is the usual chord on 5; on 7 it is the leading-tone chord.
    return romanNumeral(d + 1, c.q, acc);
  }

  /* ---------- keys ---------- */
  var SHARP_ORDER = 'FCGDAEB', FLAT_ORDER = 'BEADGCF';
  function keySignature(rootName, minor) {
    var sc = scale(rootName, minor ? 'minor' : 'major'), sh = [], fl = [];
    sc.forEach(function (n) { var p = parseNote(n.name); for (var a = 0; a < Math.abs(p.acc); a++) (p.acc > 0 ? sh : fl).push(LETTERS[p.L]); });
    var acc = sh.length ? sh : fl, type = sh.length ? '#' : fl.length ? 'b' : '';
    var order = type === '#' ? SHARP_ORDER : FLAT_ORDER;
    acc.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    return { type: type, count: acc.length, letters: acc };
  }
  var CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  var CIRCLE_MINOR = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'Bb', 'F', 'C', 'G', 'D'];
  // Respell a note name for a key (used when transposing a song).
  function respell(midi, keyRoot, minor) {
    var sc = scale(keyRoot, minor ? 'minor' : 'major'), pc = mod(midi, 12);
    for (var i = 0; i < sc.length; i++) if (sc[i].pc === pc) return nameAt(midi, sc[i].name);
    // Not in the key: a sharp in sharp keys, a flat in flat keys (but raised 7th/6th in minor).
    var flat = prefersFlat(keyRoot, minor ? 'minor' : 'major');
    if (minor) { var k = parseNote(keyRoot).pc; if (mod(pc - k, 12) === 11 || mod(pc - k, 12) === 9) { var t = sc[mod(pc - k, 12) === 11 ? 6 : 5]; var p = parseNote(t.name); return nameAt(midi, LETTERS[p.L] + accStr(p.acc + 1)); } }
    return midiName(midi, flat);
  }
  function transposeKey(keyRoot, semis, minor) {
    var pc = mod(parseNote(keyRoot).pc + semis, 12);
    var list = minor ? CIRCLE_MINOR : CIRCLE;
    for (var i = 0; i < list.length; i++) if (parseNote(list[i]).pc === pc) return list[i];
    return pcName(pc, true);
  }
  function transposeChord(sym, semis, keyRoot, minor) {
    var c = parseChord(sym); if (!c) return sym;
    var pc = mod(parseNote(c.root).pc + semis, 12), name = respell(60 + pc, keyRoot, minor).replace(/-?\d+$/, '');
    return name + CHORDS[c.q].sym;
  }

  /* ---------- instruments ---------- */
  var INSTRUMENTS = {
    piano: { name: 'Piano', fretted: false, strings: null, low: 21, high: 108 },
    guitar: { name: 'Guitar', fretted: true, tuning: [40, 45, 50, 55, 59, 64], labels: ['E', 'A', 'D', 'G', 'B', 'e'], frets: 15, rootBass: true, minStrings: 4 },
    bass: { name: 'Bass guitar', fretted: true, tuning: [28, 33, 38, 43], labels: ['E', 'A', 'D', 'G'], frets: 15, rootBass: true, minStrings: 2 },
    ukulele: { name: 'Ukulele', fretted: true, tuning: [67, 60, 64, 69], labels: ['G', 'C', 'E', 'A'], frets: 12, rootBass: false, minStrings: 4 },
    mandolin: { name: 'Mandolin', fretted: true, tuning: [55, 62, 69, 76], labels: ['G', 'D', 'A', 'E'], frets: 15, rootBass: false, minStrings: 4 },
    violin: { name: 'Violin', fretted: false, bowed: true, tuning: [55, 62, 69, 76], labels: ['G', 'D', 'A', 'E'], frets: 9 }
  };
  // All chord shapes on a fretted instrument, best first.
  function voicings(instKey, pcs, rootPc, max) {
    var I = INSTRUMENTS[instKey]; if (!I || !I.tuning) return [];
    var T = I.tuning, n = T.length, seen = {}, out = [];
    var need = pcs.length > 3 && n < 6 ? pcs.filter(function (pc, k) { return k !== 2; }) : pcs.slice(); // 4-string: the 5th may go
    if (pcs.length > 4 && n >= 6) need = pcs.filter(function (pc, k) { return k !== 2; });
    for (var base = 0; base <= Math.min(12, I.frets - 3); base++) {
      var opts = T.map(function (open) {
        var o = [-1];
        for (var f = 0; f <= base + 3; f++) if ((f === 0 || f >= Math.max(1, base)) && pcs.indexOf(mod(open + f, 12)) >= 0) o.push(f);
        return o;
      });
      (function rec(s, cur) {
        if (s === n) { judge(cur.slice()); return; }
        for (var i = 0; i < opts[s].length; i++) { cur.push(opts[s][i]); rec(s + 1, cur); cur.pop(); }
      })(0, []);
    }
    function judge(v) {
      var key = v.join(','); if (seen[key]) return;
      var play = [], first = -1;
      for (var s = 0; s < n; s++) if (v[s] >= 0) { if (first < 0) first = s; play.push(s); }
      if (play.length < Math.min(I.minStrings, n)) return;
      for (var s2 = first; s2 < n; s2++) if (v[s2] < 0) return; // no muted string inside the chord
      var low = play.reduce(function (a, s) { return T[s] + v[s] < T[a] + v[a] ? s : a; }, play[0]);
      if (I.rootBass && mod(T[low] + v[low], 12) !== rootPc) return;
      var have = {}; play.forEach(function (s) { have[mod(T[s] + v[s], 12)] = 1; });
      if (!need.every(function (pc) { return have[pc]; })) return;
      var fr = play.map(function (s) { return v[s]; }).filter(function (f) { return f > 0; });
      var lo = fr.length ? Math.min.apply(null, fr) : 0, hi = fr.length ? Math.max.apply(null, fr) : 0;
      if (hi - lo > 3) return;
      var fingers = fr.length, barre = false;
      if (fingers > 4) {
        var atLo = play.filter(function (s) { return v[s] === lo; });
        var from = atLo[0]; // a barre covers every string from its lowest one up, with no open string above
        if (atLo.length < 2 || play.some(function (s) { return s > from && v[s] === 0; })) return;
        fingers = fr.length - atLo.length + 1; barre = true;
        if (fingers > 4) return;
      }
      var opens = play.filter(function (s) { return v[s] === 0; }).length;
      var trapped = hi >= 4 || lo === 1 ? play.filter(function (s) { return v[s] === 0 && play.some(function (a) { return a < s && v[a] > 0; }) && play.some(function (b) { return b > s && v[b] > 0; }); }).length : 0;
      var score = lo * 1.6 + (n - play.length) * 1.4 + fingers * 0.6 + (barre ? 2.2 : 0) + (hi - lo) * 0.5 - opens * 0.25 + (hi > 5 ? 1 : 0) + trapped * 2.6;
      seen[key] = 1;
      out.push({ frets: v, score: score, barre: barre ? lo : 0, base: lo });
    }
    out.sort(function (a, b) { return a.score - b.score; });
    var res = [], shapes = {};
    for (var i = 0; i < out.length && res.length < (max || 4); i++) {
      var sig = out[i].frets.map(function (f) { return f < 0 ? 'x' : f; }).join('');
      if (!shapes[sig]) { shapes[sig] = 1; res.push(out[i]); }
    }
    return res;
  }
  // Octave shift that puts a melody inside the instrument's range with the lowest frets.
  function octaveShift(instKey, midis) {
    var I = INSTRUMENTS[instKey]; if (!midis.length) return 0;
    var lo = Math.min.apply(null, midis), hi = Math.max.apply(null, midis);
    if (!I.tuning) { var sh = 0; while (lo + sh < (I.low || 21)) sh += 12; while (hi + sh > (I.high || 108)) sh -= 12; return sh; }
    var bottom = Math.min.apply(null, I.tuning), top = Math.max.apply(null, I.tuning) + I.frets, best = 0, bestCost = 1e9;
    for (var k = -3; k <= 2; k++) {
      var s = k * 12, cost = 0;
      midis.forEach(function (m) { m += s; if (m < bottom || m > top) cost += 1000; else { var f = 99; I.tuning.forEach(function (o) { if (m >= o && m - o < f) f = m - o; }); cost += f; } });
      if (instKey === 'guitar' || instKey === 'bass') cost += Math.abs(k) * 0.1; // guitar melodies are read at written pitch
      if (cost < bestCost) { bestCost = cost; best = s; }
    }
    return best;
  }
  // Best string and fret for every note of a melody (Viterbi over all positions).
  function tabPath(instKey, midis) {
    var I = INSTRUMENTS[instKey], T = I.tuning, maxF = I.frets;
    var cands = midis.map(function (m) {
      if (m == null) return [null];
      var c = []; T.forEach(function (o, s) { var f = m - o; if (f >= 0 && f <= maxF) c.push({ s: s, f: f }); });
      return c.length ? c : [null];
    });
    var cost = [], back = [];
    var local = function (c) { return c ? c.f * 0.22 + (c.f > 12 ? 2 : 0) : 0; };
    var move = function (a, b) {
      if (!a || !b) return 0;
      var fa = a.f, fb = b.f;
      if (fa === 0 || fb === 0) return Math.abs(a.s - b.s) * 0.15 + 0.2;
      return Math.max(0, Math.abs(fa - fb) - 1) * 0.9 + Math.abs(a.s - b.s) * 0.15 + (a.s === b.s && fa !== fb ? 0.1 : 0);
    };
    cands.forEach(function (cs, i) {
      cost[i] = []; back[i] = [];
      cs.forEach(function (c, j) {
        if (i === 0) { cost[i][j] = local(c); back[i][j] = -1; return; }
        // carry the last real note across rests
        var best = 1e9, arg = 0;
        cands[i - 1].forEach(function (p, k) {
          var pp = p, ii = i - 1, kk = k;
          while (!pp && ii > 0) { kk = back[ii][kk]; ii--; pp = cands[ii][kk]; }
          var v = cost[i - 1][k] + move(pp, c);
          if (v < best) { best = v; arg = k; }
        });
        cost[i][j] = best + local(c); back[i][j] = arg;
      });
    });
    var last = cands.length - 1, out = [];
    if (last < 0) return out;
    var j = cost[last].indexOf(Math.min.apply(null, cost[last]));
    for (var i = last; i >= 0; i--) { out[i] = cands[i][j]; j = back[i][j]; }
    return out;
  }

  /* ---------- text tab ---------- */
  // events: [{midi|null, dur(beats), chord?}] ; returns ASCII tab with chord names and bar lines.
  function tabText(opts) {
    var I = INSTRUMENTS[opts.inst], T = I.tuning, n = T.length, bpb = opts.beatsPerBar || 4, perBeat = opts.charsPerBeat || 4;
    var path = tabPath(opts.inst, opts.events.map(function (e) { return e.midi; }));
    var lines = [], head = [];
    if (opts.title) head.push(opts.title);
    head.push(I.name + ' tab · tuning ' + I.labels.join(' ') + (opts.key ? ' · key ' + opts.key : '') + (opts.tempo ? ' · ' + opts.tempo + ' BPM' : '') + (opts.time ? ' · ' + opts.time : ''));
    if (opts.note) head.push(opts.note);
    var rows, crow, beat = opts.pickup ? bpb - opts.pickup : 0, bars = 0, maxBars = opts.barsPerLine || 4;
    function start() { rows = []; for (var s = 0; s < n; s++) rows.push(I.labels[n - 1 - s].padEnd(1) + '|'); crow = '  '; }
    function flush() { if (rows && rows[0].length > 2) { lines.push(crow.replace(/\s+$/, '')); rows.forEach(function (r) { lines.push(r); }); lines.push(''); } start(); bars = 0; }
    start();
    opts.events.forEach(function (e, i) {
      var p = path[i], w = Math.max(3, Math.round(e.dur * perBeat));
      var label = e.chord ? e.chord : '';
      var txt = p ? String(p.f) : '';
      for (var s = 0; s < n; s++) {
        var str = n - 1 - s; // print the highest string on top
        var cell = (p && p.s === str ? txt : '') ;
        rows[s] += '-' + cell + '-'.repeat(Math.max(1, w - 1 - cell.length));
      }
      crow += (label + ' '.repeat(w)).slice(0, Math.max(w, label.length + 1));
      while (crow.length < rows[0].length) crow += ' ';
      beat += e.dur;
      if (beat >= bpb - 1e-6) {
        beat -= bpb; bars++;
        for (var s2 = 0; s2 < n; s2++) rows[s2] += '|';
        crow += ' ';
        if (bars >= maxBars) flush();
      }
    });
    flush();
    return head.join('\n') + '\n\n' + lines.join('\n').replace(/\n+$/, '') + '\n';
  }
  function chordBoxText(instKey, frets, sym) {
    var I = INSTRUMENTS[instKey];
    return sym + ' ' + frets.map(function (f) { return f < 0 ? 'x' : f; }).join(frets.some(function (f) { return f > 9; }) ? '-' : '');
  }

  /* ---------- pitch detection (autocorrelation) ---------- */
  function detectPitch(buf, sr) {
    var N = buf.length, rms = 0, i;
    for (i = 0; i < N; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / N); if (rms < 0.012) return null;
    var a = 0, b = N - 1, th = 0.2;
    for (i = 0; i < N / 2; i++) if (Math.abs(buf[i]) < th) { a = i; break; }
    for (i = 1; i < N / 2; i++) if (Math.abs(buf[N - i]) < th) { b = N - i; break; }
    var x = buf.slice(a, b), M = x.length, c = new Float32Array(M);
    for (i = 0; i < M; i++) for (var j = 0; j < M - i; j++) c[i] += x[j] * x[j + i];
    var d = 0; while (d < M - 1 && c[d] > c[d + 1]) d++;
    var maxv = -1, maxp = -1;
    for (i = d; i < M; i++) if (c[i] > maxv) { maxv = c[i]; maxp = i; }
    if (maxp <= 0 || maxv < c[0] * 0.3) return null;
    var T0 = maxp, x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || 0, aa = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
    if (aa) T0 = T0 - bb / (2 * aa);
    var f = sr / T0;
    return f > 40 && f < 2200 ? { freq: f, midi: 69 + 12 * Math.log2(f / 440), rms: rms } : null;
  }

  var TE = {
    LETTERS: LETTERS, parseNote: parseNote, pretty: pretty, pcName: pcName, midiName: midiName, nameAt: nameAt, freq: freq,
    interval: interval, IV: IV, SCALES: SCALES, MODE_ORDER: MODE_ORDER, scale: scale, scaleMidis: scaleMidis, stepPattern: stepPattern, spell: spell,
    prefersFlat: prefersFlat, CHORDS: CHORDS, chord: chord, parseChord: parseChord, diatonic: diatonic, romanOf: romanOf, romanNumeral: romanNumeral,
    keySignature: keySignature, CIRCLE: CIRCLE, CIRCLE_MINOR: CIRCLE_MINOR, respell: respell, transposeKey: transposeKey, transposeChord: transposeChord,
    INSTRUMENTS: INSTRUMENTS, voicings: voicings, octaveShift: octaveShift, tabPath: tabPath, tabText: tabText, chordBoxText: chordBoxText,
    detectPitch: detectPitch, mod: mod
  };
  if (typeof module === 'object' && module.exports) module.exports = TE; else root.TheoryEngine = TE;
})(typeof self !== 'undefined' ? self : this);
