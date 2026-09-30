/**
 * Signaling relay for Screen Share Forge (screen-forge.html).
 *
 * WebRTC needs the two browsers to exchange a one-time "offer" and "answer"
 * (SDP blobs) before they can connect directly to each other. Browsers on
 * different networks have no way to find each other on their own, so this
 * tiny Worker holds a mailbox for each session code: the helper drops off an
 * offer, the client picks it up and drops off an answer, the helper picks
 * that up, and from then on video/audio/chat all flow directly between the
 * two browsers, peer-to-peer — this Worker never sees any of it again.
 *
 * Deploy steps are in cloudflare-worker/README.md. Needs a KV namespace
 * binding named SIGNAL_KV.
 */

const TTL_SECONDS = 600; // a code and its offer/answer expire after 10 minutes
const MAX_BODY_BYTES = 128 * 1024;
const MAX_SDP_CHARS = 120_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }, CORS_HEADERS)
  });
}

function isValidCode(code) {
  // New sessions use ten Web-Crypto-generated characters. Accept older
  // six-character codes during the ten-minute rolling deployment window.
  return typeof code === 'string' && /^[2-9A-HJ-KMNP-Z]{6,16}$/.test(code);
}

async function isLimited(binding, request) {
  if (!binding) return null;
  const result = await binding.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  return !result.success;
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: Object.assign({ 'Cache-Control': 'no-store' }, CORS_HEADERS) });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // [code, "offer"|"answer"]
    const code = parts[0];
    const kind = parts[1];

    if (parts.length !== 2 || !isValidCode(code) || (kind !== 'offer' && kind !== 'answer')) {
      return json({ error: 'Not found' }, 404);
    }
    if (!env.SIGNAL_KV) {
      return json({ error: 'Worker is missing the SIGNAL_KV binding.' }, 500);
    }
    const key = kind + ':' + code;

    if (request.method === 'PUT') {
      const limited = await isLimited(env.SIGNAL_WRITE_LIMITER, request);
      if (limited === null) return json({ error: 'Worker is missing the SIGNAL_WRITE_LIMITER binding.' }, 503);
      if (limited) {
        return json({ error: 'Too many signaling updates. Wait a minute and try again.' }, 429);
      }
      const parsed = await readJson(request);
      if (parsed.tooLarge) return json({ error: 'Signaling message is too large.' }, 413);
      if (parsed.invalid) return json({ error: 'Invalid JSON body' }, 400);
      const body = parsed.value;
      if (!body || typeof body.sdp !== 'string' || body.sdp.length < 1 || body.sdp.length > MAX_SDP_CHARS ||
          body.type !== kind || !/^v=0(?:\r?\n|$)/.test(body.sdp)) {
        return json({ error: 'Body must include a valid offer or answer SDP under 120 KB.' }, 400);
      }
      await env.SIGNAL_KV.put(key, JSON.stringify({ sdp: body.sdp, type: body.type }), { expirationTtl: TTL_SECONDS });
      return json({ ok: true });
    }

    if (request.method === 'GET') {
      const limited = await isLimited(env.SIGNAL_READ_LIMITER, request);
      if (limited === null) return json({ error: 'Worker is missing the SIGNAL_READ_LIMITER binding.' }, 503);
      if (limited) {
        return json({ error: 'Too many signaling checks. Wait a minute and try again.' }, 429);
      }
      const stored = await env.SIGNAL_KV.get(key);
      if (!stored) return json({ error: 'Not ready yet' }, 404);
      return json(JSON.parse(stored));
    }

    if (request.method === 'DELETE') {
      const limited = await isLimited(env.SIGNAL_WRITE_LIMITER, request);
      if (limited === null) return json({ error: 'Worker is missing the SIGNAL_WRITE_LIMITER binding.' }, 503);
      if (limited) {
        return json({ error: 'Too many signaling updates. Wait a minute and try again.' }, 429);
      }
      await env.SIGNAL_KV.delete('offer:' + code);
      await env.SIGNAL_KV.delete('answer:' + code);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }
};
