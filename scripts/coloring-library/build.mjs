#!/usr/bin/env node
// Builds the Coloring Forge picture library (coloring-library/).
//
//   npm pack openmoji && tar xzf openmoji-*.tgz          # OpenMoji line drawings, CC BY-SA 4.0
//   curl -o NotoEmoji.ttf "<Noto Emoji 400 TTF from fonts.googleapis.com/css2?family=Noto+Emoji>"   # SIL OFL
//   python3 scripts/coloring-library/noto-coverage.py NotoEmoji.ttf package/data/openmoji.json > noto-coverage.json
//   node scripts/coloring-library/build.mjs package NotoEmoji.ttf noto-coverage.json
//
// Every picture is drawn in Chromium and pictures that are mostly solid black (bad to colour in)
// are left out. Hand-drawn pictures are copied to coloring-library/openmoji/<code>.svg; the bold
// style is drawn on the page with the Noto Emoji web font, so it needs no files.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [pkg, notoFont, coverageFile] = process.argv.slice(2);
if (!coverageFile) { console.error('Usage: node scripts/coloring-library/build.mjs <openmoji package dir> <NotoEmoji.ttf> <noto-coverage.json>'); process.exit(1); }
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}

// Kid-friendly categories: [id, label, icon]
const CATS = [
  ['animals', 'Animals', '🦁'], ['nature', 'Plants & nature', '🌻'], ['food', 'Food & drink', '🍕'],
  ['fantasy', 'Fairy tales & fantasy', '🧚'], ['people', 'People & jobs', '👩‍🚒'], ['faces', 'Faces & feelings', '😀'],
  ['sport', 'Sports, games & parties', '⚽'], ['vehicles', 'Vehicles', '🚒'], ['places', 'Buildings & places', '🏰'],
  ['sky', 'Weather & space', '🌈'], ['things', 'Things at home & school', '🎒'], ['music', 'Music', '🎸'],
  ['clothes', 'Clothes', '👗'], ['body', 'Hands & body', '✋'], ['signs', 'Signs & symbols', '☮️'], ['flags', 'Flags', '🏳️']
];
const SKIP_SUB = new Set(['brand', 'ui-element', 'regional-indicator', 'alphanum', 'arrow', 'av-symbol', 'keycap', 'punctuation', 'math', 'currency', 'gender', 'interaction', 'symbols']);
// Not for a children's coloring book.
const NOT_FOR_KIDS = /^(middle finger|sake|bottle with popping cork|wine glass|cocktail glass|beer mug|clinking beer mugs|clinking glasses|tumbler glass|dagger|bomb|atom bomb|cigarette|coffin|funeral urn|drunk person|pills)$/i;
function category(e) {
  if (NOT_FOR_KIDS.test(e.annotation)) return null;
  const g = e.group, s = e.subgroups;
  if (SKIP_SUB.has(s) || g === 'component') return null;
  if (g === 'extras-unicode' && s === 'symbol-other') return null;
  if (/^animal-|^(cat|monkey)-face$/.test(s) || (g === 'extras-openmoji' && s === 'animals-nature')) return 'animals';
  if (/^plant-|gardening|climate-environment|place-geographic/.test(s)) return 'nature';
  if (g === 'food-drink' || s === 'food-drink') return 'food';
  if (s === 'person-fantasy' || s === 'face-costume') return 'fantasy';
  if (/^person(-role|-activity|-resting)?$|^family$|^people$/.test(s)) return 'people';
  if (g === 'smileys-emotion' || s === 'smileys-emotion') return 'faces';
  if (g === 'activities' || s === 'person-sport') return 'sport';
  if (/^transport-(air|ground|water)$/.test(s)) return 'vehicles';
  if (/^place-|^hotel$|^travel-places$/.test(s) && s !== 'place-geographic') return 'places';
  if (s === 'sky-weather') return 'sky';
  if (s === 'music' || s === 'musical-instrument') return 'music';
  if (s === 'clothing') return 'clothes';
  if (/^hand|^body-parts$|^person-gesture$|^person-symbol$/.test(s)) return 'body';
  if (/flag/.test(s) || g === 'flags' || s === 'queer-symbols') return 'flags';
  if (g === 'objects' || /^(objects|technology|time|healthcare)$/.test(s)) return 'things';
  if (g === 'symbols' || /^(emergency|symbol-other)$/.test(s)) return 'signs';
  return null;
}

const data = JSON.parse(fs.readFileSync(path.join(pkg, 'data', 'openmoji.json'), 'utf8'));
const coverage = new Set(JSON.parse(fs.readFileSync(coverageFile, 'utf8')));
const list = [];
const tidy = svg => svg.replace(/<!--.*?-->/gs, '').replace(/\s*\n\s*/g, ' ').replace(/>\s+</g, '><').replace(/ id="[^"]*"/g, '').trim();
for (const e of data) {
  if (e.skintone) continue;
  const c = category(e); if (!c) continue;
  const file = path.join(pkg, 'black', 'svg', e.hexcode + '.svg');
  if (!fs.existsSync(file)) continue;
  const flag = c === 'flags' && e.subgroups !== 'flag' && e.subgroups !== 'queer-symbols';
  let svg = fs.readFileSync(file, 'utf8'), guide = null;
  if (flag) {
    // The black flag drawings are empty rectangles. Outline the coloured version instead,
    // and keep the coloured one as a guide printed in the corner of the page.
    const color = fs.readFileSync(path.join(pkg, 'color', 'svg', e.hexcode + '.svg'), 'utf8');
    const shapes = ((/<g id="color">([\s\S]*?)<\/g>/.exec(color) || [])[1] || '').match(/<(rect|path|polygon|circle|ellipse|polyline|line)\b/g) || [];
    if (shapes.length < 2) continue; // a plain one-colour rectangle: nothing to colour in
    guide = tidy(color);
    svg = color.replace(/<g id="color">([\s\S]*?)<\/g>/, (m, inner) => '<g fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round">' +
      inner.replace(/ (fill|stroke)="[^"]*"/g, '').replace(/ stroke-width="[^"]*"/g, '') + '</g>');
  }
  list.push({ e, c, svg: tidy(svg), guide, noto: !flag && coverage.has(e.hexcode) });
}

