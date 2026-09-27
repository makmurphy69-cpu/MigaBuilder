#!/usr/bin/env node
/* Fails when a tool listed on the homepage has no narrated explanation video.
 *
 *   node scripts/check-tool-videos.mjs
 *
 * Every tool card on index.html (<a class="tool-card" href="…html">) must have
 *   - a scenario in scripts/tutorial-videos/scenarios.mjs,
 *   - an entry in videos/manifest.json with a transcript,
 *   - the video and poster files that entry points to.
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

const problems = [];
for (const t of tools) {
  const miss = [];
  if (!SCENARIOS[t]) miss.push('no scenario in scripts/tutorial-videos/scenarios.mjs');
  const e = manifest[t];
  if (!e) miss.push('no entry in videos/manifest.json');
  else {
    for (const k of ['video', 'poster']) if (!e[k] || !fs.existsSync(path.join(ROOT, e[k]))) miss.push(k + ' file missing (' + (e[k] || 'not set') + ')');
    if (!Array.isArray(e.transcript) || !e.transcript.length) miss.push('no transcript');
  }
  if (miss.length) problems.push(t + ': ' + miss.join('; '));
}
if (problems.length) {
  console.error('These tools need an explanation video:\n  ' + problems.join('\n  '));
  console.error('\nAdd a scenario and record it: node scripts/tutorial-videos/record.mjs <tool>  (see scripts/tutorial-videos/README.md)');
  process.exit(1);
}
console.log('✓ All ' + tools.length + ' tools have an explanation video.');
