/* When a Gemini model is overloaded ("This model is currently experiencing high
 * demand", HTTP 503) or out of quota (429), try the other Gemini model once
 * instead of failing. ai-client.js does the same for the tools that use it;
 * this file covers the older tools that call Gemini themselves: it wraps
 * fetch() and only touches requests to MigaBuilder's Gemini proxy and to
 * Google's generateContent API. A visitor sending too many requests (the
 * proxy's own limit) is passed on unchanged, since switching would not help.
 */
(function (window) {
  'use strict';
  if (window.__migaGeminiFallback) return;
  window.__migaGeminiFallback = true;
  const PROXY = 'https://migabuilder-gemini.makmurphy69.workers.dev';
  const GOOGLE = /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/([^:/?]+):generateContent/;
  const PAIRS = {
    'gemini-3.5-flash': 'gemini-3.5-flash-lite', 'gemini-3.5-flash-lite': 'gemini-3.5-flash',
    'gemini-3.1-flash-image': 'gemini-3.1-flash-lite-image', 'gemini-3.1-flash-lite-image': 'gemini-3.1-flash-image'
  };
  const RETRY = [429, 500, 502, 503, 504];
  const original = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const isProxy = url.replace(/\/$/, '') === PROXY;
    const google = GOOGLE.exec(url);
    if ((!isProxy && !google) || !init || typeof init.body !== 'string') return original(input, init);
    const res = await original(input, init);
    if (res.ok || !RETRY.includes(res.status)) return res;
    let other = null, retryUrl = url, retryBody = init.body;
    if (isProxy) {
      let body; try { body = JSON.parse(init.body); } catch (e) { return res; }
      other = PAIRS[body && body.model];
      if (!other) return res;
      const text = await res.clone().text().catch(() => '');
      if (/Too many AI requests/i.test(text)) return res;
      retryBody = JSON.stringify(Object.assign({}, body, { model: other }));
    } else {
      other = PAIRS[google[1]];
      if (!other) return res;
      retryUrl = url.replace(google[1] + ':', other + ':');
    }
    try {
      const again = await original(retryUrl, Object.assign({}, init, { body: retryBody }));
      return again.ok ? again : res;
    } catch (e) { return res; }
  };
})(window);
