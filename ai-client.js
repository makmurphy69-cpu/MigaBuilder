/* MigaBuilder shared AI client for the newer tools.
 *
 * MigaAI.mount(container) renders the provider / model / API key fields into
 * `container` and remembers the choice (never the key) in localStorage.
 * MigaAI.ask(system, user) sends one request with whatever the visitor picked:
 *   - Gemini goes through MigaBuilder's free proxy (no key needed),
 *   - "Gemini (your own key)", OpenAI and Anthropic are called directly from
 *     the browser with the visitor's own key, kept only in memory. (Picture
 *     Forge can remember a Gemini key on the device if the visitor ticks
 *     "Remember"; it is then prefilled here too.) The own-key Gemini option
 *     also makes the tools work on a downloaded copy of the site, where the
 *     proxy refuses requests from other origins.
 * MigaAI.json(text) pulls the first JSON object or array out of a reply.
 */
(function (window, document) {
  'use strict';
  const GEMINI_PROXY_URL = 'https://migabuilder-gemini.makmurphy69.workers.dev';
  const MODELS = {
    gemini: [
      ['gemini-3.5-flash', 'Gemini 3.5 Flash (free)'],
      ['gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite (free, faster)']
    ],
    geminikey: [
      ['gemini-3.5-flash', 'Gemini 3.5 Flash'],
      ['gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite (faster)']
    ],
    openai: [
      ['gpt-4o-mini', 'gpt-4o-mini (fast, cheap)'],
      ['gpt-4o', 'gpt-4o (higher quality)'],
      ['gpt-4.1', 'gpt-4.1']
    ],
    anthropic: [
      ['claude-sonnet-5', 'Claude Sonnet 5 (recommended)'],
      ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 (fast, cheap)'],
      ['claude-opus-5', 'Claude Opus 5 (highest quality)']
    ]
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  let els = null;

  function mount(container) {
    container.innerHTML =
      '<div class="grid ai-grid">' +
      '<div class="field"><label for="aiProvider">AI provider</label><select id="aiProvider">' +
      '<option value="gemini">Gemini — free, no key needed</option><option value="geminikey">Gemini (your own key)</option><option value="openai">OpenAI (your key)</option><option value="anthropic">Anthropic Claude (your key)</option></select></div>' +
      '<div class="field"><label for="aiModel">Model</label><select id="aiModel"></select></div>' +
      '</div>' +
      '<div class="field" id="aiKeyField" hidden><label for="aiKey">Your API key</label><input id="aiKey" type="password" autocomplete="off" placeholder="sk-...">' +
      '<small>Sent only to the provider you chose, straight from this browser. Never stored.</small>' +
      '<small id="aiKeyHelp" hidden> Free key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → Create API key → Copy.</small></div>' +
      '<p class="muted" id="aiFreeNote">Free Gemini shares a limited daily capacity. If it stops answering, switch to your own OpenAI or Anthropic key.</p>';
    els = {
      provider: container.querySelector('#aiProvider'),
      model: container.querySelector('#aiModel'),
      key: container.querySelector('#aiKey'),
      keyField: container.querySelector('#aiKeyField'),
      free: container.querySelector('#aiFreeNote'),
      help: container.querySelector('#aiKeyHelp')
    };
    const saved = store.get('migaAiProvider');
    if (saved && MODELS[saved]) els.provider.value = saved;
    const apply = () => {
      const p = els.provider.value;
      els.model.innerHTML = MODELS[p].map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
      const savedModel = store.get('migaAiModel');
      if (savedModel && MODELS[p].some(([v]) => v === savedModel)) els.model.value = savedModel;
      els.keyField.hidden = p === 'gemini';
      els.free.hidden = p !== 'gemini';
      els.key.placeholder = p === 'openai' ? 'sk-...' : p === 'geminikey' ? 'AIza...' : 'sk-ant-...';
      els.help.hidden = p !== 'geminikey';
      if (p === 'geminikey' && !els.key.value) els.key.value = store.get('migaGeminiKey') || '';
      store.set('migaAiProvider', p);
    };
    els.provider.addEventListener('change', apply);
    els.model.addEventListener('change', () => store.set('migaAiModel', els.model.value));
    apply();
  }

  function settings() {
    if (!els) return { provider: 'gemini', model: MODELS.gemini[0][0], key: '' };
    return { provider: els.provider.value, model: els.model.value, key: els.key.value.trim() };
  }

  async function errorFrom(response, fallback) {
    const body = await response.json().catch(() => null);
    const msg = body && ((body.error && body.error.message) || (typeof body.error === 'string' && body.error));
    return new Error(msg || fallback + ' (HTTP ' + response.status + ')');
  }

  async function ask(system, user, opts) {
    const s = Object.assign(settings(), opts || {});
    const signal = opts && opts.signal;
    if (s.provider !== 'gemini' && !s.key) throw new Error('Add your ' + ({ openai: 'OpenAI', anthropic: 'Anthropic', geminikey: 'Gemini' }[s.provider]) + ' API key first, or switch back to free Gemini.');
    let text = '';
    if (s.provider === 'gemini') {
      const r = await fetch(GEMINI_PROXY_URL, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: s.model, systemPrompt: system, userPrompt: user }) });
      if (!r.ok) throw await errorFrom(r, 'The free AI is busy or at its daily limit. Try again later or use your own key');
      const d = await r.json();
      const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
      text = parts ? parts.map(p => p.text || '').join('') : '';
    } else if (s.provider === 'geminikey') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + s.model + ':generateContent', { method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }] }) });
      if (!r.ok) throw await errorFrom(r, 'Gemini request failed');
      const d = await r.json();
      const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
      text = parts ? parts.filter(p => !p.thought).map(p => p.text || '').join('') : '';
    } else if (s.provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: s.model, max_tokens: (opts && opts.maxTokens) || 16000, system, messages: [{ role: 'user', content: user }] }) });
      if (!r.ok) throw await errorFrom(r, 'Anthropic request failed');
      const d = await r.json();
      text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    } else {
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.key },
        body: JSON.stringify({ model: s.model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
      if (!r.ok) throw await errorFrom(r, 'OpenAI request failed');
      const d = await r.json();
      text = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    }
    if (!text) throw new Error('The AI sent back an empty answer. Please try again.');
    return text;
  }

  // Extract the first complete JSON object/array, tolerating ``` fences and chatter around it.
  function json(text) {
    const t = String(text).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    try { return JSON.parse(t); } catch (e) { /* fall through to scanning */ }
    const start = t.search(/[\[{]/);
    if (start < 0) throw new Error('The AI answer did not contain JSON.');
    const open = t[start], close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0 && c === close) return JSON.parse(t.slice(start, i + 1)); }
    }
    throw new Error('The AI answer was cut off before the JSON finished. Try a smaller piece or another model.');
  }

  window.MigaAI = { mount, ask, json, settings };
})(window, document);
