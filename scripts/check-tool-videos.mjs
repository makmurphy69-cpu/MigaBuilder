#!/usr/bin/env node
/* Fails when a tool listed on the homepage has no narrated explanation video.
 *
 *   node scripts/check-tool-videos.mjs
 *
 * Every tool card on index.html (<a class="tool-card" href="…html">) must have
 *   - a scenario in scripts/tutorial-videos/scenarios.mjs,
 *   - an entry in videos/manifest.json with a transcript,
 *   - the video and poster that entry points to, published in the
 *     makmurphy69-cpu/migabuilder-videos repository (GitHub Pages).
 * Record a missing video with: node scripts/tutorial-videos/record.mjs <tool>
 * (see scripts/tutorial-videos/README.md). Runs in CI on every pull request.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const tools = [...new Set([...html.matchAll(/<a class="tool-card" href="([^"#?]+\.html)"/g)].map(m => m[1]))];
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos', 'manifest.json'), 'utf8'));
const { SCENARIOS } = await import(path.join(ROOT, 'scripts', 'tutorial-videos', 'scenarios.mjs'));

// Videos and posters are served from the videos repository; check that each one is published.
const exists = async f => {
  if (!/^https:\/\//.test(f)) return fs.existsSync(path.join(ROOT, f));
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = await fetch(f, { method: 'HEAD' }); if (r.ok) return true; if (r.status === 404) return false; } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
};

const problems = [];
for (const t of tools) {
  const miss = [];
  if (!SCENARIOS[t]) miss.push('no scenario in scripts/tutorial-videos/scenarios.mjs');
  const e = manifest[t];
  if (!e) miss.push('no entry in videos/manifest.json');
  else {
    for (const k of ['video', 'poster']) if (!e[k] || !(await exists(e[k]))) miss.push(k + ' missing (' + (e[k] || 'not set') + ')');
    if (!Array.isArray(e.transcript) || !e.transcript.length) miss.push('no transcript');
  }
  if (miss.length) problems.push(t + ': ' + miss.join('; '));
}
if (problems.length) {
  console.error('These tools need an explanation video:\n  ' + problems.join('\n  '));
  console.error('\nAdd a scenario and record it: node scripts/tutorial-videos/record.mjs <tool>, then push the new files in the migabuilder-videos repository  (see scripts/tutorial-videos/README.md)');
  process.exit(1);
}
console.log('✓ All ' + tools.length + ' tools have an explanation video.');
