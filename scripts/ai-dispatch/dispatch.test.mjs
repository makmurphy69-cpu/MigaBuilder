import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { answerLog, buildLogPrompt, findPendingMentions, parseCommentEvent } from './dispatch.mjs';

const LOG = `# Review

## MB-009 — Something

**Files:** \`app.js\`

@gemini do you agree with this finding?

Mentioning \`@gemini\` in code does not count.

\`\`\`
@gemini inside a fence does not count either
\`\`\`

Email foo@gemini.com does not count.
`;

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'ai-dispatch-'));
  writeFileSync(join(dir, 'AI-COLLABORATION.md'), '# Protocol');
  writeFileSync(join(dir, 'app.js'), 'const secretSauce = 1;');
  writeFileSync(join(dir, 'AI-REVIEW.md'), LOG);
  return dir;
}

test('finds only real, unanswered mentions', () => {
  const pending = findPendingMentions(LOG);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].heading, 'MB-009 — Something');
  assert.match(pending[0].text, /do you agree/);
});

test('prompt carries the protocol, the log and cited source files', () => {
  const dir = repo();
  const [m] = findPendingMentions(LOG);
  const prompt = buildLogPrompt(LOG, m, dir);
  assert.match(prompt, /# Protocol/);
  assert.match(prompt, /secretSauce/);
  assert.match(prompt, /do you agree/);
});

test('inserts the reply under the mention once, and never re-triggers', async () => {
  const dir = repo();
  const file = join(dir, 'AI-REVIEW.md');
  let calls = 0;
  const ask = async () => { calls++; return 'Confirmed. Claude, @gemini here — see line 3.'; };
  assert.equal(await answerLog({ file, ask, model: 'gemini-test', date: '2026-01-01', root: dir, log() {} }), 1);
  const out = readFileSync(file, 'utf8');
  assert.match(out, /do you agree with this finding\?\n\n> \*\*Gemini\*\* \(gemini-test, 2026-01-01\): <!-- gemini-reply:[0-9a-f]{12} -->\n>\n> Confirmed\. Claude, Gemini here/);
  assert.equal(findPendingMentions(out).length, 0);
  assert.equal(await answerLog({ file, ask, model: 'gemini-test', root: dir, log() {} }), 0);
  assert.equal(calls, 1);
});

test('comment events: only trusted humans who tag @gemini', () => {
  const event = (over = {}) => ({
    action: 'created',
    repository: { full_name: 'o/r' },
    issue: { number: 7, title: 'T', body: 'B', pull_request: {} },
    comment: { id: 1, body: '@Gemini please review', author_association: 'OWNER', user: { login: 'owner', type: 'User' }, ...over }
  });
  assert.deepEqual(
    { n: parseCommentEvent(event()).number, pull: parseCommentEvent(event()).isPull, inline: parseCommentEvent(event()).inline },
    { n: 7, pull: true, inline: false });
  assert.equal(parseCommentEvent(event({ author_association: 'NONE' })), null);
  assert.equal(parseCommentEvent(event({ user: { login: 'github-actions[bot]', type: 'Bot' } })), null);
  assert.equal(parseCommentEvent(event({ body: 'no mention' })), null);
});
