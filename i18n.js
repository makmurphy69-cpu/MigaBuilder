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
    { code: 'sw', label: 'Kiswahili', rtl: false },
    { code: 'sv', label: 'Svenska', rtl: false }
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
    },
    sv: {
      feedbackLink: 'Hittat en bugg eller har en idé? Skicka feedback →',
      partOf: 'En del av',
      show: 'Visa',
      hide: 'Dölj',
      providerGemini: 'Gemini — gratis, ingen nyckel behövs',
      providerOpenai: 'OpenAI',
      providerAnthropic: 'Anthropic (Claude)',
      moreLanguagesLabel: '🌐 Fler språk (Google Översätt)',
      languageAriaLabel: 'Språk',
      viewSourceLink: 'Visa källkoden på GitHub (MIT-licens) →'
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

  function t(key, missing) {
    var dict = strings[currentLang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return fill(dict[key]);
    var fallbackDict = strings[FALLBACK_LANG] || {};
    return Object.prototype.hasOwnProperty.call(fallbackDict, key) ? fill(fallbackDict[key]) : (missing != null ? missing : key);
  }

  function applyToDom() {
    // A key missing from a stale cached strings file keeps the text written in the page, never the key name.
    document.querySelectorAll('[data-i18n]').forEach(function (el) { if (el.dataset.i18nDefault == null) el.dataset.i18nDefault = el.textContent; el.textContent = t(el.getAttribute('data-i18n'), el.dataset.i18nDefault); });
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
    refreshPhrases();
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


  // ---- Phrase dictionaries -------------------------------------------------
  // Pages that are not tagged with data-i18n keys load a phrase file
  // (i18n/<page>.js) that calls I18N.phrases({ 'English text': { es, ar, zh, sw, sv } }).
  // Any text node, placeholder, title, aria-label or button value whose whole
  // (whitespace-trimmed) text equals one of those English strings is swapped
  // for the translation — including text the page's own JavaScript adds later,
  // which a MutationObserver picks up. Numbers may vary: "Step 2 / 4" matches an
  // entry written as "Step {0} / {1}". The English original is remembered so
  // switching language (or back to English) always starts from it.
  var phraseDict = {};          // lang -> { english: translation }
  var originals = new WeakMap(); // node -> English text we replaced
  var attrOriginals = new WeakMap(); // element -> { attr: English }
  var PHRASE_ATTRS = ['placeholder', 'title', 'aria-label'];
  var SKIP_SELECTOR = 'script,style,noscript,[contenteditable=""],[contenteditable="true"],[data-no-i18n],[data-i18n],[data-i18n-html],.lang-switcher';
  // Their placeholder/title is translated, but never the text inside (user input, code samples).
  var NO_TEXT_SELECTOR = 'textarea,code,pre';
  var observer = null;
  var applying = false;

  function addPhrases(dict) {
    Object.keys(dict || {}).forEach(function (en) {
      var row = dict[en] || {};
      var key = norm(en);
      Object.keys(row).forEach(function (lang) {
        (phraseDict[lang] = phraseDict[lang] || {})[key] = row[lang];
      });
    });
    if (document.body && currentLang !== FALLBACK_LANG) applyPhrases(document.body);
  }

  function norm(text) { return String(text).replace(/\s+/g, ' ').trim(); }

  function lookup(text) {
    var dict = phraseDict[currentLang];
    if (!dict) return null;
    var key = norm(text);
    if (!key || !/[^\s\d.,:%×x\/()+-]/.test(key)) return null;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    var nums = [];
    var pattern = key.replace(/\d+(?:[.,]\d+)?/g, function (m) { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    if (nums.length && Object.prototype.hasOwnProperty.call(dict, pattern)) {
      return dict[pattern].replace(/\{(\d+)\}/g, function (m, i) { return nums[i] != null ? nums[i] : m; });
    }
    return null;
  }

  function skipped(el) { return !el || (el.closest && el.closest(SKIP_SELECTOR)); }
  function textSkipped(el) { return skipped(el) || el.closest(NO_TEXT_SELECTOR); }

  function translateTextNode(node) {
    var current = node.nodeValue;
    var known = originals.get(node);
    // If the page changed the text since we translated it, the new text is the English source.
    var english = (known && known.shown === current) ? known.en : current;
    var out = currentLang === FALLBACK_LANG ? null : lookup(english);
    if (out == null) {
      if (known && known.shown === current && current !== english) node.nodeValue = english;
      if (known) originals.delete(node);
      return;
    }
    var lead = english.match(/^\s*/)[0], trail = english.match(/\s*$/)[0];
    var shown = lead + out + trail;
    originals.set(node, { en: english, shown: shown });
    if (current !== shown) node.nodeValue = shown;
  }

  function translateAttrs(el) {
    var saved = attrOriginals.get(el) || {};
    var attrs = PHRASE_ATTRS.slice();
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type)) attrs.push('value');
    attrs.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var current = el.getAttribute(a);
      var english = (saved[a] && saved[a].shown === current) ? saved[a].en : current;
      var out = currentLang === FALLBACK_LANG ? null : lookup(english);
      if (out == null) {
        if (saved[a] && saved[a].shown === current && current !== english) el.setAttribute(a, english);
        delete saved[a];
        return;
      }
      saved[a] = { en: english, shown: out };
      if (current !== out) el.setAttribute(a, out);
    });
    attrOriginals.set(el, saved);
  }

  function applyPhrases(root) {
    if (!root) return;
    applying = true;
    try {
      if (root.nodeType === 3) { if (!textSkipped(root.parentElement)) translateTextNode(root); return; }
      if (root.nodeType !== 1 || skipped(root)) return;
      if (root.closest(NO_TEXT_SELECTOR)) { if (root.matches(NO_TEXT_SELECTOR)) translateAttrs(root); return; }
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (n) {
          if (n.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;
          if (n.matches(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
          if (n.matches(NO_TEXT_SELECTOR)) { translateAttrs(n); return NodeFilter.FILTER_REJECT; }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n = root;
      do {
        if (n.nodeType === 3) translateTextNode(n);
        else translateAttrs(n);
      } while ((n = walker.nextNode()));
    } finally { applying = false; }
  }

  function translateTitle() {
    if (!document.__i18nTitle) document.__i18nTitle = { en: document.title, shown: document.title };
    var saved = document.__i18nTitle;
    if (document.title !== saved.shown) saved.en = document.title;
    var out = currentLang === FALLBACK_LANG ? null : lookup(saved.en);
    saved.shown = out == null ? saved.en : out;
    if (document.title !== saved.shown) document.title = saved.shown;
  }

  function watch() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (records) {
      if (applying || currentLang === FALLBACK_LANG) return;
      records.forEach(function (r) {
        if (r.type === 'childList') r.addedNodes.forEach(function (n) { applyPhrases(n); });
        else if (r.type === 'characterData') applyPhrases(r.target);
        else if (r.type === 'attributes' && !skipped(r.target)) { applying = true; try { translateAttrs(r.target); } finally { applying = false; } }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: PHRASE_ATTRS.concat('value') });
  }

  function refreshPhrases() {
    if (!document.body) return;
    if (currentLang !== FALLBACK_LANG && !phraseDict[currentLang]) return;
    applyPhrases(document.body);
    translateTitle();
    if (currentLang !== FALLBACK_LANG) watch();
  }

  // Pages without data-i18n keys need a place for the language menu: under the masthead text.
  function ensureSwitcherHost() {
    if (document.querySelector('[data-i18n-switcher]')) return;
    var anchor = document.querySelector('header.masthead > div') || document.querySelector('header.masthead') || document.querySelector('header');
    if (!anchor) return;
    var host = document.createElement('div');
    host.setAttribute('data-i18n-switcher', '');
    host.style.marginTop = '10px';
    anchor.appendChild(host);
  }

  // ---- Shared phrases (generated) ----
  // Text from the shared parts of every page (menus, art notes, video guides, AI settings).
  var SHARED_PHRASES = {
    "(no answer)": { es: "(sin respuesta)", ar: "(لا إجابة)", zh: "（未作答）", sw: "(hakuna jibu)", sv: "(inget svar)" },
    ". No account required.": { es: ". No necesitas cuenta.", ar: ". لا حاجة إلى حساب.", zh: "。无需账户。", sw: ". Hakuna haja ya akaunti.", sv: ". Inget konto behövs." },
    "AI goes online": { es: "La IA usa internet", ar: "الذكاء الاصطناعي يتصل بالإنترنت", zh: "AI 需要联网", sw: "AI hutumia mtandao", sv: "AI går via internet" },
    "AI provider": { es: "Proveedor de IA", ar: "مزوّد الذكاء الاصطناعي", zh: "AI 提供商", sw: "Mtoa huduma wa AI", sv: "AI-leverantör" },
    "AI questions. Good luck!": { es: "preguntas de IA. ¡Buena suerte!", ar: "أسئلة بالذكاء الاصطناعي. حظًا موفقًا!", zh: "道 AI 题目。祝你好运！", sw: "maswali ya AI. Bahati njema!", sv: "AI-frågor. Lycka till!" },
    "AI steps go online": { es: "Los pasos de IA usan internet", ar: "خطوات الذكاء الاصطناعي تتصل بالإنترنت", zh: "AI 步骤需要联网", sw: "Hatua za AI hutumia mtandao", sv: "AI-stegen går via internet" },
    "About the art": { es: "Sobre el arte", ar: "حول الرسم", zh: "关于插画", sw: "Kuhusu sanaa", sv: "Om konsten" },
    "About this art": { es: "Sobre esta obra", ar: "حول هذا العمل الفني", zh: "关于这幅作品", sw: "Kuhusu sanaa hii", sv: "Om det här konstverket" },
    "Accent": { es: "Acento", ar: "اللون المميز", zh: "强调色", sw: "Rangi ya msisitizo", sv: "Accent" },
    "Accent colour": { es: "Color de acento", ar: "اللون المميز", zh: "强调色", sw: "Rangi ya msisitizo", sv: "Accentfärg" },
    "Anthropic Claude (your key)": { es: "Anthropic Claude (tu clave)", ar: "Anthropic Claude (مفتاحك)", zh: "Anthropic Claude（你的密钥）", sw: "Anthropic Claude (ufunguo wako)", sv: "Anthropic Claude (din nyckel)" },
    "Arabic": { es: "Árabe", ar: "العربية", zh: "阿拉伯语", sw: "Kiarabu", sv: "Arabiska" },
    "Asking the AI…": { es: "Preguntando a la IA…", ar: "جارٍ سؤال الذكاء الاصطناعي…", zh: "正在询问 AI…", sw: "Inauliza AI…", sv: "Frågar AI:n…" },
    "Background": { es: "Fondo", ar: "الخلفية", zh: "背景", sw: "Mandharinyuma", sv: "Bakgrund" },
    "Body text": { es: "Texto del cuerpo", ar: "نص المحتوى", zh: "正文", sw: "Maandishi ya mwili", sv: "Brödtext" },
    "Brand details stay in this browser unless you export them or send text to a service yourself.": { es: "Los datos de marca se quedan en este navegador a menos que los exportes o envíes texto a un servicio tú mismo.", ar: "تبقى بيانات العلامة التجارية في هذا المتصفح ما لم تصدّرها أو ترسل نصًا إلى خدمة بنفسك.", zh: "品牌信息保存在此浏览器中，除非你自行导出或把文字发送到某个服务。", sw: "Maelezo ya chapa hubaki kwenye kivinjari hiki isipokuwa uyahamishe au utume maandishi kwa huduma mwenyewe.", sv: "Varumärkesuppgifterna stannar i den här webbläsaren om du inte själv exporterar dem eller skickar text till en tjänst." },
    "Brand kit (saved on this device)": { es: "Kit de marca (guardado en este dispositivo)", ar: "حزمة العلامة التجارية (محفوظة على هذا الجهاز)", zh: "品牌套件（保存在本设备上）", sw: "Kifurushi cha chapa (kimehifadhiwa kwenye kifaa hiki)", sv: "Varumärkespaket (sparat på den här enheten)" },
    "Brand name": { es: "Nombre de marca", ar: "اسم العلامة التجارية", zh: "品牌名称", sw: "Jina la chapa", sv: "Varumärkesnamn" },
    "Brand voice": { es: "Tono de marca", ar: "أسلوب العلامة التجارية", zh: "品牌语气", sw: "Sauti ya chapa", sv: "Varumärkets tonläge" },
    "Cancel": { es: "Cancelar", ar: "إلغاء", zh: "取消", sw: "Ghairi", sv: "Avbryt" },
    "Challenge mode": { es: "Modo desafío", ar: "وضع التحدي", zh: "挑战模式", sw: "Hali ya changamoto", sv: "Utmaningsläge" },
    "Challenge — timed, points & streaks": { es: "Desafío — con tiempo, puntos y rachas", ar: "تحدٍّ — بوقت ونقاط وسلاسل", zh: "挑战——计时、积分和连胜", sw: "Changamoto — kwa muda, pointi na mfululizo", sv: "Utmaning — tidtagning, poäng & svitar" },
    "Choose a brand-kit JSON file": { es: "Elige un archivo JSON de kit de marca", ar: "اختر ملف JSON لحزمة العلامة التجارية", zh: "选择品牌套件 JSON 文件", sw: "Chagua faili ya JSON ya kifurushi cha chapa", sv: "Välj en JSON-fil med varumärkespaket" },
    "Clear": { es: "Borrar", ar: "مسح", zh: "清除", sw: "Futa", sv: "Rensa" },
    "Copy": { es: "Copiar", ar: "نسخ", zh: "复制", sw: "Nakili", sv: "Kopiera" },
    "Could not create the quiz:": { es: "No se pudo crear el cuestionario:", ar: "تعذّر إنشاء الاختبار:", zh: "无法创建测验：", sw: "Haikuweza kutengeneza jaribio:", sv: "Kunde inte skapa quizet:" },
    "Could not load": { es: "No se pudo cargar", ar: "تعذّر التحميل", zh: "无法加载", sw: "Imeshindwa kupakia", sv: "Kunde inte ladda" },
    "Delete": { es: "Eliminar", ar: "حذف", zh: "删除", sw: "Futa", sv: "Ta bort" },
    "Download PNG": { es: "Descargar PNG", ar: "تنزيل PNG", zh: "下载 PNG", sw: "Pakua PNG", sv: "Ladda ner PNG" },
    "Download TXT": { es: "Descargar TXT", ar: "تنزيل TXT", zh: "下载 TXT", sw: "Pakua TXT", sv: "Ladda ner TXT" },
    "End quiz": { es: "Terminar cuestionario", ar: "إنهاء الاختبار", zh: "结束测验", sw: "Maliza jaribio", sv: "Avsluta quizet" },
    "English": { es: "Inglés", ar: "الإنجليزية", zh: "英语", sw: "Kiingereza", sv: "Engelska" },
    "Enter": { es: "Intro", ar: "إدخال", zh: "回车", sw: "Enter", sv: "Enter" },
    "Export": { es: "Exportar", ar: "تصدير", zh: "导出", sw: "Hamisha", sv: "Exportera" },
    "Files": { es: "Archivos", ar: "الملفات", zh: "文件", sw: "Faili", sv: "Filer" },
    "Follow the real controls on this page with captions and voice.": { es: "Sigue los controles reales de esta página con subtítulos y voz.", ar: "تابع عناصر التحكم الحقيقية في هذه الصفحة مع ترجمة وصوت.", zh: "通过字幕和语音跟随本页的真实控件。", sw: "Fuata vidhibiti halisi vya ukurasa huu kwa manukuu na sauti.", sv: "Följ sidans riktiga kontroller med textning och röst." },
    "Free Gemini shares a limited daily capacity. If it stops answering, switch to your own OpenAI or Anthropic key.": { es: "Gemini gratis comparte una capacidad diaria limitada. Si deja de responder, usa tu propia clave de OpenAI o Anthropic.", ar: "Gemini المجاني يتشارك سعة يومية محدودة. إذا توقف عن الرد، استخدم مفتاح OpenAI أو Anthropic الخاص بك.", zh: "免费的 Gemini 共享有限的每日额度。如果它不再回应，请改用你自己的 OpenAI 或 Anthropic 密钥。", sw: "Gemini ya bure inashiriki uwezo mdogo wa kila siku. Ikiacha kujibu, tumia ufunguo wako wa OpenAI au Anthropic.", sv: "Gratis Gemini delar en begränsad daglig kapacitet. Om den slutar svara, byt till din egen OpenAI- eller Anthropic-nyckel." },
    "Free key:": { es: "Clave gratis:", ar: "مفتاح مجاني:", zh: "免费密钥：", sw: "Ufunguo wa bure:", sv: "Gratis nyckel:" },
    "Free tools · no signup · private by design": { es: "Herramientas gratis · sin registro · privadas por diseño", ar: "أدوات مجانية · بلا تسجيل · خاصة بطبيعتها", zh: "免费工具 · 无需注册 · 以隐私为本", sw: "Zana za bure · bila kujisajili · faragha kwa muundo", sv: "Gratis verktyg · ingen registrering · privat från grunden" },
    "French": { es: "Francés", ar: "الفرنسية", zh: "法语", sw: "Kifaransa", sv: "Franska" },
    "Gemini (your own key)": { es: "Gemini (tu propia clave)", ar: "Gemini (مفتاحك الخاص)", zh: "Gemini（你自己的密钥）", sw: "Gemini (ufunguo wako)", sv: "Gemini (egen nyckel)" },
    "Gemini 3.5 Flash (free tier)": { es: "Gemini 3.5 Flash (nivel gratuito)", ar: "Gemini 3.5 Flash (الفئة المجانية)", zh: "Gemini 3.5 Flash（免费层级）", sw: "Gemini 3.5 Flash (kiwango cha bure)", sv: "Gemini 3.5 Flash (gratisnivå)" },
    "Gemini 3.5 Flash (free)": { es: "Gemini 3.5 Flash (gratis)", ar: "Gemini 3.5 Flash (مجاني)", zh: "Gemini 3.5 Flash（免费）", sw: "Gemini 3.5 Flash (bure)", sv: "Gemini 3.5 Flash (gratis)" },
    "Gemini 3.5 Flash-Lite (free tier)": { es: "Gemini 3.5 Flash-Lite (nivel gratuito)", ar: "Gemini 3.5 Flash-Lite (الفئة المجانية)", zh: "Gemini 3.5 Flash-Lite（免费层级）", sw: "Gemini 3.5 Flash-Lite (kiwango cha bure)", sv: "Gemini 3.5 Flash-Lite (gratisnivå)" },
    "Gemini 3.5 Flash-Lite (free, faster)": { es: "Gemini 3.5 Flash-Lite (gratis, más rápido)", ar: "Gemini 3.5 Flash-Lite (مجاني، أسرع)", zh: "Gemini 3.5 Flash-Lite（免费，更快）", sw: "Gemini 3.5 Flash-Lite (bure, haraka zaidi)", sv: "Gemini 3.5 Flash-Lite (gratis, snabbare)" },
    "Gemini — free, no key needed": { es: "Gemini — gratis, sin clave", ar: "Gemini — مجاني، بدون مفتاح", zh: "Gemini — 免费，无需密钥", sw: "Gemini — bure, bila ufunguo", sv: "Gemini — gratis, ingen nyckel behövs" },
    "Generate AI quiz": { es: "Generar cuestionario con IA", ar: "أنشئ اختبارًا بالذكاء الاصطناعي", zh: "用 AI 生成测验", sw: "Tengeneza jaribio kwa AI", sv: "Skapa AI-quiz" },
    "Generate quiz": { es: "Generar cuestionario", ar: "أنشئ اختبارًا", zh: "生成测验", sw: "Tengeneza jaribio", sv: "Skapa quiz" },
    "German": { es: "Alemán", ar: "الألمانية", zh: "德语", sw: "Kijerumani", sv: "Tyska" },
    "How this picture links to it": { es: "Cómo se relaciona esta imagen", ar: "كيف ترتبط هذه الصورة بالأداة", zh: "这幅画与本工具的关系", sw: "Jinsi picha hii inavyohusiana", sv: "Hur bilden hänger ihop med verktyget" },
    "Import": { es: "Importar", ar: "استيراد", zh: "导入", sw: "Leta", sv: "Importera" },
    "Includes the sample made in this video": { es: "Incluye el ejemplo creado en este vídeo", ar: "يتضمن المثال المصنوع في هذا الفيديو", zh: "包含本视频中制作的示例", sw: "Inajumuisha mfano uliotengenezwa kwenye video hii", sv: "Innehåller exemplet som görs i videon" },
    "Install MigaBuilder as an app — the tools you have used then work offline": { es: "Instala MigaBuilder como app: las herramientas que ya usaste funcionarán sin conexión", ar: "ثبّت MigaBuilder كتطبيق — ستعمل الأدوات التي استخدمتها دون اتصال", zh: "将 MigaBuilder 安装为应用——用过的工具即可离线使用", sw: "Sakinisha MigaBuilder kama programu — zana ulizotumia zitafanya kazi bila mtandao", sv: "Installera MigaBuilder som app — verktygen du har använt fungerar då offline" },
    "Japanese": { es: "Japonés", ar: "اليابانية", zh: "日语", sw: "Kijapani", sv: "Japanska" },
    "Jump to any MigaBuilder tool (Ctrl+K)": { es: "Ir a cualquier herramienta de MigaBuilder (Ctrl+K)", ar: "انتقل إلى أي أداة في MigaBuilder ‏(Ctrl+K)", zh: "跳转到任意 MigaBuilder 工具（Ctrl+K）", sw: "Nenda kwa zana yoyote ya MigaBuilder (Ctrl+K)", sv: "Hoppa till valfritt MigaBuilder-verktyg (Ctrl+K)" },
    "Language": { es: "Idioma", ar: "اللغة", zh: "语言", sw: "Lugha", sv: "Språk" },
    "Length": { es: "Duración", ar: "المدة", zh: "长度", sw: "Urefu", sv: "Längd" },
    "Level": { es: "Nivel", ar: "المستوى", zh: "级别", sw: "Kiwango", sv: "Nivå" },
    "Made by Claude, an AI by Anthropic: an original homage drawn in code. Nothing is copied from real paintings.": { es: "Hecha por Claude, una IA de Anthropic: un homenaje original dibujado con código. No se copia nada de pinturas reales.", ar: "من صنع Claude، ذكاء اصطناعي من Anthropic: تكريم أصلي مرسوم بالكود. لا شيء منسوخ من لوحات حقيقية.", zh: "由 Anthropic 的 AI Claude 制作：一幅用代码绘制的原创致敬作品，没有复制任何真实画作。", sw: "Imetengenezwa na Claude, AI ya Anthropic: heshima asilia iliyochorwa kwa msimbo. Hakuna kilichonakiliwa kutoka kwa michoro halisi.", sv: "Gjord av Claude, en AI från Anthropic: en egen hyllning ritad med kod. Ingenting är kopierat från riktiga målningar." },
    "Mode": { es: "Modo", ar: "الوضع", zh: "模式", sw: "Hali", sv: "Läge" },
    "Model": { es: "Modelo", ar: "النموذج", zh: "模型", sw: "Modeli", sv: "Modell" },
    "New quiz": { es: "Nuevo cuestionario", ar: "اختبار جديد", zh: "新测验", sw: "Jaribio jipya", sv: "Nytt quiz" },
    "Next question →": { es: "Siguiente pregunta →", ar: "السؤال التالي ←", zh: "下一题 →", sw: "Swali linalofuata →", sv: "Nästa fråga →" },
    "Next →": { es: "Siguiente →", ar: "التالي ←", zh: "下一个 →", sw: "Inayofuata →", sv: "Nästa →" },
    "Nothing is uploaded. The walkthrough only points to controls already on this page.": { es: "No se sube nada. El recorrido solo señala controles que ya están en esta página.", ar: "لا يُرفع أي شيء. الجولة تشير فقط إلى عناصر تحكم موجودة على هذه الصفحة.", zh: "不会上传任何内容。演示只会指向本页已有的控件。", sw: "Hakuna kinachopakiwa. Mwongozo unaonyesha tu vidhibiti vilivyopo kwenye ukurasa huu.", sv: "Ingenting laddas upp. Genomgången pekar bara på kontroller som redan finns på sidan." },
    "Number of questions": { es: "Número de preguntas", ar: "عدد الأسئلة", zh: "题目数量", sw: "Idadi ya maswali", sv: "Antal frågor" },
    "On-screen keyboard for other languages and alphabets (Arabic, Russian, Chinese, Hindi, Korean, accents…)": { es: "Teclado en pantalla para otros idiomas y alfabetos (árabe, ruso, chino, hindi, coreano, acentos…)", ar: "لوحة مفاتيح على الشاشة للغات وأبجديات أخرى (العربية، الروسية، الصينية، الهندية، الكورية، علامات التشكيل…)", zh: "屏幕键盘，支持其他语言和文字（阿拉伯文、俄文、中文、印地文、韩文、重音符号…）", sw: "Kibodi ya skrini kwa lugha na alfabeti nyingine (Kiarabu, Kirusi, Kichina, Kihindi, Kikorea, alama za lafudhi…)", sv: "Skärmtangentbord för andra språk och alfabet (arabiska, ryska, kinesiska, hindi, koreanska, accenter…)" },
    "Open": { es: "Abre", ar: "افتح", zh: "打开", sw: "Fungua", sv: "Öppna" },
    "OpenAI (your key)": { es: "OpenAI (tu clave)", ar: "OpenAI (مفتاحك)", zh: "OpenAI（你的密钥）", sw: "OpenAI (ufunguo wako)", sv: "OpenAI (din nyckel)" },
    "Part of": { es: "Parte de", ar: "جزء من", zh: "隶属于", sw: "Sehemu ya", sv: "En del av" },
    "Personal best:": { es: "Mejor marca personal:", ar: "أفضل نتيجة شخصية:", zh: "个人最佳：", sw: "Rekodi yako bora:", sv: "Personligt rekord:" },
    "Portuguese": { es: "Portugués", ar: "البرتغالية", zh: "葡萄牙语", sw: "Kireno", sv: "Portugisiska" },
    "Practice — no timer": { es: "Práctica — sin tiempo", ar: "تدريب — بدون مؤقت", zh: "练习——不计时", sw: "Mazoezi — bila kipima muda", sv: "Övning — ingen timer" },
    "Prefer to follow along on this page? The interactive walkthrough below points to the real controls.": { es: "¿Prefieres seguirlo en esta página? El recorrido interactivo de abajo señala los controles reales.", ar: "تفضّل المتابعة على هذه الصفحة؟ الجولة التفاعلية أدناه تشير إلى عناصر التحكم الحقيقية.", zh: "想在本页面跟着做？下面的互动演示会指向真实的控件。", sw: "Ungependa kufuata kwenye ukurasa huu? Mwongozo shirikishi hapa chini unaonyesha vidhibiti halisi.", sv: "Vill du hellre följa med på sidan? Den interaktiva genomgången nedan pekar ut de riktiga kontrollerna." },
    "Preview": { es: "Vista previa", ar: "معاينة", zh: "预览", sw: "Onyesho la awali", sv: "Förhandsvisning" },
    "Primary": { es: "Principal", ar: "الأساسي", zh: "主色", sw: "Msingi", sv: "Primär" },
    "Private": { es: "Privado", ar: "خاص", zh: "私密", sw: "Faragha", sv: "Privat" },
    "Private · runs in your browser": { es: "Privado · funciona en tu navegador", ar: "خاص · يعمل في متصفحك", zh: "私密 · 在浏览器中运行", sw: "Faragha · inafanya kazi kwenye kivinjari chako", sv: "Privat · körs i din webbläsare" },
    "Question": { es: "Pregunta", ar: "السؤال", zh: "题目", sw: "Swali", sv: "Fråga" },
    "Questions about": { es: "Preguntas sobre", ar: "أسئلة عن", zh: "题目主题", sw: "Maswali kuhusu", sv: "Frågor om" },
    "Quiz ready —": { es: "Cuestionario listo:", ar: "الاختبار جاهز —", zh: "测验已就绪——", sw: "Jaribio liko tayari —", sv: "Quizet är klart —" },
    "REAL WALKTHROUGH": { es: "RECORRIDO REAL", ar: "جولة حقيقية", zh: "真实演示", sw: "MWONGOZO HALISI", sv: "RIKTIG GENOMGÅNG" },
    "Read the transcript": { es: "Leer la transcripción", ar: "اقرأ النص المكتوب", zh: "阅读文字稿", sw: "Soma nakala ya maandishi", sv: "Läs utskriften" },
    "Real demonstration": { es: "Demostración real", ar: "عرض حقيقي", zh: "真实演示", sw: "Onyesho halisi", sv: "Riktig demonstration" },
    "Reset view": { es: "Restablecer vista", ar: "إعادة ضبط العرض", zh: "重置视图", sw: "Weka upya mwonekano", sv: "Återställ vy" },
    "Result": { es: "Resultado", ar: "النتيجة", zh: "结果", sw: "Matokeo", sv: "Resultat" },
    "Retry the ones I missed": { es: "Repetir las que fallé", ar: "أعد الأسئلة التي أخطأت فيها", zh: "重做答错的题", sw: "Rudia nilizokosea", sv: "Gör om de jag missade" },
    "Runs in your browser · AI steps send text to the AI you pick": { es: "Funciona en tu navegador · los pasos de IA envían texto a la IA que elijas", ar: "يعمل في متصفحك · خطوات الذكاء الاصطناعي ترسل النص إلى الذكاء الاصطناعي الذي تختاره", zh: "在浏览器中运行 · AI 步骤会把文字发送给你选择的 AI", sw: "Inafanya kazi kwenye kivinjari chako · hatua za AI hutuma maandishi kwa AI unayochagua", sv: "Körs i din webbläsare · AI-stegen skickar text till den AI du väljer" },
    "See results": { es: "Ver resultados", ar: "اعرض النتائج", zh: "查看结果", sw: "Ona matokeo", sv: "Se resultat" },
    "Send feedback →": { es: "Enviar comentarios →", ar: "أرسل ملاحظاتك ←", zh: "发送反馈 →", sw: "Tuma maoni →", sv: "Skicka feedback →" },
    "Sent only to the provider you chose, straight from this browser. Never stored.": { es: "Se envía solo al proveedor que elegiste, directamente desde este navegador. Nunca se guarda.", ar: "يُرسل فقط إلى المزوّد الذي اخترته، مباشرة من هذا المتصفح. لا يُحفظ أبدًا.", zh: "只会从此浏览器直接发送给你选择的提供商，从不保存。", sw: "Hutumwa tu kwa mtoa huduma uliyemchagua, moja kwa moja kutoka kivinjari hiki. Hauhifadhiwi kamwe.", sv: "Skickas bara till leverantören du valt, direkt från den här webbläsaren. Sparas aldrig." },
    "Show": { es: "Mostrar", ar: "إظهار", zh: "显示", sw: "Onyesha", sv: "Visa" },
    "Space": { es: "Espacio", ar: "مسافة", zh: "空格", sw: "Space", sv: "Mellanslag" },
    "Spanish": { es: "Español", ar: "الإسبانية", zh: "西班牙语", sw: "Kihispania", sv: "Spanska" },
    "Start": { es: "Inicio", ar: "البداية", zh: "起点", sw: "Mwanzo", sv: "Start" },
    "Start walkthrough": { es: "Iniciar recorrido", ar: "ابدأ الجولة", zh: "开始演示", sw: "Anza mwongozo", sv: "Starta genomgången" },
    "Step {0} / {1}": { es: "Paso {0} / {1}", ar: "الخطوة {0} / {1}", zh: "第 {0} / {1} 步", sw: "Hatua {0} / {1}", sv: "Steg {0} / {1}" },
    "Stop": { es: "Detener", ar: "إيقاف", zh: "停止", sw: "Simamisha", sv: "Stopp" },
    "Subject": { es: "Asunto", ar: "الموضوع", zh: "主题", sw: "Mada", sv: "Ämne" },
    "Surrealism": { es: "Surrealismo", ar: "السريالية", zh: "超现实主义", sw: "Usurealisti", sv: "Surrealism" },
    "Swedish": { es: "Sueco", ar: "السويدية", zh: "瑞典语", sw: "Kiswidi", sv: "Svenska" },
    "Thai": { es: "Tailandés", ar: "التايلاندية", zh: "泰语", sw: "Kithai", sv: "Thailändska" },
    "The AI did not return usable questions. Try again.": { es: "La IA no devolvió preguntas utilizables. Inténtalo de nuevo.", ar: "لم يُرجع الذكاء الاصطناعي أسئلة صالحة. حاول مرة أخرى.", zh: "AI 没有返回可用的题目。请重试。", sw: "AI haikurudisha maswali yanayotumika. Jaribu tena.", sv: "AI:n gav inga användbara frågor. Försök igen." },
    "The artist": { es: "El artista", ar: "الفنان", zh: "艺术家", sw: "Msanii", sv: "Konstnären" },
    "This tool runs in your browser, except its AI steps. When you use an AI step, the text for that step is sent to the AI you pick: the free Gemini option goes through MigaBuilder's proxy to Google; OpenAI and Anthropic are called directly with your own key.": { es: "Esta herramienta funciona en tu navegador, excepto sus pasos de IA. Cuando usas un paso de IA, el texto de ese paso se envía a la IA que elijas: la opción gratuita de Gemini pasa por el proxy de MigaBuilder hacia Google; OpenAI y Anthropic se llaman directamente con tu propia clave.", ar: "تعمل هذه الأداة في متصفحك، باستثناء خطوات الذكاء الاصطناعي. عند استخدام خطوة ذكاء اصطناعي، يُرسل نص تلك الخطوة إلى الذكاء الاصطناعي الذي تختاره: خيار Gemini المجاني يمر عبر وسيط MigaBuilder إلى Google؛ ويُستدعى OpenAI وAnthropic مباشرة بمفتاحك الخاص.", zh: "此工具在你的浏览器中运行，AI 步骤除外。使用 AI 步骤时，该步骤的文字会发送到你选择的 AI：免费的 Gemini 选项通过 MigaBuilder 的代理发送到 Google；OpenAI 和 Anthropic 则用你自己的密钥直接调用。", sw: "Zana hii inafanya kazi kwenye kivinjari chako, isipokuwa hatua zake za AI. Unapotumia hatua ya AI, maandishi ya hatua hiyo hutumwa kwa AI unayochagua: chaguo la bure la Gemini hupitia proksi ya MigaBuilder kwenda Google; OpenAI na Anthropic huitwa moja kwa moja kwa ufunguo wako.", sv: "Verktyget körs i din webbläsare, utom AI-stegen. När du använder ett AI-steg skickas texten för det steget till den AI du väljer: det kostnadsfria Gemini-alternativet går via MigaBuilders proxy till Google; OpenAI och Anthropic anropas direkt med din egen nyckel." },
    "This tool works inside your browser. Your text and files are not uploaded unless you use a sharing feature.": { es: "Esta herramienta funciona dentro de tu navegador. Tus textos y archivos no se suben salvo que uses una función para compartir.", ar: "تعمل هذه الأداة داخل متصفحك. لا تُرفع نصوصك وملفاتك إلا إذا استخدمت ميزة مشاركة.", zh: "此工具在你的浏览器内运行。除非你使用分享功能，否则你的文字和文件不会上传。", sw: "Zana hii inafanya kazi ndani ya kivinjari chako. Maandishi na faili zako hazipakiwi isipokuwa utumie kipengele cha kushiriki.", sv: "Verktyget körs i din webbläsare. Din text och dina filer laddas inte upp om du inte använder en delningsfunktion." },
    "Toggle dark mode": { es: "Cambiar el modo oscuro", ar: "تبديل الوضع الداكن", zh: "切换深色模式", sw: "Washa/zima hali ya giza", sv: "Växla mörkt läge" },
    "Topic": { es: "Tema", ar: "الموضوع", zh: "主题", sw: "Mada", sv: "Ämne" },
    "VIDEO GUIDE · {0}:{1}": { es: "GUÍA EN VÍDEO · {0}:{1}", ar: "دليل فيديو · {0}:{1}", zh: "视频指南 · {0}:{1}", sw: "MWONGOZO WA VIDEO · {0}:{1}", sv: "VIDEOGUIDE · {0}:{1}" },
    "Voice on": { es: "Voz activada", ar: "الصوت مفعّل", zh: "语音已开启", sw: "Sauti imewashwa", sv: "Röst på" },
    "Walkthrough language": { es: "Idioma del recorrido", ar: "لغة الجولة", zh: "演示语言", sw: "Lugha ya mwongozo", sv: "Genomgångens språk" },
    "Write": { es: "Escribir", ar: "اكتب", zh: "编写", sw: "Andika", sv: "Skriv" },
    "Writing your quiz…": { es: "Escribiendo tu cuestionario…", ar: "جارٍ كتابة اختبارك…", zh: "正在编写你的测验…", sw: "Inaandika jaribio lako…", sv: "Skriver ditt quiz…" },
    "Your API key": { es: "Tu clave de API", ar: "مفتاح API الخاص بك", zh: "你的 API 密钥", sw: "Ufunguo wako wa API", sv: "Din API-nyckel" },
    "Your OpenAI API key": { es: "Tu clave de API de OpenAI", ar: "مفتاح OpenAI API الخاص بك", zh: "你的 OpenAI API 密钥", sw: "Ufunguo wako wa OpenAI API", sv: "Din OpenAI API-nyckel" },
    "Your best:": { es: "Tu mejor marca:", ar: "أفضل نتيجة لك:", zh: "你的最佳：", sw: "Bora yako:", sv: "Ditt bästa:" },
    "Your browser cannot play this video.": { es: "Tu navegador no puede reproducir este vídeo.", ar: "لا يستطيع متصفحك تشغيل هذا الفيديو.", zh: "你的浏览器无法播放此视频。", sw: "Kivinjari chako hakiwezi kucheza video hii.", sv: "Din webbläsare kan inte spela upp videon." },
    "Your browser does not support embedded video.": { es: "Tu navegador no admite vídeo incrustado.", ar: "متصفحك لا يدعم الفيديو المضمّن.", zh: "你的浏览器不支持嵌入视频。", sw: "Kivinjari chako hakitumii video iliyopachikwa.", sv: "Din webbläsare stöder inte inbäddad video." },
    "advanced": { es: "avanzado", ar: "متقدم", zh: "高级", sw: "juu", sv: "avancerad" },
    "and": { es: "y", ar: "و", zh: "和", sw: "na", sv: "och" },
    "beginner": { es: "principiante", ar: "مبتدئ", zh: "初级", sw: "mwanzo", sv: "nybörjare" },
    "intermediate": { es: "intermedio", ar: "متوسط", zh: "中级", sw: "kati", sv: "medel" },
    "or": { es: "o", ar: "أو", zh: "或", sw: "au", sv: "eller" },
    "← All tools": { es: "← Todas las herramientas", ar: "→ كل الأدوات", zh: "← 全部工具", sw: "← Zana zote", sv: "← Alla verktyg" },
    "← Previous": { es: "← Anterior", ar: "→ السابق", zh: "← 上一个", sw: "← Iliyotangulia", sv: "← Föregående" },
    "→ Create API key → Copy.": { es: "→ Create API key → Copiar.", ar: "← Create API key ← نسخ.", zh: "→ Create API key → 复制。", sw: "→ Create API key → Nakili.", sv: "→ Create API key → Kopiera." },
    "⌨️ Keyboard": { es: "⌨️ Teclado", ar: "⌨️ لوحة المفاتيح", zh: "⌨️ 键盘", sw: "⌨️ Kibodi", sv: "⌨️ Tangentbord" },
    "⏸ Pause": { es: "⏸ Pausa", ar: "⏸ إيقاف مؤقت", zh: "⏸ 暂停", sw: "⏸ Sitisha", sv: "⏸ Pausa" },
    "▶ New here? Watch the {0}:{1} video guide ↓": { es: "▶ ¿Eres nuevo? Mira la guía en vídeo de {0}:{1} ↓", ar: "▶ جديد هنا؟ شاهد دليل الفيديو ({0}:{1}) ↓", zh: "▶ 第一次来？观看 {0}:{1} 的视频指南 ↓", sw: "▶ Mgeni hapa? Tazama mwongozo wa video wa {0}:{1} ↓", sv: "▶ Ny här? Se videoguiden på {0}:{1} ↓" },
    "▶ Play": { es: "▶ Reproducir", ar: "▶ تشغيل", zh: "▶ 播放", sw: "▶ Cheza", sv: "▶ Spela" },
    "▶ Watch": { es: "▶ Ver", ar: "▶ شاهد", zh: "▶观看", sw: "▶ Tazama", sv: "▶ Titta" },
    "✓ Copied": { es: "✓ Copiado", ar: "✓ تم النسخ", zh: "✓ 已复制", sw: "✓ Imenakiliwa", sv: "✓ Kopierat" },
    "⬇ Download": { es: "⬇ Descargar", ar: "⬇ تنزيل", zh: "⬇ 下载", sw: "⬇ Pakua", sv: "⬇ Ladda ner" },
    "⬇ Download video": { es: "⬇ Descargar vídeo", ar: "⬇ تنزيل الفيديو", zh: "⬇ 下载视频", sw: "⬇ Pakua video", sv: "⬇ Ladda ner video" },
    "⬇ Printable quiz + answers": { es: "⬇ Cuestionario imprimible + respuestas", ar: "⬇ اختبار قابل للطباعة + الإجابات", zh: "⬇ 可打印测验 + 答案", sw: "⬇ Jaribio la kuchapisha + majibu", sv: "⬇ Utskrivbart quiz + svar" },
    "🌙 Dark": { es: "🌙 Oscuro", ar: "🌙 داكن", zh: "🌙 深色", sw: "🌙 Giza", sv: "🌙 Mörkt" },
    "👀 See the sample made in this video": { es: "👀 Ver el ejemplo creado en este vídeo", ar: "👀 شاهد المثال المصنوع في هذا الفيديو", zh: "👀 查看本视频中制作的示例", sw: "👀 Tazama mfano uliotengenezwa kwenye video hii", sv: "👀 Se exemplet som görs i videon" },
    "💾 My work": { es: "💾 Mi trabajo", ar: "💾 أعمالي", zh: "💾 我的作品", sw: "💾 Kazi yangu", sv: "💾 Mitt arbete" },
    "📲 Install": { es: "📲 Instalar", ar: "📲 تثبيت", zh: "📲 安装", sw: "📲 Sakinisha", sv: "📲 Installera" },
    "🔎 Ctrl K": { es: "🔎 Ctrl K", ar: "🔎 Ctrl K", zh: "🔎 Ctrl K", sw: "🔎 Ctrl K", sv: "🔎 Ctrl K" },
    "🔒 Files you choose are opened on this device and are not uploaded.": { es: "🔒 Los archivos que eliges se abren en este dispositivo y no se suben.", ar: "🔒 تُفتح الملفات التي تختارها على هذا الجهاز ولا تُرفع.", zh: "🔒 你选择的文件会在本设备上打开，不会上传。", sw: "🔒 Faili unazochagua hufunguliwa kwenye kifaa hiki na hazipakiwi.", sv: "🔒 Filerna du väljer öppnas på den här enheten och laddas inte upp." }
  };
  // ---- End of shared phrases ----
  addPhrases(SHARED_PHRASES);

  var initialised = false;

  window.I18N = {
    init: function (pageStrings, opts) {
      window.__I18N_PAGE_STRINGS = pageStrings || {};
      vars = (opts && opts.vars) || {};
      initialised = true;
      mergeDicts();
      injectRtlStyles();
      ensureSwitcherHost();
      buildSwitcher();
      setLang(detectInitialLang());
    },
    phrases: addPhrases,
    t: t,
    getLang: function () { return currentLang; },
    setLang: setLang,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    languages: LANGUAGES
  };

  // Pages that only use phrase files never call I18N.init themselves.
  function autoInit() { if (!initialised) window.I18N.init({}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else setTimeout(autoInit, 0);
})(window, document);
