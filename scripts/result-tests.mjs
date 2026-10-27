#!/usr/bin/env node
/* Checks that the main tools actually produce the right result, not just that
 * their pages load (that is scripts/smoke-test.mjs). Each test drives a tool in
 * a real browser with a small file from scripts/fixtures/, waits for the
 * download, and checks the downloaded file (type, size, content).
 *
 *   node scripts/result-tests.mjs                 # every test
 *   node scripts/result-tests.mjs media-convert   # only tests whose name contains the words
 *
 * AI tools are tested with canned AI answers, so no AI credit is used.
 * The tests need the internet for CDN libraries (FFmpeg, Tesseract, pdf-lib…).
 * Runs in CI on every pull request (workflow result-tests.yml).
 *
 * Env: CHROMIUM=/path/to/chrome, BROWSER_PROXY=http://host:port, IGNORE_CERTS=1
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'scripts', 'fixtures');

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf', '.txt': 'text/plain' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('not found'); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// ---------- helpers for tests ----------
const magic = (buf, ...bytes) => bytes.every((b, i) => buf[i] === b);
const ascii = (buf, at, text) => buf.slice(at, at + text.length).toString('latin1') === text;
function expect(ok, msg) { if (!ok) throw new Error(msg); }
async function downloadOf(page, action, timeout) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: timeout || 120000 }), action()]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(file) };
}
// Answer AI requests (Gemini proxy) with canned text chosen by the request.
async function fakeAi(ctx, answer) {
  await ctx.route(/migabuilder-gemini/, async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    const text = answer(body);
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
  });
}

const TESTS = [];
const test = (name, file, run, opts) => TESTS.push(Object.assign({ name, file, run }, opts || {}));

// ---------- the tests ----------
test('media-convert: compress a video to a smaller MP4', 'media-convert.html', async (page) => {
  await page.click('.tab[data-mode="convert"]');
  await page.setInputFiles('#ffFile', path.join(FIX, 'clip.mp4'));
  await page.selectOption('#ffWidth', '640');
  const out = await downloadOf(page, () => page.click('#ffConvert'), 240000);
  expect(/\.mp4$/.test(out.name), 'expected an .mp4, got ' + out.name);
  expect(ascii(out.buf, 4, 'ftyp'), 'download is not an MP4 file');
  expect(out.buf.length > 1000, 'MP4 is suspiciously small: ' + out.buf.length);
  await page.waitForFunction(() => /Finished/.test(document.querySelector('#ffProgress').textContent));
}, { timeout: 300000 });

test('media-convert: extract MP3 audio', 'media-convert.html', async (page) => {
  await page.click('.tab[data-mode="convert"]');
  await page.setInputFiles('#ffFile', path.join(FIX, 'clip.mp4'));
  await page.selectOption('#ffMode', 'mp3');
  const out = await downloadOf(page, () => page.click('#ffConvert'), 240000);
  expect(/\.mp3$/.test(out.name), 'expected an .mp3, got ' + out.name);
  expect(ascii(out.buf, 0, 'ID3') || (out.buf[0] === 0xff && (out.buf[1] & 0xe0) === 0xe0), 'download is not an MP3 file');
}, { timeout: 300000 });

test('media-convert: remove location data keeps the video', 'media-convert.html', async (page) => {
  expect(fs.readFileSync(path.join(FIX, 'clip.mp4')).includes('+59.3293'), 'fixture should carry a GPS tag');
  await page.click('.tab[data-mode="convert"]');
  await page.setInputFiles('#ffFile', path.join(FIX, 'clip.mp4'));
  await page.selectOption('#ffMode', 'clean');
  const out = await downloadOf(page, () => page.click('#ffConvert'), 240000);
  expect(ascii(out.buf, 4, 'ftyp'), 'download is not an MP4 file');
  expect(!out.buf.includes('+59.3293'), 'the GPS location is still in the file');
}, { timeout: 300000 });

test('media-convert: cancel stops the job and the next one still works', 'media-convert.html', async (page) => {
  await page.click('.tab[data-mode="convert"]');
  // A 30-second clip, and Cancel only once converting has begun: on a fast runner the
  // 3-second clip finished before the click landed, so the test saw "Finished".
  await page.setInputFiles('#ffFile', path.join(FIX, 'clip-long.mp4'));
  await page.click('#ffConvert');
  await page.waitForFunction(() => /Converting/.test(document.querySelector('#ffProgress').textContent), null, { timeout: 120000 });
  await page.click('#ffProgress .mp-cancel');
  await page.waitForFunction(() => /Cancelled/.test(document.querySelector('#ffProgress').textContent));
  await page.waitForFunction(() => !document.querySelector('#ffConvert').disabled, null, { timeout: 60000 });
  await page.selectOption('#ffMode', 'mp3');
  const out = await downloadOf(page, () => page.click('#ffConvert'), 240000);
  expect(/\.mp3$/.test(out.name), 'expected an .mp3 after cancelling, got ' + out.name);
}, { timeout: 300000 });

test('media-convert: cancel while the engine downloads stops the job', 'media-convert.html', async (page, ctx) => {
  // Hold the engine download so Cancel lands while it is still coming in.
  await ctx.route(/@ffmpeg\/core/, async route => { await new Promise(r => setTimeout(r, 4000)); await route.continue(); });
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.click('.tab[data-mode="convert"]');
  await page.setInputFiles('#ffFile', path.join(FIX, 'clip.mp4'));
  await page.click('#ffConvert');
  await page.waitForFunction(() => /Downloading the conversion engine/.test(document.querySelector('#ffProgress').textContent), null, { timeout: 60000 });
  await page.click('#ffProgress .mp-cancel');
  await page.waitForFunction(() => !document.querySelector('#ffConvert').disabled, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  expect(/Cancelled/.test(await page.textContent('#ffProgress')), 'the panel no longer says Cancelled: ' + (await page.textContent('#ffProgress')).slice(0, 120));
  expect(downloads === 0, 'the cancelled job still made a file');
  await page.selectOption('#ffMode', 'mp3');
  const out = await downloadOf(page, () => page.click('#ffConvert'), 240000);
  expect(/\.mp3$/.test(out.name), 'expected an .mp3 after cancelling, got ' + out.name);
}, { timeout: 300000 });

test('media-convert: transcribe a spoken file into SRT and VTT subtitles', 'media-convert.html', async (page) => {
  await page.click('.tab[data-mode="filetx"]');
  await page.setInputFiles('#txFile', path.join(FIX, 'speech.mp3'));
  await page.selectOption('#txModel', 'onnx-community/whisper-tiny');
  await page.selectOption('#txLang', 'en');
  await page.click('#txStart');
  await page.waitForFunction(() => !document.querySelector('#txSrt').disabled, null, { timeout: 280000 });
  const srt = (await downloadOf(page, () => page.click('#txSrt'))).buf.toString('utf8');
  expect(/^1\n00:00:0\d,\d{3} --> 00:00:\d\d,\d{3}\n/.test(srt), 'not an SRT file: ' + srt.slice(0, 80));
  expect(/weather|welcome|recording/i.test(srt), 'the spoken words are missing: ' + srt.slice(0, 200));
  const vtt = (await downloadOf(page, () => page.click('#txVtt'))).buf.toString('utf8');
  expect(/^WEBVTT\n\n00:00:0\d\.\d{3} --> /.test(vtt), 'not a VTT file: ' + vtt.slice(0, 80));
}, { timeout: 300000 });

test('media-convert: cancel a transcription and start again', 'media-convert.html', async (page) => {
  await page.click('.tab[data-mode="filetx"]');
  await page.setInputFiles('#txFile', path.join(FIX, 'speech.mp3'));
  await page.selectOption('#txModel', 'onnx-community/whisper-tiny');
  await page.click('#txStart');
  await page.waitForFunction(() => /Starting|Downloading|Listening/.test(document.querySelector('#txProgress').textContent), null, { timeout: 60000 });
  await page.click('#txProgress .mp-cancel');
  await page.waitForFunction(() => !document.querySelector('#txStart').disabled, null, { timeout: 30000 });
  expect(/Cancelled/.test(await page.textContent('#txProgress')), 'the panel does not say Cancelled');
  await page.click('#txStart');
  await page.waitForFunction(() => !document.querySelector('#txTxt').disabled, null, { timeout: 280000 });
  expect(/weather|welcome|recording/i.test(await page.inputValue('#txText')), 'no transcript after starting again');
}, { timeout: 300000 });

test('ocr-forge: read two images with one engine and join a searchable PDF', 'ocr-forge.html', async (page) => {
  let workers = 0;
  page.on('worker', () => workers++);
  await page.setInputFiles('#image', [path.join(FIX, 'text-1.png'), path.join(FIX, 'text-2.png')]);
  await page.selectOption('#language', 'eng');
  await page.click('#extract');
  await page.waitForFunction(() => /Text extracted/.test(document.querySelector('#ocrProgress').textContent), null, { timeout: 240000 });
  const text = (await page.inputValue('#output')).toUpperCase();
  expect(/SUNRISE BAKERY/.test(text), 'first image not read: ' + text.slice(0, 120));
  expect(/INVOICE NUMBER 2041/.test(text), 'second image not read: ' + text.slice(0, 200));
  expect(workers <= 1, 'expected one reused OCR worker, saw ' + workers);
  const pdf = await downloadOf(page, () => page.click('#pdf'));
  expect(ascii(pdf.buf, 0, '%PDF'), 'searchable PDF is not a PDF');
  const pages = await page.evaluate(async b64 => (await PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))).getPageCount(), pdf.buf.toString('base64'));
  expect(pages === 2, 'searchable PDF should have 2 pages, has ' + pages);
}, { timeout: 300000 });

test('image-studio: AI sharpen 2× runs the on-device model over every tile and downloads a twice-as-big PNG', 'image-studio.html', async (page) => {
  await page.setInputFiles('#images', path.join(FIX, 'small-photo.png'));
  await page.click('.tab[data-mode="upscale"]');
  await page.selectOption('#upMethod', 'ai2');
  await page.click('#makeUpscale');
  await page.waitForFunction(() => /Sharpened to|went wrong|could not|memory/i.test(document.querySelector('#upProgress').textContent), null, { timeout: 240000 });
  const msg = await page.textContent('#upProgress');
  expect(/Sharpened to 320 × 240/.test(msg), 'upscale did not finish: ' + msg.trim().slice(0, 200));
  const png = await downloadOf(page, () => page.click('#download'));
  expect(magic(png.buf, 0x89, 0x50, 0x4e, 0x47), 'download is not a PNG');
  // The model really ran: its result differs from a plain browser enlargement, but still looks like the same picture.
  const diff = await page.evaluate(async b64 => {
    const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const ai = await load('data:image/png;base64,' + b64), src = await load('scripts/fixtures/small-photo.png');
    const draw = (img, smooth) => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, 320, 240); return g.getImageData(0, 0, 320, 240).data; };
    const a = draw(ai), b = draw(src); let sum = 0, same = 0;
    for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); sum += d; if (d === 0) same++; }
    return { w: ai.width, h: ai.height, mean: sum / (a.length / 4) / 3, same: same / (a.length / 4) };
  }, png.buf.toString('base64'));
  expect(diff.w === 320 && diff.h === 240, `PNG should be 320 × 240, is ${diff.w} × ${diff.h}`);
  expect(diff.same < 0.9, 'result is identical to a plain enlargement, so the AI did not run');
  expect(diff.mean < 25, 'result does not look like the original picture (mean difference ' + diff.mean.toFixed(1) + ')');
}, { timeout: 300000 });

test('mind-map: a pasted list becomes a map; PNG, SVG, outline and the map file hold every idea', 'mind-map.html', async (page) => {
  await page.fill('#outlineIn', 'Bakery plan\n- Menu\n  - Sourdough\n  - Cinnamon buns\n- Shop\n  - Rent');
  await page.click('#fromOutline');
  expect(await page.locator('#nodes .node').count() === 6, 'the list should make 6 ideas');
  // Add an idea with the keyboard: select "Shop", Tab, type, Enter.
  await page.locator('#nodes .node', { hasText: 'Shop' }).click();
  await page.keyboard.press('Tab');
  await page.keyboard.type('Opening day');
  await page.keyboard.press('Enter');
  expect(await page.locator('#nodes .node', { hasText: 'Opening day' }).count() === 1, 'the new idea was not added');
  // A sticky note placed on the board opens for typing straight away.
  await page.click('[data-tool=note]');
  const bb = await page.locator('#board').boundingBox();
  await page.mouse.click(bb.x + 90, bb.y + 60);
  await page.keyboard.type('Call the bank');
  await page.keyboard.press('Enter');
  expect(await page.locator('#nodes .node', { hasText: 'Call the bank' }).count() === 1, 'the sticky note was not added');
  const svg = (await downloadOf(page, () => page.click('#svg'))).buf.toString('utf8');
  for (const w of ['Bakery plan', 'Cinnamon buns', 'Opening day', 'Call the bank']) expect(svg.includes(w), 'SVG is missing ' + w);
  expect(/^<\?xml[\s\S]*<svg[^>]*viewBox=/.test(svg), 'SVG has no viewBox');
  const png = await downloadOf(page, () => page.click('#png'));
  expect(magic(png.buf, 0x89, 0x50, 0x4e, 0x47) && png.buf.length > 5000, 'PNG is missing or empty');
  const outline = (await downloadOf(page, () => page.click('#outlineBtn'))).buf.toString('utf8');
  expect(/^Bakery plan\n  - Menu\n    - Sourdough\n    - Cinnamon buns\n  - Shop\n    - Rent\n    - Opening day\nNote: Call the bank/.test(outline), 'outline is wrong:\n' + outline);
  const file = await downloadOf(page, () => page.click('#save'));
  const json = JSON.parse(file.buf.toString('utf8'));
  expect(json.app === 'migabuilder-mind-map' && json.board.nodes.length === 8, 'map file should hold 8 ideas');
  // Open the saved file again after starting an empty whiteboard.
  page.once('dialog', d => d.accept());
  await page.selectOption('#template', 'whiteboard');
  expect(await page.locator('#nodes .node').count() === 0, 'the whiteboard should start empty');
  const tmp = path.join(os.tmpdir(), 'mind-map-test.json');
  fs.writeFileSync(tmp, file.buf);
  await page.setInputFiles('#open', tmp);
  await page.waitForFunction(() => document.querySelectorAll('#nodes .node').length === 8);
});

test('random-forge: a locked part survives rerolls, the idea and the AI plan download, and Build it opens a playable game', 'random-forge.html', async (page, ctx, base) => {
  await fakeAi(ctx, () => 'PITCH\nA fox races through the frozen north.\n\nTHE MAIN PARTS\n- Ice lanes\n- Alien scouts\n\nWHAT MAKES IT SPECIAL\nTreasure everywhere.\n\nFIRST THREE STEPS\n1. Play it\n2. Tune it\n3. Share it');
  await page.click('#kinds button[data-k="game"]');
  const hero = await page.textContent('.slot[data-n="2"] .val');
  await page.click('.slot[data-n="2"] .lock');
  for (let i = 0; i < 6; i++) await page.click('#rerollBtn');
  expect(await page.textContent('.slot[data-n="2"] .val') === hero, 'the locked hero changed on reroll');
  const title = (await page.textContent('#title')).trim();
  const idea = (await downloadOf(page, () => page.click('#dlBtn'))).buf.toString('utf8');
  expect(idea.startsWith(title + '\n') && idea.includes('Hero: ' + hero) && /3d-game-forge\.html#g=j/.test(idea) && /random-forge\.html#r=game\./.test(idea), 'idea file is wrong:\n' + idea);
  await page.click('#planBtn');
  await page.waitForSelector('#plan:not(.hidden)');
  const plan = (await downloadOf(page, () => page.click('#planDl'))).buf.toString('utf8');
  expect(plan.startsWith(title.toUpperCase()) && plan.includes('FIRST THREE STEPS') && plan.includes('Hero: ' + hero), 'plan file is wrong:\n' + plan.slice(0, 300));
  // The share link brings back exactly this creation.
  const shared = page.url();
  const again = await ctx.newPage();
  await again.goto(shared);
  expect((await again.textContent('#title')).trim() === title, 'the share link shows a different creation');
  // Build it: 3D Game Forge opens with this game set up.
  const spec = await page.evaluate(() => window.RandomForge.gameSpec());
  await again.goto(base + '/' + await page.getAttribute('#buildBtn', 'href'));
  await again.waitForFunction(() => document.getElementById('f_title').value.length > 0);
  expect(await again.inputValue('#f_title') === spec.title && await again.inputValue('#f_env') === spec.env && await again.inputValue('#f_player') === spec.player, '3D Game Forge did not open the rolled game');
  // Picture and story ideas arrive filled in.
  await page.click('#kinds button[data-k="picture"]');
  await again.goto(base + '/' + await page.getAttribute('#buildBtn', 'href'));
  expect((await again.inputValue('#prompt')) === (await page.textContent('#pitch')).trim(), 'Picture Forge did not get the picture idea');
});

// Text of every page of a PDF, read with pdf.js inside the page (the page must load pdf.js).
async function pdfPageTexts(page, buf) {
  if (!(await page.evaluate(() => !!window.pdfjsLib))) await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });
  return page.evaluate(async b64 => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) out.push((await (await doc.getPage(i)).getTextContent()).items.map(t => t.str).join(' '));
    return out;
  }, buf.toString('base64'));
}

test('pdf-forge: reorder and remove pages with thumbnails', 'pdf-forge.html', async (page) => {
  await page.setInputFiles('#files', path.join(FIX, 'three-pages.pdf'));
  await page.waitForFunction(() => document.querySelectorAll('#thumbs li canvas').length === 3, null, { timeout: 60000 });
  await page.click('#thumbs li:nth-child(1) button[title="Move later"]');
  await page.click('#thumbs li:nth-child(3) button[title="Remove page"]');
  expect((await page.inputValue('#pages')) === '2, 1', 'pages box should read "2, 1", got ' + await page.inputValue('#pages'));
  const out = await downloadOf(page, () => page.click('#merge'));
  expect(ascii(out.buf, 0, '%PDF'), 'download is not a PDF');
  const texts = await pdfPageTexts(page, out.buf);
  expect(texts.length === 2 && /PAGE TWO/.test(texts[0]) && /PAGE ONE/.test(texts[1]), 'wrong pages or order: ' + JSON.stringify(texts));
});

test('pdf-forge: split pages into a ZIP', 'pdf-forge.html', async (page) => {
  await page.setInputFiles('#files', path.join(FIX, 'three-pages.pdf'));
  const out = await downloadOf(page, () => page.click('#split'));
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const names = (out.buf.toString('latin1').match(/page-\d{3}\.pdf/g) || []);
  expect(new Set(names).size === 3, 'ZIP should hold 3 page PDFs, found ' + new Set(names).size);
});

test('pdf-forge: PDF to images saves every page as a JPG in a ZIP', 'pdf-forge.html', async (page) => {
  await page.setInputFiles('#toImgFile', path.join(FIX, 'three-pages.pdf'));
  const out = await downloadOf(page, () => page.click('#toImgBtn'), 60000);
  expect(out.name === 'three-pages-pages.zip', 'expected three-pages-pages.zip, got ' + out.name);
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const names = [...new Set(out.buf.toString('latin1').match(/three-pages-page-\d{3}\.jpg/g) || [])];
  expect(names.length === 3, 'ZIP should hold 3 page images, found ' + names.join(', '));
  await page.waitForSelector('#toImgProgress .mp-panel.mp-ok', { timeout: 10000 });
});

test('pdf-forge: PDF to images saves one chosen page as a sharp PNG', 'pdf-forge.html', async (page) => {
  await page.setInputFiles('#toImgFile', path.join(FIX, 'three-pages.pdf'));
  await page.selectOption('#toImgFormat', 'image/png');
  await page.selectOption('#toImgDpi', '300');
  await page.fill('#toImgPages', '2');
  const out = await downloadOf(page, () => page.click('#toImgBtn'), 60000);
  expect(out.name === 'three-pages-page-002.png', 'expected three-pages-page-002.png, got ' + out.name);
  expect(magic(out.buf, 0x89, 0x50, 0x4e, 0x47), 'download is not a PNG');
  const w = out.buf.readUInt32BE(16), h = out.buf.readUInt32BE(20);
  expect(w > 1000 && h > 1000, '300 DPI page should be over 1000 px each way, got ' + w + '×' + h);
});

test('heic: a picked iPhone photo (HEIC) becomes a JPEG page in PDF Forge', 'pdf-forge.html', async (page) => {
  await page.setInputFiles('#images', path.join(FIX, 'photo.heic'));
  await page.waitForFunction(() => /\.jpg$/.test((document.querySelector('#images').files[0] || {}).name || ''), null, { timeout: 60000 });
  const out = await downloadOf(page, () => page.click('#imagesPdf'));
  expect(ascii(out.buf, 0, '%PDF'), 'download is not a PDF');
  expect(out.buf.includes('/DCTDecode'), 'the PDF holds no JPEG image');
}, { timeout: 120000 });

test('heic: a dropped iPhone photo (HEIC) converts in File Forge', 'file-forge.html', async (page) => {
  const b64 = fs.readFileSync(path.join(FIX, 'photo.heic')).toString('base64');
  await page.evaluate(b64 => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), dt = new DataTransfer();
    dt.items.add(new File([bytes], 'photo.heic', { type: 'image/heic' }));
    document.querySelector('#dropZone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, b64);
  await page.waitForFunction(() => !document.querySelector('#convertBtn').disabled, null, { timeout: 60000 });
  await page.uncheck('#zipOutput');
  const out = await downloadOf(page, () => page.click('#convertBtn'));
  expect(/^photo\./.test(out.name), 'expected a converted photo, got ' + out.name);
  expect(magic(out.buf, 0xff, 0xd8) || magic(out.buf, 0x89, 0x50, 0x4e, 0x47) || ascii(out.buf, 8, 'WEBP'), 'download is not a JPEG, PNG or WebP image');
}, { timeout: 120000 });

// Fires the paste event a browser sends for Ctrl+V with files on the clipboard (a screenshot arrives as "image.png").
async function pasteFile(page, file, name, type) {
  const b64 = fs.readFileSync(path.join(FIX, file)).toString('base64');
  await page.evaluate(([b64, name, type]) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), dt = new DataTransfer();
    dt.items.add(new File([bytes], name, { type }));
    document.body.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  }, [b64, name, type]);
}

test('paste: a pasted screenshot opens in File Forge and converts', 'file-forge.html', async (page) => {
  await page.waitForSelector('.miga-paste-note', { state: 'attached', timeout: 15000 });
  await pasteFile(page, 'small-photo.png', 'image.png', 'image/png');
  await page.waitForFunction(() => !document.querySelector('#convertBtn').disabled, null, { timeout: 30000 });
  await page.uncheck('#zipOutput');
  const out = await downloadOf(page, () => page.click('#convertBtn'));
  expect(/^pasted-/.test(out.name), 'the pasted screenshot should get a "pasted-…" name, got ' + out.name);
  expect(magic(out.buf, 0xff, 0xd8) || magic(out.buf, 0x89, 0x50, 0x4e, 0x47) || ascii(out.buf, 8, 'WEBP'), 'download is not a JPEG, PNG or WebP image');
});

test('paste: a pasted PDF goes to PDF Forge\'s PDF picker and splits', 'pdf-forge.html', async (page) => {
  await page.waitForSelector('.miga-paste-note', { state: 'attached', timeout: 15000 });
  await pasteFile(page, 'three-pages.pdf', 'three-pages.pdf', 'application/pdf');
  await page.waitForFunction(() => (document.querySelector('#files').files[0] || {}).name === 'three-pages.pdf', null, { timeout: 15000 });
  expect(await page.evaluate(() => document.querySelector('#images').files.length === 0), 'the PDF must not land in the images picker');
  const out = await downloadOf(page, () => page.click('#split'));
  const names = (out.buf.toString('latin1').match(/page-\d{3}\.pdf/g) || []);
  expect(new Set(names).size === 3, 'ZIP should hold 3 page PDFs, found ' + new Set(names).size);
});

// A noisy 1600×1200 photo-like picture, made in the page, so it is hard to compress (a few hundred KB as JPG).
async function addNoisyPhoto(page) {
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
    const x = c.getContext('2d'), d = x.createImageData(c.width, c.height);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < d.data.length; i += 4) { const p = i / 4, gx = p % 1600, gy = (p / 1600) | 0; d.data[i] = gx / 7 + rnd() * 90; d.data[i + 1] = gy / 5 + rnd() * 90; d.data[i + 2] = 120 + rnd() * 120; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'holiday.png', { type: 'image/png' }));
    const input = document.querySelector('#fileInput'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => !document.querySelector('#convertBtn').disabled, null, { timeout: 30000 });
  await page.uncheck('#zipOutput');
}

test('file-forge: "keep each file under 50 KB" makes a JPG that fits the limit', 'file-forge.html', async (page) => {
  await addNoisyPhoto(page);
  await page.selectOption('#formatSelect', 'image/jpeg');
  await page.fill('#targetKb', '50');
  const out = await downloadOf(page, () => page.click('#convertBtn'));
  expect(magic(out.buf, 0xff, 0xd8), 'download is not a JPEG');
  expect(out.buf.length <= 50000, 'JPG should be at most 50,000 bytes, got ' + out.buf.length);
  expect(out.buf.length > 20000, 'JPG should use most of the allowance (quality kept as high as fits), got ' + out.buf.length);
  expect(await page.textContent('.file-status') === '✓ Done', 'status should be ✓ Done, got ' + await page.textContent('.file-status'));
});

test('file-forge: a size limit on PNG shrinks the picture until it fits', 'file-forge.html', async (page) => {
  await addNoisyPhoto(page);
  await page.selectOption('#formatSelect', 'image/png');
  await page.fill('#targetKb', '150');
  const out = await downloadOf(page, () => page.click('#convertBtn'));
  expect(magic(out.buf, 0x89, 0x50, 0x4e, 0x47), 'download is not a PNG');
  expect(out.buf.length <= 150000, 'PNG should be at most 150,000 bytes, got ' + out.buf.length);
  expect(out.buf.readUInt32BE(16) < 1600, 'PNG should be smaller than the 1600 px original, width ' + out.buf.readUInt32BE(16));
});

test('qr-forge: the downloaded QR code scans back to the text', 'qr-forge.html', async (page) => {
  await page.fill('#qrText', 'https://migabuilder.com/qr-test');
  await page.waitForTimeout(500);
  const out = await downloadOf(page, () => page.click('#downloadBtn'));
  const isPng = magic(out.buf, 0x89, 0x50, 0x4e, 0x47), isSvg = /<svg/.test(out.buf.slice(0, 400).toString());
  expect(isPng || isSvg, 'download is not a PNG or SVG: ' + out.name);
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js' });
  const text = await page.evaluate(async ({ b64, type }) => {
    const img = new Image(); img.src = 'data:' + type + ';base64,' + b64; await img.decode();
    const w = Math.max(img.naturalWidth, 300), h = Math.max(img.naturalHeight, 300), c = document.createElement('canvas'); c.width = w + 40; c.height = h + 40;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 20, 20, w, h);
    const r = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    return r ? r.data : null;
  }, { b64: out.buf.toString('base64'), type: isPng ? 'image/png' : 'image/svg+xml' });
  expect(text === 'https://migabuilder.com/qr-test', 'QR code reads as ' + JSON.stringify(text));
});

test('cv-forge: Download PDF makes a PDF with the name in it', 'cv-forge.html', async (page) => {
  await page.fill('#name', 'Amina Wanjiru');
  await page.fill('#role', 'Head Baker');
  await page.fill('#summary', 'Twelve years of artisan bread and pastry, leading a team of six.');
  const out = await downloadOf(page, () => page.click('#pdfBtn'));
  expect(ascii(out.buf, 0, '%PDF'), 'download is not a PDF: ' + out.name);
  const texts = await pdfPageTexts(page, out.buf);
  if (process.env.SHOW_TEXT) console.log(texts.join('\n').slice(0, 700));
  expect(texts.length >= 1 && /Amina Wanjiru/.test(texts.join(' ')), 'the name is not in the PDF text');
  expect(/Twelve years of artisan bread/.test(texts.join(' ')), 'the summary is not readable as text');
});

test('invoice-forge: download holds the business and client names', 'invoice-forge.html', async (page) => {
  await page.fill('#bizName', 'Sunrise Bakery');
  await page.fill('#clientName', 'Kilimani Cafe');
  const out = await downloadOf(page, () => page.click('#downloadBtn'));
  const html = out.buf.toString('utf8');
  expect(/<html/i.test(html), 'download is not an HTML document: ' + out.name);
  expect(html.includes('Kilimani Cafe') && html.includes('Sunrise Bakery'), 'business or client name missing from the invoice');
});

test('psychology-atlas: printable quiz has every question and an answer key', 'psychology-atlas.html', async (page) => {
  await page.selectOption('#qSource', 'school');
  await page.selectOption('#qCount', '15');
  const quiz = await downloadOf(page, () => page.click('#printQuiz'));
  const html = quiz.buf.toString('utf8');
  expect(quiz.name === 'psychology-quiz.html', 'unexpected quiz file name: ' + quiz.name);
  expect(html.includes('History of psychology quiz'), 'the quiz has no title');
  const keyAt = html.indexOf('Answer key');
  expect(keyAt > 0, 'the quiz has no answer key');
  const questions = (html.slice(0, keyAt).match(/<li><p>/g) || []).length, answers = (html.slice(keyAt).match(/<li>[A-D]\) /g) || []).length;
  expect(questions === 15 && answers === 15, 'expected 15 questions and 15 answers, got ' + questions + ' and ' + answers);
});

// Species Atlas reads iNaturalist; answer with a saved lion record so the test needs no network.
async function fakeINat(ctx) {
  const lion = fs.readFileSync(path.join(FIX, 'species-lion.json'), 'utf8');
  await ctx.route(/api\.inaturalist\.org\/v1\//, route => {
    const u = route.request().url();
    if (/\.png/.test(u)) return route.fulfill({ status: 204, body: '' });
    const body = /\/taxa\/41964\?/.test(u) ? lion : JSON.stringify({ total_results: 0, page: 1, per_page: 30, results: [] });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body });
  });
  await ctx.route(/inaturalist-open-data|static\.inaturalist|tile\.openstreetmap/, r => r.fulfill({ status: 204, body: '' }));
}
test('species-atlas: fact sheet and printable species list hold the species', 'species-atlas.html', async (page, ctx, base) => {
  await page.goto(base + '/species-atlas.html#taxon=41964');
  await page.waitForFunction(() => /Lion/.test((document.querySelector('#info h2') || {}).textContent || ''));
  const sheet = await downloadOf(page, () => page.click('#sheetBtn'));
  const html = sheet.buf.toString('utf8');
  expect(sheet.name === 'lion-fact-sheet.html', 'unexpected fact sheet name: ' + sheet.name);
  expect(html.includes('Panthera leo') && html.includes('Vulnerable') && html.includes('Felidae'), 'fact sheet is missing the name, status or classification');
  expect(html.includes('seasav'), 'fact sheet does not credit the photographer');
  await page.click('#starBtn');
  const list = await downloadOf(page, () => page.click('#dlList'));
  expect(list.name === 'my-species-list.html', 'unexpected list name: ' + list.name);
  const lh = list.buf.toString('utf8');
  expect(lh.includes('My species list (1)') && lh.includes('Panthera leo'), 'species list does not hold the lion');
}, { setup: fakeINat });

test('physics-map: printable quiz has every question and an answer key; a fact sheet holds the planet data', 'physics-map.html', async (page) => {
  await page.selectOption('#qSource', 'all');
  await page.selectOption('#qCount', '15');
  const quiz = await downloadOf(page, () => page.click('#printQuiz'));
  const html = quiz.buf.toString('utf8');
  expect(quiz.name === 'physics-quiz.html', 'unexpected quiz file name: ' + quiz.name);
  const keyAt = html.indexOf('Answer key');
  expect(keyAt > 0, 'the quiz has no answer key');
  const questions = (html.slice(0, keyAt).match(/<li><p>/g) || []).length, answers = (html.slice(keyAt).match(/<li>[A-D]\) /g) || []).length;
  expect(questions === 15 && answers === 15, 'expected 15 questions and 15 answers, got ' + questions + ' and ' + answers);
  await page.click('#playBtn'); // stop the planets so Mars holds still
  await page.click('[data-k="body:mars"]');
  const sheet = await downloadOf(page, () => page.click('#sheetBtn'));
  const text = sheet.buf.toString('utf8');
  expect(sheet.name === 'mars-fact-sheet.html', 'unexpected fact sheet name: ' + sheet.name);
  expect(/Mars/.test(text) && /6,792 km/.test(text) && /687 Earth days/.test(text), 'the fact sheet is missing Mars’s diameter or year');
  expect(!/<input|<button/.test(text), 'the fact sheet still contains page controls');
});

test('pdf-compress: output is a valid PDF with every page', 'pdf-compress.html', async (page) => {
  await page.setInputFiles('#file', path.join(FIX, 'photo-pages.pdf'));
  await page.click('#go');
  await page.waitForSelector('#dl:not(.hidden)', { timeout: 120000 });
  const out = await downloadOf(page, () => page.click('#dl'));
  expect(ascii(out.buf, 0, '%PDF'), 'download is not a PDF');
  const texts = await pdfPageTexts(page, out.buf);
  expect(texts.length === 3, 'compressed PDF should keep 3 pages, has ' + texts.length);
  const before = fs.statSync(path.join(FIX, 'photo-pages.pdf')).size;
  expect(out.buf.length < before, 'compressed PDF is not smaller (' + out.buf.length + ' vs ' + before + ' bytes)');
});

const SITE_PLAN = { siteName: 'Sunrise Bakery', tagline: 'Fresh bread every morning', pages: [{ slug: 'index', navLabel: 'Home', purpose: 'Homepage' }, { slug: 'menu', navLabel: 'Menu', purpose: 'Breads and cakes' }, { slug: 'contact', navLabel: 'Contact', purpose: 'Contact details and a form' }], design: { mood: 'warm', primary: '#b4530f', accent: '#f4b942', theme: 'light', headingFont: 'Fraunces', bodyFont: 'Inter', corners: 'round', ctaLabel: 'Order today' } };
const SITE_PAGE = '<title>Sunrise Bakery</title>\n<meta name="description" content="Fresh bread.">\n<main><section class="hero hero-center"><div class="container"><h1>Real sourdough</h1><p class="lead">Baked at 4am.</p><div class="actions"><a class="btn btn-primary" href="menu.html">See the menu</a></div></div></section><section class="section"><div class="container"><div class="grid grid-3"><article class="card"><h3>Local flour</h3></article></div></div></section></main>';
test('clip-forge: Auto Edit plans two clips with the AI and renders one video', 'clip-forge.html', async (page, ctx) => {
  let asked = '';
  await fakeAi(ctx, body => {
    if (/finishing touches/.test(body.systemPrompt || '')) return JSON.stringify({ look: 'warm', textStyle: 'pop', shots: [{ n: 1, effect: 'punch', sound: 'whoosh', text: '' }, { n: 2, effect: 'slowzoom', sound: 'success', text: '' }] });
    asked = body.userPrompt || '';
    const ids = (asked.match(/^#(\d+) /gm) || []).map(x => parseInt(x.slice(1), 10));
    return JSON.stringify({ hook: 'Two places, one day', cta: 'Follow for more', shots: [{ id: ids[ids.length - 1], why: 'busy start' }, { id: ids[0], why: 'calm ending' }] });
  });
  const clip = fs.readFileSync(path.join(FIX, 'clip.webm')); // WebM: test Chromium has no H.264
  await page.click('#autoEditBox summary');
  await page.setInputFiles('#aeClipsInput', [{ name: 'beach.webm', mimeType: 'video/webm', buffer: clip }, { name: 'city.webm', mimeType: 'video/webm', buffer: clip }]);
  await page.waitForFunction(() => /2 clips measured/.test(document.querySelector('#aeStatus').textContent), null, { timeout: 60000 });
  await page.fill('#aeLength', '4');
  await page.selectOption('#aeStyle', 'fast');
  await page.click('#aePlanBtn');
  await page.waitForFunction(() => document.querySelectorAll('#aeShotList .ae-item').length >= 2, null, { timeout: 30000 });
  expect(/"beach\.webm"/.test(asked) && /"city\.webm"/.test(asked), 'the AI was not told about both clips');
  const summary = await page.textContent('#aePlanSummary');
  expect(/AI picked/.test(summary), 'the AI plan was not used: ' + summary);
  expect(/city\.webm/.test(await page.textContent('#aeShotList .ae-item')), 'the first shot should be the AI\'s hook from city.webm');
  expect(/Two places, one day/.test(await page.textContent('#captionsList')), 'the hook text was not added as a text overlay');
  await page.click('#aeFxAiBtn');
  await page.waitForFunction(() => /AI picked these/.test(document.querySelector('#aeFxStatus').textContent), null, { timeout: 30000 });
  const fx = await page.$$eval('#aeShotList select[data-f="fx"]', s => s.map(x => x.value));
  expect(fx[0] === 'punch' && fx[1] === 'slowzoom', 'the AI effects were not applied: ' + fx);
  expect(await page.inputValue('#aeLook') === 'warm', 'the AI look was not applied');
  await page.locator('#aeShotList input[data-f="text"]').nth(1).fill('Over here');
  const out = await downloadOf(page, async () => {
    await page.click('#aeRenderBtn');
    await page.waitForSelector('#downloadVideoBtn:not([disabled])', { timeout: 60000 });
    await page.click('#downloadVideoBtn');
  }, 90000);
  expect(magic(out.buf, 0x1a, 0x45, 0xdf, 0xa3), 'download is not a WebM video');
  expect(out.buf.length > 5000, 'video is suspiciously small: ' + out.buf.length);
}, { timeout: 150000 });

test('clip-forge: talk to yourself joins two takes into one video', 'clip-forge.html', async (page) => {
  const clip = fs.readFileSync(path.join(FIX, 'clip.webm'));
  await page.click('#cloneBox summary');
  await page.setInputFiles('#cloneInputA', { name: 'take-1.webm', mimeType: 'video/webm', buffer: clip });
  await page.waitForFunction(() => /✓/.test(document.querySelector('#cloneHintA').textContent), null, { timeout: 30000 });
  await page.setInputFiles('#cloneInputB', { name: 'take-2.webm', mimeType: 'video/webm', buffer: clip });
  await page.waitForSelector('#cloneOptions', { state: 'visible', timeout: 30000 });
  await page.fill('#cloneOffset', '1');
  const out = await downloadOf(page, async () => {
    await page.click('#cloneRenderBtn');
    await page.waitForSelector('#downloadVideoBtn:not([disabled])', { timeout: 60000 });
    await page.click('#downloadVideoBtn');
  }, 90000);
  expect(magic(out.buf, 0x1a, 0x45, 0xdf, 0xa3), 'download is not a WebM video');
  expect(out.buf.length > 5000, 'video is suspiciously small: ' + out.buf.length);
  await page.click('#cloneToAeBtn');
  await page.waitForFunction(() => /1 clip measured/.test(document.querySelector('#aeStatus').textContent), null, { timeout: 60000 });
}, { timeout: 150000 });

test('clip-forge: layers, keyframes and a colour grade render into the video', 'clip-forge.html', async (page) => {
  const clip = fs.readFileSync(path.join(FIX, 'clip.webm'));
  await page.setInputFiles('#videoInput', { name: 'main.webm', mimeType: 'video/webm', buffer: clip });
  await page.waitForSelector('#tlWrap', { state: 'visible', timeout: 30000 });
  // A picture layer and a text layer on their own tracks.
  await page.setInputFiles('#lyImageInput', path.join(FIX, 'text-1.png'));
  await page.click('#lyTextBtn');
  await page.fill('#lyEditor textarea[data-f="text"]', 'Hello layers');
  expect(await page.locator('#tlTracks .tl-row').count() === 3, 'expected 3 timeline tracks (text, picture, main video)');
  // Keyframes: at 0 s on the left, at 1.5 s on the right; halfway it is in between.
  await page.click('#lyEditor [data-act="addkf"]');
  await page.evaluate(() => { const v = document.getElementById('sourceVideo'); v.currentTime = 1.5; return new Promise(r => v.addEventListener('seeked', r, { once: true })); });
  await page.click('#lyEditor [data-act="addkf"]');
  await page.locator('#lyEditor input[data-p="x"]').fill('80');
  expect(await page.locator('#lyKfs .ly-kf').count() === 2, 'expected two keyframes');
  const mid = await page.evaluate(() => { const kfs = [{ t: 0, x: 20, ease: 'linear' }, { t: 2, x: 80 }]; return ClipLayers.valuesAt({ keyframes: kfs }, 1).x; });
  expect(Math.abs(mid - 50) < 0.01, 'keyframes should interpolate to 50 halfway, got ' + mid);
  // A black and white grade turns the preview grey.
  await page.selectOption('#grPreset', 'bw');
  expect(await page.locator('#grList .gr-row').count() === 3, 'the black and white look should add 3 adjustments');
  await page.waitForTimeout(300);
  const grey = await page.evaluate(() => {
    const c = document.getElementById('stageCanvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let diff = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { diff += Math.abs(d[i] - d[i + 1]) + Math.abs(d[i + 1] - d[i + 2]); n++; }
    return { shown: getComputedStyle(c).display !== 'none', diff: diff / n };
  });
  expect(grey.shown, 'the edit preview is not shown');
  expect(grey.diff < 4, 'the black and white grade did not make the preview grey (colour difference ' + grey.diff.toFixed(1) + ')');
  const out = await downloadOf(page, async () => {
    await page.click('#renderBtn');
    await page.waitForSelector('#downloadVideoBtn:not([disabled])', { timeout: 60000 });
    await page.click('#downloadVideoBtn');
  }, 90000);
  expect(magic(out.buf, 0x1a, 0x45, 0xdf, 0xa3), 'download is not a WebM video');
  expect(out.buf.length > 5000, 'video is suspiciously small: ' + out.buf.length);
}, { timeout: 150000 });

test('clip-forge: caption styles and the per-app safe zone show in the preview and render', 'clip-forge.html', async (page) => {
  const clip = fs.readFileSync(path.join(FIX, 'clip.webm'));
  await page.setInputFiles('#videoInput', { name: 'main.webm', mimeType: 'video/webm', buffer: clip });
  await page.waitForSelector('#tlWrap', { state: 'visible', timeout: 30000 });
  // Picking an app turns the safe-zone guide (and the live preview) on.
  await page.selectOption('#aspectSelect', '9:16');
  await page.selectOption('#safeZoneApp', 'reels');
  expect(await page.isChecked('#safeZoneCheckbox'), 'choosing an app should switch the safe-zone guide on');
  await page.fill('#captionTextInput', 'Watch this amazing trick');
  await page.selectOption('#captionPositionInput', 'middle');
  await page.click('#addCaptionBtn');
  // Yellow pixels in the middle of the preview: none with the dark box, plenty once the key word turns yellow.
  const yellow = () => page.waitForTimeout(300).then(() => page.evaluate(() => {
    const c = document.getElementById('stageCanvas'), d = c.getContext('2d').getImageData(0, c.height * 0.3, c.width, c.height * 0.4).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 190 && d[i + 2] < 140) n++;
    return n;
  }));
  const before = await yellow();
  await page.selectOption('#captionsList .cap-style', 'highlight');
  const after = await yellow();
  expect(after > before + 200, 'the highlight style did not draw a yellow key word (' + before + ' -> ' + after + ' yellow pixels)');
  const out = await downloadOf(page, async () => {
    await page.click('#renderBtn');
    await page.waitForSelector('#downloadVideoBtn:not([disabled])', { timeout: 60000 });
    await page.click('#downloadVideoBtn');
  }, 90000);
  expect(magic(out.buf, 0x1a, 0x45, 0xdf, 0xa3), 'download is not a WebM video');
  expect(out.buf.length > 5000, 'video is suspiciously small: ' + out.buf.length);
}, { timeout: 150000 });

test('website-builder: AI site has a shared design and downloads as a tidy ZIP', 'website-builder.html', async (page) => {
  await page.fill('#brief', 'Sunrise Bakery is a neighbourhood bakery in Nairobi.');
  await page.click('#draftBtn');
  await page.waitForFunction(() => /READY/.test(document.querySelector('#titleBlockRight').textContent), null, { timeout: 60000 });
  await page.fill('#zipSiteUrl', 'sunrisebakery.co.ke');
  const out = await downloadOf(page, () => page.click('#downloadZipBtn'));
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const files = await page.evaluate(async b64 => { const zip = await JSZip.loadAsync(b64, { base64: true }); const o = {}; for (const n of Object.keys(zip.files)) o[n] = await zip.file(n).async('string'); return o; }, out.buf.toString('base64'));
  ['index.html', 'menu.html', 'contact.html', 'style.css'].forEach(n => expect(files[n], n + ' missing from the ZIP (has ' + Object.keys(files).join(', ') + ')'));
  expect(/--primary:#b4530f/.test(files['style.css']), 'shared style.css does not carry the planned colours');
  expect(/Sitemap: https:\/\/sunrisebakery\.co\.ke\/sitemap\.xml/.test(files['robots.txt'] || ''), 'robots.txt missing or does not point at the sitemap');
  expect(/<loc>https:\/\/sunrisebakery\.co\.ke\/<\/loc>/.test(files['sitemap.xml'] || '') && /<loc>https:\/\/sunrisebakery\.co\.ke\/menu\.html<\/loc>/.test(files['sitemap.xml']), 'sitemap.xml does not list the pages');
  ['index.html', 'menu.html'].forEach(n => {
    expect(/<link rel="stylesheet" href="style.css">/.test(files[n]), n + ' does not link style.css');
    expect(/class="site-header"/.test(files[n]) && /class="site-footer"/.test(files[n]) && /<main>/.test(files[n]), n + ' lacks the shared header, footer or main');
    expect(/href="contact.html"/.test(files[n]), n + ' navigation does not link the contact page');
  });
}, { setup: ctx => fakeAi(ctx, body => /information architect/.test(body.systemPrompt) ? JSON.stringify(SITE_PLAN) : SITE_PAGE) });

test('website-builder: a site loaded from a multi-site ZIP keeps its design and settings', 'website-builder.html', async (page) => {
  await page.setInputFiles('#loadPageInput', path.join(FIX, 'two-sites.zip'));
  await page.waitForSelector('#zipSitePicker:not([hidden]) button', { timeout: 15000 });
  const sites = await page.$$eval('#zipSitePicker button', bs => bs.map(b => b.textContent));
  expect(sites.join(',') === 'Bakery,Garage', 'site picker shows ' + sites.join(','));
  await page.click('#zipSitePicker button:has-text("Bakery")');
  await page.waitForSelector('#zipSitePicker form.zip-details input[name=name]');
  expect(await page.inputValue('#zipSitePicker input[name=name]') === 'Test Bakery', 'details form is not pre-filled from settings.js');
  await page.fill('#zipSitePicker input[name=name]', 'Fixture Bakery');
  await page.click('#zipSitePicker button[type=submit]');
  await page.waitForFunction(() => /LOADED · 2 pages/.test(document.querySelector('#titleBlockRight').textContent), null, { timeout: 15000 });
  const tabs = await page.$$eval('#pageTabs button', bs => bs.map(b => b.textContent));
  expect(tabs.join(',') === 'Home,Our story', 'tabs are ' + tabs.join(','));
  const out = await downloadOf(page, () => page.click('#downloadZipBtn'));
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const files = await page.evaluate(async b64 => { const zip = await JSZip.loadAsync(b64, { base64: true }); const o = {}; for (const n of Object.keys(zip.files)) if (!zip.files[n].dir) o[n] = await zip.file(n).async('string'); return o; }, out.buf.toString('base64'));
  ['index.html', 'about.html', 'style.css'].forEach(n => expect(files[n], n + ' missing from the ZIP (has ' + Object.keys(files).join(', ') + ')'));
  expect(/\.brand\{color:var\(--primary\)\}/.test(files['style.css']), 'the site CSS was not carried into style.css');
  expect(/--primary:#123456/.test(files['style.css']), 'the colours from settings.js were not applied');
  expect(Object.keys(files).some(n => /^images\/.+\.svg$/.test(n)), 'the logo picture was not exported to images/');
  expect(/<span data-site="name">Fixture Bakery<\/span>/.test(files['index.html']) && /<span data-site="name">Fixture Bakery<\/span>/.test(files['about.html']), 'the business name from the details form was not applied to every page');
  expect(/<title>Fixture Bakery \| Home<\/title>/.test(files['index.html']), 'the page title still has the old name');
  expect(/href="tel:\+46701234567"/.test(files['index.html']), 'the phone link was not set from settings.js');
  expect(!/var SITE =/.test(files['index.html']), 'settings.js code was left in the page');
  expect(/url\("images\/hero\.jpg"\)/.test(files['style.css']), 'a picture not added yet should keep its images/ slot in style.css');
});

test('website-builder: Check & fix repairs a weak page, Undo restores it, the style panel restyles text', 'website-builder.html', async (page) => {
  await page.setInputFiles('#loadPageInput', path.join(FIX, 'weak-page.html'));
  await page.waitForFunction(() => /LOADED/.test(document.querySelector('#titleBlockRight').textContent), null, { timeout: 15000 });
  await page.click('#healthBtn');
  const before = +(await page.textContent('#healthScore'));
  expect(before <= 40, 'the weak page scored ' + before);
  await page.fill('#ghRepo', 'someone/fixit-site');
  await page.click('#healthFixBtn');
  await page.waitForFunction(b => +document.querySelector('#healthScore').textContent > b, before, { timeout: 5000 });
  const html = await page.$eval('#codePane', e => e.value);
  expect(/<html lang="en"/.test(html), 'page language was not set');
  expect(/name="viewport"/.test(html), 'viewport was not added');
  expect((html.match(/<h1\b/g) || []).length === 1, 'still more than one h1');
  expect(/<h3\b[^>]*>Opening hours<\/h3>/.test(html), 'the skipped heading level was not repaired');
  expect(/alt="Bathroom renovation"/.test(html), 'the picture did not get a description from its file name');
  expect(/<meta name="description" content="Fixit Plumbing repairs leaks/.test(html), 'meta description was not written from the page text');
  expect(/<link rel="canonical" href="https:\/\/someone\.github\.io\/fixit-site\/weak-page\.html">/.test(html), 'canonical link was not added from the GitHub repo');
  expect(await page.isEnabled('#healthAiBtn'), '"Ask the AI" should be offered for the vague link');
  await page.click('#undoBlockBtn');
  expect(!/name="viewport"/.test(await page.$eval('#codePane', e => e.value)), 'Undo did not take the fixes back');
  await page.click('#editModeBtn');
  const frame = page.frameLocator('#preview');
  await frame.locator('p[data-miga-edit]').first().waitFor();
  await frame.locator('p').first().click();
  await page.waitForSelector('#stylePanel:not([hidden])');
  await page.$eval('#stSize', e => { e.value = '22'; e.dispatchEvent(new Event('input')); });
  await page.click('#stylePanel [data-align="center"]');
  await page.waitForFunction(() => /<p style="font-size: 22px; text-align: center;">Fixit Plumbing repairs/.test(document.querySelector('#codePane').value), null, { timeout: 5000 });
  expect(!/data-miga-(selected|edit)/.test(await page.$eval('#codePane', e => e.value)), 'edit-mode markers leaked into the page');
});

test('website-builder: the industry and style start step reaches the AI planner', 'website-builder.html', async (page) => {
  await page.click('#industryChips [data-value="restaurant"]');
  await page.click('#styleChips [data-value="luxury"]');
  await page.fill('#brief', 'Sunrise Bakery is a neighbourhood bakery in Nairobi.');
  await page.click('#draftBtn');
  await page.waitForFunction(() => /READY/.test(document.querySelector('#titleBlockRight').textContent), null, { timeout: 60000 });
  expect(/Type of business: Restaurant or café/.test(plannerBrief) && /Visual style the owner picked: Luxury/.test(plannerBrief), 'the planner did not get the start-step choices: ' + plannerBrief.slice(-200));
}, { setup: ctx => fakeAi(ctx, body => { if (/information architect/.test(body.systemPrompt)) { plannerBrief = JSON.stringify(body); return JSON.stringify(SITE_PLAN); } return SITE_PAGE; }) });
let plannerBrief = '';

const APP = bug => '<!DOCTYPE html><html><head><title>Tally</title></head><body><div class="app"><header class="app-header"><div class="app-title"><span class="logo">➕</span><h1>Tally</h1></div></header><div class="card"><button class="btn btn-primary" id="inc">Add one</button> <span id="n">0</span></div></div><script>' + (bug ? 'missingFunction();' : '') + 'let n=0;document.getElementById("inc").onclick=()=>{document.getElementById("n").textContent=++n};</' + 'script></body></html>';
test('app-forge: a broken app is fixed automatically and downloads as an installable ZIP', 'app-forge.html', async (page) => {
  await page.fill('#appName', 'Tally');
  await page.fill('#appBrief', 'A counter with one big button.');
  await page.click('#generateBtn');
  await page.waitForFunction(() => !document.querySelector('#downloadBtn').disabled, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  expect(/checked and fixed/.test(await page.textContent('#statusBox')), 'the startup error was not caught and fixed');
  const out = await downloadOf(page, () => page.click('#downloadBtn'));
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const files = await page.evaluate(async b64 => { const zip = await JSZip.loadAsync(b64, { base64: true }); const o = {}; for (const n of Object.keys(zip.files)) o[n] = n.endsWith('.png') ? 'png' : await zip.file(n).async('string'); return o; }, out.buf.toString('base64'));
  ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'].forEach(n => expect(files[n], n + ' missing from the ZIP'));
  expect(/id="miga-ui"/.test(files['index.html']), 'the app does not include the Miga UI kit');
  expect(!/missingFunction/.test(files['index.html']), 'the downloaded app still has the bug');
  expect(JSON.parse(files['manifest.json']).name === 'Tally', 'manifest has the wrong name');
}, { expectErrors: /missingFunction/, setup: (() => { let calls = 0; return ctx => { calls = 0; return fakeAi(ctx, () => APP(++calls === 1)); }; })() });

test('utility-forge: the JSON viewer finds the broken line, formats and downloads; Base64, JWT and lorem ipsum work', 'utility-forge.html', async (page) => {
  await page.fill('#jsonInput', '{"name": "Alex",\n "tags": ["a", "b",]\n}');
  await page.click('#jsonFormat');
  expect(/line 2/.test(await page.textContent('#jsonStatus')), 'the JSON error does not name line 2: ' + await page.textContent('#jsonStatus'));
  await page.fill('#jsonInput', '{"b":1,"a":{"city":"Gothenburg","list":[1,2,{"deep":true}]}}');
  await page.click('#jsonSort');
  await page.fill('#jsonSearch', 'gothen');
  await page.waitForSelector('#jsonTree mark');
  const out = await downloadOf(page, () => page.click('#jsonDownload'));
  const json = out.buf.toString('utf8');
  expect(out.name === 'formatted.json' && json.startsWith('{\n  "a": {') && JSON.parse(json).a.list[2].deep === true, 'formatted JSON is wrong:\n' + json);
  await page.click('.card[data-mode="encode"]');
  await page.fill('#encInput', 'Hej världen 👋');
  await page.click('#encRun');
  const b64 = await page.inputValue('#encOutput');
  await page.click('#encSwap'); await page.selectOption('#encOp', 'b64d'); await page.click('#encRun');
  expect(await page.inputValue('#encOutput') === 'Hej världen 👋', 'Base64 did not round-trip UTF-8 text: ' + b64);
  const enc = s => Buffer.from(JSON.stringify(s)).toString('base64url');
  await page.selectOption('#encOp', 'jwt');
  await page.fill('#encInput', enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc({ sub: '42', name: 'Alex', exp: 1000 }) + '.sig');
  await page.click('#encRun');
  expect(/"name": "Alex"/.test(await page.inputValue('#encOutput')) && /expired/.test(await page.textContent('#jwtOut')), 'the JWT payload or expiry is not shown');
  await page.fill('#encInput', 'data:text/plain;base64,' + Buffer.from('hello file').toString('base64'));
  const file = await downloadOf(page, () => page.click('#b64ToFile'));
  expect(file.name === 'decoded.txt' && file.buf.toString() === 'hello file', 'Base64 to file is wrong: ' + file.name);
  await page.click('.card[data-mode="lorem"]');
  await page.fill('#lorCount', '4'); await page.selectOption('#lorUnit', 'p'); await page.selectOption('#lorFormat', 'html'); await page.click('#lorRun');
  const lor = (await downloadOf(page, () => page.click('#lorDownload'))).buf.toString();
  expect(lor.startsWith('<p>Lorem ipsum dolor sit amet') && (lor.match(/<p>/g) || []).length === 4, 'lorem ipsum HTML is wrong:\n' + lor.slice(0, 200));
  expect(/^[0-9a-f-]{36}$/m.test(await page.textContent('#uuidOut')), 'no UUIDs generated');
  await page.click('.card[data-mode="time"]');
  await page.fill('#tsInput', '1700000000'); await page.click('#tsRun');
  expect((await page.textContent('#tsOut')).includes('2023-11-14T22:13:20.000Z'), 'Unix timestamp converted wrongly');
});

test('palette-forge: a photo gives its main colours, the gradient downloads as a 1920×1080 PNG, the shadow CSS is copied', 'palette-forge.html', async (page) => {
  await page.setInputFiles('#photoInput', path.join(FIX, 'small-photo.png'));
  await page.waitForFunction(() => /main colors/.test(document.getElementById('photoStatus').textContent));
  const cols = await page.$$eval('#swatches .swatch-hex', els => els.map(e => e.textContent));
  expect(cols.length === 5 && cols.every(c => /^#[0-9A-F]{6}$/.test(c)), 'the photo did not give 5 colours: ' + cols.join(' '));
  expect(await page.$$eval('#grStops .gr-stop', r => r.length) === 5, 'the gradient did not take the photo colours');
  await page.selectOption('#grType', 'conic');
  expect((await page.textContent('#grCss')).includes('conic-gradient(from 135deg'), 'gradient CSS is wrong: ' + await page.textContent('#grCss'));
  const png = await downloadOf(page, () => page.click('#grPng'));
  expect(png.name === 'gradient.png' && magic(png.buf, 0x89, 0x50, 0x4e, 0x47) && png.buf.readUInt32BE(16) === 1920 && png.buf.readUInt32BE(20) === 1080, 'the gradient is not a 1920×1080 PNG');
  await page.click('#shPresets [data-p="inset"]');
  expect(/box-shadow: inset 0px 4px 12px 0px rgba\(22, 32, 43, 0\.3\);/.test(await page.textContent('#shCss')), 'shadow CSS is wrong: ' + await page.textContent('#shCss'));
});

test('everyday-forge: the loan and savings calculators give the textbook answers and download their tables', 'everyday-forge.html', async (page) => {
  await page.click('.tab[data-mode="finance"]');
  await page.selectOption('#finCur', 'USD');
  await page.fill('#lnAmount', '200000'); await page.fill('#lnRate', '6'); await page.fill('#lnYears', '30');
  // Amounts are formatted for the browser's language, so compare the digits only.
  const digits = async sel => (await page.textContent(sel)).replace(/[^\d]/g, '');
  expect((await digits('#lnKpis')).startsWith('119910'), 'a 200,000 loan at 6% for 30 years should cost $1,199.10 a month: ' + await page.textContent('#lnKpis'));
  const loan = (await downloadOf(page, () => page.click('#lnCsv'))).buf.toString();
  const rows = loan.trim().split('\n');
  expect(rows.length === 31 && rows[30].startsWith('30,') && rows[30].endsWith(',0.00'), 'the loan schedule should end with nothing owed after 30 years:\n' + rows.slice(-2).join('\n'));
  await page.fill('#lnExtra', '200');
  expect(/Interest saved/.test(await page.textContent('#lnKpis')), 'an extra payment does not show the interest saved');
  await page.click('.fsub[data-f="save"]');
  await page.fill('#svStart', '1000'); await page.fill('#svMonthly', '0'); await page.fill('#svRate', '10'); await page.fill('#svYears', '10'); await page.selectOption('#svComp', '1');
  expect((await digits('#svKpis')).startsWith('2594'), '1,000 at 10% a year for 10 years should grow to $2,594: ' + await page.textContent('#svKpis'));
  const sav = (await downloadOf(page, () => page.click('#svCsv'))).buf.toString();
  expect(sav.startsWith('Year,Put in,Interest earned,Balance\n1,1000.00,100.00,1100.00'), 'the savings table is wrong:\n' + sav.slice(0, 120));
  await page.click('.fsub[data-f="margin"]');
  await page.fill('#mgCost', '60'); await page.selectOption('#mgMode', 'margin'); await page.fill('#mgValue', '40'); await page.fill('#mgVat', '25');
  const mg = await page.textContent('#mgKpis');
  expect(/100[.,]00/.test(mg) && /125[.,]00/.test(mg) && /66[.,]7 %/.test(mg), 'a 40% margin on a cost of 60 should be a price of 100 (125 with VAT), markup 66.7%: ' + mg);
});

test('markdown-forge: the toolbar formats text, the preview updates, Word-style HTML becomes Markdown, .md and .html download', 'markdown-forge.html', async (page) => {
  await page.evaluate(() => { try { localStorage.removeItem('miga-markdown-doc'); } catch (e) {} });
  await page.fill('#mdInput', '# Shopping list\n\nBuy milk');
  await page.evaluate(() => { const t = document.getElementById('mdInput'); t.focus(); t.setSelectionRange(t.value.length - 4, t.value.length); });
  await page.click('[data-md="bold"]');
  expect((await page.inputValue('#mdInput')).endsWith('Buy **milk**'), 'Bold did not wrap the selection: ' + await page.inputValue('#mdInput'));
  await page.press('#mdInput', 'End'); await page.press('#mdInput', 'Enter'); await page.click('[data-md="task"]'); await page.type('#mdInput', 'Bread');
  await page.click('[data-md="table"]');
  expect(await page.$eval('#mdPreview', p => !!p.querySelector('h1#shopping-list') && !!p.querySelector('strong') && !!p.querySelector('input[type=checkbox]') && !!p.querySelector('table th')), 'the preview is missing the heading, bold, task or table');
  const md = await downloadOf(page, () => page.click('#mdDownloadMd'));
  expect(md.name === 'shopping-list.md' && md.buf.toString().includes('- [ ] Bread') && md.buf.toString().includes('| Column 1 |'), 'the .md download is wrong: ' + md.name + '\n' + md.buf.toString().slice(0, 200));
  await page.click('#mdMore');
  const html = (await downloadOf(page, () => page.click('#mdDownloadHtml'))).buf.toString();
  expect(/^<!doctype html>/.test(html) && html.includes('<title>Shopping list</title>') && html.includes('<strong>milk</strong>') && html.includes('.md-body'), 'the HTML page is wrong:\n' + html.slice(0, 300));
  const conv = await page.evaluate(() => window.MarkdownForge.htmlToMd('<h2>Plan</h2><p>Some <b>bold</b> and a <a href="https://example.com">link</a>.</p><ul><li>One</li><li>Two</li></ul><table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table>'));
  expect(conv.includes('## Plan') && conv.includes('**bold**') && conv.includes('[link](https://example.com)') && /-\s+One/.test(conv) && conv.includes('| A | B |'), 'HTML to Markdown is wrong:\n' + conv);
  const safe = await page.evaluate(() => window.MarkdownForge.toHtml('<img src=x onerror="alert(1)"><script>alert(2)</script>'));
  expect(!/onerror|<script/i.test(safe), 'the preview lets scripts through: ' + safe);
});

test('cipher-forge: every code round-trips, Crack it finds a shift, a link opens ready to decode, a picture and a password-locked photo message download', 'cipher-forge.html', async (page) => {
  const res = await page.evaluate(() => {
    const C = window.CipherForge, msg = 'Meet me at the tree house at four', o = { shift: 7, keyword: 'lemon', rails: 3 }, bad = [];
    for (const c of ['caesar', 'rot13', 'atbash', 'vigenere', 'a1z26', 'morse', 'keypad', 'binary', 'reverse', 'railfence']) {
      const e = C.encode(c, msg, o), d = C.decode(c, e, o);
      if (e === msg || d.toUpperCase() !== msg.toUpperCase()) bad.push(c + ': ' + e + ' → ' + d);
    }
    return { bad, caesar: C.encode('caesar', 'Hello, World!', { shift: 3 }), morse: C.encode('morse', 'SOS'), crack: C.crack(C.encode('caesar', msg, { shift: 11 }))[0] };
  });
  expect(!res.bad.length, 'codes that do not round-trip:\n' + res.bad.join('\n'));
  expect(res.caesar === 'Khoor, Zruog!' && res.morse === '... --- ...', 'wrong codes: ' + res.caesar + ' / ' + res.morse);
  expect(res.crack.cipher === 'caesar' && res.crack.shift === 11 && res.crack.text === 'Meet me at the tree house at four', 'Crack it did not find shift 11: ' + JSON.stringify(res.crack));
  await page.fill('#input', 'Hello friend'); await page.check('#shareKey');
  const url = await page.evaluate(() => window.CipherForge.shareUrl());
  await page.goto('about:blank'); await page.goto(url); await page.waitForTimeout(500);
  expect((await page.textContent('#output')).trim() === 'Hello friend', 'the shared link did not decode: ' + await page.textContent('#output'));
  await page.selectOption('#cipher', 'pigpen'); await page.click('[data-mode="encode"]'); await page.fill('#input', 'ABC');
  expect(await page.$$eval('#output svg', s => s.length) === 3, 'Pigpen did not draw three symbols');
  const pic = await downloadOf(page, () => page.click('#pictureBtn'));
  expect(pic.name === 'secret-message.png' && magic(pic.buf, 0x89, 0x50, 0x4E, 0x47), 'the picture is not a PNG: ' + pic.name);
  await page.setInputFiles('#hidePhoto', path.join(FIX, 'small-photo.png'));
  await page.fill('#hideMsg', 'The key is under the mat'); await page.fill('#hidePass', 'tiger');
  const hidden = await downloadOf(page, () => page.click('#hideBtn'));
  expect(magic(hidden.buf, 0x89, 0x50, 0x4E, 0x47) && hidden.name.endsWith('-secret.png'), 'the photo with the hidden message is not a PNG: ' + hidden.name);
  const tmp = path.join(os.tmpdir(), 'cipher-secret.png'); fs.writeFileSync(tmp, hidden.buf);
  await page.setInputFiles('#revealPhoto', tmp); await page.fill('#revealPass', 'wrong'); await page.click('#revealBtn');
  await page.waitForFunction(() => /Wrong password/.test(document.getElementById('stegoStatus').textContent), null, { timeout: 15000 });
  await page.fill('#revealPass', 'tiger'); await page.click('#revealBtn');
  await page.waitForFunction(() => document.getElementById('revealOut').textContent === 'The key is under the mat', null, { timeout: 15000 });
});

test('coloring-forge: AI page, tracing, Chinese stroke order, paint by numbers, maze and cover make pages, and the book downloads as one PDF', 'coloring-forge.html', async (page, ctx) => {
  const png = fs.readFileSync(path.join(FIX, 'small-photo.png')).toString('base64');
  let prompt = '';
  // Free AI pictures are off, so "Describe it" uses a Gemini key saved in Picture Forge.
  await ctx.route(/generativelanguage\.googleapis\.com/, async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    prompt = (body.contents && body.contents[0].parts[0].text) || '';
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }] }) });
  });
  const pages = () => page.evaluate(() => window.ColoringForge.pages.length);
  expect(await page.evaluate(() => document.querySelector('input[name=csrc]:checked').value) === 'library', 'the page should start on the picture library');
  await page.evaluate(() => localStorage.setItem('migaGeminiKey', 'test-key')); await page.reload();
  await page.waitForFunction(() => window.ColoringForge); await page.check('input[name=csrc][value=ai]');
  await page.fill('#colorPrompt', 'a smiling elephant'); await page.click('#colorMake');
  await page.waitForFunction(() => window.ColoringForge.pages.length === 1, null, { timeout: 30000 });
  expect(/coloring book page/.test(prompt) && prompt.includes('a smiling elephant'), 'the AI prompt is wrong: ' + prompt);
  // The AI picture is turned into pure black and white.
  const grey = await page.evaluate(() => { const c = window.ColoringForge.pages[0].cv, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 40 && d[i] < 215 && d[i] === d[i + 1]) n++; return n / (d.length / 4); });
  expect(grey < 0.02, 'the AI page is not black and white (' + (grey * 100).toFixed(1) + '% grey)');
  await page.click('#addBtn');
  await page.click('[data-tab="trace"]'); await page.selectOption('#traceKind', 'upper'); await page.click('#traceMake');
  await page.waitForFunction(() => window.ColoringForge.pages.length >= 2, null, { timeout: 15000 });
  const tracePages = await pages(); await page.click('#addBtn');
  await page.click('[data-tab="hanzi"]'); await page.selectOption('#hanSet', 'han:numbers'); await page.click('#hanMake');
  await page.waitForFunction(() => /Practice sheet ready/.test(document.getElementById('hanProgress').textContent), null, { timeout: 60000 });
  expect(!/no stroke data/.test(await page.textContent('#hanProgress')), 'stroke order did not load: ' + await page.textContent('#hanProgress'));
  await page.click('#addBtn');
  await page.click('[data-tab="paint"]'); await page.setInputFiles('#paintPhoto', path.join(FIX, 'small-photo.png')); await page.selectOption('#paintColors', '6'); await page.click('#paintMake');
  await page.waitForFunction(() => /colours and \d+ areas/.test(document.getElementById('paintProgress').textContent), null, { timeout: 60000 });
  const used = +(await page.textContent('#paintProgress')).match(/(\d+) colours/)[1];
  expect(used >= 2 && used <= 6 && await pages() === 2, 'paint by numbers made ' + used + ' colours / ' + await pages() + ' pages');
  await page.click('[data-tab="maze"]'); await page.click('#mazeMake');
  const sol = await page.evaluate(() => { const F = window.ColoringForge, m = F.makeMaze(10, 12, Math.random), p = F.solveMaze(m); return p[0] === 0 && p[p.length - 1] === 119; });
  expect(sol && await pages() === 2, 'the maze or its answer page is missing');
  const mazePng = await downloadOf(page, () => page.click('#pngBtn'));
  expect(magic(mazePng.buf, 0x89, 0x50, 0x4E, 0x47) && mazePng.buf.length > 20000, 'the maze PNG is wrong: ' + mazePng.name);
  const before = await page.evaluate(() => window.ColoringForge.book.length);
  await page.click('[data-tab="cover"]'); await page.click('#coverMake'); await page.click('#addBtn');
  await page.waitForFunction(n => window.ColoringForge.book.length === n + 1, before, { timeout: 15000 });
  const total = before + 1;
  expect(total >= 1 + tracePages + 2, 'the book has only ' + total + ' pages');
  const pdf = await downloadOf(page, () => page.click('#pdfBtn'), 60000);
  const pdfPages = (pdf.buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(ascii(pdf.buf, 0, '%PDF') && pdf.name === 'emma-coloring-book.pdf' && pdfPages === total, 'the book PDF is wrong: ' + pdf.name + ', ' + pdfPages + ' pages, expected ' + total);
});

test('coloring-forge: the picture library makes pages without AI (hand-drawn, bold, flag with colour guide, four to a page)', 'coloring-forge.html', async (page) => {
  await page.waitForFunction(() => /\d,\d{3} pictures/.test(document.getElementById('libCount').textContent), null, { timeout: 20000 });
  const total = +(await page.textContent('#libCount')).match(/([\d,]+) pictures/)[1].replace(',', '');
  expect(total >= 3000, 'the library has only ' + total + ' pictures');
  const made = () => page.evaluate(() => window.ColoringForge.pages.length && window.ColoringForge.pages[0].label);
  const ink = () => page.evaluate(() => { const c = window.ColoringForge.pages[0].cv, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 100) n++; return n / (d.length / 16); });
  await page.fill('#libSearch', 'lion'); await page.waitForTimeout(400);
  for (const style of ['hand', 'bold']) {
    await page.selectOption('#libStyle', style); await page.waitForTimeout(200);
    await page.click('#libGrid button >> nth=0');
    await page.waitForFunction(() => window.ColoringForge.pages.length === 1 && window.ColoringForge.pages[0].label === 'Lion', null, { timeout: 20000 });
    const k = await ink(); expect(k > 0.01 && k < 0.3, style + ' lion page has ' + (k * 100).toFixed(1) + '% ink');
  }
  // A flag gets a colour guide: the page must contain colour.
  await page.selectOption('#libStyle', 'all'); await page.fill('#libSearch', 'japan'); await page.waitForTimeout(400);
  await page.click('#libGrid button >> nth=0');
  await page.waitForFunction(() => window.ColoringForge.pages[0].label === 'Japan', null, { timeout: 20000 });
  const red = await page.evaluate(() => { const c = window.ColoringForge.pages[0].cv, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 90) n++; return n; });
  expect(red > 500, 'the flag page has no colour guide');
  await page.fill('#libSearch', ''); await page.selectOption('#libCat', '7'); await page.selectOption('#libPer', '4'); await page.waitForTimeout(400);
  await page.click('#libGrid button >> nth=2');
  await page.waitForFunction(() => / and more$/.test(window.ColoringForge.pages[0].label || ''), null, { timeout: 20000 });
  expect(/and more/.test(await made()), 'four-to-a-page did not work');
  const png = await downloadOf(page, () => page.click('#pngBtn'));
  expect(magic(png.buf, 0x89, 0x50, 0x4E, 0x47) && png.buf.length > 20000, 'the page PNG is wrong: ' + png.name);
});

test('go-forge: every lesson can be solved, the coach reviews a move and the game downloads as SGF', 'go-forge.html', async (page) => {
  const bad = await page.evaluate(() => window.__goForge.verifyLessons());
  expect(bad.length === 0, 'lessons without a working answer: ' + bad.join(', '));
  await page.click('[data-tab="play"]');
  await page.selectOption('#gSize', '9'); await page.selectOption('#gLevel', '2'); await page.selectOption('#gColor', '1');
  await page.click('#newGame');
  const idle = n => page.waitForFunction(k => !window.__goForge.busy && window.__goForge.game.moves.length === k, n, { timeout: 60000 });
  await page.evaluate(() => window.__goForge.playUser('E5')); await idle(2);
  await page.evaluate(() => window.__goForge.playUser('C3')); await idle(4);
  await page.click('#adviceBtn'); await page.waitForFunction(() => !window.__goForge.busy && /Best idea|pass/.test(document.getElementById('coach').textContent), null, { timeout: 60000 });
  const adv = await page.$eval('#coach', e => e.textContent);
  expect(/pass/.test(adv) || (/Why it comes up/.test(adv) && /What it exposes/.test(adv)), 'the advice does not explain its options: ' + adv.slice(0, 200));
  await page.click('#feedbackBtn'); await page.waitForFunction(() => !window.__goForge.busy && /move|Blunder|Mistake|Inaccuracy/.test(document.querySelector('#coach .rate')?.textContent || ''), null, { timeout: 60000 });
  const out = await downloadOf(page, () => page.click('#sgfBtn'));
  const sgf = out.buf.toString('utf8');
  expect(/^go-forge-9x9-\d{4}-\d{2}-\d{2}\.sgf$/.test(out.name), 'unexpected file name ' + out.name);
  expect(sgf.startsWith('(;GM[1]FF[4]') && /SZ\[9\]/.test(sgf) && /KM\[7\.5\]/.test(sgf), 'the SGF header is wrong: ' + sgf.slice(0, 120));
  expect(/;B\[ee\]/.test(sgf) && /;B\[cg\]/.test(sgf), 'the SGF does not contain the moves E5 and C3');
  expect((sgf.match(/;[BW]\[/g) || []).length === 4, 'the SGF should have 4 moves');
  expect(/C\[(Best move|Good move|Inaccuracy|Mistake|Blunder)/.test(sgf), 'the coach review is missing from the SGF');
  const back = await page.evaluate(s => window.__goForge.parseSgf(s), sgf);
  expect(back.n === 9 && back.moves.length === 4, 'the SGF cannot be read back');
});

test('noise-forge: a mix plays without errors and downloads as a WAV file', 'noise-forge.html', async (page) => {
  await page.click('#mix-3'); // Rainy night
  await page.waitForFunction(() => /Pause/.test(document.getElementById('playBtn').textContent));
  expect(await page.evaluate(() => window.__noiseForge.encode()) === 'rain:60:1,thunder:55,crickets:20', 'the Rainy night mix is wrong: ' + await page.evaluate(() => window.__noiseForge.encode()));
  await page.click('[data-tog="pink"]');
  await page.click('#playBtn');
  await page.selectOption('#dlLen', '0.5');
  const out = await downloadOf(page, () => page.click('#dlBtn'), 120000);
  expect(/^noise-forge-.*-30s\.wav$/.test(out.name), 'unexpected file name ' + out.name);
  expect(ascii(out.buf, 0, 'RIFF') && ascii(out.buf, 8, 'WAVE'), 'download is not a WAV file');
  const channels = out.buf.readUInt16LE(22), rate = out.buf.readUInt32LE(24), samples = (out.buf.length - 44) / 2 / channels;
  expect(channels === 2 && rate === 44100 && Math.abs(samples - 30 * 44100) < 10, 'WAV format is wrong: ' + channels + ' ch, ' + rate + ' Hz, ' + samples + ' samples');
  let sum = 0, peak = 0; for (let i = 44 + 44100 * 4 * 5; i < 44 + 44100 * 4 * 25; i += 2) { const v = Math.abs(out.buf.readInt16LE(i)) / 32768; sum += v * v; if (v > peak) peak = v; }
  const rms = Math.sqrt(sum / (44100 * 2 * 20));
  expect(rms > 0.03 && peak < 0.99, 'the sound level is wrong: rms ' + rms.toFixed(3) + ', peak ' + peak.toFixed(2));
});

test('tune-forge: the demo string is tuned to E2 and the sound level log downloads as CSV', 'tune-forge.html', async (page) => {
  await page.click('#demoBtn'); // a plucked string tuned up step by step — no microphone needed
  await page.waitForFunction(() => { const s = window.__tuneForge.tuner(); return s.note === 'E2' && s.inTune; }, null, { timeout: 20000 });
  const st = await page.evaluate(() => window.__tuneForge.tuner());
  expect(Math.abs(st.freq - 82.41) < 0.6 && st.string === 0, 'the tuner reads the low E string wrongly: ' + JSON.stringify(st));
  await page.click('#tab-level');
  await page.waitForFunction(() => window.__tuneForge.level().rows >= 3, null, { timeout: 15000 });
  const out = await downloadOf(page, () => page.click('#lvlCsv'));
  const csv = out.buf.toString('utf8'), rows = csv.trim().split(/\r\n/);
  expect(out.name === 'sound-level-log.csv', 'unexpected file name ' + out.name);
  expect(rows[0] === 'Tune Forge sound level log' && /^Weighting,dB\(A\)$/.test(rows[1]), 'the CSV header is wrong: ' + rows.slice(0, 2).join(' | '));
  const at = rows.indexOf('Time,Seconds,Leq 1 s (dB),Max 1 s (dB),Peak (dBFS)');
  const data = rows.slice(at + 1).map(r => r.split(','));
  expect(at > 0 && data.length >= 3, 'the CSV has no measurements');
  // the first second can still be near-silent while the demo starts; levels never go below the 20 dB floor
  expect(data.every(r => r.length === 5 && +r[2] >= 20 && +r[2] < 130 && +r[4] <= 0), 'a measurement row is wrong: ' + rows.slice(at + 1, at + 4).join(' | '));
  expect(data.some(r => +r[2] > 40), 'no measurement picked up the demo sound: ' + rows.slice(at + 1, at + 4).join(' | '));
});

// ---------- runner ----------
const words = process.argv.slice(2).map(w => w.toLowerCase());
const chosen = TESTS.filter(t => !words.length || words.every(w => t.name.toLowerCase().includes(w)));
if (!chosen.length) { console.error('No test matches: ' + words.join(' ')); process.exit(2); }

const srv = await serve();
const base = 'http://127.0.0.1:' + srv.address().port;
const { chromium } = await loadPlaywright();
const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: [...(process.env.IGNORE_CERTS ? ['--ignore-certificate-errors'] : []), ...(process.env.BROWSER_PROXY ? ['--proxy-server=' + process.env.BROWSER_PROXY] : [])] });

const failed = [];
for (const t of chosen) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  // Keep tests from counting as visits or calling real AI.
  await ctx.route(/migabuilder-visits|migabuilder-feedback|googletagmanager/, r => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now();
  try {
    if (t.setup) await t.setup(ctx);
    await page.goto(base + '/' + t.file, { waitUntil: 'load' });
    await Promise.race([
      t.run(page, ctx, base),
      new Promise((_, no) => setTimeout(() => no(new Error('timed out')), t.timeout || 120000))
    ]);
    const real = errors.filter(m => !(t.expectErrors && t.expectErrors.test(m)));
    if (real.length) throw new Error('JavaScript error: ' + real[0]);
    console.log('✓ ' + t.name + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  } catch (e) {
    failed.push(t.name);
    console.log('✗ ' + t.name + '\n    ' + String(e.message || e).split('\n')[0]);
    // What the tool itself was saying helps tell a network problem from a broken tool.
    const said = await page.evaluate(() => Array.from(document.querySelectorAll('.mp-panel,.status.show,[role=alert]')).map(n => n.innerText.trim()).filter(Boolean).join(' | ')).catch(() => '');
    if (said) console.log('    page said: ' + said.slice(0, 300));
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log('\n' + (chosen.length - failed.length) + '/' + chosen.length + ' result tests passed.');
process.exit(failed.length ? 1 : 0);
