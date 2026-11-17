#!/usr/bin/env node
/* Lists English text still showing on the language pages (/es/, /de/ … made by
 * scripts/build-language-pages.mjs). Opens each page in a real browser, lets i18n.js
 * translate it, and prints visible text that still reads as English.
 *
 *   node scripts/check-translations.mjs                 # every Spanish page
 *   node scripts/check-translations.mjs de qr-forge     # German, one page
 *
 * It only reports (exit code 0). Fix a finding by adding the English text to the page's
 * i18n/<page>.js (or i18n.js for text shared by many pages), then rebuild the language pages.
 * Skipped on purpose: the video-guide transcript (it matches the English narration), code,
 * what the user types, and examples a tool generates.
 *
 * Env: CHROMIUM=/path/to/chrome, BROWSER_PROXY=http://host:port, IGNORE_CERTS=1
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['es', 'ar', 'zh', 'sw', 'sv', 'de', 'pt', 'fr'];

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };
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

const args = process.argv.slice(2);
const lang = LANGS.includes(args[0]) ? args.shift() : 'es';
const dir = path.join(ROOT, lang);
const pages = args.length ? args.map(a => a.replace(/\.html$/, '') + '.html') : fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();

const srv = await serve();
const base = 'http://127.0.0.1:' + srv.address().port;
const { chromium } = await loadPlaywright();
const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: [...(process.env.IGNORE_CERTS ? ['--ignore-certificate-errors'] : []), ...(process.env.BROWSER_PROXY ? ['--proxy-server=' + process.env.BROWSER_PROXY] : [])] });

let total = 0;
for (const file of pages) {
  const page = await browser.newPage();
  await page.route(u => /cloudflareinsights\.com|migabuilder-visits\./.test(u.href), r => r.abort());
  try { await page.goto(`${base}/${lang}/${file}`, { timeout: 30000 }); } catch (e) { console.log(`✗ ${file}: could not open`); await page.close(); continue; }
  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => {
    // Words that are common in English and do not occur on their own in the site's other languages.
    const ENGLISH = /\b(the|and|your|with|you|this|from|will|that|are|into|each|press|choose|click)\b/i;
    const SKIP = 'script,style,code,pre,textarea,noscript,svg,[contenteditable],[data-no-i18n],.lang-switcher,.mkb,.miga-transcript,.miga-tutorial,#mt-caption';
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.nodeValue.replace(/\s+/g, ' ').trim();
      const el = n.parentElement;
      if (text.length < 4 || !ENGLISH.test(text) || !el || el.closest(SKIP)) continue;
      const style = getComputedStyle(el);
      if ((!el.offsetParent && style.position !== 'fixed') || style.visibility === 'hidden') continue;
      if (!out.includes(text)) out.push(text);
    }
    return out;
  });
  await page.close();
  if (!found.length) continue;
  total += found.length;
  console.log(`${lang}/${file} (${found.length})`);
  found.forEach(t => console.log('  ' + (t.length > 140 ? t.slice(0, 140) + '…' : t)));
}
console.log(`\n${total} English text${total === 1 ? '' : 's'} on ${pages.length} ${lang} page${pages.length === 1 ? '' : 's'}.`);
await browser.close();
srv.close();
