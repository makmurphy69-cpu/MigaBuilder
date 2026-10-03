#!/usr/bin/env node
/* Weekly check-up of everything the site depends on but does not control.
 *
 *   node scripts/weekly-checkup.mjs                 # report only
 *   node scripts/weekly-checkup.mjs --apply         # also apply the safe library upgrades
 *   node scripts/weekly-checkup.mjs --report out.md # write the report to a file  (default: the temp folder)
 *   node scripts/weekly-checkup.mjs --only libs,gemini,links,live
 *
 * 1. Libraries: every pinned CDN library (cdnjs, jsDelivr, unpkg) is compared
 *    with the latest release. A "safe" upgrade is a newer release in the same
 *    major version (for 0.x versions: the same minor), whose file exists on the
 *    CDN. --apply rewrites those URLs; bigger (major) upgrades are only listed,
 *    since they usually change the library's API.
 * 2. Gemini models: every gemini-* model name in the code is looked up in
 *    Google's model list, so a retired model is caught before visitors hit it.
 *    Needs GEMINI_API_KEY; skipped without it.
 * 3. Links: every external <a href> on the pages (affiliate links included) is
 *    opened; 404/410 and dead hosts are reported as broken.
 * 4. Live site: every page in sitemap.xml must answer 200 on migabuilder.com.
 *
 * Writes check-up.json (problems, upgrades) next to the report so the workflow
 * (weekly-checkup.yml) can decide whether to open a pull request or an issue.
 * The exit code is 0 unless the script itself crashes: findings go in the report.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const argValue = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const REPORT = argValue('--report') || path.join(os.tmpdir(), 'check-up.md');
const ONLY = (argValue('--only') || 'libs,gemini,links,live').split(',');
const SITE = 'https://migabuilder.com';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 MigaBuilder-weekly-checkup';

const sourceFiles = fs.readdirSync(ROOT).filter(f => /\.(html|js|mjs)$/.test(f)).sort();
const pageFiles = sourceFiles.filter(f => f.endsWith('.html'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

async function get(url, { timeout = 20000, method = 'GET', json = false, headers = {} } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, ...headers } });
    const body = json ? await r.json().catch(() => null) : (method === 'GET' ? await r.text().catch(() => '') : '');
    return { status: r.status, ok: r.ok, body };
  } catch (e) {
    return { status: 0, ok: false, error: e.name === 'AbortError' ? 'timed out' : (e.cause?.code || e.message) };
  } finally { clearTimeout(t); }
}

async function pool(items, size, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

// ---------- semver helpers ----------
const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;
const parse = v => { const m = SEMVER.exec(v); return m ? m.slice(1, 4).map(Number) : null; };
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const sameLine = (cur, v) => cur[0] > 0 ? v[0] === cur[0] : v[0] === 0 && v[1] === cur[1];
function newest(versions, filter = () => true) {
  return versions.map(v => [v, parse(v)]).filter(([, p]) => p && filter(p)).sort((a, b) => cmp(b[1], a[1]))[0]?.[0] || null;
}

// ---------- 1. libraries ----------
const CDN_URL = /https:\/\/(?:cdnjs\.cloudflare\.com\/ajax\/libs\/([\w.\-]+)\/([\w.\-]+)\/|cdn\.jsdelivr\.net\/npm\/((?:@[\w.\-]+\/)?[\w.\-]+)@([\w.\-^~]+)\/?|unpkg\.com\/((?:@[\w.\-]+\/)?[\w.\-]+)@([\w.\-^~]+)\/?|cdn\.jsdelivr\.net\/gh\/([\w.\-]+\/[\w.\-]+)@([\w.\-]+)\/?)[^"'`\s)<>]*/g;

function findLibraries() {
  const libs = new Map(); // key cdn|name|version -> { cdn, name, version, urls:Set, files:Set }
  for (const f of sourceFiles) {
    for (const m of read(f).matchAll(CDN_URL)) {
      const [url, cjName, cjVer, npmName, npmVer, unName, unVer, ghName, ghVer] = m;
      const [cdn, name, version] = cjName ? ['cdnjs', cjName, cjVer] : npmName ? ['jsdelivr', npmName, npmVer] : unName ? ['unpkg', unName, unVer] : ['gh', ghName, ghVer];
      const key = `${cdn}|${name}|${version}`;
      if (!libs.has(key)) libs.set(key, { cdn, name, version, urls: new Set(), files: new Set() });
      libs.get(key).urls.add(url); libs.get(key).files.add(f);
    }
  }
  return [...libs.values()];
}

