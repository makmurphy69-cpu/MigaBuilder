#!/usr/bin/env node
/* Records the narrated tutorial video and the sample for each MigaBuilder tool.
 *
 *   node scripts/tutorial-videos/record.mjs                 # every tool
 *   node scripts/tutorial-videos/record.mjs bug-scanner.html qr-forge.html
 *
 * For each scenario in scenarios.mjs it opens the real tool page in Chromium,
 * performs the steps with a visible pointer, highlight and captions, speaks
 * each caption with the Piper text-to-speech voice, cuts out long waits (for
 * example while the AI writes a website), and writes:
 *   videos/<tool>.mp4        narrated video (H.264 + AAC)
 *   videos/<tool>.jpg        poster frame
 *   samples/<tool>.*         the result made in the video
 *   videos/manifest.json     what tutorials.js and sample-viewer.html read
 *
 * Requirements: Node 18+, Playwright with Chromium, Python 3 with `piper-tts`
 * and `imageio-ffmpeg` (pip install piper-tts imageio-ffmpeg). The voice model
 * is downloaded on first run into scripts/tutorial-videos/.cache/.
 * AI requests go to the site's own Gemini proxy (sent with the site's Origin)
 * and are cached in .cache/ai, so re-recording does not use the free quota.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CACHE = path.join(HERE, '.cache');
const VIDEOS = path.join(ROOT, 'videos');
const SAMPLES = path.join(ROOT, 'samples');
const PROXY = 'https://migabuilder-gemini.makmurphy69.workers.dev';
const VOICE = process.env.PIPER_VOICE || path.join(CACHE, 'voices', 'en_US-lessac-high.onnx');
const W = 1280, H = 720;
[CACHE, VIDEOS, SAMPLES, path.join(CACHE, 'tts'), path.join(CACHE, 'ai'), path.join(CACHE, 'raw'), path.join(CACHE, 'voices')].forEach(d => fs.mkdirSync(d, { recursive: true }));

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}
const FFMPEG = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- static server
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.txt': 'text/plain', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
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

// ---------------------------------------------------------------- voice
async function ensureVoice() {
  if (fs.existsSync(VOICE)) return;
  const base = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/';
  for (const f of ['en_US-lessac-high.onnx', 'en_US-lessac-high.onnx.json']) {
    console.log('Downloading voice', f);
    const r = await fetch(base + f); if (!r.ok) throw new Error('Voice download failed: ' + r.status);
    fs.writeFileSync(path.join(path.dirname(VOICE), f), Buffer.from(await r.arrayBuffer()));
  }
}
function wavSeconds(file) {
  const b = fs.readFileSync(file); let off = 12, rate = 22050, ch = 1, bits = 16;
  while (off < b.length - 8) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(off + 10); rate = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === 'data') return size / (rate * ch * bits / 8);
    off += 8 + size + (size % 2);
  }
  return 0;
}
function tts(text) {
  const out = path.join(CACHE, 'tts', sha(text + '|' + path.basename(VOICE)) + '.wav');
  if (fs.existsSync(out)) return Promise.resolve(out);
  return new Promise((res, rej) => {
    const p = spawn('python3', ['-m', 'piper', '-m', VOICE, '--length-scale', '1.02', '--sentence-silence', '0.25', '-f', out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', c => c === 0 && fs.existsSync(out) ? res(out) : rej(new Error('piper failed: ' + err.slice(-400))));
    p.stdin.end(text.replace(/[“”]/g, '"').replace(/[’]/g, "'"));
  });
}

// ---------------------------------------------------------------- on-page overlay (pointer, highlight, captions, title cards)
const OVERLAY = `(() => {
  if (window.__tv) return;
  const css = \`#__tv_cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .55s cubic-bezier(.3,.7,.3,1);transform:translate(640px,360px)}
  #__tv_cursor svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
  #__tv_ring{position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #E2A63B;border-radius:8px;box-shadow:0 0 0 4px rgba(226,166,59,.28),0 0 22px rgba(226,166,59,.55);transition:all .35s ease;opacity:0}
  #__tv_click{position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #E2A63B;opacity:0}
  #__tv_click.go{animation:__tvclick .5s ease-out}
  @keyframes __tvclick{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.4);opacity:0}}
  #__tv_cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:1000px;width:max-content;z-index:2147483647;pointer-events:none;background:rgba(8,24,38,.9);color:#fff;font:600 21px/1.4 'IBM Plex Sans',Arial,sans-serif;padding:10px 20px;border-radius:10px;text-align:center;opacity:0;transition:opacity .25s}
  #__tv_card{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(circle at 30% 20%,#16406a,#081826 70%);color:#EDEAE0;font-family:'Space Grotesk',Arial,sans-serif;text-align:center}
  #__tv_card b{font-size:62px;letter-spacing:-.02em}#__tv_card span{font-size:26px;margin-top:14px;color:#6FD1E0;max-width:900px;line-height:1.35}#__tv_card i{font-style:normal;font-size:18px;margin-top:30px;color:rgba(237,234,224,.6)}
  #__tv_skip{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:#E2A63B;color:#2a1c05;font:700 18px 'IBM Plex Sans',Arial,sans-serif;padding:8px 18px;border-radius:999px;display:none}\`;
  const add = () => {
    if (document.getElementById('__tv_cursor')) return;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    const mk = (id, html) => { const d = document.createElement('div'); d.id = id; if (html) d.innerHTML = html; document.documentElement.appendChild(d); return d; };
    mk('__tv_ring'); mk('__tv_click'); mk('__tv_cap'); mk('__tv_card'); mk('__tv_skip');
    mk('__tv_cursor', '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.4-7.6L20.5 11z" fill="#fff" stroke="#081826" stroke-width="1.6" stroke-linejoin="round"/></svg>');
  };
  window.__tv = {
    add,
    cursor(x, y) { add(); document.getElementById('__tv_cursor').style.transform = 'translate(' + (x - 3) + 'px,' + (y - 2) + 'px)'; },
    ring(r) { add(); const e = document.getElementById('__tv_ring'); if (!r) { e.style.opacity = 0; return; } Object.assign(e.style, { left: (r.x - 6) + 'px', top: (r.y - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px', opacity: 1 }); },
    click(x, y) { add(); const e = document.getElementById('__tv_click'); e.classList.remove('go'); e.style.left = x + 'px'; e.style.top = y + 'px'; void e.offsetWidth; e.classList.add('go'); },
    caption(t) { add(); const e = document.getElementById('__tv_cap'); e.textContent = t || ''; e.style.opacity = t ? 1 : 0; },
    card(title, sub, foot) { add(); const e = document.getElementById('__tv_card'); if (!title) { e.style.display = 'none'; return; } e.innerHTML = '<b></b><span></span><i></i>'; e.children[0].textContent = title; e.children[1].textContent = sub || ''; e.children[2].textContent = foot || ''; e.style.display = 'flex'; },
    skip(t) { add(); const e = document.getElementById('__tv_skip'); e.textContent = t || ''; e.style.display = t ? 'block' : 'none'; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

// ---------------------------------------------------------------- one recording
async function record(browser, file, sc, baseUrl) {
  const tool = file.replace(/\.html$/, '');
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: path.join(CACHE, 'raw'), size: { width: W, height: H } }, acceptDownloads: true, permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(OVERLAY);
  await ctx.addInitScript(() => { try { localStorage.setItem('migabuilderLang', 'en'); } catch (e) {} });
  // never count recording sessions as visits
  await ctx.route(/migabuilder-visits|migabuilder-feedback/, r => r.fulfill({ status: 204, body: '' }));
  await ctx.route(PROXY + '/**', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors() });
    const body = req.postData() || '';
    const key = path.join(CACHE, 'ai', sha(body) + '.json');
    let text;
    if (fs.existsSync(key)) text = fs.readFileSync(key, 'utf8');
    else {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://migabuilder.com' }, body });
        text = await r.text();
        if (r.ok) { fs.writeFileSync(key, text); break; }
        console.log('   AI request failed (' + r.status + '), retrying…'); await sleep(8000 * (attempt + 1));
      }
    }
    route.fulfill({ status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors()), body: text });
  });
  // FETCH_VIA_NODE=1: let Node fetch CDN scripts and fonts for the page. Useful behind a
  // TLS-inspecting proxy that Node trusts (NODE_EXTRA_CA_CERTS) but Chromium does not.
  if (process.env.FETCH_VIA_NODE) {
    await ctx.route(url => !url.href.startsWith(baseUrl) && !url.href.startsWith(PROXY) && /^https?:/.test(url.protocol), async route => {
      const req = route.request();
      try {
        const r = await fetch(req.url(), { method: req.method(), headers: { 'User-Agent': 'Mozilla/5.0 MigaBuilder tutorial recorder' }, body: req.method() === 'GET' ? undefined : req.postDataBuffer() || undefined });
        route.fulfill({ status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }, body: Buffer.from(await r.arrayBuffer()) });
      } catch (e) { route.abort(); }
    });
  }
  const page = await ctx.newPage();
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const clips = [], skips = [], transcript = [];
  let sample = null, pointer = { x: W / 2, y: H / 2 };

  const h = {
    page, ctx, baseUrl, tool,
    asset: name => path.join(HERE, 'assets', name),
    async go(url) { await page.goto(baseUrl + '/' + (url || file), { waitUntil: 'load' }); await page.evaluate(() => window.__tv && window.__tv.add()); await page.addStyleTag({ content: '.miga-tutorial{display:none!important}#voiceNote,.voice-note{display:none!important}' }); },
    async step(text, fn) {
      const wav = await tts(text); const dur = wavSeconds(wav);
      clips.push({ t: now() + 0.15, wav }); transcript.push(text);
      await page.evaluate(t => window.__tv && window.__tv.caption(t), text).catch(() => {});
      const started = Date.now();
      await Promise.all([sleep(dur * 1000 + 450), fn ? fn() : null]);
      const spent = (Date.now() - started) / 1000;
      if (spent < dur + 0.45) await sleep((dur + 0.45 - spent) * 1000);
    },
    async card(title, sub, foot) { await page.evaluate(([a, b, c]) => window.__tv.card(a, b, c), [title, sub, foot]); },
    async uncard() { await page.evaluate(() => window.__tv.card(null)); },
    // Hide a long wait from the final video: everything between start and end is cut.
    async skip(label, fn) {
      await page.evaluate(t => { window.__tv.caption(''); window.__tv.skip(t); }, '⏩ ' + label).catch(() => {});
      const s = now(); await fn(); const e = now();
      await page.evaluate(() => window.__tv && window.__tv.skip('')).catch(() => {});
      if (e - s > 2) skips.push([s + 0.8, e - 0.2]);
    },
    async point(sel, opts = {}) {
      const loc = typeof sel === 'string' ? page.locator(sel).first() : sel;
      await loc.waitFor({ state: 'visible', timeout: opts.timeout || 15000 });
      await loc.evaluate((e, block) => e.scrollIntoView({ behavior: 'smooth', block }), opts.block || 'center');
      await sleep(550);
      const r = await loc.boundingBox(); if (!r) return loc;
      pointer = { x: r.x + Math.min(r.width / 2, 60 + r.width / 4), y: r.y + r.height / 2 };
      await page.evaluate(([x, y, r]) => { window.__tv.cursor(x, y); window.__tv.ring(r); }, [pointer.x, pointer.y, r]);
      await page.mouse.move(pointer.x, pointer.y, { steps: 8 });
      await sleep(600);
      return loc;
    },
    async unring() { await page.evaluate(() => window.__tv.ring(null)).catch(() => {}); },
    async click(sel, opts = {}) {
      const loc = await h.point(sel, opts);
      await page.evaluate(([x, y]) => window.__tv.click(x, y), [pointer.x, pointer.y]);
      await loc.click({ timeout: 15000, force: !!opts.force });
      await sleep(opts.after ?? 500);
    },
    async type(sel, text, opts = {}) {
      const loc = await h.point(sel, opts);
      await loc.click(); await loc.fill('');
      const visible = text.slice(0, opts.visible ?? 90);
      await loc.pressSequentially(visible, { delay: opts.delay ?? 28 });
      if (text.length > visible.length) await loc.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.scrollTop = e.scrollHeight; }, text);
      await sleep(300);
    },
    async fill(sel, text) { const loc = await h.point(sel); await loc.fill(text); await sleep(300); },
    async select(sel, value) { const loc = await h.point(sel); await loc.selectOption(value); await sleep(400); },
    async check(sel, on = true) { const loc = await h.point(sel); await loc.setChecked(on); await sleep(300); },
    async upload(sel, files) { await page.locator(sel).first().setInputFiles(Array.isArray(files) ? files.map(h.asset) : h.asset(files)); await sleep(600); },
    async scroll(sel, block = 'start') { await page.locator(sel).first().evaluate((e, b) => e.scrollIntoView({ behavior: 'smooth', block: b }), block); await sleep(900); },
    async scrollBy(y) { await page.evaluate(y => window.scrollBy({ top: y, behavior: 'smooth' }), y); await sleep(900); },
    async wait(ms) { await sleep(ms); },
    // --- samples
    async sampleDownload(sel, label, clickOpts) {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), h.click(sel, clickOpts)]);
      const ext = path.extname(dl.suggestedFilename()) || '.bin';
      const out = path.join(SAMPLES, tool + ext); await dl.saveAs(out);
      sample = { file: 'samples/' + tool + ext, label, kind: kindOf(ext) };
      return out;
    },
    async sampleShot(sel, label) {
      const out = path.join(SAMPLES, tool + '.png');
      await h.unring(); await page.evaluate(() => { window.__tv.caption(''); }).catch(() => {});
      await page.locator(sel).first().screenshot({ path: out, animations: 'disabled' });
      sample = { file: 'samples/' + tool + '.png', label, kind: 'image' }; return out;
    },
    async sampleFile(content, ext, label) {
      const out = path.join(SAMPLES, tool + ext); fs.writeFileSync(out, content);
      sample = { file: 'samples/' + tool + ext, label, kind: kindOf(ext) }; return out;
    },
    setSample(s) { sample = s; }
  };

  console.log('● ' + file);
  let error = null;
  try {
    await h.go();
    await h.card(sc.title, sc.subtitle, 'MigaBuilder · free browser tools');
    await h.step(sc.intro);
    await h.uncard();
    await sc.run(h, page);
    await h.unring();
    await h.card(sc.title, sc.outro || 'Now try it yourself — it’s free.', 'migabuilder.com/' + file);
    await h.step(sc.outroSay || 'Now it is your turn. Open ' + sc.title + ' on MigaBuilder and try it yourself. It is free, and there is nothing to sign up for.');
  } catch (e) { error = e; console.log('   ✗ ' + e.message.split('\n')[0]); }
  const total = now();
  const vid = page.video();
  await ctx.close();
  const raw = await vid.path();
  if (error && !process.env.KEEP_FAILED) { fs.rmSync(raw, { force: true }); return { tool, error: error.message }; }
  const info = await encode(tool, raw, clips, skips, total);
  fs.rmSync(raw, { force: true });
  return { tool, title: sc.title, video: 'videos/' + tool + '.mp4', poster: 'videos/' + tool + '.jpg', duration: Math.round(info.duration), transcript, sample, error: error && error.message };
}
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }; }
function kindOf(ext) { ext = ext.toLowerCase(); return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext) ? 'image' : ['.html', '.htm'].includes(ext) ? 'html' : ext === '.pdf' ? 'pdf' : ['.mp3', '.wav', '.ogg', '.m4a'].includes(ext) ? 'audio' : ['.mp4', '.webm'].includes(ext) ? 'video' : ['.txt', '.md', '.csv', '.json'].includes(ext) ? 'text' : 'download'; }

// ---------------------------------------------------------------- ffmpeg: cut waits, lay narration, encode
async function encode(tool, raw, clips, skips, total) {
  skips.sort((a, b) => a[0] - b[0]);
  const keep = []; let cur = 0.25;
  for (const [a, b] of skips) { if (a > cur) keep.push([cur, a]); cur = Math.max(cur, b); }
  keep.push([cur, total]);
  const shift = t => { let s = 0.25; for (const [a, b] of skips) if (t >= b) s += b - a; else if (t > a) s += t - a; return Math.max(0, t - s); };
  const duration = keep.reduce((n, [a, b]) => n + (b - a), 0);
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw];
  clips.forEach(c => args.push('-i', c.wav));
  let fc = keep.map(([a, b], i) => `[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`).join(';');
  fc += ';' + keep.map((_, i) => `[v${i}]`).join('') + `concat=n=${keep.length}:v=1:a=0,fps=20,scale=${W}:${H}:flags=lanczos,format=yuv420p[v]`;
  fc += ';' + clips.map((c, i) => { const ms = Math.round(shift(c.t) * 1000); return `[${i + 1}:a]aresample=44100,adelay=${ms}:all=1[a${i}]`; }).join(';');
  fc += ';' + clips.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=0.85,alimiter=limit=0.9,apad[a]`;
  const out = path.join(VIDEOS, tool + '.mp4');
  execFileSync(FFMPEG, [...args, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', duration.toFixed(2), '-c:v', 'libx264', '-preset', 'slow', '-crf', '31', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart', out]);
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', Math.max(1, duration * 0.62).toFixed(2), '-i', out, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '6', path.join(VIDEOS, tool + '.jpg')]);
  const size = fs.statSync(out).size;
  console.log(`   ✓ ${tool}.mp4 ${duration.toFixed(0)}s ${(size / 1048576).toFixed(2)} MB`);
  return { duration };
}

// ---------------------------------------------------------------- main
const { SCENARIOS } = await import('./scenarios.mjs');
const { ensureAssets } = await import('./assets.mjs');
const wanted = process.argv.slice(2).map(a => a.endsWith('.html') ? a : a + '.html');
const list = Object.keys(SCENARIOS).filter(f => !wanted.length || wanted.includes(f));
if (!list.length) { console.log('No matching scenarios. Available:', Object.keys(SCENARIOS).join(' ')); process.exit(1); }
await ensureVoice();
const { chromium } = await loadPlaywright();
const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(process.env.IGNORE_CERTS ? ['--ignore-certificate-errors'] : []), ...(process.env.BROWSER_PROXY ? ['--proxy-server=' + process.env.BROWSER_PROXY] : [])] });
const srv = await serve();
const baseUrl = 'http://127.0.0.1:' + srv.address().port;
await ensureAssets(browser, FFMPEG, path.join(HERE, 'assets'));
const manifestFile = process.env.MANIFEST || path.join(VIDEOS, 'manifest.json');
const failed = [];
for (const f of list) {
  const r = await record(browser, f, SCENARIOS[f], baseUrl);
  if (r.error && !r.video) { failed.push(f + ': ' + r.error.split('\n')[0]); continue; }
  if (r.error) failed.push(f + ' (partial): ' + r.error.split('\n')[0]);
  // Re-read before writing so several recorders can run side by side.
  const latest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
  latest[f] = { title: r.title, video: r.video, poster: r.poster, duration: r.duration, transcript: r.transcript, sample: r.sample || null };
  fs.writeFileSync(manifestFile, JSON.stringify(Object.fromEntries(Object.entries(latest).sort()), null, 1));
}
await browser.close(); srv.close();
if (failed.length) { console.log('\nProblems:\n - ' + failed.join('\n - ')); process.exitCode = 1; }
else console.log('\nAll ' + list.length + ' recordings done.');
