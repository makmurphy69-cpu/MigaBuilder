#!/usr/bin/env node
/* Opens every page in a real browser and fails on JavaScript errors.
 *
 *   node scripts/smoke-test.mjs              # every *.html page in the repo root
 *   node scripts/smoke-test.mjs game-forge   # only the pages named
 *
 * A page fails when it throws an uncaught error, logs a console error from
 * one of our own files, or a file of ours (script, style, data) is missing.
 * Failures caused only by third-party hosts (CDNs, analytics, AI APIs) are
 * reported as warnings, since they depend on the network, not on our code.
 * Runs in CI on every pull request (workflow smoke-test.yml).
 *
 * Env: CHROMIUM=/path/to/chrome, BROWSER_PROXY=http://host:port, IGNORE_CERTS=1
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SETTLE_MS = Number(process.env.SETTLE_MS || 1500);

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}

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

const only = process.argv.slice(2).map(a => a.endsWith('.html') ? a : a + '.html');
const pages = (only.length ? only : fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort());

const srv = await serve();
const base = 'http://127.0.0.1:' + srv.address().port;
const { chromium } = await loadPlaywright();
const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(process.env.IGNORE_CERTS ? ['--ignore-certificate-errors'] : []), ...(process.env.BROWSER_PROXY ? ['--proxy-server=' + process.env.BROWSER_PROXY] : [])] });

const isOurs = u => typeof u === 'string' && u.startsWith(base);
const failed = [], warned = [];
for (const file of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [], warnings = [];
  let externalFailed = false;
  // Visit counters and analytics only accept migabuilder.com, so keep them out of local runs.
  await page.route(u => /cloudflareinsights\.com|static\.cloudflareinsights|migabuilder-visits\./.test(u.href), r => r.abort());
  page.on('pageerror', e => errors.push('uncaught: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() && m.location().url;
    const text = m.text();
    // Network failures show up as console errors too; those are reported via requestfailed/response below.
    if (/Failed to load resource|blocked by CORS policy/.test(text)) return;
    (isOurs(loc) ? errors : warnings).push('console: ' + text.slice(0, 300) + (loc ? ' (' + loc.replace(base + '/', '') + ')' : ''));
  });
  page.on('requestfailed', r => {
    // Redirect pages (location.replace) cancel their own pending requests; that is not a failure.
    if ((r.failure() || {}).errorText === 'net::ERR_ABORTED') return;
    if (isOurs(r.url())) errors.push('request failed: ' + r.url().replace(base + '/', '') + ' ' + (r.failure() || {}).errorText);
    else if (!/cloudflareinsights|migabuilder-visits\./.test(r.url())) { externalFailed = true; warnings.push('external request failed: ' + r.url().slice(0, 120)); }
  });
  page.on('response', r => {
    if (isOurs(r.url()) && r.status() >= 400 && !/favicon\.ico$/.test(r.url())) errors.push('HTTP ' + r.status() + ': ' + r.url().replace(base + '/', ''));
  });
  try {
    await page.goto(base + '/' + file, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(SETTLE_MS);
  } catch (e) {
    errors.push('load: ' + e.message.split('\n')[0]);
  }
  await ctx.close();
  // When a third-party script did not arrive, errors in our code that depend on it are not our bug.
  const hard = externalFailed ? errors.filter(e => !/is not defined|Cannot read properties of undefined/.test(e)) : errors;
  const soft = warnings.concat(errors.filter(e => !hard.includes(e)));
  if (hard.length) { failed.push(file); console.log('✗ ' + file + '\n    ' + hard.join('\n    ')); }
  else console.log('✓ ' + file);
  if (soft.length) { warned.push(file); if (process.env.VERBOSE) console.log('    (warning) ' + soft.join('\n    (warning) ')); }
}
await browser.close();
srv.close();

console.log('\n' + (pages.length - failed.length) + '/' + pages.length + ' pages load without errors' + (warned.length ? ' (' + warned.length + ' with third-party warnings; VERBOSE=1 to show)' : '') + '.');
if (failed.length) { console.error('Failing: ' + failed.join(', ')); process.exit(1); }
