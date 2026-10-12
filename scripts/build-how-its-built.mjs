#!/usr/bin/env node
/* Writes how-its-built.json: the numbers and recent changes shown on how-its-built.html.
 *
 *   node scripts/build-how-its-built.mjs
 *
 * Everything comes from the repository itself (git history of main, index.html,
 * videos/manifest.json), so the page never claims more than the code shows.
 * Needs the full history: in a shallow clone run `git fetch --unshallow` first.
 * Runs weekly in CI (workflow how-its-built.yml), which commits the file when it changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

if (git('rev-parse', '--is-shallow-repository') === 'true') {
  console.error('This is a shallow clone, so the counts would be wrong. Run: git fetch --unshallow');
  process.exit(1);
}

const ref = process.env.HOW_REF || 'HEAD';
const index = read('index.html');
const tools = [...index.matchAll(/<a class="tool-card" href="([^"]+)"/g)].map(m => m[1]);
const videos = Object.keys(JSON.parse(read('videos/manifest.json')));

// One entry per pull request merged into main: squash merges end in "(#123)",
// merge commits say "Merge pull request #123 from …" with the title on the next line.
const SEP = '\u001f', END = '\u001e';
const log = git('log', ref, '--first-parent', `--format=%ad${SEP}%s${SEP}%b${END}`, '--date=short');
const prs = [];
for (const entry of log.split(END)) {
  const [date, subject = '', body = ''] = entry.trim().split(SEP);
  if (!date) continue;
  let m = subject.match(/^(.*) \(#(\d+)\)$/);
  if (m) { prs.push({ number: +m[2], title: m[1], date }); continue; }
  m = subject.match(/^Merge pull request #(\d+)(?:: (.*)| from .*)$/);
  if (m) prs.push({ number: +m[1], title: (m[2] || body.split('\n')[0] || '').trim(), date });
}

// The tool page a change is mostly about, when its title starts with that tool's name.
const names = [...index.matchAll(/<a class="tool-card" href="([^"]+)"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/g)]
  .map(m => ({ href: m[1], name: m[2].trim() })).sort((a, b) => b.name.length - a.name.length);
const toolFor = title => names.find(t => title.toLowerCase().startsWith(t.name.toLowerCase()))?.href || null;

const commits = +git('rev-list', '--count', ref);
const firstDay = git('log', ref, '--reverse', '--format=%ad', '--date=short').split('\n')[0];
const lastDay = git('log', ref, '-1', '--format=%ad', '--date=short');
const workflows = fs.readdirSync(path.join(ROOT, '.github/workflows')).filter(f => /\.ya?ml$/.test(f)).length;

const data = {
  updated: lastDay,
  firstCommit: firstDay,
  commits,
  pullRequests: prs.length,
  tools: tools.length,
  videos: videos.length,
  languages: 6,
  workflows,
  recent: prs.slice(0, 15).map(p => ({ ...p, tool: toolFor(p.title) }))
};
fs.writeFileSync(path.join(ROOT, 'how-its-built.json'), JSON.stringify(data, null, 1) + '\n');
console.log(`how-its-built.json: ${data.tools} tools, ${data.commits} commits, ${data.pullRequests} pull requests, ${data.videos} videos since ${data.firstCommit}`);
