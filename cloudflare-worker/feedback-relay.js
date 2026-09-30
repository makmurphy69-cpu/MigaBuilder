/**
 * Feedback/community relay for feedback.html.
 *
 * Turns the site's feedback form into real GitHub Issues on your repo, and
 * lists recent ones back so the page reads like a small community board —
 * anyone can see what's been suggested/reported, and open it on GitHub to
 * comment or react. Holds a fine-grained GitHub token as a Worker secret so
 * it never reaches the browser (visitors never need their own GitHub
 * account to submit).
 *
 * Deploy steps are in cloudflare-worker/README.md.
 */

const ALLOWED_ORIGINS = [
  'https://migabuilder.com',
  'https://www.migabuilder.com'
];

const FEEDBACK_LABEL = 'feedback';
const TYPE_LABELS = { bug: 'bug', suggestion: 'enhancement', other: 'feedback' };
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 4000;
const MAX_CONTACT = 200;
const MAX_BODY_BYTES = 8192;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }, corsHeaders(origin))
  });
}

async function readJson(request) {
  const headerLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(headerLength) && headerLength > MAX_BODY_BYTES) return { tooLarge: true };
  if (!request.body) return { invalid: true };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  try { return { value: JSON.parse(text) }; } catch (e) { return { invalid: true }; }
}

function githubHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'migabuilder-feedback-relay'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, origin);
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
      return json({ error: 'Worker is missing GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO.' }, 500, origin);
    }
    const apiBase = 'https://api.github.com/repos/' + env.GITHUB_OWNER + '/' + env.GITHUB_REPO;

    if (request.method === 'GET') {
      const upstream = await fetch(
        apiBase + '/issues?state=all&labels=' + encodeURIComponent(FEEDBACK_LABEL) + '&per_page=25&sort=created&direction=desc',
        { headers: githubHeaders(env.GITHUB_TOKEN) }
      );
      if (!upstream.ok) {
        return json({ error: 'Could not load feedback right now.' }, 502, origin);
      }
      const issues = await upstream.json();
      const simplified = issues
        .filter(issue => !issue.pull_request)
        .map(issue => ({
          title: issue.title,
          url: issue.html_url,
          number: issue.number,
          state: issue.state,
          comments: issue.comments,
          created_at: issue.created_at,
          labels: (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name))
        }));
      return json({ issues: simplified }, 200, origin);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    // Origin is not authentication: scripts can forge it. Fail closed until
    // the per-IP binding is configured, so public issue creation is never left unthrottled.
    if (!env.RATE_LIMITER) return json({ error: 'Feedback rate limiting is not configured.' }, 503, origin);
    const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!success) return json({ error: 'Too many messages in a short time. Wait a minute and try again.' }, 429, origin);

    const parsed = await readJson(request);
    if (parsed.tooLarge) return json({ error: 'Feedback message is too large.' }, 413, origin);
    if (parsed.invalid) return json({ error: 'Invalid JSON body' }, 400, origin);
    const payload = parsed.value;

    // Honeypot: a hidden field real visitors never fill in. If it's filled,
    // pretend success without actually creating anything, so bots don't
    // learn to look for a different tell.
    if (payload && payload.website) {
      return json({ ok: true }, 200, origin);
    }

    const type = ['bug', 'suggestion', 'other'].includes(payload && payload.type) ? payload.type : 'other';
    const tool = typeof (payload && payload.tool) === 'string' ? payload.tool.slice(0, 80) : 'General';
    const title = typeof (payload && payload.title) === 'string' ? payload.title.trim() : '';
    const description = typeof (payload && payload.description) === 'string' ? payload.description.trim() : '';
    const contact = typeof (payload && payload.contact) === 'string' ? payload.contact.trim().slice(0, MAX_CONTACT) : '';

    if (!title || title.length > MAX_TITLE) {
      return json({ error: 'Title is required and must be under ' + MAX_TITLE + ' characters.' }, 400, origin);
    }
    if (!description || description.length > MAX_DESCRIPTION) {
      return json({ error: 'Description is required and must be under ' + MAX_DESCRIPTION + ' characters.' }, 400, origin);
    }

    // "@name" in a public issue notifies that GitHub user; break the mention so the form cannot be used to ping people.
    const noMentions = text => text.replace(/@(?=[A-Za-z0-9-])/g, '@\u200b');
    const typePrefix = type === 'bug' ? 'Bug' : type === 'suggestion' ? 'Suggestion' : 'Feedback';
    const issueTitle = '[' + typePrefix + ': ' + tool + '] ' + noMentions(title);
    const issueBody =
      '**Tool:** ' + tool + '\n' +
      '**Type:** ' + typePrefix + '\n\n' +
      noMentions(description) +
      (contact ? '\n\n---\n_Contact left by submitter: ' + noMentions(contact) + '_' : '') +
      '\n\n---\n_Submitted via the feedback form on the site._';

    const createResp = await fetch(apiBase + '/issues', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders(env.GITHUB_TOKEN)),
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [...new Set([FEEDBACK_LABEL, TYPE_LABELS[type]])]
      })
    });

    if (!createResp.ok) {
      // GitHub's error text stays in the Worker log; it can name the repo or token scopes.
      console.warn('GitHub issue create failed', createResp.status, (await createResp.text()).slice(0, 300));
      return json({ error: 'Could not submit feedback right now.' }, 502, origin);
    }

    const created = await createResp.json();
    return json({ ok: true, url: created.html_url, number: created.number }, 200, origin);
  }
};