const versionCache = new Map();
async function versionsOf(cdn, name) {
  const key = (cdn === 'gh' ? 'gh|' : cdn === 'cdnjs' ? 'cdnjs|' : 'npm|') + name;
  if (!versionCache.has(key)) versionCache.set(key, (async () => {
    if (cdn === 'cdnjs') {
      const r = await get(`https://api.cdnjs.com/libraries/${name}?fields=version,versions`, { json: true });
      return r.body?.versions || null;
    }
    if (cdn === 'gh') {
      const r = await get(`https://data.jsdelivr.com/v1/packages/gh/${name}`, { json: true });
      return r.body?.versions?.map(v => v.version) || null;
    }
    const r = await get(`https://registry.npmjs.org/${name.replace('/', '%2F')}`, { json: true, headers: { Accept: 'application/vnd.npm.install-v1+json' } });
    return r.body?.versions ? Object.keys(r.body.versions) : null;
  })());
  return versionCache.get(key);
}

async function checkLibraries() {
  const libs = findLibraries();
  const rows = [], upgrades = [], problems = [];
  await pool(libs, 6, async lib => {
    const versions = await versionsOf(lib.cdn, lib.name);
    if (!versions) { problems.push(`Could not look up versions of **${lib.name}** (${lib.cdn}).`); return; }
    const cur = parse(lib.version);
    const latest = newest(versions);
    if (!cur) { // floating (d3@7, tesseract.js@5) or non-semver (three.js r128): list only
      rows.push({ ...lib, latest, note: 'not pinned to an exact version; left as is' });
      return;
    }
    const safe = newest(versions, p => sameLine(cur, p) && cmp(p, cur) > 0);
    let note = '';
    if (safe) {
      const urls = [...lib.urls].map(u => [u, u.replace(`${lib.name}/${lib.version}/`, `${lib.name}/${safe}/`).replace(`${lib.name}@${lib.version}`, `${lib.name}@${safe}`)]);
      // only files (not folder prefixes like .../dist/) can be checked directly
      const checks = await pool(urls.filter(([, n]) => !n.endsWith('/')), 4, async ([, n]) => (await get(n, { method: 'HEAD' })).ok);
      if (checks.every(Boolean)) { upgrades.push({ ...lib, to: safe, urls }); note = `safe upgrade → ${safe}`; }
      else note = `${safe} exists but its file is missing on the CDN; left as is`;
    }
    if (latest && parse(latest) && !sameLine(cur, parse(latest))) note += (note ? '; ' : '') + `bigger update ${latest} available (may change how the library works: upgrade by hand and test)`;
    rows.push({ ...lib, latest, note: note || 'up to date' });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));

  if (APPLY) for (const up of upgrades) for (const f of up.files) {
    let text = read(f);
    for (const [from, to] of up.urls) text = text.split(from).join(to);
    fs.writeFileSync(path.join(ROOT, f), text);
  }
  const table = ['| Library | Used | Latest | Status |', '|---|---|---|---|',
    ...rows.map(r => `| ${r.name} (${r.cdn}) | ${r.version} | ${r.latest || '?'} | ${r.note} |`)].join('\n');
  return { problems, upgrades, section: table };
}

