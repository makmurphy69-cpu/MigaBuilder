#!/usr/bin/env node
// Routes `@gemini` mentions to Gemini and posts its answer back where it was asked.
//
//   node scripts/ai-dispatch/dispatch.mjs log [--file AI-REVIEW.md] [--dry-run]
//     Answers every unanswered @gemini mention in the review log, inserting
//     Gemini's reply right under the paragraph that asked.
//
//   node scripts/ai-dispatch/dispatch.mjs comment
//     Inside GitHub Actions (issue_comment / pull_request_review_comment):
//     answers the triggering comment with a reply comment.
//
// Needs GEMINI_API_KEY. Comment mode also needs GITHUB_TOKEN.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MENTION = /(^|[^\w`/@-])@gemini\b/i;
const REPLY_MARK = /<!-- gemini-reply:([0-9a-f]{12}) -->/g;
const FILE_CHAR_LIMIT = 40000;
const CONTEXT_CHAR_LIMIT = 120000;

export const SYSTEM_INSTRUCTION = `You are Gemini, the third reviewer in MigaBuilder's multi-AI collaboration alongside Claude and ChatGPT.
MigaBuilder is a static site (plain HTML/CSS/JS, no build step) served from the main branch of this repository.
Follow AI-COLLABORATION.md exactly: inspect the evidence you are given, do not automatically agree with Claude or ChatGPT,
separate findings by category, and for each point give the affected file/function, concrete evidence, realistic impact,
a proposed fix and a test that would prove it. If the code you need was not included, say which file you need instead of guessing.
You cannot push code or edit files; the owner, Claude or ChatGPT implement what is agreed.
Never include API keys, tokens, passwords or other secrets. Answer in GitHub-flavoured Markdown, concisely, and address
Claude or ChatGPT by name when your reply is meant for them. Do not write "@gemini" in your answer.`;

// ---------- review-log mode ----------

/** Splits markdown into blocks separated by blank lines; fenced code stays inside one block. */
export function splitBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let start = null;
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const blank = !inFence && line.trim() === '';
    if (!blank && start === null) start = i;
    if (blank && start !== null) { blocks.push({ start, end: i - 1 }); start = null; }
  });
  if (start !== null) blocks.push({ start, end: lines.length - 1 });
  return blocks.map(b => ({ ...b, text: lines.slice(b.start, b.end + 1).join('\n') }));
}

export const mentionId = text => createHash('sha1').update(text.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 12);

const isGeminiReply = text => /^>\s*\*\*Gemini\b/.test(text);
const stripCode = text => text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '').replace(/`[^`\n]*`/g, '');

/** Every @gemini mention in the log that has no reply yet. */
export function findPendingMentions(text) {
  const answered = new Set([...text.matchAll(REPLY_MARK)].map(m => m[1]));
  const lines = text.split('\n');
  return splitBlocks(text)
    .filter(b => !isGeminiReply(b.text) && MENTION.test(stripCode(b.text)))
    .map(b => {
      let heading = '';
      for (let i = b.start; i >= 0; i--) if (/^#{1,3}\s/.test(lines[i])) { heading = lines[i].replace(/^#+\s*/, ''); break; }
      return { ...b, heading, id: mentionId(b.text) };
    })
    .filter(m => !answered.has(m.id));
}

/** The section (from its ## heading to the next one) that contains a line. */
function sectionAround(text, lineNo) {
  const lines = text.split('\n');
  let a = lineNo; while (a > 0 && !/^##\s/.test(lines[a])) a--;
  let b = lineNo + 1; while (b < lines.length && !/^##\s/.test(lines[b])) b++;
  return lines.slice(a, b).join('\n');
}

/** Repo files cited in backticks (e.g. `website-builder.html`), so Gemini sees the actual code. */
export function citedFiles(text, root = ROOT) {
  const out = [];
  for (const [, p] of text.matchAll(/`([\w./-]+\.(?:html|js|mjs|css|json|md|py|yml|yaml|toml))`/g)) {
    const file = join(root, p);
    if (!out.includes(p) && !p.includes('..') && existsSync(file) && statSync(file).isFile()) out.push(p);
  }
  return out;
}

function fileContext(paths, root = ROOT) {
  let budget = CONTEXT_CHAR_LIMIT;
  const parts = [];
  for (const p of paths) {
    if (budget <= 0) { parts.push(`(${p} omitted: context budget used up)`); continue; }
    let body = readFileSync(join(root, p), 'utf8');
    const limit = Math.min(FILE_CHAR_LIMIT, budget);
    if (body.length > limit) body = body.slice(0, limit) + `\n... [truncated, ${body.length - limit} more characters]`;
    budget -= body.length;
    parts.push(`----- ${p} -----\n${body}`);
  }
  return parts.join('\n\n');
}

const readRepoFile = (p, root = ROOT) => existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '';

export function buildLogPrompt(logText, mention, root = ROOT) {
  const section = sectionAround(logText, mention.start);
  const files = citedFiles(section, root).filter(p => p !== 'AI-REVIEW.md' && p !== 'AI-COLLABORATION.md');
  return [
    '# AI-COLLABORATION.md', readRepoFile('AI-COLLABORATION.md', root),
    '# AI-REVIEW.md (the shared review log)', logText,
    files.length ? '# Source files cited in this section\n' + fileContext(files, root) : '',
    `# Your task\nThis message in AI-REVIEW.md, under "${mention.heading || 'top of file'}", is addressed to you:\n\n${mention.text}\n\nReply to it. Your reply will be inserted directly below that message in the log.`
  ].filter(Boolean).join('\n\n');
}

