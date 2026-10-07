/* heic-support.js — lets image tools open iPhone photos (HEIC/HEIF).
 *
 * Desktop Chrome, Edge and Firefox cannot decode HEIC, so a photo AirDropped or
 * synced from an iPhone fails in every image tool. This script sits in front of
 * the page's own code: when a HEIC file is picked or dropped, it converts it to
 * a JPEG on this device (nothing is uploaded) and then hands the page the same
 * change or drop event it would have got, with the JPEG in place of the HEIC.
 * Pages need no changes besides loading this file.
 *
 * Safari decodes HEIC itself, so the converter (heic-to, a WebAssembly build of
 * libheif, about 3 MB) is only downloaded when the browser can't.
 */
(function () {
  'use strict';
  var LIB = 'https://cdn.jsdelivr.net/npm/heic-to@1.6.5/dist/heic-to.js';
  var EXTRA_ACCEPT = '.heic,.heif,image/heic,image/heif';
  var replayed = typeof WeakSet === 'function' ? new WeakSet() : null;
  var lib = null;

  if (window.I18N && I18N.phrases) {
    I18N.phrases({
      'Converting your iPhone photo (HEIC) to JPEG on this device…': { es: 'Convirtiendo tu foto de iPhone (HEIC) a JPEG en este dispositivo…', ar: 'جارٍ تحويل صورة iPhone ‏(HEIC) إلى JPEG على هذا الجهاز…', zh: '正在本设备上将你的 iPhone 照片（HEIC）转换为 JPEG…', sw: 'Inabadilisha picha yako ya iPhone (HEIC) kuwa JPEG kwenye kifaa hiki…', sv: 'Konverterar ditt iPhone-foto (HEIC) till JPEG på den här enheten…' },
      'This HEIC photo could not be opened. Try exporting it as JPEG from the Photos app.': { es: 'No se pudo abrir esta foto HEIC. Prueba a exportarla como JPEG desde la app Fotos.', ar: 'تعذّر فتح صورة HEIC هذه. جرّب تصديرها بصيغة JPEG من تطبيق الصور.', zh: '无法打开这张 HEIC 照片。请尝试在"照片"应用中将其导出为 JPEG。', sw: 'Picha hii ya HEIC haikuweza kufunguliwa. Jaribu kuihamisha kama JPEG kutoka programu ya Picha.', sv: 'Det här HEIC-fotot gick inte att öppna. Prova att exportera det som JPEG från appen Bilder.' }
    });
  }

  function isHeicFile(f) {
    return !!f && (/^image\/hei[cf](-sequence)?$/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || ''));
  }
  function hasHeic(files) {
    for (var i = 0; files && i < files.length; i++) if (isHeicFile(files[i])) return true;
    return false;
  }
  function wantsImages(input) {
    var a = (input.getAttribute('accept') || '').toLowerCase();
    return /image\//.test(a) && a.indexOf('.heic') < 0;
  }
  // Let the file picker show .heic files in inputs that take pictures.
  function widenAccept(root) {
    var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('input[type=file][accept]') : [];
    for (var i = 0; i < list.length; i++) if (wantsImages(list[i])) list[i].setAttribute('accept', list[i].getAttribute('accept') + ',' + EXTRA_ACCEPT);
  }

  var toast = null;
  function say(text, isError) {
    if (!document.body) return;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'miga-heic-note';
      toast.setAttribute('role', 'status');
      toast.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;max-width:min(92vw,520px);padding:10px 16px;border-radius:10px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)';
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? '#7a1d1d' : '#0e2a47';
    toast.style.color = '#fff';
    toast.textContent = text;
    toast.hidden = !text;
    clearTimeout(say.timer);
    if (isError) say.timer = setTimeout(function () { toast.hidden = true; }, 7000);
  }

  function canvasToJpeg(source, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(source, 0, 0);
    return new Promise(function (ok, bad) { c.toBlob(function (b) { b ? ok(b) : bad(new Error('JPEG encode failed')); }, 'image/jpeg', 0.92); });
  }
  async function toJpeg(file) {
    var blob = null;
    // Safari (and any browser that learns HEIC) decodes it natively, so skip the download there.
    try {
      var bmp = await createImageBitmap(file);
      blob = await canvasToJpeg(bmp, bmp.width, bmp.height);
      if (bmp.close) bmp.close();
    } catch (e) { blob = null; }
    if (!blob) {
      if (!lib) lib = import(LIB).catch(function (e) { lib = null; throw e; });
      var m = await lib;
      blob = await m.heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
    }
    var name = (file.name || 'photo.heic').replace(/\.hei[cf]$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified || Date.now() });
  }
  // Converts the HEIC files in a list; other files pass through untouched. Returns a DataTransfer.
  async function convertAll(files) {
    say('Converting your iPhone photo (HEIC) to JPEG on this device…');
    var dt = new DataTransfer(), failed = false;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (isHeicFile(f)) {
        try { f = await toJpeg(f); } catch (e) { failed = true; }
      }
      dt.items.add(f);
    }
    if (failed) say('This HEIC photo could not be opened. Try exporting it as JPEG from the Photos app.', true);
    else say('');
    return dt;
  }

  function mark(ev) { if (replayed) replayed.add(ev); else ev.__migaHeic = true; return ev; }
  function isReplay(ev) { return replayed ? replayed.has(ev) : !!ev.__migaHeic; }

  // A picked file: hold the page's change (and input) event, swap the files, then send them on.
  function onPick(e) {
    var input = e.target;
    if (isReplay(e) || !input || input.tagName !== 'INPUT' || input.type !== 'file' || !hasHeic(input.files)) return;
    e.stopImmediatePropagation();
    if (e.type !== 'change') return; // the change event drives the conversion; input is replayed with it
    convertAll(input.files).then(function (dt) {
      try { input.files = dt.files; } catch (err) { /* very old browsers: leave the HEIC in place */ }
      input.dispatchEvent(mark(new Event('input', { bubbles: true })));
      input.dispatchEvent(mark(new Event('change', { bubbles: true })));
    });
  }
  // A dropped file: cancel this drop and replay it on the same element with the JPEG.
  function onDrop(e) {
    if (isReplay(e) || !e.dataTransfer || !hasHeic(e.dataTransfer.files)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var target = e.target, x = e.clientX, y = e.clientY;
    convertAll(e.dataTransfer.files).then(function (dt) {
      var ev;
      try { ev = new DragEvent('drop', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: dt }); }
      catch (err) { return; }
      (target && target.isConnected ? target : document.body).dispatchEvent(mark(ev));
    });
  }

  window.addEventListener('change', onPick, true);
  window.addEventListener('input', onPick, true);
  window.addEventListener('drop', onDrop, true);
  // Inputs added later (and the ones a label opens) get the wider accept list just before the picker opens.
  window.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'file' && wantsImages(t)) t.setAttribute('accept', t.getAttribute('accept') + ',' + EXTRA_ACCEPT);
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { widenAccept(document); });
  else widenAccept(document);

  window.MigaHeic = { isHeic: isHeicFile, toJpeg: toJpeg };
})();
