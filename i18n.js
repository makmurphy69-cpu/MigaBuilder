/**
 * MigaBuilder's shared translation runtime.
 *
 * Each page loads this file, then calls I18N.init(pageStrings, opts) with
 * its own dictionary of { en: {...}, es: {...}, ar: {...}, zh: {...}, sw: {...} }.
 * Strings are applied to any element carrying:
 *   data-i18n="key"              -> sets textContent
 *   data-i18n-html="key"         -> sets innerHTML (only for strings that are
 *                                    known-safe markup, e.g. containing a
 *                                    fixed <a> tag written by us, never user input)
 *   data-i18n-placeholder="key"  -> sets the placeholder attribute
 *   data-i18n-title="key"        -> sets the title attribute
 *
 * The chosen language is remembered in localStorage under 'migabuilderLang'
 * so it carries across every page on the site, and a small dropdown is
 * injected into the page's <header class="masthead"> automatically.
 *
 * Arabic is a right-to-left language: switching to it sets dir="rtl" and
 * lang="ar" on <html>. Most of the site's flex/grid layouts mirror
 * automatically because CSS direction is an inherited property, but a
 * best-effort override stylesheet (injected here) fixes the most common
 * physical-direction assumptions (text-align, left/right margins). This is
 * a functional, readable RTL treatment, not a pixel-perfect bespoke mirror
 * of every custom layout.
 *
 * Any UI string a page's own JavaScript needs to look up dynamically (e.g.
 * to build dynamic content) can call I18N.t('key').
 *
 * Strings may contain {name} placeholders, filled from opts.vars passed to
 * I18N.init(pageStrings, { vars: { n: 58 } }).
 */
