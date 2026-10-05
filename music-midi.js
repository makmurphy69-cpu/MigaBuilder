/* Standard MIDI file reader and writer for Music Forge's Beat maker. Plain functions, no dependencies.
 *   MigaMidi.write({ bpm, ppq, tracks: [{ name, channel, program, notes: [{ tick, dur, note, vel }] }] }) -> Uint8Array
 *   MigaMidi.read(arrayBuffer) -> { ppq, bpm, tracks: [{ name, channel, program, notes: [{ tick, dur, note, vel }] }] }
 * Notes are MIDI numbers (60 = middle C), velocities 1-127, ticks counted in ppq per quarter note. */
(function (window) {
  'use strict';

  function vlq(n) {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  }
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = n => [(n >>> 8) & 255, n & 255];
  const text = s => Array.from(unescape(encodeURIComponent(s || ''))).map(c => c.charCodeAt(0));
  function chunk(id, bytes) { return [...text(id), ...u32(bytes.length), ...bytes]; }
  function trackChunk(events) { // events: [{ tick, bytes }]
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const out = []; let last = 0;
    events.forEach(e => { out.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; });
    out.push(0, 0xff, 0x2f, 0); // end of track
    return chunk('MTrk', out);
  }

  function write(song) {
    const ppq = song.ppq || 96, bpm = song.bpm || 120, usPerQuarter = Math.round(60000000 / bpm);
    const name = text(song.title || 'Music Forge');
    const conductor = [
      { tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(name.length), ...name] },
      { tick: 0, order: 1, bytes: [0xff, 0x51, 3, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255] },
      { tick: 0, order: 2, bytes: [0xff, 0x58, 4, 4, 2, 24, 8] }
    ];
    const chunks = [trackChunk(conductor)];
    (song.tracks || []).forEach(t => {
      const ch = Math.max(0, Math.min(15, t.channel || 0)), tn = text(t.name), ev = [{ tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(tn.length), ...tn] }];
      if (t.program != null && ch !== 9) ev.push({ tick: 0, order: 1, bytes: [0xc0 | ch, t.program & 0x7f] });
      (t.notes || []).forEach(n => {
        const note = Math.max(0, Math.min(127, Math.round(n.note))), vel = Math.max(1, Math.min(127, Math.round(n.vel || 100)));
        // Note-offs sort before note-ons on the same tick, so repeated notes are not cut short.
        ev.push({ tick: n.tick, order: 3, bytes: [0x90 | ch, note, vel] });
        ev.push({ tick: n.tick + Math.max(1, n.dur || 1), order: 2, bytes: [0x80 | ch, note, 0] });
      });
      chunks.push(trackChunk(ev));
    });
    const header = chunk('MThd', [...u16(1), ...u16(chunks.length), ...u16(ppq)]);
    return new Uint8Array([].concat(header, ...chunks));
  }

  function read(arrayBuffer) {
    const b = new Uint8Array(arrayBuffer); let p = 0;
    const str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(b[p + i]); return s; };
    const r32 = () => { const v = (b[p] << 24 | b[p + 1] << 16 | b[p + 2] << 8 | b[p + 3]) >>> 0; p += 4; return v; };
    const r16 = () => { const v = b[p] << 8 | b[p + 1]; p += 2; return v; };
    const rv = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80 && p < b.length); return v; };
    // A RIFF-wrapped MIDI (.rmi) holds the normal file inside a 'data' chunk.
    if (str(4) === 'RIFF') {
      let at = -1; for (let i = 12; i + 4 <= b.length; i++) if (b[i] === 0x4d && b[i + 1] === 0x54 && b[i + 2] === 0x68 && b[i + 3] === 0x64) { at = i; break; }
      if (at < 0) throw new Error('This is not a MIDI file (.mid).'); p = at;
    }
    if (str(4) !== 'MThd') throw new Error('This is not a MIDI file (.mid).');
    p += 4; const hlen = r32(), hstart = p; r16(); const ntracks = r16(), division = r16(); p = hstart + hlen;
    if (division & 0x8000) throw new Error('This MIDI file uses SMPTE timing, which is not supported. Save it with musical (bars and beats) timing.');
    const ppq = division || 96; let bpm = 0; const tracks = [];
    for (let t = 0; t < ntracks && p + 8 <= b.length; t++) {
      const id = str(4); p += 4; const len = r32(), end = Math.min(b.length, p + len);
      if (id !== 'MTrk') { p = end; continue; }
      let tick = 0, status = 0, name = '';
      const byCh = {}, open = {};
      const chan = c => byCh[c] || (byCh[c] = { channel: c, program: null, notes: [] });
      while (p < end) {
        tick += rv();
        let s = b[p];
        if (s & 0x80) { p++; status = s; } else s = status; // running status
        if (s === 0xff) {
          const type = b[p++], l = rv();
          if (type === 0x03 && !name) name = str(l).replace(/\0/g, '').trim();
          if (type === 0x51 && !bpm && l === 3) bpm = Math.round(60000000 / (b[p] << 16 | b[p + 1] << 8 | b[p + 2]));
          p += l; if (type === 0x2f) break;
        } else if (s === 0xf0 || s === 0xf7) { p += rv(); }
        else {
          const kind = s & 0xf0, c = s & 0x0f, d1 = b[p++], d2 = (kind === 0xc0 || kind === 0xd0) ? 0 : b[p++];
          if (kind === 0xc0) chan(c).program = d1;
          const key = c + ':' + d1;
          if (kind === 0x90 && d2 > 0) { (open[key] = open[key] || []).push({ tick, vel: d2 }); }
          else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) {
            const on = open[key] && open[key].shift();
            if (on) chan(c).notes.push({ tick: on.tick, dur: Math.max(1, tick - on.tick), note: d1, vel: on.vel });
          }
        }
      }
      Object.keys(open).forEach(k => (open[k] || []).forEach(on => { const [c, n] = k.split(':').map(Number); chan(c).notes.push({ tick: on.tick, dur: Math.max(1, tick - on.tick), note: n, vel: on.vel }); }));
      Object.values(byCh).filter(x => x.notes.length).forEach(x => tracks.push({ name: name, channel: x.channel, program: x.program, notes: x.notes.sort((a, b2) => a.tick - b2.tick) }));
      p = end;
    }
    return { ppq, bpm: bpm || 120, tracks };
  }

  window.MigaMidi = { write, read };
})(window);
