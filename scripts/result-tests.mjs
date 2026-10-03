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

test('website-builder: AI site has a shared design and downloads as a tidy ZIP', 'website-builder.html', async (page) => {
  await page.fill('#brief', 'Sunrise Bakery is a neighbourhood bakery in Nairobi.');
  await page.click('#draftBtn');
  await page.waitForFunction(() => /READY/.test(document.querySelector('#titleBlockRight').textContent), null, { timeout: 60000 });
  const out = await downloadOf(page, () => page.click('#downloadZipBtn'));
  expect(magic(out.buf, 0x50, 0x4b, 0x03, 0x04), 'download is not a ZIP');
  const files = await page.evaluate(async b64 => { const zip = await JSZip.loadAsync(b64, { base64: true }); const o = {}; for (const n of Object.keys(zip.files)) o[n] = await zip.file(n).async('string'); return o; }, out.buf.toString('base64'));
  ['index.html', 'menu.html', 'contact.html', 'style.css'].forEach(n => expect(files[n], n + ' missing from the ZIP (has ' + Object.keys(files).join(', ') + ')'));
  expect(/--primary:#b4530f/.test(files['style.css']), 'shared style.css does not carry the planned colours');
  ['index.html', 'menu.html'].forEach(n => {
    expect(/<link rel="stylesheet" href="style.css">/.test(files[n]), n + ' does not link style.css');
    expect(/class="site-header"/.test(files[n]) && /class="site-footer"/.test(files[n]) && /<main>/.test(files[n]), n + ' lacks the shared header, footer or main');
    expect(/href="contact.html"/.test(files[n]), n + ' navigation does not link the contact page');
  });
}, { setup: ctx => fakeAi(ctx, body => /information architect/.test(body.systemPrompt) ? JSON.stringify(SITE_PLAN) : SITE_PAGE) });

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