// ---------- 2. Gemini models ----------
async function checkGemini() {
  const used = new Map();
  for (const f of [...sourceFiles, ...fs.readdirSync(path.join(ROOT, 'cloudflare-worker')).filter(f => f.endsWith('.js')).map(f => 'cloudflare-worker/' + f), 'scripts/ai-dispatch/gemini.mjs']) {
    for (const m of read(f).matchAll(/['"`](gemini-\d[\w.\-]*)['"`]/g)) {
      if (!used.has(m[1])) used.set(m[1], new Set());
      used.get(m[1]).add(f);
    }
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { problems: [], section: '_Skipped: GEMINI_API_KEY is not set._' };
  const listed = [];
  let pageToken = '';
  do {
    const r = await get(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${key}${pageToken ? '&pageToken=' + pageToken : ''}`, { json: true });
    if (!r.ok) return { problems: [`Could not read Google's Gemini model list (HTTP ${r.status || r.error}).`], section: '' };
    listed.push(...(r.body.models || []).map(m => m.name.replace(/^models\//, '')));
    pageToken = r.body.nextPageToken || '';
  } while (pageToken);
  const problems = [], lines = [];
  for (const [model, files] of [...used].sort()) {
    if (listed.includes(model)) lines.push(`- \`${model}\` ✅`);
    else {
      lines.push(`- \`${model}\` ❌ not offered by Google any more (used in ${[...files].join(', ')})`);
      problems.push(`Gemini model \`${model}\` is no longer listed by Google; used in ${[...files].join(', ')}.`);
    }
  }
  // newer stable flash models visitors could benefit from
  const ver = m => Number(/^gemini-(\d+(?:\.\d+)?)-/.exec(m)?.[1] || 0);
  const best = Math.max(...[...used.keys()].map(ver));
  const newer = listed.filter(m => /^gemini-\d+(\.\d+)?-flash(-lite)?$/.test(m) && ver(m) > best);
  if (newer.length) lines.push('', `Newer models available: ${newer.map(m => '`' + m + '`').join(', ')}. Worth trying them when the free tier covers them.`);
  return { problems, section: lines.join('\n') };
}

// ---------- 3. external links ----------
const SKIP_HOSTS = /(^|\.)(localhost|127\.0\.0\.1|example\.(com|org)|migabuilder\.com)$/;
async function checkLinks() {
  const links = new Map();
  for (const f of pageFiles) {
    for (const m of read(f).matchAll(/<a\b[^>]*\shref="(https?:\/\/[^"#]+)[^"]*"/g)) {
      let host; try { host = new URL(m[1]).hostname; } catch { continue; }
      if (SKIP_HOSTS.test(host) || m[1].includes('${')) continue;
      if (!links.has(m[1])) links.set(m[1], new Set());
      links.get(m[1]).add(f);
    }
  }
  const results = await pool([...links.keys()], 8, async url => {
    let r = await get(url);
    if (r.status === 0 || r.status >= 500) { await new Promise(res => setTimeout(res, 3000)); r = await get(url, { timeout: 30000 }); }
    return { url, ...r };
  });
  const broken = results.filter(r => r.status === 404 || r.status === 410 || (r.status === 0 && /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|CERT|SSL/i.test(r.error || '')));
  const unsure = results.filter(r => !r.ok && !broken.includes(r));
  const where = url => [...links.get(url)].join(', ');
  const lines = [`Checked ${results.length} links.`];
  if (broken.length) lines.push('', '**Broken:**', ...broken.map(r => `- ${r.url} — ${r.status || r.error} (on ${where(r.url)})`));
  if (unsure.length) lines.push('', '<details><summary>Could not verify (sites that block robots, rate limits, timeouts) — usually fine</summary>', '', ...unsure.map(r => `- ${r.url} — ${r.status || r.error}`), '</details>');
  return { problems: broken.map(r => `Broken link ${r.url} (${r.status || r.error}) on ${where(r.url)}.`), section: lines.join('\n') };
}

// ---------- 4. live site ----------
async function checkLive() {
  const sm = await get(`${SITE}/sitemap.xml`);
  if (!sm.ok) return { problems: [`${SITE}/sitemap.xml did not load (${sm.status || sm.error}).`], section: '' };
  const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const results = await pool(urls, 8, async url => {
    let r = await get(url);
    if (!r.ok) { await new Promise(res => setTimeout(res, 5000)); r = await get(url, { timeout: 30000 }); }
    return { url, ...r };
  });
  const bad = results.filter(r => !r.ok);
  return {
    problems: bad.map(r => `Live page ${r.url} answered ${r.status || r.error}.`),
    section: bad.length ? bad.map(r => `- ❌ ${r.url} — ${r.status || r.error}`).join('\n') : `All ${results.length} pages in sitemap.xml load ✅`
  };
}

// ---------- run ----------
const checks = { libs: ['Library versions', checkLibraries], gemini: ['Gemini models', checkGemini], links: ['External links', checkLinks], live: ['Live site', checkLive] };
const problems = [], upgrades = [], sections = [];
for (const id of ONLY) {
  const [title, fn] = checks[id] || [];
  if (!fn) continue;
  console.log(`Checking: ${title}...`);
  try {
    const r = await fn();
    problems.push(...r.problems); upgrades.push(...(r.upgrades || []));
    sections.push(`## ${title}\n\n${r.section}`);
  } catch (e) {
    problems.push(`The ${title.toLowerCase()} check crashed: ${e.message}`);
  }
}

const date = new Date().toISOString().slice(0, 10);
const report = [
  `# Weekly check-up ${date}`, '',
  problems.length ? `**${problems.length} thing(s) need a look:**\n\n${problems.map(p => '- ' + p).join('\n')}` : 'Nothing needs attention ✅',
  upgrades.length ? `\n**Safe library upgrades${APPLY ? ' applied' : ' available'}:**\n\n${upgrades.map(u => `- ${u.name} ${u.version} → ${u.to} (${[...u.files].join(', ')})`).join('\n')}` : '',
  '', ...sections.map(s => s + '\n')
].join('\n');
fs.writeFileSync(REPORT, report);
fs.writeFileSync(path.join(path.dirname(REPORT), 'check-up.json'), JSON.stringify({
  problems, upgrades: upgrades.map(u => ({ name: u.name, from: u.version, to: u.to, files: [...u.files] }))
}, null, 2));
console.log(report);
