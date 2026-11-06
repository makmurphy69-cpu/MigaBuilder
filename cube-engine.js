/* Cube Forge engine: twisty cubes and cuboids of any size (1 to 10 layers on
 * each side), move notation, scrambles, and a beginner-method solver for the
 * 3×3×3 and 2×2×2 that explains every step. Plain JavaScript with no
 * dependencies, so it also runs in Node for tests.
 *
 * Coordinates are doubled so even and odd sizes are both whole numbers: on a
 * puzzle with n layers along an axis, positions run -(n-1), -(n-3) … n-1.
 * The state is one colour per sticker slot; a move is a permutation of slots.
 */
(function (root) {
  'use strict';

  // Faces: axis (0 x, 1 y, 2 z), side (+1/-1), and the quarter-turn sign of a
  // clockwise turn seen from that face (right-hand rule about +axis).
  const FACES = { R: [0, 1, -1], L: [0, -1, 1], U: [1, 1, -1], D: [1, -1, 1], F: [2, 1, -1], B: [2, -1, 1] };
  const FACE_ORDER = ['U', 'L', 'F', 'R', 'B', 'D'];
  // Colours: yellow on top, white at the bottom, green in front (the usual
  // scheme, held upside down so the white cross starts at the bottom).
  const COLORS = [
    { key: 'W', name: 'white', hex: '#f4f4f0' },
    { key: 'Y', name: 'yellow', hex: '#ffd23a' },
    { key: 'G', name: 'green', hex: '#18a558' },
    { key: 'B', name: 'blue', hex: '#1f63d6' },
    { key: 'R', name: 'red', hex: '#d8322f' },
    { key: 'O', name: 'orange', hex: '#ff8a1f' }
  ];
  const HOME = { U: 1, D: 0, F: 2, B: 3, L: 4, R: 5 };
  const OPP = [1, 0, 3, 2, 5, 4];
  const faceOf = n => n[0] ? (n[0] > 0 ? 'R' : 'L') : n[1] ? (n[1] > 0 ? 'U' : 'D') : (n[2] > 0 ? 'F' : 'B');
  const normalOf = f => { const [a, s] = FACES[f], n = [0, 0, 0]; n[a] = s; return n; };

  // Rotate a vector a quarter turn q times about +axis (right-hand rule).
  function rot(v, axis, q) {
    let [x, y, z] = v;
    for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
      if (axis === 0) [y, z] = [-z, y];
      else if (axis === 1) [x, z] = [z, -x];
      else [x, y] = [-y, x];
    }
    return [x, y, z];
  }

  class Puzzle {
    constructor(dims) {
      this.dims = dims.map(d => Math.max(1, Math.min(10, d | 0)));
      this.slots = []; this.index = new Map();
      const [X, Y, Z] = this.dims, range = n => { const r = []; for (let i = -(n - 1); i <= n - 1; i += 2) r.push(i); return r; };
      for (const f of FACE_ORDER) {
        const [a, s] = FACES[f], n = normalOf(f), other = [0, 1, 2].filter(i => i !== a);
        for (const u of range(this.dims[other[0]])) for (const v of range(this.dims[other[1]])) {
          const p = [0, 0, 0]; p[a] = s * (this.dims[a] - 1); p[other[0]] = u; p[other[1]] = v;
          this.index.set(p.join(',') + '|' + n.join(','), this.slots.length);
          this.slots.push({ p, n, face: f });
        }
      }
      this.colors = Uint8Array.from(this.slots, s => HOME[s.face]);
      this.permCache = new Map();
    }
    get isCube() { return this.dims[0] === this.dims[1] && this.dims[1] === this.dims[2]; }
    get n() { return this.dims[0]; }
    clone() { const c = Object.create(Puzzle.prototype); Object.assign(c, this); c.colors = this.colors.slice(); return c; }
    slotAt(p, n) { return this.index.get(p.join(',') + '|' + n.join(',')); }
    colorAt(p, n) { const i = this.slotAt(p, n); return i === undefined ? -1 : this.colors[i]; }
    reset() { this.colors = Uint8Array.from(this.slots, s => HOME[s.face]); }
    // A quarter turn about an axis is only possible when that cross-section is square.
    canQuarter(axis) { const o = [0, 1, 2].filter(i => i !== axis); return this.dims[o[0]] === this.dims[o[1]]; }
    layerCoord(axis, side, k) { return side * (this.dims[axis] - 1) - side * 2 * (k - 1); }

    // Parse one move: R U' F2 Rw 3Rw r 2R M E S x y z (and 2' for a half turn).
    parse(tok) {
      const m = /^(\d*)([RLUDFBrludfbMESxyz])(w?)(\d*)('?)(2?)$/.exec(tok.trim());
      if (!m) throw new Error('Unknown move “' + tok + '”');
      let [, pre, ch, w, amt, prime, amt2] = m;
      const amount = (+(amt || amt2 || 1)) * (prime ? -1 : 1);
      let axis, q, layers = [];
      if ('xyz'.includes(ch)) {
        const f = { x: 'R', y: 'U', z: 'F' }[ch]; axis = FACES[f][0]; q = FACES[f][2];
        for (let k = 1; k <= this.dims[axis]; k++) layers.push(this.layerCoord(axis, 1, k));
      } else if ('MES'.includes(ch)) {
        const f = { M: 'L', E: 'D', S: 'F' }[ch]; axis = FACES[f][0]; q = FACES[f][2];
        const d = this.dims[axis];
        if (d < 3) throw new Error(ch + ' needs at least 3 layers');
        if (d % 2) layers = [0]; else throw new Error(ch + ' needs an odd number of layers');
        if (pre) throw new Error('Unknown move “' + tok + '”');
      } else {
        const f = ch.toUpperCase(), lower = ch !== f;
        const [a, s, cq] = FACES[f]; axis = a; q = cq;
        const d = this.dims[a];
        let wide = w || lower;
        let depth = pre ? +pre : (wide ? 2 : 1);
        if (depth < 1 || depth > d) throw new Error('“' + tok + '”: this puzzle has ' + d + ' layers that way');
        if (wide) for (let k = 1; k <= depth; k++) layers.push(this.layerCoord(a, s, k));
        else layers.push(this.layerCoord(a, s, depth));
      }
      q = ((q * amount) % 4 + 4) % 4;
      if (q === 0) return null;
      if (q % 2 && !this.canQuarter(axis)) throw new Error('“' + tok + '”: this side is not square, so it can only turn halfway (' + tok.replace(/'|2/g, '') + '2)');
      return { axis, layers, q, tok };
    }
    tokens(alg) { return String(alg || '').replace(/[()\[\],]/g, ' ').split(/\s+/).filter(Boolean); }
    perm(mv) {
      const key = mv.axis + ':' + mv.layers.join('.') + ':' + mv.q;
      let p = this.permCache.get(key);
      if (p) return p;
      p = new Uint16Array(this.slots.length);
      const L = new Set(mv.layers);
      this.slots.forEach((s, i) => {
        p[i] = L.has(s.p[mv.axis]) ? this.slotAt(rot(s.p, mv.axis, mv.q), rot(s.n, mv.axis, mv.q)) : i;
      });
      this.permCache.set(key, p);
      return p;
    }
    applyMove(mv) {
      if (!mv) return;
      const p = this.perm(mv), old = this.colors, nw = new Uint8Array(old.length);
      for (let i = 0; i < old.length; i++) nw[p[i]] = old[i];
      this.colors = nw;
    }
    apply(alg) { for (const t of this.tokens(alg)) this.applyMove(this.parse(t)); return this; }
    isSolved() {
      const first = {};
      for (let i = 0; i < this.slots.length; i++) {
        const f = this.slots[i].face;
        if (first[f] === undefined) first[f] = this.colors[i]; else if (first[f] !== this.colors[i]) return false;
      }
      return true;
    }
    // Stickers of one face as rows (top row first) for drawing a flat net.
    faceGrid(f) {
      const [a, s] = FACES[f], n = normalOf(f);
      // right and down directions on the face as seen from outside
      const dirs = { U: [[1, 0, 0], [0, 0, 1]], D: [[1, 0, 0], [0, 0, -1]], F: [[1, 0, 0], [0, -1, 0]], B: [[-1, 0, 0], [0, -1, 0]], R: [[0, 0, -1], [0, -1, 0]], L: [[0, 0, 1], [0, -1, 0]] }[f];
      const ax = v => v.findIndex(c => c !== 0);
      const ra = ax(dirs[0]), da = ax(dirs[1]);
      const rs = dirs[0][ra], ds = dirs[1][da], W = this.dims[ra], H = this.dims[da], rows = [];
      for (let r = 0; r < H; r++) {
        const row = [];
        for (let c = 0; c < W; c++) {
          const p = [0, 0, 0]; p[a] = s * (this.dims[a] - 1);
          p[ra] = rs * (-(W - 1) + 2 * c); p[da] = ds * (-(H - 1) + 2 * r);
          row.push(this.slotAt(p, n));
        }
        rows.push(row);
      }
      return rows;
    }
  }

  // ---------- notation helpers ----------
  function invert(alg) {
    return String(alg).trim().split(/\s+/).filter(Boolean).reverse().map(t => {
      if (/2'?$/.test(t)) return t.replace(/'$/, '');
      return t.endsWith("'") ? t.slice(0, -1) : t + "'";
    }).join(' ');
  }
  // Merge neighbouring turns of the same layer: U U → U2, U U' → nothing.
  function simplify(moves) {
    const out = [];
    const split = t => { const m = /^(.*?)(2|'|2')?$/.exec(t); const base = m[1], suf = m[2] || ''; return [base, suf === '2' || suf === "2'" ? 2 : suf === "'" ? 3 : 1]; };
    const join = (b, q) => q === 1 ? b : q === 2 ? b + '2' : b + "'";
    for (const t of moves) {
      const [b, q] = split(t);
      if (out.length) {
        const [pb, pq] = split(out[out.length - 1]);
        if (pb === b) { out.pop(); const nq = (pq + q) % 4; if (nq) out.push(join(b, nq)); continue; }
      }
      out.push(t);
    }
    return out;
  }

  // Plain-language description of a move (for learners).
  function describe(tok) {
    const m = /^(\d*)([RLUDFBrludfbMESxyz])(w?)(2?)('?)(2?)$/.exec(tok || '');
    if (!m) return '';
    const ch = m[2], half = m[4] || m[6], prime = m[5];
    const wide = m[3] || (ch !== ch.toUpperCase() && !'xyz'.includes(ch));
    const pre = m[1];
    const F = ch.toUpperCase();
    const what = {
      R: ['right side', 'up', 'down'], L: ['left side', 'down', 'up'], U: ['top', 'to the left', 'to the right'], D: ['bottom', 'to the right', 'to the left'],
      F: ['front', 'clockwise', 'anticlockwise'], B: ['back', 'anticlockwise (as you look at the front)', 'clockwise (as you look at the front)'],
      M: ['middle slice (between left and right)', 'down', 'up'], E: ['middle slice (between top and bottom)', 'to the right', 'to the left'], S: ['middle slice (between front and back)', 'clockwise', 'anticlockwise'],
      X: ['whole cube', 'forwards so the front goes to the top', 'backwards so the front goes to the bottom'], Y: ['whole cube', 'so the right side comes to the front', 'so the left side comes to the front'], Z: ['whole cube', 'clockwise, like turning a steering wheel right', 'anticlockwise, like turning a steering wheel left']
    }[F];
    if (!what) return '';
    let layer = what[0];
    if ('xyz'.includes(ch)) layer = 'whole cube';
    else if (pre && !wide) layer = 'layer ' + pre + ' from the ' + what[0].replace(' side', '');
    else if (wide) layer = (pre || 2) + ' layers on the ' + what[0].replace(' side', '');
    const dir = half ? 'twice (half a turn)' : prime ? what[2] : what[1];
    return 'Turn the ' + layer + ' ' + dir;
  }

  // ---------- scrambles ----------
  function scramble(pz, rnd) {
    rnd = rnd || Math.random;
    const [X, Y, Z] = pz.dims, big = Math.max(X, Y, Z);
    if (big === 1) return '';
    const count = pz.isCube ? (big === 2 ? 11 : big === 3 ? 25 : 20 * (big - 2) + 20) : 12 + 6 * big;
    const opts = [];
    for (const f of 'RLUDFB') {
      const a = FACES[f][0], d = pz.dims[a];
      if (d < 2) continue;
      if (big === 2 && pz.isCube && 'LDB'.includes(f)) continue;
      const maxDepth = Math.max(1, Math.floor(d / 2));
      for (let k = 1; k <= maxDepth; k++) opts.push({ f, a, k, tok: k === 1 ? f : (k === 2 ? f + 'w' : k + f + 'w') });
    }
    if (!opts.length) return '';
    const out = []; let lastAxis = -1, usedOnAxis = new Set();
    for (let i = 0; i < count && opts.length; i++) {
      let o, tries = 0;
      do { o = opts[Math.floor(rnd() * opts.length)]; tries++; } while (tries < 50 && o.a === lastAxis && usedOnAxis.has(o.f + o.k));
      if (o.a !== lastAxis) usedOnAxis = new Set();
      usedOnAxis.add(o.f + o.k); lastAxis = o.a;
      const r = rnd(), quarter = pz.canQuarter(o.a);
      out.push(o.tok + (!quarter || r < 0.33 ? '2' : r < 0.66 ? "'" : ''));
    }
    return out.join(' ');
  }

  // ---------- counting ----------
  function fact(n) { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; }
  function positions(n) {
    if (n < 2) return 1n;
    const f24 = fact(24), c = 1n * 24n * 24n * 24n * 24n * 24n * 24n; // (4!)^6
    if (n % 2 === 0) {
      const k = (n * n - 2 * n) / 4, centres = (n - 2) * (n - 2) / 4;
      return fact(7) * 729n * f24 ** BigInt(k) / c ** BigInt(centres);
    }
    const k = (n * n - 2 * n - 3) / 4, centres = (n - 1) * (n - 3) / 4;
    return fact(8) * 2187n * fact(12) * 1024n * f24 ** BigInt(k) / c ** BigInt(centres);
  }
  function pieceCount(dims) {
    const [X, Y, Z] = dims; let corners = 0, edges = 0, centres = 0, total = 0;
    const inner = (Math.max(0, X - 2)) * (Math.max(0, Y - 2)) * (Math.max(0, Z - 2));
    total = X * Y * Z - inner;
    for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) {
      const out = (x === 0 || x === X - 1 ? 1 : 0) + (y === 0 || y === Y - 1 ? 1 : 0) + (z === 0 || z === Z - 1 ? 1 : 0);
      if (!out) continue;
      const sides = (X === 1 ? 0 : (x === 0 || x === X - 1 ? 1 : 0)) + (Y === 1 ? 0 : (y === 0 || y === Y - 1 ? 1 : 0)) + (Z === 1 ? 0 : (z === 0 || z === Z - 1 ? 1 : 0));
      if (sides >= 3) corners++; else if (sides === 2) edges++; else centres++;
    }
    return { corners, edges, centres, total };
  }

  // ---------- beginner-method solver for 3×3×3 (and 2×2×2) ----------
  const ALG = {
    sexy: "R U R' U'",
    right: "U R U' R' U' F' U F",
    left: "U' L' U L U F U' F'",
    cross: "F R U R' U' F'",
    sune: "R U R' U R U2 R'",
    niklas: "U R U' L' U R' U' L",
    twist: "R' D' R D"
  };
  const yTok = k => ['', 'y', 'y2', "y'"][((k % 4) + 4) % 4];
  const uTok = k => ['', 'U', 'U2', "U'"][((k % 4) + 4) % 4];

  function SolveError(msg) { const e = new Error(msg); e.solveError = true; return e; }

  function solve3(input, opts) {
    opts = opts || {};
    const cornersOnly = !!opts.cornersOnly;
    const c = input.clone();
    const stages = [];
    let stage = null;
    const begin = (id, title, text) => { stage = { id, title, text, parts: [] }; stages.push(stage); };
    const run = (alg, note) => {
      const t = c.tokens(alg);
      if (!t.length) return;
      c.apply(alg);
      const last = stage.parts[stage.parts.length - 1];
      if (last && last.note === note) last.moves.push(...t); else stage.parts.push({ note, moves: t });
    };
    const col = (p, n) => c.colorAt(p, n);
    const centre = f => col(normalOf(f).map(v => v * 2), normalOf(f));
    const stickers = p => { const out = []; for (let a = 0; a < 3; a++) if (p[a]) { const n = [0, 0, 0]; n[a] = Math.sign(p[a]); out.push({ n, c: col(p, n) }); } return out; };
    const name = cs => cs.map(i => COLORS[i].name).join('–');
    const EDGE = [], CORNER = [];
    for (const x of [-2, 0, 2]) for (const y of [-2, 0, 2]) for (const z of [-2, 0, 2]) { const nz = [x, y, z].filter(v => v).length; if (nz === 2) EDGE.push([x, y, z]); if (nz === 3) CORNER.push([x, y, z]); }
    const find = (list, set) => list.find(p => { const s = stickers(p).map(t => t.c).sort().join(); return s === set.slice().sort().join(); });
    const pieceOK = p => stickers(p).every(t => t.c === centre(faceOf(t.n)));
    const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    const yTo = (from, to) => { for (let k = 0; k < 4; k++) if (eq(rot(from, 1, -k), to)) return k; return 0; }; // y turns like U (clockwise from above)
    const WHITE = 0, YELLOW = 1;

    // 0. Hold the cube with the white centre at the bottom.
    begin('hold', 'Hold the cube', cornersOnly ? 'Hold the cube so a white sticker is at the bottom. The pieces around it decide which colour goes on each side.' : 'Hold the cube with the white centre at the bottom and the yellow centre on top. The centres never move, so they tell you which colour each side will be.');
    for (const r of ['', 'x2', 'x', "x'", 'z', "z'"]) {
      const t = c.clone(); t.apply(r);
      const ok = cornersOnly ? CORNER.some(p => p[1] < 0 && t.colorAt(p, [0, -1, 0]) === WHITE) : t.colorAt([0, -2, 0], [0, -1, 0]) === WHITE;
      if (ok) { run(r, 'Turn the whole cube so white is at the bottom'); break; }
    }
    if (!cornersOnly && centre('D') !== WHITE) throw SolveError('The white centre is missing.');

    if (!cornersOnly) {
      // 1. White cross: one edge at a time, keeping the ones already done.
      begin('cross', 'White cross', 'Make a white cross on the bottom. Each white edge must also match the centre on its side. Put in one edge at a time.');
      const sides = ['F', 'R', 'B', 'L'];
      const faceMoves = [];
      for (const f of 'RLUDFB') for (const s of ['', "'", '2']) faceMoves.push({ tok: f + s, f, perm: c.perm(c.parse(f + s)) });
      const done = [];
      for (const f of sides) {
        const side = centre(f), n = normalOf(f), home = n.map(v => v * 2); home[1] = -2;
        const targets = [[home, [0, -1, 0], WHITE], [home, n, side]];
        if (!find(EDGE, [WHITE, side])) throw SolveError('There is no ' + name([WHITE, side]) + ' edge. Check the colours you entered.');
        // Follow the stickers that must end up in place: this edge and the ones already done.
        const want = targets.concat(done), goal = [], cur = [];
        for (const [hp, hn, cc] of want) {
          goal.push(c.slotAt(hp, hn));
          const pp = find(EDGE, [WHITE, centre(faceOf([Math.sign(hp[0]), 0, Math.sign(hp[2])]))]);
          cur.push(c.slotAt(pp, stickers(pp).find(t => t.c === cc).n));
        }
        const solved = s => s.every((v, i) => v === goal[i]);
        let found = null;
        const dfs = (s, depth, last, path) => {
          if (solved(s)) { found = path.slice(); return true; }
          if (depth === 0) return false;
          for (const m of faceMoves) {
            if (m.f === last) continue;
            if (last && FACES[m.f][0] === FACES[last][0] && 'RUF'.includes(m.f)) continue;
            path.push(m.tok);
            if (dfs(s.map(v => m.perm[v]), depth - 1, m.f, path)) return true;
            path.pop();
          }
          return false;
        };
        for (let d = 0; d <= 8 && !found; d++) dfs(cur, d, null, []);
        if (!found) throw SolveError('Could not place the ' + name([WHITE, side]) + ' edge.');
        run(found.join(' '), 'Put the ' + name([WHITE, side]) + ' edge in place');
        done.push(...targets);
      }
    }

    // 2. White corners.
    begin('corners', cornersOnly ? 'White layer' : 'White corners', 'Finish the white layer. Turn the whole cube so the corner’s spot is at the front right, bring the corner above it, then repeat R U R\' U\' until it is in place with white at the bottom.');
    const dCorners = () => CORNER.filter(p => p[1] < 0);
    const sideCols = p => [centre(p[0] > 0 ? 'R' : 'L'), centre(p[2] > 0 ? 'F' : 'B')];
    const whiteCorners = () => dCorners().map(p => [WHITE].concat(sideCols(p)));
    if (cornersOnly) {
      // Virtual centres come from one white corner already at the bottom; make it
      // the reference by giving the centres its colours.
      const ref = dCorners().find(p => col(p, [0, -1, 0]) === WHITE);
      const cx = col(ref, [Math.sign(ref[0]), 0, 0]), cz = col(ref, [0, 0, Math.sign(ref[2])]);
      setCentres(c, { D: WHITE, U: YELLOW, [ref[0] > 0 ? 'R' : 'L']: cx, [ref[0] > 0 ? 'L' : 'R']: OPP[cx], [ref[2] > 0 ? 'F' : 'B']: cz, [ref[2] > 0 ? 'B' : 'F']: OPP[cz] });
    }
    const DFR = [2, -2, 2], UFR = [2, 2, 2];
    for (let guard = 0; guard < 24; guard++) {
      const sets = whiteCorners();
      const todo = sets.map(s => find(CORNER, s) || null);
      if (todo.some(p => !p)) throw SolveError('A white corner is missing. Check the colours you entered.');
      const wrong = sets.map((s, i) => [s, todo[i]]).filter(([s, p]) => !(p[1] < 0 && pieceOK(p)));
      if (!wrong.length) break;
      let [set, p] = wrong.find(([s, p]) => p[1] > 0) || wrong[0];
      const nm = name(set);
      if (p[1] < 0) {
        run(yTok(yTo(p, DFR)), 'Take the ' + nm + ' corner out of the wrong spot');
        run(ALG.sexy, 'Take the ' + nm + ' corner out of the wrong spot');
        p = find(CORNER, set);
      }
      // Where it belongs: the bottom corner between the two centres of its colours.
      const target = dCorners().find(q => sideCols(q).concat([WHITE]).sort().join() === set.slice().sort().join());
      run(yTok(yTo(target, DFR)), 'Insert the ' + nm + ' corner');
      p = find(CORNER, set);
      // U turns move the top layer: find U^m that carries p to UFR.
      for (let m = 0; m < 4; m++) if (eq(rot(p, 1, -m), UFR)) { run(uTok(m), 'Insert the ' + nm + ' corner'); break; }
      let reps = 0;
      while (!pieceOK(DFR) && reps < 6) { run(ALG.sexy, 'Insert the ' + nm + ' corner'); reps++; }
      if (!pieceOK(DFR)) throw SolveError('The ' + nm + ' corner is twisted. Check the colours you entered.');
    }

    if (!cornersOnly) {
      // 3. Middle layer edges.
      begin('middle', 'Middle layer', 'Find an edge on top without yellow. Turn the top until its front colour matches a centre, turn the cube so that centre is at the front, then send the edge right or left with the matching algorithm.');
      const MID = EDGE.filter(p => p[1] === 0), TOP = EDGE.filter(p => p[1] > 0);
      for (let guard = 0; guard < 16; guard++) {
        if (MID.every(pieceOK)) break;
        const cand = TOP.find(p => stickers(p).every(t => t.c !== YELLOW));
        if (cand) {
          const side = stickers(cand).find(t => t.n[1] === 0), top = stickers(cand).find(t => t.n[1] !== 0);
          const nm = name([side.c, top.c]);
          // U turns so the side sticker sits on the face with that centre colour.
          let m = 0;
          for (; m < 4; m++) { const n2 = rot(side.n, 1, -m); if (centre(faceOf(n2)) === side.c) break; }
          const n2 = rot(side.n, 1, -m);
          run(uTok(m), 'Put the ' + nm + ' edge in the middle layer');
          run(yTok(yTo(n2, [0, 0, 1])), 'Put the ' + nm + ' edge in the middle layer');
          if (top.c === centre('R')) run(ALG.right, 'Put the ' + nm + ' edge in the middle layer (to the right)');
          else if (top.c === centre('L')) run(ALG.left, 'Put the ' + nm + ' edge in the middle layer (to the left)');
          else throw SolveError('The ' + nm + ' edge does not fit. Check the colours you entered.');
        } else {
          const bad = MID.find(p => !pieceOK(p));
          const nm = name(stickers(bad).map(t => t.c));
          run(yTok(yTo(bad, [2, 0, 2])), 'Take the ' + nm + ' edge out of the wrong spot');
          run(ALG.right, 'Take the ' + nm + ' edge out of the wrong spot');
        }
      }
      if (!MID.every(pieceOK)) throw SolveError('The middle layer could not be finished. Check the colours you entered.');

      // 4. Yellow cross.
      begin('ycross', 'Yellow cross', 'Make a yellow cross on top (the corners do not matter yet). Hold a yellow line left to right, or a yellow L at the back and left, and do F R U R\' U\' F\'. Do it again until the cross is done.');
      const UE = { F: [0, 2, 2], R: [2, 2, 0], B: [0, 2, -2], L: [-2, 2, 0] };
      const up = p => col(p, [0, 1, 0]) === YELLOW;
      for (let guard = 0; guard < 6; guard++) {
        const ys = Object.keys(UE).filter(k => up(UE[k]));
        if (ys.length === 4) break;
        if (ys.length % 2) throw SolveError('One edge is flipped, so the yellow cross cannot be made. Take that edge out and turn it round, or check the colours you entered.');
        if (ys.length === 0) { run(ALG.cross, 'Yellow dot: do the algorithm'); continue; }
        // rotate U so the pattern is a horizontal line (L+R) or an L at back+left
        let done = false;
        for (let m = 0; m < 4 && !done; m++) {
          const t = c.clone(); t.apply(uTok(m));
          const u = k => t.colorAt(UE[k], [0, 1, 0]) === YELLOW;
          if ((u('L') && u('R')) || (u('B') && u('L'))) { run(uTok(m), (u('L') && u('R')) ? 'Yellow line: hold it left to right' : 'Yellow L: hold it at the back and left'); run(ALG.cross, (u('L') && u('R')) ? 'Yellow line: hold it left to right' : 'Yellow L: hold it at the back and left'); done = true; }
        }
      }
      // 5. Yellow edges match the centres.
      begin('yedges', 'Yellow edges', 'Turn the top until two edges match their centres. Hold those two at the back and right and do R U R\' U R U2 R\'. Then turn the top to line everything up.');
      const edgesOK = s => ['F', 'R', 'B', 'L'].every(f => { const n = normalOf(f), p = [n[0] * 2, 2, n[2] * 2]; return s.colorAt(p, n) === s.colorAt([n[0] * 2, 0, n[2] * 2], n) && s.colorAt(p, [0, 1, 0]) === YELLOW; });
      searchLL(c, run, edgesOK, ['U', "U'", 'U2', 'y', "y'", 'y2', ALG.sune], 'Swap the yellow edges', 'Two pieces are swapped, so the yellow edges cannot be lined up. Check the colours you entered, or take two edges out and swap them.', st => f2lOK(st, false));
    }

    // 6. Yellow corners in the right places.
    begin('cpos', 'Place yellow corners', 'Find a corner that is already in its spot (its colours match the three sides, even if it is twisted). Hold it at the front right and do U R U\' L\' U R\' U\' L until all corners are in their spots.');
    const cornersPlaced = s => {
      const cent = f => s.colorAt(normalOf(f).map(v => v * 2), normalOf(f));
      return [[2, 2, 2], [2, 2, -2], [-2, 2, 2], [-2, 2, -2]].every(p => {
        const have = []; for (let a = 0; a < 3; a++) { const n = [0, 0, 0]; n[a] = Math.sign(p[a]); have.push(s.colorAt(p, n)); }
        const want = [YELLOW, cent(p[0] > 0 ? 'R' : 'L'), cent(p[2] > 0 ? 'F' : 'B')];
        return have.slice().sort().join() === want.sort().join();
      }) && (cornersOnly || ['F', 'R', 'B', 'L'].every(f => { const n = normalOf(f), p = [n[0] * 2, 2, n[2] * 2]; return s.colorAt(p, n) === s.colorAt([n[0] * 2, 0, n[2] * 2], n); }));
    };
    if (cornersOnly) {
      // On a 2×2 the top layer can be turned freely; first turn it so at least one corner is placed.
      searchLL(c, run, s => cornersPlaced(s), ['U', "U'", 'U2', 'y', "y'", 'y2', ALG.niklas], 'Place the yellow corners', 'Two pieces are swapped, so the puzzle cannot be solved. Check the colours you entered, or take two pieces out and swap them.', st => f2lOK(st, true));
    } else {
      searchLL(c, run, cornersPlaced, ['y', "y'", 'y2', ALG.niklas], 'Place the yellow corners', 'Two pieces are swapped, so the puzzle cannot be solved. Check the colours you entered, or take two pieces out and swap them.', st => f2lOK(st, false));
    }

    // 7. Twist the yellow corners.
    begin('corient', 'Twist yellow corners', 'Hold the cube with a wrong corner at the front right. Do R\' D\' R D two or four times until its yellow is on top, then turn only the top (U) to bring the next wrong corner to the front right. The bottom looks scrambled in between — it fixes itself at the end. Never turn the whole cube during this step.');
    const yUp = p => col(p, [0, 1, 0]) === YELLOW;
    const UC = [[2, 2, 2], [-2, 2, 2], [-2, 2, -2], [2, 2, -2]];
    // Start with a wrong corner at the front right (turning the whole cube is fine before starting).
    if (!UC.every(yUp)) {
      const w = UC.find(p => !yUp(p));
      run(yTok(yTo(w, UFR)), 'Hold a wrong corner at the front right');
    }
    let twists = 0;
    for (let i = 0; i < 4; i++) {
      let pairs = 0;
      while (!yUp(UFR) && pairs < 3) { run(ALG.twist + ' ' + ALG.twist, 'Twist the corner until yellow is on top'); pairs++; }
      twists += pairs;
      if (UC.every(yUp)) break;
      // bring the next wrong corner to UFR with U turns
      let m = 1;
      for (; m < 4; m++) { const t = c.clone(); t.apply(uTok(m)); if (t.colorAt(UFR, [0, 1, 0]) !== YELLOW) break; }
      run(uTok(m), 'Turn the top to bring the next corner to the front right');
    }
    if (!UC.every(yUp) || !f2lOK(c, cornersOnly)) throw SolveError('A corner is twisted, so the puzzle cannot be solved. Take it out and put it back the right way, or check the colours you entered.');
    begin('finish', 'Finish', 'Turn the top layer until it matches. Solved!');
    for (let m = 0; m < 4; m++) { const t = c.clone(); t.apply(uTok(m)); if (cornersOnly ? cornersDone(t) : t.isSolved()) { run(uTok(m), 'Line up the top layer'); break; } }
    if (!(cornersOnly ? cornersDone(c) : c.isSolved())) throw SolveError('The cube could not be solved. Some stickers may be wrong, or a piece is twisted or flipped.');

    // tidy: merge neighbouring turns inside each part
    for (const s of stages) for (const p of s.parts) p.moves = simplify(p.moves);
    for (const s of stages) s.parts = s.parts.filter(p => p.moves.length);
    return { stages: stages.filter(s => s.parts.length || ['cross', 'corners', 'finish'].includes(s.id)), final: c };
  }
  // Every face has one colour on its corners (a solved 2×2 inside a 3×3).
  function cornersDone(s) {
    const seen = {};
    for (let i = 0; i < s.slots.length; i++) {
      const sl = s.slots[i];
      if (sl.p.filter(v => v).length !== 3) continue;
      if (seen[sl.face] === undefined) seen[sl.face] = s.colors[i]; else if (seen[sl.face] !== s.colors[i]) return false;
    }
    return true;
  }
  function setCentres(c, map) {
    for (const f of Object.keys(map)) { const n = normalOf(f); c.colors[c.slotAt(n.map(v => v * 2), n)] = map[f]; }
    // Edges on an embedded 2×2 do not exist; give them matching colours so nothing else depends on them.
    for (let i = 0; i < c.slots.length; i++) { const s = c.slots[i]; if (s.p.filter(v => v).length === 2) c.colors[i] = map[s.face]; }
  }
  // First two layers solved (corners only on a 2×2), with yellow anywhere on top.
  function f2lOK(s, cornersOnly) {
    const cent = f => s.colorAt(normalOf(f).map(v => v * 2), normalOf(f));
    for (let i = 0; i < s.slots.length; i++) {
      const sl = s.slots[i];
      if (sl.p[1] > 0) continue;
      if (cornersOnly && sl.p.filter(v => v).length !== 3) continue;
      if (s.colors[i] !== cent(sl.face)) return false;
    }
    return true;
  }
  // Short search over a few moves and algorithms (last-layer steps).
  function searchLL(c, run, goal, set, note, fail, keep) {
    if (goal(c)) return;
    const moves = set.map(a => ({ a, toks: c.tokens(a) }));
    const kind = a => /^U/.test(a) ? 'U' : /^y/.test(a) ? 'y' : a;
    let found = null;
    const dfs = (s, depth, last, path) => {
      if (goal(s) && keep(s)) { found = path.slice(); return true; }
      if (!depth) return false;
      for (const m of moves) {
        const k = kind(m.a);
        if ((k === 'U' || k === 'y') && k === last) continue;
        const t = s.clone(); t.apply(m.a);
        path.push(m.a);
        if (dfs(t, depth - 1, k, path)) return true;
        path.pop();
      }
      return false;
    };
    for (let d = 1; d <= 7 && !found; d++) dfs(c, d, null, []);
    if (!found) throw SolveError(fail);
    for (const a of found) run(a, note);
  }

  // Solve a 2×2×2 by placing it inside a 3×3×3 and solving only the corners.
  function solve2(pz) {
    const big = new Puzzle([3, 3, 3]);
    pz.slots.forEach((s, i) => { big.colors[big.slotAt(s.p.map(v => v * 2), s.n)] = pz.colors[i]; });
    // Put white at the bottom first, on the real puzzle, so the reference corner exists.
    return solve3(big, { cornersOnly: true });
  }

  function solve(pz) {
    const d = pz.dims.join('x');
    if (d === '3x3x3' || d === '2x2x2') { const bad = checkColours(pz); if (bad) throw SolveError(bad); }
    if (d === '3x3x3') return solve3(pz);
    if (d === '2x2x2') return solve2(pz);
    throw SolveError('The step-by-step solver works on the 3×3×3 and the 2×2×2.');
  }

  // Check that an entered 3×3 or 2×2 has the right number of each colour.
  function checkColours(pz) {
    const per = pz.dims[0] * pz.dims[1], cnt = [0, 0, 0, 0, 0, 0];
    for (const v of pz.colors) cnt[v]++;
    const bad = cnt.map((n, i) => n !== per ? COLORS[i].name + ' ' + n + ' (needs ' + per + ')' : null).filter(Boolean);
    return bad.length ? 'Each colour must appear ' + per + ' times. Now: ' + bad.join(', ') + '.' : '';
  }

  const api = { Puzzle, FACES, COLORS, HOME, OPP, ALG, rot, invert, simplify, describe, scramble, positions, pieceCount, solve, checkColours, faceOf, normalOf };
  root.CubeEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
