/**
 * MigaBuilder's Gemini proxy.
 *
 * Holds the real Gemini API key(s) as a Worker secret (env.GEMINI_API_KEY) so
 * they never reach the browser. The site's free tier calls this Worker
 * instead of generativelanguage.googleapis.com directly.
 *
 * GEMINI_API_KEY can hold one key, or several comma-separated keys (e.g.
 * from separate free-tier Google accounts) to multiply the effective rate
 * limit: each request picks a random starting key and, if that one comes
 * back rate-limited, automatically retries the next one before giving up.
 * A key Google reports as invalid (deleted, expired or mistyped) is skipped
 * the same way, and remembered so later requests don't try it first.
 *
 * Optional RATE_LIMITER binding (Workers rate limiting) caps requests per
 * visitor IP, since the Origin check alone can be faked outside a browser.
 *
 * Deploy steps are in cloudflare-worker/README.md.
 */

const ALLOWED_ORIGINS = [
  'https://migabuilder.com',
  'https://www.migabuilder.com'
];

const ALLOWED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-image'
];

const IMAGE_ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'];
const IMAGE_SIZES = ['1K', '2K', '4K'];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// A key that's rate-limited (429) or over its quota (403) is worth retrying
// with a different key; anything else (400 bad request, a real 200, etc.) is
// not a key problem, so it's returned immediately without trying more keys.
const RETRYABLE_STATUSES = [403, 429];

// Google answers a deleted, expired or mistyped key with 400 and reason
// API_KEY_INVALID (or 401). That's a problem with this one key, not with the
// request, so try the next key instead of failing the visitor's request.
function isInvalidKey(status, text) {
  return status === 401 || (status === 400 && /API_KEY_INVALID|API key not valid|API key expired/i.test(text));
}

// Keys found invalid while this Worker instance is running. They are tried
// last (not dropped) so a key that starts working again is not lost forever.
const invalidKeys = new Set();

const keyLabel = key => '...' + key.slice(-4);

function parseApiKeys(raw) {
  return (raw || '').split(',').map(key => key.trim()).filter(Boolean);
}

// Randomize which key each request tries first, so load spreads evenly
// across all of them instead of always hammering the first one.
function rotate(keys) {
  const start = Math.floor(Math.random() * keys.length);
  return keys.slice(start).concat(keys.slice(0, start));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, origin);
    }
    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: 'Too many AI requests in a short time. Wait a minute and try again.' }, 429, origin);
      }
    }
    const apiKeys = parseApiKeys(env.GEMINI_API_KEY);
    if (!apiKeys.length) {
      return json({ error: 'Worker is missing the GEMINI_API_KEY secret.' }, 500, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const model = payload && payload.model;
    const isImage = payload && payload.kind === 'image';
    const systemPrompt = (payload && payload.systemPrompt) || '';
    const userPrompt = payload && payload.userPrompt;

    if (!ALLOWED_MODELS.includes(model)) {
      return json({ error: 'Unsupported or missing model' }, 400, origin);
    }
    if (!isImage && (typeof userPrompt !== 'string' || !userPrompt.trim())) {
      return json({ error: 'Missing userPrompt' }, 400, origin);
    }

    if (isImage) {
      const prompt = payload && payload.prompt;
      if (model !== 'gemini-3.1-flash-image') return json({ error: 'Unsupported image model' }, 400, origin);
      if (typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.length > 2400) return json({ error: 'Image prompt must be between 8 and 2,400 characters.' }, 400, origin);
      if (!IMAGE_ASPECTS.includes(payload.aspectRatio)) return json({ error: 'Unsupported image shape' }, 400, origin);
      if (!IMAGE_SIZES.includes(payload.imageSize)) return json({ error: 'Unsupported image resolution' }, 400, origin);
    } else if (model === 'gemini-3.1-flash-image') {
      return json({ error: 'Image model requires an image request' }, 400, origin);
    }

    const requestBody = JSON.stringify(isImage ? {
      contents: [{ parts: [{ text: payload.prompt.trim() }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: payload.aspectRatio, imageSize: payload.imageSize }
      }
    } : {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }]
    });
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

    let lastText = '';
    let lastStatus = 500;
    const rotated = rotate(apiKeys);
    const ordered = rotated.filter(key => !invalidKeys.has(key)).concat(rotated.filter(key => invalidKeys.has(key)));
    for (const key of ordered) {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: requestBody
      });
      lastStatus = upstream.status;
      lastText = await upstream.text();
      if (isInvalidKey(upstream.status, lastText)) {
        if (!invalidKeys.has(key)) console.warn('Gemini key ' + keyLabel(key) + ' is invalid (deleted or expired?); remove it from GEMINI_API_KEY. Trying the next key.');
        invalidKeys.add(key);
        continue;
      }
      invalidKeys.delete(key);
      if (!RETRYABLE_STATUSES.includes(upstream.status)) break; // success, or a non-key-related error
    }

    return new Response(lastText, {
      status: lastStatus,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
    });
  }
};
