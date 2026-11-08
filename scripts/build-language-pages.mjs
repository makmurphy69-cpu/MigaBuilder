#!/usr/bin/env node
/* Builds one page per language for every homepage tool (and the homepage), so search engines
 * can find each language at its own address: /es/qr-forge.html, /de/qr-forge.html, /es/ …
 *
 *   node scripts/build-language-pages.mjs --meta [page …]   # read translated titles/descriptions (needs Chromium)
 *   node scripts/build-language-pages.mjs                   # write /es/ /ar/ … pages, hreflang links and sitemap-languages.xml
 *   node scripts/build-language-pages.mjs --check           # fail if anything is out of date (runs in CI)
 *
 * A language page is a copy of the English page with:
 *   - <html lang>, a translated <title>, description and FAQ structured data,
 *   - its own canonical address, and hreflang links to every language version,
 *   - <base href="/"> so the page's own files still load from the site root,
 *   - window.MIGA_PAGE_LANG, which makes i18n.js open the page in that language.
 * The visible text is translated in the browser by i18n.js, exactly as on the English page.
 *
 * Translated titles, descriptions and FAQ answers come from i18n/page-meta.json, which --meta
 * fills by opening each page and switching its language. When an English title, description
 * or FAQ changes, run --meta for that page, then build again. Edit only the English pages:
 * the language folders are generated.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://migabuilder.com';
const LANGS = ['es', 'ar', 'zh', 'sw', 'sv', 'de', 'pt', 'fr'];
const META_FILE = path.join(ROOT, 'i18n', 'page-meta.json');
const SITEMAP = path.join(ROOT, 'sitemap-languages.xml');
const MARK_START = '<!-- language versions (scripts/build-language-pages.mjs) -->';
const MARK_END = '<!-- /language versions -->';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// The homepage and every tool listed on it.
function pages() {
  const home = read('index.html');
  const tools = [...home.matchAll(/class="tool-card[^"]*"[^>]*href="([a-z0-9-]+\.html)"|href="([a-z0-9-]+\.html)"[^>]*class="tool-card/g)].map(m => m[1] || m[2]);
  // Only pages that have translations (they load i18n.js); the rest would be English under a foreign address.
  return ['index.html', ...[...new Set(tools)].filter(f => fs.existsSync(path.join(ROOT, f)) && /<script[^>]+src="\/?i18n\.js"/.test(read(f))).sort()];
}
const urlOf = (lang, page) => SITE + '/' + (lang === 'en' ? '' : lang + '/') + (page === 'index.html' ? '' : page);

function headInfo(html) {
  const title = unesc((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const description = unesc((html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '').trim();
  return { title, description, faq: faqStrings(html) };
}
function jsonLdBlocks(html) {
  return [...html.matchAll(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g)];
}
function faqStrings(html) {
  const out = [];
  for (const m of jsonLdBlocks(html)) {
    let data; try { data = JSON.parse(m[2]); } catch (e) { continue; }
    if (data['@type'] !== 'FAQPage') continue;
    for (const q of data.mainEntity || []) { out.push(q.name); if (q.acceptedAnswer) out.push(q.acceptedAnswer.text); }
  }
  return out;
}
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Removes the block together with the line break the build puts after it, so building twice changes nothing.
const stripBlock = html => html.replace(new RegExp(reEsc(MARK_START) + '[\\s\\S]*?' + reEsc(MARK_END) + '\\n?', 'g'), '');

function alternates(page) {
  const links = ['en', ...LANGS].map(l => `<link rel="alternate" hreflang="${l === 'zh' ? 'zh-Hans' : l}" href="${urlOf(l, page)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${urlOf('en', page)}">`);
  return MARK_START + '\n' + links.join('\n') + '\n' + MARK_END;
}

// Apply a function to the HTML outside <script> and <style> blocks only.
function outsideCode(html, fn) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/i).map((part, i) => i % 2 ? part : fn(part)).join('');
}

function languagePage(englishHtml, page, lang, meta, pageSet) {
  const m = (meta && meta[lang]) || {};
  const src = stripBlock(englishHtml);
  const en = headInfo(src);
  const title = m.title || en.title;
  const description = m.description || en.description;
  let html = src;
  // <html lang dir> and the English title for switching back in place.
  html = html.replace(/<html\b([^>]*)>/i, (all, attrs) => {
    attrs = attrs.replace(/\s(lang|dir|data-en-title)="[^"]*"/g, '');
    return `<html lang="${lang === 'zh' ? 'zh-Hans' : lang}"${lang === 'ar' ? ' dir="rtl"' : ''} data-en-title="${esc(en.title)}"${attrs}>`;
  });
  // Root-relative loading, the page language, and same-page #links (which <base> would send to the homepage).
  const boot = `<base href="/"><script>window.MIGA_PAGE_LANG='${lang}';addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^="#"]');if(!a||e.defaultPrevented||a.target)return;e.preventDefault();var h=a.getAttribute('href');if(h.length>1)location.hash=h;});</script>`;
  if (/<meta\s+charset=[^>]*>/i.test(html)) html = html.replace(/<meta\s+charset=[^>]*>/i, s => s + boot);
  else html = html.replace(/<head>/i, s => s + boot);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*(")/gi, (a, b, c) => b + esc(description) + c);
  html = html.replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*(")/gi, (a, b, c) => b + esc(title.replace(/\s*\|\s*MigaBuilder\s*$/, '')) + c);
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/gi, (a, b, c) => b + urlOf(lang, page) + c);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/gi, (a, b, c) => b + urlOf(lang, page) + c);
  html = html.replace(/<\/head>/i, alternates(page) + '\n</head>');
  // FAQ structured data in the page language.
  const faq = m.faq || {};
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (all, a, body, c) => {
    let data; try { data = JSON.parse(body); } catch (e) { return all; }
    if (data['@type'] !== 'FAQPage') return all;
    for (const q of data.mainEntity || []) {
      if (faq[q.name]) q.name = faq[q.name];
      if (q.acceptedAnswer && faq[q.acceptedAnswer.text]) q.acceptedAnswer.text = faq[q.acceptedAnswer.text];
    }
    if (data.inLanguage == null) data.inLanguage = lang;
    return a + JSON.stringify(data) + c;
  });
  // Links to other translated pages stay in this language.
  html = outsideCode(html, part => part.replace(/(<a\b[^>]*?\shref=")(\/?)([a-z0-9-]+\.html|\.\/|)((?:#[^"]*)?)"/gi, (all, a, slash, target, hash) => {
    if (target === '' && !slash && !hash) return all;            // href=""
    if (target === '' && !slash) return all;                      // href="#…" — same page
    const file = target === './' || target === '' ? 'index.html' : target;
    if (!pageSet.has(file)) return all;
    return a + '/' + lang + '/' + (file === 'index.html' ? '' : file) + hash + '"';
  }));
  return '<!-- Generated from /' + page + ' by scripts/build-language-pages.mjs. Edit the English page, then rebuild. -->\n' + html;
}

function englishWithAlternates(html, page) {
  const clean = stripBlock(html);
  return clean.replace(/<\/head>/i, alternates(page) + '\n</head>');
}

function sitemapXml(list) {
  const body = list.map(page => LANGS.map(lang => {
    const alts = ['en', ...LANGS].map(l => `    <xhtml:link rel="alternate" hreflang="${l === 'zh' ? 'zh-Hans' : l}" href="${urlOf(l, page)}"/>`).join('\n');
    return `  <url>\n    <loc>${urlOf(lang, page)}</loc>\n${alts}\n  </url>`;
  }).join('\n')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by scripts/build-language-pages.mjs -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

function loadMeta() { try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (e) { return {}; } }

// Everything the build would write: { relativePath: content }.
function plan() {
  const meta = loadMeta();
  const list = pages();
  const set = new Set(list);
  const out = {}, stale = [];
  for (const page of list) {
    const english = read(page);
    const en = headInfo(stripBlock(english));
    const pm = meta[page];
    if (!pm || pm.src.title !== en.title || pm.src.description !== en.description || JSON.stringify(pm.src.faq || []) !== JSON.stringify(en.faq)) stale.push(page);
    out[page] = englishWithAlternates(english, page);
    for (const lang of LANGS) out[lang + '/' + page] = languagePage(english, page, lang, pm, set);
  }
  out[path.relative(ROOT, SITEMAP)] = sitemapXml(list);
  return { out, stale, list };
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };
function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Open each page, switch through the languages and keep the translated title, description and FAQ text.
async function readMeta(only) {
  const { chromium } = await loadPlaywright();
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const meta = loadMeta();
  const list = only.length ? pages().filter(p => only.includes(p) || only.includes(p.replace(/\.html$/, ''))) : pages();
  for (const page of list) {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('migabuilderNoCount', '1'); } catch (e) {} });
    await ctx.route('**/*', r => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
    const tab = await ctx.newPage();
    const en = headInfo(stripBlock(read(page)));
    try {
      await tab.goto(base + page, { waitUntil: 'load', timeout: 30000 });
      await tab.waitForFunction(() => window.I18N && I18N.getLang && document.getElementById('i18nLangSelect'), null, { timeout: 15000 });
      await tab.waitForTimeout(600);
      const entry = { src: en };
      // Remember the English text of the elements that carry the title, description and FAQ.
      await tab.evaluate(faq => {
        const pick = sel => document.querySelector(sel);
        window.__metaEls = {
          h1: pick('h1[aria-label]') || pick('h1'), sub: pick('header.masthead p, .masthead p, header p'), about: pick('.miga-about > p'), hero: pick('.hero-copy')
        };
        window.__metaEn = {};
        for (const k in window.__metaEls) window.__metaEn[k] = window.__metaEls[k] ? (window.__metaEls[k].getAttribute('aria-label') || window.__metaEls[k].textContent).trim() : '';
        const want = new Set(faq);
        window.__faqEls = Array.from(document.querySelectorAll('h2, h3, h4, p, li, summary, dt, dd')).filter(el => want.has(el.textContent.trim())).map(el => [el, el.textContent.trim()]);
      }, en.faq);
      for (const lang of LANGS) {
        const got = await tab.evaluate(async lang => {
          I18N.setLang(lang);
          await new Promise(r => setTimeout(r, 350));
          const now = {};
          for (const k in window.__metaEls) now[k] = window.__metaEls[k] ? (window.__metaEls[k].getAttribute('aria-label') || window.__metaEls[k].textContent).trim() : '';
          const faq = {};
          for (const [el, enText] of window.__faqEls) { const t = el.textContent.trim(); if (t && t !== enText) faq[enText] = t; }
          return { title: document.title, now, en: window.__metaEn, faq };
        }, lang);
        const changed = k => got.now[k] && got.now[k] !== got.en[k];
        let title = got.title !== en.title ? got.title : '';
        // No translated <title>: the translated heading plus the first sentence of the translated subtitle.
        const firstSentence = t => {
          t = t.split(/(?<=[.!?。！？])\s*|\s+—\s+|——/)[0].replace(/[.。]$/, '');
          if (t.length <= 60) return t;
          const clause = t.split(/[,;，；、]/)[0];
          return clause.length >= 20 && clause.length <= 60 ? clause : t.slice(0, 57).replace(/\s+\S*$/, '') + '…';
        };
        if (!title && (changed('sub') || changed('hero'))) title = (got.now.h1 || got.en.h1) + ' — ' + firstSentence(changed('sub') ? got.now.sub : got.now.hero);
        if (title && !/MigaBuilder/.test(title)) title += ' | MigaBuilder';
        let description = changed('about') ? got.now.about : changed('hero') ? got.now.hero : changed('sub') ? got.now.sub : '';
        if (description.length > 300) description = description.slice(0, 297).replace(/\s+\S*$/, '') + '…';
        entry[lang] = { title, description, faq: got.faq };
      }
      meta[page] = entry;
      const missing = LANGS.filter(l => !entry[l].title || !entry[l].description);
      console.log((missing.length ? '△ ' : '✓ ') + page + (missing.length ? '  (English title or description kept for: ' + missing.join(', ') + ')' : ''));
    } catch (e) {
      console.log('✗ ' + page + ': ' + e.message.split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  const sorted = Object.fromEntries(Object.keys(meta).sort().map(k => [k, meta[k]]));
  fs.writeFileSync(META_FILE, JSON.stringify(sorted, null, 1) + '\n');
}

const args = process.argv.slice(2);
if (args[0] === '--meta') {
  await readMeta(args.slice(1));
} else {
  const { out, stale, list } = plan();
  if (args[0] === '--check') {
    const wrong = Object.keys(out).filter(f => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8') !== out[f]);
    const extra = LANGS.flatMap(l => fs.existsSync(path.join(ROOT, l)) ? fs.readdirSync(path.join(ROOT, l)).map(f => l + '/' + f) : []).filter(f => !(f in out));
    if (stale.length) console.log('Translated titles/descriptions are out of date for: ' + stale.join(', ') + '\n  Run: node scripts/build-language-pages.mjs --meta ' + stale.map(p => p.replace(/\.html$/, '')).join(' '));
    if (wrong.length || extra.length) console.log('Language pages are out of date (' + (wrong.length + extra.length) + ' files). Run: node scripts/build-language-pages.mjs');
    if (stale.length || wrong.length || extra.length) process.exit(1);
    console.log('✓ ' + list.length + ' pages × ' + LANGS.length + ' languages are up to date.');
  } else {
    let n = 0;
    for (const [f, content] of Object.entries(out)) {
      const full = path.join(ROOT, f);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      if (!fs.existsSync(full) || fs.readFileSync(full, 'utf8') !== content) { fs.writeFileSync(full, content); n++; }
    }
    // Remove pages for tools that are no longer on the homepage.
    for (const l of LANGS) for (const f of fs.existsSync(path.join(ROOT, l)) ? fs.readdirSync(path.join(ROOT, l)) : []) {
      if (!((l + '/' + f) in out)) { fs.unlinkSync(path.join(ROOT, l, f)); n++; }
    }
    console.log(n + ' files written. ' + list.length + ' pages × ' + LANGS.length + ' languages.');
    if (stale.length) console.log('Note: translated titles/descriptions are missing or out of date for ' + stale.length + ' page(s). Run --meta for: ' + stale.map(p => p.replace(/\.html$/, '')).join(' '));
  }
}
