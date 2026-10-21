#!/usr/bin/env node
// Builds hanzi-dictionary.json, the Chinese character dictionary used by Alphabet Forge.
//
//   node scripts/build-hanzi-dictionary.mjs <makemeahanzi dictionary.txt> <Jun Da frequency list> <cedict_ts.u8> <word frequency list>
//
// Sources (all free to reuse):
//   - Make Me a Hanzi dictionary.txt (meaning, pinyin, how each character is built) — LGPL 3
//     https://github.com/skishore/makemeahanzi
//   - Jun Da's Modern Chinese character frequency list — used only to sort the characters
//     https://lingua.mtsu.edu/chinese-computing/
//   - CC-CEDICT (example words and their meanings) — CC BY-SA 4.0  https://www.mdbg.net/chinese/dictionary?page=cc-cedict
//   - Leiden Weibo word frequencies — used only to pick common example words
// The last three ship together in the MIT-licensed `hanzi` npm package (lib/data/*.txt.js).
import fs from 'node:fs';
import path from 'node:path';

const [mmah, junda, cedict, wordFreq] = process.argv.slice(2);
if (!wordFreq) { console.error('Usage: node scripts/build-hanzi-dictionary.mjs dictionary.txt frequencyjunda.txt cedict_ts.u8 leidenfreqdata.txt'); process.exit(1); }
const read = f => fs.readFileSync(f, 'utf8').replace(/^module\.exports = `/, '').replace(/`;?\s*$/, '');

// ---- pinyin with tone numbers → tone marks ("zhong1 guo2" → "zhōng guó")
const MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
function mark(syl) {
  const m = /^([a-zü:v]+)([1-5])$/i.exec(syl); if (!m) return syl.replace(/u:|v/g, 'ü');
  let s = m[1].replace(/u:|v/gi, 'ü'); const t = +m[2]; if (t === 5) return s;
  const low = s.toLowerCase();
  let i = low.indexOf('a'); if (i < 0) i = low.indexOf('e'); if (i < 0 && low.includes('ou')) i = low.indexOf('o');
  if (i < 0) { for (let k = low.length - 1; k >= 0; k--) if ('iouü'.includes(low[k])) { i = k; break; } }
  if (i < 0) return s;
  const ch = MARKS[low[i]][t - 1];
  return s.slice(0, i) + (s[i] === s[i].toUpperCase() && s[i] !== s[i].toLowerCase() ? ch.toUpperCase() : ch) + s.slice(i + 1);
}
const pinyin = p => p.split(' ').map(mark).join(' ').replace(/ ([,·])/g, '$1');

// ---- character frequency rank
const rank = new Map();
for (const line of read(junda).split('\n')) { const c = line.split('\t'); if (c[1] && !rank.has(c[1])) rank.set(c[1], +c[0]); }

// ---- CC-CEDICT: simplified word → [pinyin, meaning]
const words = new Map();
const badSense = /^(variant of|old variant|surname |see |used in |(?:archaic|old|Japanese|Korean) variant|abbr\. for|CL:|\(old\)|\(Tw\)|\(dialect\))/i;
for (const line of read(cedict).split('\n')) {
  if (line.startsWith('#')) continue;
  const m = /^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/\s*$/.exec(line); if (!m) continue;
  const [, , simp, py, defs] = m;
  if (/^[A-Z]/.test(py)) continue; // names of people and places
  const senses = defs.split('/').map(s => s.replace(/\s*\(CL:.*?\)|\s*CL:\S+/g, '').trim()).filter(s => s && !badSense.test(s));
  if (!senses.length) continue;
  const english = senses.slice(0, 2).join('; ').replace(/\|[^\s\]]+/g, '');
  if (!words.has(simp)) words.set(simp, [pinyin(py), english.length > 70 ? english.slice(0, 67).replace(/[ ;,][^ ;,]*$/, '') + '…' : english]);
}

// ---- common words per character
const freq = [];
for (const line of read(wordFreq).split('\n')) {
  const [w, n] = line.split(','); if (!w || !n || !/^[一-鿿]{2,4}$/.test(w) || !words.has(w)) continue;
  freq.push([w, +n]);
}
freq.sort((a, b) => b[1] - a[1]);
const examples = new Map();
for (const [w] of freq) for (const ch of new Set(w)) {
  const list = examples.get(ch) || []; if (list.length >= 3) continue;
  list.push(w); examples.set(ch, list);
}

// ---- characters
const out = [];
for (const line of fs.readFileSync(mmah, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const d = JSON.parse(line), c = d.character, r = rank.get(c);
  if (!r || !d.definition || !(d.pinyin || []).length) continue;
  const e = d.etymology || {};
  const parts = [...new Set([...(d.decomposition || '')].filter(x => /[⺀-⿟㐀-鿿]/.test(x) && !/[⿰-⿿]/.test(x) && x !== c))];
  const item = { c, p: d.pinyin.join(', '), m: d.definition.replace(/\s+/g, ' ').trim(), f: r };
  if (e.type) item.t = { pictographic: 'p', ideographic: 'i', pictophonetic: 's' }[e.type]; // picture · idea · sound + meaning
  if (e.hint) item.h = e.hint;
  if (e.semantic) item.sm = e.semantic;
  if (e.phonetic) item.ph = e.phonetic;
  if (parts.length) item.k = parts.join('');
  if (d.radical && d.radical !== c) item.rd = d.radical;
  const ex = (examples.get(c) || []).map(w => [w, ...words.get(w)]);
  // Add readings the example words use (地 is "de" in Make Me a Hanzi, but "dì" in 地方).
  const readings = d.pinyin.slice();
  for (const [w, py] of ex) { const syl = py.split(' '); if (syl.length !== [...w].length) continue; [...w].forEach((ch, i) => { const r = syl[i].toLowerCase(); if (ch === c && !readings.includes(r)) readings.push(r); }); }
  item.p = readings.join(', ');
  if (ex.length && r <= 6000) item.w = ex;
  out.push(item);
}
out.sort((a, b) => a.f - b.f);
out.forEach((x, i) => { x.f = i + 1; });
const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'hanzi-dictionary.json');
fs.writeFileSync(file, JSON.stringify({
  about: 'Chinese characters in order of how often they are used. Meanings and how each character is built: Make Me a Hanzi (LGPL). Example words: CC-CEDICT (CC BY-SA 4.0). Order: Jun Da character frequency list.',
  chars: out
}));
console.log(out.length + ' characters, ' + out.filter(x => x.w).length + ' with example words, ' + (fs.statSync(file).size / 1024 | 0) + ' KB → ' + file);
