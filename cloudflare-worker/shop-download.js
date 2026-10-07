/**
 * Download delivery for the MigaBuilder shop (shop.html / thanks.html).
 *
 * Stripe (Managed Payments) takes the payment and sends the receipt; this
 * Worker hands over the file. After checkout the Payment Link sends the
 * buyer to thanks.html?session_id=cs_..., and that page asks this Worker:
 *
 *   GET /order?session_id=cs_...           → { ok, email, items: [{ sku, name, download }] }
 *   GET /download?session_id=cs_...&sku=X  → the file itself (attachment)
 *
 * Every request re-checks the Checkout Session with Stripe, so a download
 * only works for a paid session, for a product that session actually
 * bought, and for DOWNLOAD_DAYS after the purchase. The files live in a
 * private R2 bucket, so there is no public URL to share or guess.
 *
 * Each Stripe product needs metadata `sku`; the file served is `<sku>.zip`
 * in the bucket.
 *
 * Bindings / settings (Settings → Variables and Secrets / Bindings):
 *   STRIPE_SECRET_KEY  secret  — sk_live_... (or sk_test_... while testing)
 *   PRODUCT_FILES      R2 bucket binding holding the <sku>.zip files
 *   DOWNLOAD_DAYS      optional variable, default 30
 *   RATE_LIMITER       optional rate-limit binding (e.g. 20 requests / 60 s)
 *
 * Deploy steps are in cloudflare-worker/README.md.
 */

const ALLOWED_ORIGINS = [
  'https://migabuilder.com',
  'https://www.migabuilder.com'
];

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const SKU_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STRIPE_VERSION = '2025-03-31.basil';

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// Fetches the Checkout Session with its line items and products, and checks
// it is paid and recent. Returns { session, items } or { error, status }.
async function loadPaidSession(sessionId, env) {
  if (!SESSION_RE.test(sessionId || '')) return { error: 'That order link is not valid.', status: 400 };
  const key = env.STRIPE_SECRET_KEY || '';
  if (!key) return { error: 'The shop is not set up yet (missing Stripe key).', status: 500 };
  // A live key must never unlock test-mode orders, and the other way round.
  const keyMode = key.indexOf('_live_') !== -1 ? 'live' : 'test';
  if (sessionId.indexOf('cs_' + keyMode + '_') !== 0) return { error: 'That order link is not valid.', status: 400 };

  const url = 'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId) +
    '?expand[]=line_items.data.price.product';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + key, 'Stripe-Version': STRIPE_VERSION }
  });
  if (res.status === 404) return { error: 'We could not find that order.', status: 404 };
  if (!res.ok) {
    console.log('Stripe session lookup failed: HTTP ' + res.status);
    return { error: 'Could not check the order with Stripe. Please try again in a minute.', status: 502 };
  }
  const session = await res.json();
  const paid = session.status === 'complete' &&
    (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
  if (!paid) return { error: 'This order is not paid yet. If you just paid, wait a moment and reload.', status: 402 };

  const days = Number(env.DOWNLOAD_DAYS) > 0 ? Number(env.DOWNLOAD_DAYS) : 30;
  if (Date.now() / 1000 - session.created > days * 86400) {
    return { error: 'This download link has expired. Reply to your receipt email and we will send a new one.', status: 410 };
  }

  const items = [];
  const lines = (session.line_items && session.line_items.data) || [];
  for (const line of lines) {
    const product = line.price && line.price.product;
    const sku = product && product.metadata && product.metadata.sku;
    if (sku && SKU_RE.test(sku)) items.push({ sku, name: product.name || sku });
  }
  return { session, items };
}

async function handleOrder(url, env, origin) {
  const result = await loadPaidSession(url.searchParams.get('session_id'), env);
  if (result.error) return json({ ok: false, error: result.error }, result.status, origin);
  const base = url.origin + '/download?session_id=' + encodeURIComponent(result.session.id) + '&sku=';
  return json({
    ok: true,
    email: (result.session.customer_details && result.session.customer_details.email) || '',
    items: result.items.map(item => ({ sku: item.sku, name: item.name, download: base + encodeURIComponent(item.sku) }))
  }, 200, origin);
}

async function handleDownload(url, env, origin) {
  const sku = url.searchParams.get('sku') || '';
  if (!SKU_RE.test(sku)) return json({ ok: false, error: 'Unknown product.' }, 400, origin);
  const result = await loadPaidSession(url.searchParams.get('session_id'), env);
  if (result.error) return json({ ok: false, error: result.error }, result.status, origin);
  if (!result.items.some(item => item.sku === sku)) {
    return json({ ok: false, error: 'This order does not include that product.' }, 403, origin);
  }
  if (!env.PRODUCT_FILES) return json({ ok: false, error: 'The shop is not set up yet (missing file storage).' }, 500, origin);
  const object = await env.PRODUCT_FILES.get(sku + '.zip');
  if (!object) {
    console.log('Missing file in R2: ' + sku + '.zip');
    return json({ ok: false, error: 'The file is missing on our side. Reply to your receipt email and we will send it.' }, 500, origin);
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="' + sku + '.zip"',
      'Content-Length': String(object.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, origin);

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ ok: false, error: 'Too many requests. Please wait a minute.' }, 429, origin);
    }

    try {
      if (url.pathname === '/order') return await handleOrder(url, env, origin);
      if (url.pathname === '/download') return await handleDownload(url, env, origin);
      return json({ ok: false, error: 'Not found.' }, 404, origin);
    } catch (e) {
      console.log('shop-download error: ' + (e && e.message));
      return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500, origin);
    }
  }
};
