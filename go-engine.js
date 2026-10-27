/* Go Forge engine: Go rules, fast random playouts and a Monte Carlo tree search
 * (UCT with RAVE). The same file runs in the page (rules, lessons, explanations)
 * and in a Web Worker (searching for moves, advice and move reviews).
 *
 * Points are indexes into a padded board: p = (y + 1) * (n + 2) + (x + 1), with
 * y counted from the top. PASS is 0 (always an edge point, never a real point).
 */
(function (root) {
  'use strict';
  const EMPTY = 0, BLACK = 1, WHITE = 2, EDGE = 3, PASS = 0;
  const LETTERS = 'ABCDEFGHJKLMNOPQRST';

  function Board(n) {
    this.n = n;
    const W = this.W = n + 2, L = this.L = W * W;
    this.c = new Uint8Array(L);      // colour of each point
    this.g = new Int16Array(L);      // group id (a stone of the group) for each stone
    this.nx = new Int16Array(L);     // next stone in the same group (circular list)
    this.sz = new Int16Array(L);     // group size, by group id
    this.pl = new Int16Array(L);     // pseudo-liberties (stone/empty adjacencies), by group id
    this.ls = new Float64Array(L);   // sum of pseudo-liberty points
    this.ls2 = new Float64Array(L);  // sum of their squares: in atari when pl*ls2 == ls*ls
    this.E = new Int16Array(L);      // list of empty points
    this.eI = new Int16Array(L);     // position of each empty point in E
    this.eN = 0;
    for (let i = 0; i < L; i++) {
      const x = i % W, y = (i / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === W - 1) this.c[i] = EDGE;
      else { this.eI[i] = this.eN; this.E[this.eN++] = i; }
    }
    this.dirs = [1, -1, W, -W];
    this.diag = [W + 1, W - 1, -W + 1, -W - 1];
    this.ko = -1; this.turn = BLACK; this.caps = [0, 0, 0]; this.passes = 0;
    this.last = -1; this.last2 = -1; this.moveNo = 0;
  }
  const P = Board.prototype;

  P.clone = function () {
    const b = Object.create(Board.prototype);
    b.n = this.n; b.W = this.W; b.L = this.L; b.dirs = this.dirs; b.diag = this.diag;
    b.c = this.c.slice(); b.g = this.g.slice(); b.nx = this.nx.slice(); b.sz = this.sz.slice();
    b.pl = this.pl.slice(); b.ls = this.ls.slice(); b.ls2 = this.ls2.slice();
    b.E = this.E.slice(); b.eI = this.eI.slice(); b.eN = this.eN;
    b.ko = this.ko; b.turn = this.turn; b.caps = this.caps.slice(); b.passes = this.passes;
    b.last = this.last; b.last2 = this.last2; b.moveNo = this.moveNo;
    return b;
  };

  P.pt = function (x, y) { return (y + 1) * this.W + (x + 1); };
  P.xy = function (p) { return [p % this.W - 1, ((p / this.W) | 0) - 1]; };
  /* "D4"-style name: letters skip I, numbers count from the bottom. */
  P.name = function (p) {
    if (p === PASS) return 'pass';
    const [x, y] = this.xy(p);
    return LETTERS[x] + (this.n - y);
  };
  P.parse = function (s) {
    s = String(s).trim().toUpperCase();
    if (s === 'PASS') return PASS;
    const x = LETTERS.indexOf(s[0]), y = this.n - parseInt(s.slice(1), 10);
    if (x < 0 || x >= this.n || !(y >= 0 && y < this.n)) throw new Error('Bad point ' + s);
    return this.pt(x, y);
  };
  /* Distance to the edge, as Go players count it: 1 = first line. */
  P.line = function (p) { const [x, y] = this.xy(p); return Math.min(x, y, this.n - 1 - x, this.n - 1 - y) + 1; };

  P.inAtari = function (g) { const pl = this.pl[g]; return pl > 0 && pl * this.ls2[g] === this.ls[g] * this.ls[g]; };
  P.atariAt = function (g, p) { return this.inAtari(g) && this.ls[g] === p * this.pl[g]; };
  P.libPoint = function (g) { return this.ls[g] / this.pl[g]; };
  P.emptyNb = function (p) { let k = 0; for (let i = 0; i < 4; i++) if (this.c[p + this.dirs[i]] === EMPTY) k++; return k; };

  P.isLegal = function (p, col) {
    if (p === PASS) return true;
    if (this.c[p] !== EMPTY || p === this.ko) return false;
    const opp = 3 - col;
    for (let k = 0; k < 4; k++) {
      const q = p + this.dirs[k], cq = this.c[q];
      if (cq === EMPTY) return true;
      if (cq === col) { if (!this.atariAt(this.g[q], p)) return true; }
      else if (cq === opp) { if (this.atariAt(this.g[q], p)) return true; }
    }
    return false;
  };

  /* Why a move is not allowed, in plain words (or '' when it is). */
  P.whyIllegal = function (p, col) {
    if (p === PASS) return '';
    if (this.c[p] !== EMPTY) return 'There is already a stone on that point.';
    if (p === this.ko) return 'Ko: you cannot take back a single stone straight away. Play somewhere else first (a “ko threat”), then you may retake.';
    if (!this.isLegal(p, col)) return 'Suicide: a stone there would have no liberties and captures nothing, so it is not allowed.';
    return '';
  };

  /* An eye of colour col: every neighbour is col (or the edge) and the diagonals are mostly col too. */
  P.isEye = function (p, col) {
    const c = this.c;
    for (let k = 0; k < 4; k++) { const v = c[p + this.dirs[k]]; if (v !== col && v !== EDGE) return false; }
    let bad = 0, edge = 0;
    for (let k = 0; k < 4; k++) { const v = c[p + this.diag[k]]; if (v === EDGE) edge = 1; else if (v === 3 - col) bad++; }
    return bad + edge < 2;
  };

  P._addLib = function (g, p) { this.pl[g]++; this.ls[g] += p; this.ls2[g] += p * p; };
  P._subLib = function (g, p) { this.pl[g]--; this.ls[g] -= p; this.ls2[g] -= p * p; };
  P._eRemove = function (p) { const i = this.eI[p], last = this.E[--this.eN]; this.E[i] = last; this.eI[last] = i; };
  P._eAdd = function (p) { this.eI[p] = this.eN; this.E[this.eN++] = p; };

  P._merge = function (a, b) {
    if (this.sz[a] < this.sz[b]) { const t = a; a = b; b = t; }
    let s = b;
    do { this.g[s] = a; s = this.nx[s]; } while (s !== b);
    const t = this.nx[a]; this.nx[a] = this.nx[b]; this.nx[b] = t;
    this.sz[a] += this.sz[b]; this.pl[a] += this.pl[b]; this.ls[a] += this.ls[b]; this.ls2[a] += this.ls2[b];
    return a;
  };

  P._remove = function (g) {
    const c = this.c, d = this.dirs;
    let s = g, n = 0;
    do { c[s] = EMPTY; this._eAdd(s); n++; s = this.nx[s]; } while (s !== g);
    s = g;
    do {
      for (let k = 0; k < 4; k++) { const t = s + d[k], ct = c[t]; if (ct === BLACK || ct === WHITE) this._addLib(this.g[t], s); }
      s = this.nx[s];
    } while (s !== g);
    return n;
  };

  /* Plays a move for col. Returns the number of stones captured, or -1 when illegal. */
  P.play = function (p, col) {
    if (col === undefined) col = this.turn;
    if (p === PASS) {
      this.ko = -1; this.passes++; this.turn = 3 - col;
      this.last2 = this.last; this.last = PASS; this.moveNo++;
      return 0;
    }
    if (!this.isLegal(p, col)) return -1;
    const c = this.c, d = this.dirs, opp = 3 - col;
    c[p] = col; this.g[p] = p; this.nx[p] = p; this.sz[p] = 1; this.pl[p] = 0; this.ls[p] = 0; this.ls2[p] = 0;
    this._eRemove(p);
    for (let k = 0; k < 4; k++) {
      const q = p + d[k], cq = c[q];
      if (cq === EMPTY) this._addLib(p, q);
      else if (cq === BLACK || cq === WHITE) this._subLib(this.g[q], p);
    }
    for (let k = 0; k < 4; k++) {
      const q = p + d[k];
      if (c[q] === col && this.g[q] !== this.g[p]) this._merge(this.g[p], this.g[q]);
    }
    let cap = 0, capPt = -1;
    for (let k = 0; k < 4; k++) {
      const q = p + d[k];
      if (c[q] === opp && this.pl[this.g[q]] === 0) { capPt = q; cap += this._remove(this.g[q]); }
    }
    const gp = this.g[p];
    this.ko = (cap === 1 && this.sz[gp] === 1 && this.pl[gp] === 1) ? capPt : -1;
    this.caps[col] += cap;
    this.passes = 0; this.turn = opp; this.last2 = this.last; this.last = p; this.moveNo++;
    return cap;
  };

  /* Puts a stone without changing whose turn it is (for setting up positions). */
  P.setup = function (p, col) {
    const t = this.turn, m = this.moveNo, l = this.last, l2 = this.last2, caps = this.caps.slice();
    if (this.play(p, col) < 0) throw new Error('Cannot set up a stone at ' + this.name(p));
    this.turn = t; this.moveNo = m; this.last = l; this.last2 = l2; this.ko = -1; this.caps = caps;
  };

  /* Exact stones and liberties of the group on p. */
  P.group = function (p) {
    const col = this.c[p], stones = [], libs = [], seen = new Set();
    if (col !== BLACK && col !== WHITE) return { col, stones, libs };
    let s = p;
    do {
      stones.push(s);
      for (let k = 0; k < 4; k++) { const q = s + this.dirs[k]; if (this.c[q] === EMPTY && !seen.has(q)) { seen.add(q); libs.push(q); } }
      s = this.nx[s];
    } while (s !== p);
    return { col, stones, libs, id: this.g[p] };
  };

  /* All groups on the board, each once. */
  P.groups = function () {
    const out = [], done = new Set();
    for (let p = 0; p < this.L; p++) {
      const v = this.c[p];
      if ((v === BLACK || v === WHITE) && !done.has(this.g[p])) { done.add(this.g[p]); out.push(this.group(p)); }
    }
    return out;
  };

  /* Area score (stones + surrounded empty points), black minus white, before komi.
   * Empty regions touching only one colour count for it. */
  P.areaScore = function (dead) {
    const c = this.c.slice();
    if (dead) for (const p of dead) c[p] = EMPTY;
    const own = new Int8Array(this.L), seen = new Uint8Array(this.L);
    let b = 0, w = 0;
    for (let p = 0; p < this.L; p++) {
      if (c[p] === BLACK) { b++; own[p] = 1; }
      else if (c[p] === WHITE) { w++; own[p] = -1; }
      else if (c[p] === EMPTY && !seen[p]) {
        const region = [p], stack = [p]; let touch = 0; seen[p] = 1;
        while (stack.length) {
          const q = stack.pop();
          for (let k = 0; k < 4; k++) {
            const r = q + this.dirs[k], v = c[r];
            if (v === EMPTY && !seen[r]) { seen[r] = 1; region.push(r); stack.push(r); }
            else if (v === BLACK) touch |= 1; else if (v === WHITE) touch |= 2;
          }
        }
        if (touch === 1) { b += region.length; for (const q of region) own[q] = 1; }
        else if (touch === 2) { w += region.length; for (const q of region) own[q] = -1; }
      }
    }
    return { black: b, white: w, own };
  };

  /* Quick area score for the end of a playout: stones and single-point eyes. */
  P._fastScore = function () {
    const c = this.c; let s = 0;
    for (let p = this.W; p < this.L - this.W; p++) {
      const v = c[p];
      if (v === BLACK) s++; else if (v === WHITE) s--;
      else if (v === EMPTY) {
        let b = 0, w = 0;
        for (let k = 0; k < 4; k++) { const t = c[p + this.dirs[k]]; if (t === BLACK) b++; else if (t === WHITE) w++; }
        if (b && !w) s++; else if (w && !b) s--;
      }
    }
    return s;
  };
  P._owner = function (p) {
    const v = this.c[p];
    if (v === BLACK) return 1; if (v === WHITE) return -1;
    let b = 0, w = 0;
    for (let k = 0; k < 4; k++) { const t = this.c[p + this.dirs[k]]; if (t === BLACK) b++; else if (t === WHITE) w++; }
    return b && !w ? 1 : w && !b ? -1 : 0;
  };

  /* ---------------------------------------------------------------- playouts */

  /* The move a light playout picks: answer the last move tactically, else a random move that does not fill an own eye. */
  P._policy = function (col) {
    const c = this.c, d = this.dirs, L = this.last;
    if (L > 0 && Math.random() < 0.9) {
      if (c[L] === 3 - col) {
        const gl = this.g[L];
        if (this.inAtari(gl)) { const lib = this.libPoint(gl); if (this.isLegal(lib, col)) return lib; }
      }
      for (let k = 0; k < 4; k++) {
        const q = L + d[k];
        if (c[q] === col) {
          const gq = this.g[q];
          if (this.inAtari(gq)) {
            const lib = this.libPoint(gq);
            if (this.isLegal(lib, col) && this.emptyNb(lib) >= 2) return lib;
          }
        }
      }
    }
    const E = this.E;
    let n = this.eN;
    while (n > 0) {
      const i = (Math.random() * n) | 0, p = E[i];
      if (!this.isEye(p, col) && this.isLegal(p, col) && !this._selfAtariBig(p, col)) return p;
      const last = E[n - 1]; E[i] = last; this.eI[last] = i; E[n - 1] = p; this.eI[p] = n - 1; n--;
    }
    return PASS;
  };

  /* A cheap check for a move that would leave a group of 3+ stones with one liberty. */
  P._selfAtariBig = function (p, col) {
    if (this.emptyNb(p) > 1) return false;
    let size = 1, libs = this.emptyNb(p);
    for (let k = 0; k < 4; k++) {
      const q = p + this.dirs[k];
      if (this.c[q] === 3 - col && this.atariAt(this.g[q], p)) return false; // captures
      if (this.c[q] === col) { const g = this.g[q]; size += this.sz[g]; if (!this.atariAt(g, p)) libs += 2; }
    }
    return size >= 3 && libs <= 1;
  };

  /* Plays random moves to the end. Returns black's area minus white's (before komi),
   * or ±1000 when captureWins and someone captured. seq/cols record the moves for RAVE. */
  P._playout = function (maxMoves, captureWins, seq, cols) {
    let moves = 0;
    while (moves < maxMoves && this.passes < 2) {
      const col = this.turn, p = this._policy(col);
      const cap = this.play(p, col);
      if (seq && p !== PASS) { seq.push(p); cols.push(col); }
      moves++;
      if (captureWins && cap > 0) return col === BLACK ? 1000 : -1000;
    }
    if (captureWins) return 0;
    return this._fastScore();
  };

  /* ---------------------------------------------------------------- tree search */

  function Node(move, col) {
    this.move = move; this.col = col; // col = the colour that played move
    this.N = 0; this.Wn = 0; this.S = 0; this.rN = 0; this.rW = 0;
    this.kids = null; this.term = 0;  // term: +1/-1 winner (from col's side) when the game ended here
  }

  function priorFor(b, p, col) {
    if (p === PASS) return b.eN < b.n * 1.5 ? [0.5, 5] : [0.05, 20];
    let v = 0.5, n = 10;
    const d = b.dirs;
    for (let k = 0; k < 4; k++) {
      const q = p + d[k], cq = b.c[q];
      if (cq === 3 - col && b.atariAt(b.g[q], p)) { v = Math.max(v, 0.85); n = 30; }
      if (cq === col && b.atariAt(b.g[q], p) && b.emptyNb(p) >= 2) { v = Math.max(v, 0.75); n = 25; }
    }
    if (b._selfAtariBig(p, col)) { v = 0.1; n = 30; }
    const line = b.line(p);
    if (line === 1 && b.moveNo < b.n * b.n / 3) { v = Math.min(v, 0.25); n = Math.max(n, 20); }
    if (line === 2 && b.moveNo < b.n * 1.2 && b.n >= 13) { v = Math.min(v, 0.4); }
    if (b.last > 0) {
      const [x, y] = b.xy(p), [lx, ly] = b.xy(b.last);
      if (Math.abs(x - lx) + Math.abs(y - ly) <= 2) v += 0.06;
    }
    return [v, n];
  }

  function expand(node, b, pv) {
    const col = b.turn;
    node.kids = [];
    for (let i = 0; i < b.eN; i++) {
      const p = b.E[i];
      if (b.isEye(p, col) || !b.isLegal(p, col)) continue;
      const kid = new Node(p, col);
      const [v, n] = priorFor(b, p, col);
      kid.pN = n * pv; kid.pW = v * n * pv;
      node.kids.push(kid);
    }
    const ps = new Node(PASS, col);
    const [v, n] = priorFor(b, PASS, col);
    ps.pN = n; ps.pW = v * n;
    node.kids.push(ps);
  }

  function select(node) {
    let best = null, bv = -1;
    const logN = Math.log(node.N + 1);
    for (const k of node.kids) {
      const n = k.N + k.pN, q = (k.Wn + k.pW) / n;
      const rq = k.rN ? k.rW / k.rN : q;
      const beta = k.rN / (k.rN + n + k.rN * n / 2500);
      const v = (1 - beta) * q + beta * rq + 0.15 * Math.sqrt(logN / n);
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  }

  /* Monte Carlo tree search from board b (b.turn to play).
   * opts: playouts, timeMs, komi, captureWins, force (a move that gets ≥ 25% of the playouts), priorWeight.
   * Returns the root player's candidate moves with visit counts, win rates and average scores,
   * plus the ownership map (+1 black … −1 white) and the overall win rate. */
  function search(b, opts) {
    const komi = opts.komi || 0, cw = !!opts.captureWins;
    const maxN = opts.playouts || 1000, until = Date.now() + (opts.timeMs || 1e9);
    const root = new Node(b.last, 3 - b.turn);
    expand(root, b, opts.priorWeight || 1);
    let force = null;
    if (opts.force !== undefined && opts.force !== null) {
      force = root.kids.find(k => k.move === opts.force) || null;
      if (!force && b.isLegal(opts.force, b.turn)) { force = new Node(opts.force, b.turn); force.pN = 1; force.pW = 0.5; root.kids.push(force); }
    }
    const own = new Float32Array(b.L);
    const maxMoves = b.n * b.n * 3;
    const stamp = new Int32Array(b.L), first = new Uint8Array(b.L);
    let sims = 0, scoreSum = 0;
    const seq = [], cols = [], path = [];
    while (sims < maxN && (sims & 31 || Date.now() < until)) {
      const bb = b.clone();
      seq.length = 0; cols.length = 0; path.length = 0;
      let node = root; path.push(node);
      let result = null; // black's score (or ±1000 in capture games)
      let depth = 0;
      while (node.kids && node.kids.length) {
        let kid;
        if (depth === 0 && force && sims % 4 === 0) kid = force; else kid = select(node);
        if (kid.term) { result = kid.term; path.push(kid); node = kid; break; }
        const cap = bb.play(kid.move, kid.col);
        if (kid.move !== PASS) { seq.push(kid.move); cols.push(kid.col); }
        path.push(kid); node = kid; depth++;
        if (cw && cap > 0) { kid.term = kid.col === BLACK ? 1000 : -1000; result = kid.term; break; }
        if (bb.passes >= 2) { kid.term = bb._fastScore() - komi; result = kid.term; break; }
        if (node.N === 0) break;
      }
      if (result === null) {
        if (!node.kids && node.N > 0 && bb.passes < 2) expand(node, bb, 1);
        const s = bb._playout(maxMoves, cw, seq, cols);
        result = cw ? s : s - komi;
        for (let p = bb.W; p < bb.L - bb.W; p++) if (bb.c[p] !== EDGE) own[p] += bb._owner(p);
      } else {
        for (let p = bb.W; p < bb.L - bb.W; p++) if (bb.c[p] !== EDGE) own[p] += bb._owner(p);
      }
      const blackWins = result > 0 ? 1 : result < 0 ? 0 : 0.5;
      scoreSum += result;
      for (const n of path) {
        n.N++;
        n.Wn += n.col === BLACK ? blackWins : 1 - blackWins;
        n.S += n.col === BLACK ? result : -result;
      }
      // RAVE: credit each node's children with moves played first by the right colour later on.
      sims++;
      const st = sims;
      for (let i = seq.length - 1; i >= 0; i--) {
        stamp[seq[i]] = st; first[seq[i]] = cols[i];
        if (i < path.length - 1) {
          const nd = path[i];
          if (nd.kids) for (const k of nd.kids) {
            if (k.move !== PASS && stamp[k.move] === st && first[k.move] === k.col) {
              k.rN++; k.rW += k.col === BLACK ? blackWins : 1 - blackWins;
            }
          }
        }
      }
    }
    for (let i = 0; i < own.length; i++) own[i] /= Math.max(1, sims);
    const col = b.turn;
    // reply: the opponent's most-searched answer to each move (-1 when the search did not get that far).
    const moves = root.kids.filter(k => k.N > 0).map(k => {
      let rep = null;
      if (k.kids) for (const g of k.kids) if (g.N > 0 && (!rep || g.N > rep.N)) rep = g;
      return { move: k.move, N: k.N, win: k.Wn / k.N, score: k.S / k.N, reply: rep && rep.N >= 3 ? rep.move : -1 };
    }).sort((x, y) => y.N - x.N);
    const sideScore = (col === BLACK ? 1 : -1) * scoreSum / Math.max(1, sims);
    const best = moves[0];
    return { moves, own: Array.from(own), sims, win: best ? best.win : 0.5, score: cw ? 0 : sideScore, turn: col };
  }

  /* ---------------------------------------------------------------- positions */

  /* Rebuilds a board from {n, setup:{b:[],w:[]}, moves:[[col, p], …], turn}. */
  function fromPos(pos) {
    const b = new Board(pos.n);
    if (pos.setup) {
      for (const p of pos.setup.b || []) b.setup(p, BLACK);
      for (const p of pos.setup.w || []) b.setup(p, WHITE);
    }
    if (pos.first) b.turn = pos.first;
    for (const [col, p] of pos.moves || []) { if (b.play(p, col) < 0) throw new Error('Illegal move in game record: ' + b.name(p)); }
    return b;
  }

  /* Star points (hoshi) and handicap stones. */
  function starPoints(n) {
    if (n < 7) return [];
    const e = n >= 13 ? 3 : 2, m = (n - 1) / 2, f = n - 1 - e;
    const pts = [[e, e], [f, f], [f, e], [e, f]];
    if (n % 2 && n >= 9) pts.push([m, m]);
    if (n % 2 && n >= 13) pts.push([e, m], [f, m], [m, e], [m, f]);
    return pts;
  }
  function handicapPoints(n, h) {
    const s = starPoints(n);
    if (h < 2) return [];
    // Order: two opposite corners, then the other two, then centre (odd counts) and sides.
    const [a, b2, c, d, centre, l, r, t, bt] = s;
    const order = { 2: [a, b2], 3: [a, b2, c], 4: [a, b2, c, d], 5: [a, b2, c, d, centre], 6: [a, b2, c, d, l, r], 7: [a, b2, c, d, l, r, centre], 8: [a, b2, c, d, l, r, t, bt], 9: [a, b2, c, d, l, r, t, bt, centre] };
    return (order[Math.min(h, n >= 13 ? 9 : 5)] || []).filter(Boolean);
  }

  /* ---------------------------------------------------------------- tactics for explanations */

  /* Can the group on stone p (in atari or with two liberties, defender = its owner) be caught in a ladder?
   * attackerToMove: true when the attacker plays next. Reads up to `budget` positions. */
  function ladderCaptures(b, p, attackerToMove, budget) {
    const ctx = { budget: budget || 3000 };
    const def = b.c[p];
    return ladderRead(b, p, def, attackerToMove, ctx, 0);
  }
  function ladderRead(b, p, def, attackerToMove, ctx, depth) {
    if (--ctx.budget < 0 || depth > 80) return false;
    if (b.c[p] !== def) return true; // captured
    const gr = b.group(p);
    const att = 3 - def;
    if (!attackerToMove) {
      if (gr.libs.length >= 2) return false;
      // The defender may capture an attacking stone next to the group instead of running.
      for (const s of gr.stones) for (const d of b.dirs) {
        const q = s + d;
        if (b.c[q] === att) { const ag = b.group(q); if (ag.libs.length === 1 && b.isLegal(ag.libs[0], def)) return false; }
      }
      const lib = gr.libs[0];
      if (!b.isLegal(lib, def)) return true;
      const bb = b.clone(); bb.play(lib, def);
      const n = bb.group(p).libs.length;
      if (n >= 3) return false;
      if (n <= 1) return true;
      return ladderRead(bb, p, def, true, ctx, depth + 1);
    }
    if (gr.libs.length === 1) return b.isLegal(gr.libs[0], att);
    if (gr.libs.length !== 2) return false;
    for (const l of gr.libs) {
      if (!b.isLegal(l, att)) continue;
      const bb = b.clone(); bb.play(l, att);
      if (bb.c[l] !== att) continue;
      if (bb.group(l).libs.length < 2) continue; // the atari stone could just be captured
      if (bb.group(p).libs.length !== 1) continue;
      if (ladderRead(bb, p, def, false, ctx, depth + 1)) return true;
    }
    return false;
  }

  /* Facts about move p by col on board b, used to explain moves in plain words. */
  function moveFacts(b, p, col) {
    const f = { move: p, col, name: b.name(p), pass: p === PASS, captures: 0, saved: 0, savedFails: false, atari: [], ladder: false,
      selfAtari: 0, ownEye: false, connects: 0, cuts: 0, line: 0, region: '', leftInAtari: [], missedCapture: null, nearest: 99, contact: false };
    const opp = 3 - col;
    const before = b.groups();
    const myAtari = before.filter(g => g.col === col && g.libs.length === 1);
    const theirAtari = before.filter(g => g.col === opp && g.libs.length === 1 && b.isLegal(g.libs[0], col));
    if (p === PASS) {
      f.leftInAtari = myAtari.map(g => ({ size: g.stones.length, at: g.stones[0] }));
      if (theirAtari.length) { const big = theirAtari.sort((x, y) => y.stones.length - x.stones.length)[0]; f.missedCapture = { size: big.stones.length, at: big.libs[0] }; }
      return f;
    }
    f.line = b.line(p);
    const [x, y] = b.xy(p), n = b.n, edgeX = Math.min(x, n - 1 - x), edgeY = Math.min(y, n - 1 - y);
    const zone = n >= 13 ? 5 : 3;
    f.region = edgeX < zone && edgeY < zone ? 'corner' : (edgeX < zone || edgeY < zone) ? 'side' : 'centre';
    f.ownEye = b.isEye(p, col);
    for (let q = 0; q < b.L; q++) if (b.c[q] === BLACK || b.c[q] === WHITE) {
      const [qx, qy] = b.xy(q), dd = Math.max(Math.abs(qx - x), Math.abs(qy - y));
      if (dd < f.nearest) f.nearest = dd;
    }
    const nbOwn = new Set(), nbOpp = new Set();
    for (const d of b.dirs) { const q = p + d; if (b.c[q] === col) nbOwn.add(b.g[q]); else if (b.c[q] === opp) nbOpp.add(b.g[q]); }
    f.contact = nbOpp.size > 0;
    const bb = b.clone();
    const cap = bb.play(p, col);
    if (cap < 0) { f.illegal = b.whyIllegal(p, col); return f; }
    f.captures = cap;
    const mine = bb.group(p);
    f.libs = mine.libs.length; f.size = mine.stones.length;
    if (nbOwn.size >= 2) f.connects = nbOwn.size;
    // Saved: one of my groups was in atari before and is not now.
    for (const g of myAtari) {
      if (bb.c[g.stones[0]] !== col) continue;
      const now = bb.group(g.stones[0]).libs.length;
      if (now >= 2) { f.saved += g.stones.length; if (now === 2 && ladderCaptures(bb, g.stones[0], true, 1500)) f.savedFails = true; }
      else f.leftInAtari.push({ size: g.stones.length, at: g.stones[0] });
    }
    if (cap) {
      // Capturing also saves my groups that were in atari next to the captured stones.
      f.leftInAtari = f.leftInAtari.filter(g => bb.group(g.at).libs.length < 2);
    }
    // Ataris on opponent groups.
    const seen = new Set();
    for (const d of b.dirs) {
      const q = p + d;
      if (bb.c[q] !== opp || seen.has(bb.g[q])) continue;
      seen.add(bb.g[q]);
      const g = bb.group(q);
      const was = before.find(h => h.stones.includes(q));
      if (g.libs.length === 1 && was && was.libs.length >= 2) {
        const lad = ladderCaptures(bb, q, false, 2500);
        f.atari.push({ size: g.stones.length, at: q, caught: lad });
        if (lad) f.ladder = true;
      }
    }
    if (nbOpp.size >= 2 && !cap) f.cuts = nbOpp.size;
    if (f.libs === 1 && !cap) f.selfAtari = f.size;
    else if (f.libs === 1 && cap) f.selfAtari = 0;
    // Missed capture: an opponent group was in atari and this move did not take it.
    const stillThere = theirAtari.filter(g => bb.c[g.stones[0]] === opp && bb.group(g.stones[0]).libs.length === 1);
    if (stillThere.length) { const big = stillThere.sort((x2, y2) => y2.stones.length - x2.stones.length)[0]; f.missedCapture = { size: big.stones.length, at: big.libs[0] }; }
    return f;
  }

  /* Urgent things on the board for the player to move: own groups in atari, groups that can be captured. */
  function urgent(b, col) {
    const out = [];
    for (const g of b.groups()) {
      if (g.libs.length !== 1) continue;
      if (g.col === col) {
        const lib = g.libs[0];
        let canRun = false, canCaptureOut = null;
        if (b.isLegal(lib, col)) { const bb = b.clone(); bb.play(lib, col); const libs = bb.c[g.stones[0]] === col ? bb.group(g.stones[0]).libs.length : 0; canRun = libs >= 3 || (libs === 2 && !ladderCaptures(bb, g.stones[0], true, 2000)); }
        for (const s of g.stones) for (const d of b.dirs) { const q = s + d; if (b.c[q] === 3 - col) { const ag = b.group(q); if (ag.libs.length === 1 && b.isLegal(ag.libs[0], col)) canCaptureOut = ag.libs[0]; } }
        out.push({ kind: 'mine', size: g.stones.length, at: g.stones[0], lib, canRun, canCaptureOut });
      } else if (b.isLegal(g.libs[0], col)) {
        out.push({ kind: 'theirs', size: g.stones.length, at: g.stones[0], lib: g.libs[0] });
      }
    }
    return out.sort((a, c) => c.size - a.size);
  }

  /* SGF coordinates ("dd" from the top-left). */
  function sgfPt(b, p) { if (p === PASS) return ''; const [x, y] = b.xy(p); return String.fromCharCode(97 + x) + String.fromCharCode(97 + y); }
  function fromSgfPt(b, s) { if (!s || (s === 'tt' && b.n <= 19)) return PASS; return b.pt(s.charCodeAt(0) - 97, s.charCodeAt(1) - 97); }

  const API = { Board, search, fromPos, starPoints, handicapPoints, ladderCaptures, moveFacts, urgent, sgfPt, fromSgfPt, EMPTY, BLACK, WHITE, EDGE, PASS, LETTERS };

  /* Worker mode: answer {id, pos, opts} with the search result. */
  if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof importScripts === 'function') {
    self.onmessage = e => {
      const { id, pos, opts } = e.data;
      try {
        const b = fromPos(pos);
        const r = search(b, opts || {});
        self.postMessage({ id, result: r });
      } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
    };
  }
  root.GoEngine = API;
})(typeof self !== 'undefined' ? self : this);
