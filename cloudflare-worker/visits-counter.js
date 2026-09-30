/**
 * MigaBuilder's visit counter.
 *
 * A privacy-friendly, cookie-free aggregate page-view and action counter. Pages send
 * a tiny fire-and-forget beacon here on load; this Worker tallies it in KV
 * and exposes a /stats endpoint the visits.html dashboard reads.
 *
 * It records aggregate page and action counts only. It does not read, hash,
 * or store visitor IP addresses, cookies, names, emails, content, or device IDs.
 *
 * Deploy steps are in cloudflare-worker/README.md.
 */

const ALLOWED_ORIGINS = [
  'https://migabuilder.com',
  'https://www.migabuilder.com'
];

const MAX_PAGE_NAME_LENGTH = 80;
const RECENT_DAYS = 14;

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
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

function todayKey(date) {
  return (date || new Date()).toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

function sanitizePageName(raw) {
  const name = (typeof raw === 'string' ? raw : '').trim() || 'unknown';
  return name.slice(0, MAX_PAGE_NAME_LENGTH).replace(/[^a-zA-Z0-9._/-]/g, '_');
}

// Pages send their file name ("geo-forge.html"). Anything else is counted as "other",
// so a script cannot fill KV (and the stats page) with made-up page names.
function pageKey(raw) {
  const name = sanitizePageName(raw);
  return /^[a-z0-9][a-z0-9-]{0,50}\.html$/.test(name) ? name : 'other';
}

// KV has no atomic increment, so a read-modify-write can occasionally lose a
// concurrent write under heavy simultaneous traffic. That's an acceptable
// trade-off for an approximate visit counter (not a billing meter).
async function incrementKV(kv, key, by) {
  const current = parseInt((await kv.get(key)) || '0', 10) || 0;
  const next = current + (by || 1);
  await kv.put(key, String(next));
  return next;
}

async function handleHit(request, env, origin) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    payload = {};
  }
  const page = pageKey(payload && payload.page);
  const day = todayKey();

  await incrementKV(env.VISITS_KV, 'views:total', 1);
  await incrementKV(env.VISITS_KV, 'views:day:' + day, 1);
  await incrementKV(env.VISITS_KV, 'views:page:' + page, 1);

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function handleEvent(request, env, origin) {
  let payload;
  try { payload = await request.json(); } catch (e) { payload = {}; }
  const page = pageKey(payload && payload.page);
  const event = sanitizePageName(payload && payload.event).replace(/[/.]/g, '_').slice(0, 40);
  const allowed = ['tool_action', 'helpful_yes', 'helpful_no'];
  if (!allowed.includes(event)) return json({ error: 'Unsupported aggregate event.' }, 400, origin);
  await incrementKV(env.VISITS_KV, 'events:total', 1);
  await incrementKV(env.VISITS_KV, 'events:' + event + ':' + page, 1);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function handleTestResult(request, env, origin) {
  let payload;
  try { payload = await request.json(); } catch (e) { payload = {}; }

  const correct = Number(payload && payload.correct);
  const questions = Number(payload && payload.questions);
  const highestLevel = Number(payload && payload.highestLevel);
  const length = Number(payload && payload.length);

  if (!Number.isInteger(correct) || !Number.isInteger(questions) ||
      !Number.isInteger(highestLevel) || ![21, 35, 70].includes(length) ||
      questions !== length || correct < 0 || correct > questions ||
      highestLevel < 0 || highestLevel > 7) {
    return json({ error: 'Invalid aggregate test result.' }, 400, origin);
  }

  const kv = env.VISITS_KV;
  await incrementKV(kv, 'tests:completed', 1);
  await incrementKV(kv, 'tests:correct', correct);
  await incrementKV(kv, 'tests:questions', questions);
  await incrementKV(kv, 'tests:level_total', highestLevel);
  await incrementKV(kv, 'tests:length:' + length + ':completed', 1);
  await incrementKV(kv, 'tests:length:' + length + ':correct', correct);
  await incrementKV(kv, 'tests:length:' + length + ':questions', questions);

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function handleTestAverage(request, env, origin) {
  const kv = env.VISITS_KV;
  const values = await Promise.all([
    kv.get('tests:completed'),
    kv.get('tests:correct'),
    kv.get('tests:questions'),
    kv.get('tests:level_total')
  ]);
  const completed = parseInt(values[0] || '0', 10) || 0;
  const correct = parseInt(values[1] || '0', 10) || 0;
  const questions = parseInt(values[2] || '0', 10) || 0;
  const levelTotal = parseInt(values[3] || '0', 10) || 0;

  return json({
    completed,
    averagePercent: questions ? Math.round((correct / questions) * 1000) / 10 : null,
    averageHighestLevel: completed ? Math.round((levelTotal / completed) * 10) / 10 : null,
    minimumForComparison: 5
  }, 200, origin);
}

function recentDayStrings(count) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(todayKey(d));
  }
  return days;
}

async function handleStats(request, env, origin) {
  const url = new URL(request.url);
  if (env.STATS_KEY && url.searchParams.get('key') !== env.STATS_KEY) {
    return json({ error: 'Missing or incorrect key.' }, 403, origin);
  }

  const kv = env.VISITS_KV;
  const days = recentDayStrings(RECENT_DAYS);

  const [totalViewsRaw, totalActionsRaw, ...dayCounts] = await Promise.all([
    kv.get('views:total'),
    kv.get('events:total'),
    ...days.map(d => kv.get('views:day:' + d))
  ]);
  const viewsByDay = days.map((d, i) => ({ day: d, views: parseInt(dayCounts[i] || '0', 10) || 0 }));

  const pageList = await kv.list({ prefix: 'views:page:' });
  const pageEntries = await Promise.all(
    pageList.keys.map(async (k) => ({ page: k.name.slice('views:page:'.length), views: parseInt((await kv.get(k.name)) || '0', 10) || 0 }))
  );
  pageEntries.sort((a, b) => b.views - a.views);
  const eventList = await kv.list({ prefix: 'events:' });
  const eventEntries = await Promise.all(eventList.keys.filter(k => k.name !== 'events:total').map(async k => {
    const parts = k.name.split(':');
    return { event: parts[1], page: parts.slice(2).join(':'), count: parseInt((await kv.get(k.name)) || '0', 10) || 0 };
  }));

  return json({
    totalViews: parseInt(totalViewsRaw || '0', 10) || 0,
    totalActions: parseInt(totalActionsRaw || '0', 10) || 0,
    viewsByDay,
    topPages: pageEntries,
    events: eventEntries
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (!env.VISITS_KV) {
      return json({ error: 'Worker is missing the VISITS_KV binding.' }, 500, origin);
    }

    if (url.pathname === '/hit' && request.method === 'POST') {
      if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
      return handleHit(request, env, origin);
    }
    if (url.pathname === '/event' && request.method === 'POST') {
      if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
      return handleEvent(request, env, origin);
    }
    if (url.pathname === '/test-result' && request.method === 'POST') {
      if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
      return handleTestResult(request, env, origin);
    }
    if (url.pathname === '/test-average' && request.method === 'GET') {
      if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
      return handleTestAverage(request, env, origin);
    }
    if (url.pathname === '/stats' && request.method === 'GET') {
      return handleStats(request, env, origin);
    }
    return json({ error: 'Not found' }, 404, origin);
  }
};