export function formatLogReply(answer, { id, model, date }) {
  const body = neutralize(answer).split('\n').map(l => (l ? '> ' + l : '>')).join('\n');
  return `> **Gemini** (${model}, ${date}): <!-- gemini-reply:${id} -->\n>\n${body}`;
}

/** Stops replies from re-triggering the dispatcher. */
export const neutralize = text => text.replace(/@gemini\b/gi, 'Gemini');

export async function answerLog({ file, ask, model, date = new Date().toISOString().slice(0, 10), root = ROOT, log = console.log }) {
  let text = readFileSync(file, 'utf8');
  const pending = findPendingMentions(text);
  if (!pending.length) { log('No unanswered @gemini mentions in ' + file); return 0; }
  // Answer bottom-up so earlier line numbers stay valid while inserting.
  for (const m of [...pending].reverse()) {
    log(`Asking Gemini about "${m.heading || m.text.slice(0, 60)}" (${m.id})`);
    const answer = await ask(buildLogPrompt(text, m, root), { system: SYSTEM_INSTRUCTION });
    const lines = text.split('\n');
    lines.splice(m.end + 1, 0, '', formatLogReply(answer, { id: m.id, model, date }));
    text = lines.join('\n');
  }
  writeFileSync(file, text);
  log(`Answered ${pending.length} mention(s) in ${file}`);
  return pending.length;
}

// ---------- GitHub comment mode ----------

async function gh(path, { token, method = 'GET', body, accept = 'application/vnd.github+json' } = {}) {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'migabuilder-ai-dispatch' },
    body: body && JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`GitHub ${method} ${path} failed: ${r.status} ${await r.text()}`);
  return accept.includes('diff') ? r.text() : r.json();
}

/** Decides whether a webhook event is a trusted @gemini request. Returns null when it should be ignored. */
export function parseCommentEvent(event) {
  const c = event.comment;
  if (!c || event.action !== 'created') return null;
  if (c.user?.type === 'Bot' || /\[bot\]$/.test(c.user?.login || '')) return null;
  if (!['OWNER', 'MEMBER', 'COLLABORATOR'].includes(c.author_association)) return null;
  if (!MENTION.test(stripCode(c.body || ''))) return null;
  const thread = event.issue || event.pull_request;
  return {
    repo: event.repository.full_name,
    number: thread.number,
    isPull: Boolean(event.pull_request || event.issue?.pull_request),
    inline: Boolean(event.pull_request), // pull_request_review_comment: reply in the review thread
    commentId: c.id,
    title: thread.title,
    body: thread.body || '',
    comment: c.body,
    author: c.user?.login,
    path: c.path,
    diffHunk: c.diff_hunk
  };
}