// Measure how much of each picture is solid ink.
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
const fontB64 = fs.readFileSync(notoFont).toString('base64');
await page.setContent('<style>@font-face{font-family:NE;src:url(data:font/ttf;base64,' + fontB64 + ')}</style><span style="font-family:NE">x</span>');
await page.evaluate(() => document.fonts.load('40px NE', '😀'));
const N = 160;
const ink = await page.evaluate(async ({ items, N }) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d', { willReadFrequently: true });
  // Share of dark pixels; -1 when the picture has colour (the browser fell back to a colour emoji font).
  const measure = () => { const d = c.getImageData(0, 0, N, N).data; let n = 0, col = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] < 128 && d[i + 1] < 128 && d[i + 2] < 128) n++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 20) col++; } return col > N * N * .002 ? -1 : n / (N * N); };
  const out = [];
  for (const it of items) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, N, N);
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(it.svg);
    try { await img.decode(); c.drawImage(img, 0, 0, N, N); } catch (e) { /* broken file */ }
    const a = measure();
    let b = null;
    if (it.noto) {
      c.fillStyle = '#fff'; c.fillRect(0, 0, N, N); c.fillStyle = '#000'; c.font = (N * .8) + 'px NE'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.emoji, N / 2, N / 2);
      // A colour emoji font the browser fell back to shows up as colour or as large grey areas.
      const d = c.getImageData(0, 0, N, N).data; let dark = 0, grey = 0;
      for (let i = 0; i < d.length; i += 4) { const v = d[i]; if (v < 70) dark++; else if (v < 200) grey++; }
      b = measure(); if (b >= 0 && grey > (dark + grey) * .45) b = -1;
      it.grey = grey / Math.max(1, dark + grey);
    }
    out.push([a, b, it.grey]);
  }
  return out;
}, { items: list.map(x => ({ svg: x.svg, noto: x.noto, emoji: x.e.emoji })), N });
await browser.close();

// Bold glyphs above MAX_BOLD are mostly solid black (a black mane, a filled body): the page draws
// their outlines instead, which turns the black areas into shapes to colour.
const MAX_INK = 0.28, MAX_BOLD = 0.2, MIN_INK = 0.012;
const outDir = path.join(ROOT, 'coloring-library');
fs.rmSync(path.join(outDir, 'openmoji'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'openmoji'), { recursive: true });
const items = [];
let drawn = 0, bold = 0;
list.forEach((x, i) => {
  const [a, b] = ink[i];
  const hand = a >= MIN_INK && a <= MAX_INK, bo = x.noto && b != null && b >= MIN_INK;
  if (!hand && !bo) return;
  if (hand) { fs.writeFileSync(path.join(outDir, 'openmoji', x.e.hexcode + '.svg'), x.svg); drawn++; }
  if (hand && x.guide) fs.writeFileSync(path.join(outDir, 'openmoji', x.e.hexcode + '-color.svg'), x.guide);
  if (bo) bold++;
  const name = x.e.annotation.replace(/^flag: /, '').replace(/^./, s => s.toUpperCase());
  const tags = [...new Set((x.e.tags + ',' + (x.e.openmoji_tags || '')).split(',').map(s => s.trim().toLowerCase()).filter(t => t && !name.toLowerCase().includes(t)))].slice(0, 6).join(' ');
  // [name, category index, hexcode if hand-drawn ('' if not), emoji if bold style ('' if not), search words,
  //  flags: 'g' = has a colour guide, 'o' = draw the bold style as outlines]
  const flags = (hand && x.guide ? 'g' : '') + (bo && b > MAX_BOLD ? 'o' : '');
  const row = [name, CATS.findIndex(c => c[0] === x.c), hand ? x.e.hexcode : '', bo ? x.e.emoji : '', tags];
  if (flags) row.push(flags);
  items.push(row);
});
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
  about: 'Hand-drawn pictures: OpenMoji (openmoji.org), CC BY-SA 4.0. Bold pictures: Noto Emoji font by Google, SIL Open Font License.',
  cats: CATS, items
}));
console.log(items.length + ' subjects: ' + drawn + ' hand-drawn + ' + bold + ' bold = ' + (drawn + bold) + ' pictures');
const per = {}; items.forEach(x => { per[CATS[x[1]][1]] = (per[CATS[x[1]][1]] || 0) + (x[2] ? 1 : 0) + (x[3] ? 1 : 0); });
console.log(per);
if (process.env.DEBUG) list.forEach((x, i) => x.noto && console.log(x.e.hexcode, x.e.annotation, ink[i][1], ink[i][2]));
