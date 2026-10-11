/* Website health checks shared by Website Checkup (site-checkup.html) and the
 * Website Builder's "Check & fix" panel. Everything runs on the HTML in this
 * browser; nothing is uploaded.
 *
 *   MigaSiteChecks.run(doc)            -> [{ id, ok, title, detail, auto }]
 *   MigaSiteChecks.score(items)        -> 0–100
 *   MigaSiteChecks.fixAll(doc, opts)   -> titles of the problems it fixed (doc is changed in place)
 *   MigaSiteChecks.parse(html) / .serialize(doc)
 *
 * "auto" means fixAll can repair that problem without guessing at the owner's words;
 * the others (link wording, the canonical address before the site has one) need a person or the AI.
 */
(function () {
  'use strict';
  const text = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const SKIPPED = 'h1+h3,h1+h4,h2+h4,h2+h5,h3+h5,h3+h6,h4+h6';
  const VAGUE_LINK = /^\s*(click here|read more|more|here|learn more)\s*$/i;
  const TINY_TEXT = /font-size\s*:\s*[1-9](\.\d+)?px/i;

  function clip(s, max) {
    if (s.length <= max) return s;
    const cut = s.slice(0, max - 1);
    return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:–—-]+$/, '') + '…';
  }

  function run(doc) {
    const items = [];
    const add = (id, ok, title, detail, auto) => items.push({ id, ok, title, detail, auto: !ok && auto });
    const title = text(doc.querySelector('title'));
    const descEl = doc.querySelector('meta[name="description"]');
    const desc = (descEl && descEl.getAttribute('content') || '').trim();
    const h1 = doc.querySelectorAll('h1');
    const imgs = Array.from(doc.images);
    const links = Array.from(doc.querySelectorAll('a'));
    const viewport = doc.querySelector('meta[name="viewport"]');
    const lang = doc.documentElement.getAttribute('lang');
    const canon = doc.querySelector('link[rel="canonical"]');
    add('title', title.length >= 15 && title.length <= 60, 'Page title', title ? title.length + ' characters; aim for roughly 15–60.' : 'Missing <title>.', true);
    add('description', desc.length >= 70 && desc.length <= 165, 'Meta description', desc ? desc.length + ' characters; aim for roughly 70–165.' : 'Missing meta description.', true);
    add('h1', h1.length === 1, 'Main heading', h1.length + ' H1 element' + (h1.length === 1 ? '' : 's') + ' found; use one clear H1.', h1.length > 1 || !!doc.querySelector('h2'));
    const noAlt = imgs.filter(i => !i.hasAttribute('alt')).length;
    add('alt', !noAlt, 'Image descriptions', noAlt + ' image(s) are missing alt attributes.', true);
    add('viewport', !!viewport, 'Mobile viewport', viewport ? 'Viewport is present.' : 'Add a responsive viewport meta tag.', true);
    add('lang', !!lang, 'Page language', lang ? 'Language is set to ' + lang + '.' : 'Add lang to the html element.', true);
    add('canonical', !!canon, 'Canonical URL', canon ? 'Canonical link is present.' : 'Add a canonical link on public pages.', false);
    add('headings', !doc.querySelectorAll(SKIPPED).length, 'Heading order', 'Avoid skipping heading levels.', true);
    const vague = links.filter(a => VAGUE_LINK.test(a.textContent)).length;
    add('links', !vague, 'Descriptive links', vague ? vague + ' link(s) say only “click here” or “read more”. Use link text that explains its destination.' : 'Use link text that explains its destination.', false);
    add('tiny', !Array.from(doc.querySelectorAll('[style]')).some(el => TINY_TEXT.test(el.getAttribute('style'))), 'Readable text', 'Avoid extremely small fixed text.', true);
    return items;
  }

  const score = items => items.length ? Math.round(items.filter(i => i.ok).length / items.length * 100) : 100;

  function retag(el, tag) {
    const doc = el.ownerDocument;
    const out = doc.createElement(tag);
    Array.from(el.attributes).forEach(a => out.setAttribute(a.name, a.value));
    while (el.firstChild) out.appendChild(el.firstChild);
    el.replaceWith(out);
    return out;
  }

  // A best guess at the page's language from its own words, so the fix does not label a Swedish page English.
  function guessLang(doc) {
    const t = text(doc.body).toLowerCase().slice(0, 4000);
    if (/[؀-ۿ]/.test(t)) return 'ar';
    if (/[一-鿿]/.test(t)) return 'zh';
    const words = t.split(/[^\p{L}]+/u);
    const count = list => words.filter(w => list.includes(w)).length;
    const scores = {
      en: count(['the', 'and', 'you', 'your', 'with', 'for', 'our', 'we']),
      es: count(['el', 'la', 'los', 'las', 'y', 'para', 'con', 'nuestro', 'usted', 'que']),
      sv: count(['och', 'att', 'för', 'med', 'vi', 'din', 'ditt', 'är', 'på']),
      sw: count(['na', 'ya', 'wa', 'kwa', 'za', 'yako', 'sisi', 'ni']),
      de: count(['und', 'der', 'die', 'das', 'mit', 'für', 'wir', 'ihr']),
      fr: count(['et', 'le', 'les', 'des', 'pour', 'avec', 'nous', 'vous'])
    };
    const best = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    return scores[best] ? best : 'en';
  }

  // Words from an image's address (e.g. loremflickr.com/1200/800/plumber,tools or team-photo.jpg).
  function altFor(img) {
    const src = img.getAttribute('src') || '';
    if (!/^data:/i.test(src)) {
      const tail = decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || '').replace(/\.[a-z0-9]{2,5}$/i, '');
      const words = tail.replace(/[,_+-]+/g, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (/[a-z]{3}/i.test(words) && !/^[a-f0-9 ]{12,}$/i.test(words)) return words.charAt(0).toUpperCase() + words.slice(1);
    }
    const box = img.closest('figure, article, section, .card, li');
    const cap = box && (box.querySelector('figcaption') || box.querySelector('h1,h2,h3,h4'));
    return cap ? text(cap).slice(0, 120) : '';
  }

  function fixAll(doc, opts) {
    opts = opts || {};
    const before = run(doc);
    const head = doc.head || doc.documentElement.insertBefore(doc.createElement('head'), doc.body);
    const meta = (name, content) => { const m = doc.createElement('meta'); m.setAttribute('name', name); m.setAttribute('content', content); head.appendChild(m); return m; };
    const h1Text = () => text(doc.querySelector('h1'));
    const todo = new Set(before.filter(i => !i.ok).map(i => i.id));

    if (todo.has('viewport')) {
      const m = doc.createElement('meta'); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1');
      head.insertBefore(m, head.firstChild);
    }
    if (todo.has('lang')) doc.documentElement.setAttribute('lang', opts.lang || guessLang(doc));
    if (todo.has('h1')) {
      const all = Array.from(doc.querySelectorAll('h1'));
      if (all.length > 1) all.slice(1).forEach(h => retag(h, 'h2'));
      else if (!all.length && doc.querySelector('h2')) retag(doc.querySelector('h2'), 'h1');
    }
    if (todo.has('headings')) {
      let guard = 0, el;
      while ((el = doc.querySelector(SKIPPED)) && guard++ < 200) {
        const prev = +el.previousElementSibling.tagName[1];
        retag(el, 'h' + (prev + 1));
      }
    }
    if (todo.has('title')) {
      let t = doc.querySelector('title');
      if (!t) { t = doc.createElement('title'); head.appendChild(t); }
      let value = text(t);
      const extra = [opts.siteName, h1Text()].filter(x => x && !value.toLowerCase().includes(x.toLowerCase()));
      while (value.length < 15 && extra.length) value = value ? value + ' — ' + extra.shift() : extra.shift();
      t.textContent = clip(value, 60);
    }
    if (todo.has('description')) {
      let m = doc.querySelector('meta[name="description"]');
      let value = (m && m.getAttribute('content') || '').trim();
      const og = doc.querySelector('meta[property="og:description"]');
      const paras = [og && og.getAttribute('content')].concat(Array.from(doc.querySelectorAll('main p, body p')).map(text)).filter(p => p && p.length > 20 && p !== value);
      while (value.length < 70 && paras.length) value = (value ? value.replace(/[.!?]?$/, '. ') : '') + paras.shift();
      if (value.length >= 40) { value = clip(value, 160); (m || meta('description', '')).setAttribute('content', value); }
    }
    if (todo.has('alt')) doc.querySelectorAll('img:not([alt])').forEach(img => img.setAttribute('alt', altFor(img)));
    if (todo.has('canonical') && opts.url) {
      const l = doc.createElement('link'); l.setAttribute('rel', 'canonical'); l.setAttribute('href', opts.url); head.appendChild(l);
    }
    if (todo.has('tiny')) doc.querySelectorAll('[style]').forEach(el => {
      const s = el.getAttribute('style');
      if (TINY_TEXT.test(s)) el.setAttribute('style', s.replace(/font-size\s*:\s*[1-9](\.\d+)?px/gi, 'font-size:12px'));
    });

    const after = run(doc);
    return before.filter(b => !b.ok && after.find(a => a.id === b.id).ok).map(b => b.title);
  }

  const parse = html => new DOMParser().parseFromString(html, 'text/html');
  const serialize = doc => '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

  window.MigaSiteChecks = { run, score, fixAll, parse, serialize };
})();