export function buildCommentPrompt(req, { history = [], diff = '', root = ROOT }) {
  const files = citedFiles([req.body, req.comment].join('\n'), root);
  if (req.path && existsSync(join(root, req.path)) && !files.includes(req.path)) files.unshift(req.path);
  return [
    '# AI-COLLABORATION.md', readRepoFile('AI-COLLABORATION.md', root),
    '# AI-REVIEW.md (the shared review log)', readRepoFile('AI-REVIEW.md', root),
    `# ${req.isPull ? 'Pull request' : 'Issue'} #${req.number}: ${req.title}\n\n${req.body}`,
    history.length ? '# Earlier comments\n' + history.map(h => `**${h.user}:**\n${h.body}`).join('\n\n---\n\n') : '',
    diff ? '# Pull request diff\n```diff\n' + (diff.length > CONTEXT_CHAR_LIMIT ? diff.slice(0, CONTEXT_CHAR_LIMIT) + '\n... [diff truncated]' : diff) + '\n```' : '',
    req.diffHunk ? `# Code the comment is attached to (${req.path})\n\`\`\`diff\n${req.diffHunk}\n\`\`\`` : '',
    files.length ? '# Source files (main branch)\n' + fileContext(files, root) : '',
    `# Your task\n${req.author} tagged you in this comment:\n\n${req.comment}\n\nReply to it. Your answer is posted as a comment in the same thread.`
  ].filter(Boolean).join('\n\n');
}

export async function answerComment({ event, ask, model, token, log = console.log }) {
  const req = parseCommentEvent(event);
  if (!req) { log('Not a trusted @gemini request; nothing to do.'); return false; }
  const base = `/repos/${req.repo}`;
  const comments = await gh(`${base}/issues/${req.number}/comments?per_page=30`, { token });
  const history = comments.filter(c => c.id !== req.commentId).slice(-20).map(c => ({ user: c.user.login, body: c.body }));
  const diff = req.isPull ? await gh(`${base}/pulls/${req.number}`, { token, accept: 'application/vnd.github.diff' }) : '';
  const answer = await ask(buildCommentPrompt(req, { history, diff }), { system: SYSTEM_INSTRUCTION });
  const body = `**Gemini** (${model}):\n\n${neutralize(answer)}\n\n---\n_Generated by Gemini via \`scripts/ai-dispatch\`_`;
  if (req.inline) await gh(`${base}/pulls/${req.number}/comments/${req.commentId}/replies`, { token, method: 'POST', body: { body } });
  else await gh(`${base}/issues/${req.number}/comments`, { token, method: 'POST', body: { body } });
  log(`Posted Gemini's reply on ${req.repo}#${req.number}`);
  return true;
}

// ---------- CLI ----------

async function main(argv) {
  const [mode, ...rest] = argv;
  const flag = name => rest.includes(name);
  const opt = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  if (mode === 'log') {
    const file = resolve(ROOT, opt('--file') || 'AI-REVIEW.md');
    if (flag('--dry-run')) {
      const pending = findPendingMentions(readFileSync(file, 'utf8'));
      pending.forEach(m => console.log(`${m.id}  ${m.heading}\n${m.text}\n`));
      console.log(`${pending.length} unanswered @gemini mention(s).`);
      return;
    }
    const { createGemini } = await import('./gemini.mjs');
    const gemini = createGemini();
    await answerLog({ file, ask: gemini.ask, model: gemini.model });
  } else if (mode === 'comment') {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) throw new Error('comment mode runs inside GitHub Actions (GITHUB_EVENT_PATH is not set).');
    if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set.');
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    if (!parseCommentEvent(event)) { console.log('Not a trusted @gemini request; nothing to do.'); return; }
    const { createGemini } = await import('./gemini.mjs');
    const gemini = createGemini();
    await answerComment({ event, ask: gemini.ask, model: gemini.model, token: process.env.GITHUB_TOKEN });
  } else {
    console.error('Usage: dispatch.mjs log [--file AI-REVIEW.md] [--dry-run] | dispatch.mjs comment');
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(err => { console.error(err.message || err); process.exit(1); });
}