(function (window, document) {
  "use strict";

  var STORAGE_KEY = 'migabuilderLang';
  var FALLBACK_LANG = 'en';
  var LANGUAGES = [
    { code: 'en', label: 'English', rtl: false },
    { code: 'es', label: 'Español', rtl: false },
    { code: 'ar', label: 'العربية', rtl: true },
    { code: 'zh', label: '中文', rtl: false },
    { code: 'sw', label: 'Kiswahili', rtl: false }
  ];

  // Strings genuinely repeated, verbatim, across most pages.
  var COMMON = {
    en: {
      feedbackLink: 'Found a bug or have an idea? Send feedback →',
      partOf: 'Part of',
      show: 'Show',
      hide: 'Hide',
      providerGemini: 'Gemini — free, no key needed',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 More languages (Google Translate)',
      languageAriaLabel: 'Language',
      viewSourceLink: 'View source on GitHub (MIT licensed) →'
    },
    es: {
      feedbackLink: '¿Encontraste un error o tienes una idea? Envía tu opinión →',
      partOf: 'Parte de',
      show: 'Mostrar',
      hide: 'Ocultar',
      providerGemini: 'Gemini — gratis, sin clave necesaria',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 Más idiomas (Google Translate)',
      languageAriaLabel: 'Idioma',
      viewSourceLink: 'Ver código fuente en GitHub (licencia MIT) →'
    },
    ar: {
      feedbackLink: 'وجدت خطأ أو لديك فكرة؟ أرسل ملاحظاتك ←',
      partOf: 'جزء من',
      show: 'إظهار',
      hide: 'إخفاء',
      providerGemini: 'Gemini — مجاني، بدون مفتاح',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 لغات أخرى (ترجمة Google)',
      languageAriaLabel: 'اللغة',
      viewSourceLink: 'عرض الكود المصدري على GitHub (ترخيص MIT) ←'
    },
    zh: {
      feedbackLink: '发现了错误或有新想法？发送反馈 →',
      partOf: '隶属于',
      show: '显示',
      hide: '隐藏',
      providerGemini: 'Gemini — 免费，无需密钥',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 更多语言（Google 翻译）',
      languageAriaLabel: '语言',
      viewSourceLink: '在 GitHub 上查看源代码（MIT 许可）→'
    },
    sw: {
      feedbackLink: 'Umepata hitilafu au una wazo? Tuma maoni →',
      partOf: 'Sehemu ya',
      show: 'Onyesha',
      hide: 'Ficha',
      providerGemini: 'Gemini — bure, hauhitaji ufunguo',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 Lugha zaidi (Google Translate)',
      languageAriaLabel: 'Lugha',
      viewSourceLink: 'Tazama msimbo chanzo kwenye GitHub (leseni ya MIT) →'
    }
  };

  var strings = {}; // merged COMMON + page-specific, per language
  var currentLang = FALLBACK_LANG;
  var listeners = [];

  function mergeDicts() {
    strings = {};
    LANGUAGES.forEach(function (l) {
      strings[l.code] = Object.assign({}, COMMON[l.code] || {}, (window.__I18N_PAGE_STRINGS && window.__I18N_PAGE_STRINGS[l.code]) || {});
    });
  }

  // Values for {name} placeholders in strings, e.g. { n: 58 } for "{n} free tools".
  var vars = {};

  function fill(text) {
    return typeof text === 'string' ? text.replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    }) : text;
  }

  function t(key) {
    var dict = strings[currentLang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return fill(dict[key]);
    var fallbackDict = strings[FALLBACK_LANG] || {};
    return Object.prototype.hasOwnProperty.call(fallbackDict, key) ? fill(fallbackDict[key]) : key;
  }

  function applyToDom() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  }

  function isRtl(lang) {
    var found = LANGUAGES.filter(function (l) { return l.code === lang; })[0];
    return !!(found && found.rtl);
  }

  function applyDirection() {
    var rtl = isRtl(currentLang);
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.body.classList.toggle('i18n-rtl', rtl);
  }

  function setLang(lang) {
    if (!strings[lang]) lang = FALLBACK_LANG;
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private browsing etc — just won't persist */ }
    applyDirection();
    applyToDom();
    var select = document.getElementById('i18nLangSelect');
    if (select) {
      if (select.value !== lang) select.value = lang;
      select.setAttribute('aria-label', t('languageAriaLabel'));
    }
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } })); } catch (e) {}
  }

  function injectRtlStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.i18n-rtl { direction: rtl; }',
      '.i18n-rtl .lang-switcher { direction: ltr; }', // keep the dropdown itself left-to-right (language names read naturally either way, and it avoids the arrow flipping oddly on some browsers)
      '.lang-switcher select {',
      '  width: auto; max-width: 100%; margin: 0;',
      '  font-family: inherit; font-size: 13px; padding: 6px 10px; border-radius: 3px;',
      '  border: 1px solid rgba(111, 209, 224, 0.4); background: rgba(8, 24, 38, 0.6); color: #EDEAE0; cursor: pointer;',
      '}',
      '.lang-switcher select:focus-visible { outline: 2px solid #6FD1E0; outline-offset: 2px; }',
      '.lang-switcher { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }',
      '.lang-switcher .lang-more-link {',
      '  font-family: inherit; font-size: 12px; color: #6FD1E0; text-decoration: underline; white-space: nowrap;',
      '}',
      '.lang-switcher .lang-more-link:hover { color: #EDEAE0; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // A page's own manually-translated languages are LANGUAGES above. For anything else,
  // link out to Google Translate rather than embedding its live-translate script, which
  // would fight these pages' own JS re-rendering text after the initial translation pass.
  function googleTranslateUrl() {
    var pageUrl = window.location.href.split('#')[0];
    return 'https://translate.google.com/translate?sl=auto&tl=auto&u=' + encodeURIComponent(pageUrl);
  }

  function buildSwitcher() {
    var host = document.querySelector('[data-i18n-switcher]');
    if (!host) return;
    host.classList.add('lang-switcher');
    var select = document.createElement('select');
    select.id = 'i18nLangSelect';
    select.setAttribute('aria-label', t('languageAriaLabel'));
    LANGUAGES.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label;
      select.appendChild(opt);
    });
    select.value = currentLang;
    select.addEventListener('change', function () { setLang(select.value); });
    host.appendChild(select);

    var moreLink = document.createElement('a');
    moreLink.className = 'lang-more-link';
    moreLink.href = googleTranslateUrl();
    moreLink.target = '_blank';
    moreLink.rel = 'noopener';
    moreLink.setAttribute('data-i18n', 'moreLanguagesLabel');
    moreLink.textContent = 'More languages (Google Translate)';
    host.appendChild(moreLink);
  }

  function detectInitialLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && strings[stored]) return stored;
    } catch (e) {}
    return FALLBACK_LANG;
  }

  window.I18N = {
    init: function (pageStrings, opts) {
      window.__I18N_PAGE_STRINGS = pageStrings || {};
      vars = (opts && opts.vars) || {};
      mergeDicts();
      injectRtlStyles();
      buildSwitcher();
      setLang(detectInitialLang());
    },
    t: t,
    getLang: function () { return currentLang; },
    setLang: setLang,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    languages: LANGUAGES
  };
})(window, document);
