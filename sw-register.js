(function () {
  'use strict';
  // Tool page artwork is loaded through the shared page script so new tools inherit it.
  // Pages can also be opened without ".html" (/model-forge), so skip only the homepage and 404.
  if (!/^\/(index(\.html)?)?$|^\/404(\.html)?$/.test(location.pathname)) {
    var artStyle = document.createElement('link');
    artStyle.rel = 'stylesheet';
    artStyle.href = '/tool-art.css';
    document.head.appendChild(artStyle);
    var artScript = document.createElement('script');
    artScript.src = '/tool-art.js';
    document.head.appendChild(artScript);
  }
  // Give every tool page consistent, crawlable metadata without duplicating JSON-LD in dozens of files.
  // Pages with hand-written structured data keep their more specific version.
  // Many tool pages have their own header instead of .tool-nav, so this goes by path, and the
  // name comes from the <title> ("Name — what it does").
  if (!/^\/(index(\.html)?)?$|^\/(404|visits|feedback|templates|sample-viewer)(\.html)?$/.test(location.pathname) &&
      document.title && !document.querySelector('script[type="application/ld+json"]')) {
    var title = document.title.split(/\s+[—|–-]\s+/)[0].trim();
    var metaDescription = document.querySelector('meta[name="description"]');
    var description = metaDescription ? metaDescription.content.trim() : '';
    var file = location.pathname.split('/').pop() || '';
    // GitHub Pages also serves /model-forge; point search engines at the .html URL the sitemap lists.
    if (file && file.indexOf('.') < 0) file += '.html';
    var url = 'https://migabuilder.com/' + file;
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = url;
      document.head.appendChild(canonical);
    } else {
      url = canonical.href;
    }
    var page = location.pathname.toLowerCase();
    var category = /video|audio|music|cartoon|media|clip|screen|record/.test(page) ? 'MultimediaApplication' :
      /image|paint|design|logo|palette|background|cad|3d/.test(page) ? 'DesignApplication' :
      /exam|flashcard|reasoning|pattern|strength|big-five|map|atlas|alphabet/.test(page) ? 'EducationalApplication' :
      /code|app|model|bug|website/.test(page) ? 'DeveloperApplication' :
      /invoice|contract|cv|form|meet|project|post/.test(page) ? 'BusinessApplication' : 'UtilitiesApplication';
    var schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: title,
      description: description,
      url: url,
      applicationCategory: category,
      operatingSystem: 'Any modern web browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
    document.head.appendChild(schema);
  }

  // Hand-off from Music Forge ("Use it in …"): the finished track waits in IndexedDB and is put
  // into this page's own audio file input, exactly as if the visitor had chosen the file.
  var AUDIO_INPUT = { 'clip-forge': 'musicInput', 'video-forge': 'soundInput', 'merge-forge': 'soundInput', 'game-forge': 'audioUploadInput', 'audio-forge': 'file', '3d-cartoon': 'musicInput', 'cartoon-forge': 'musicInput', '3d-game-forge': 'musicInput' };
  var handoffPage = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  if (/[?&]handoff=audio\b/.test(location.search) && AUDIO_INPUT[handoffPage] && window.indexedDB && window.DataTransfer) {
    var takeAudio = function () {
      var req = indexedDB.open('miga-handoff', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = function () {
        var db = req.result, tx = db.transaction('files', 'readwrite'), store = tx.objectStore('files'), get = store.get('audio');
        get.onsuccess = function () {
          var item = get.result, input = document.getElementById(AUDIO_INPUT[handoffPage]);
          if (!item || !item.blob || !input) return;
          store.delete('audio');
          var dt = new DataTransfer();
          dt.items.add(new File([item.blob], item.name || 'music.wav', { type: item.blob.type || 'audio/wav' }));
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          var note = document.createElement('div');
          note.setAttribute('role', 'status');
          note.textContent = '🎵 Your Music Forge track "' + (item.name || 'music') + '" was added here.';
          note.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;background:#0E2A47;color:#EDEAE0;border:1px solid #6FD1E0;padding:10px 16px;border-radius:6px;font:600 14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:90vw';
          document.body.appendChild(note);
          setTimeout(function () { note.remove(); }, 6000);
          var label = input.id && document.querySelector('label[for="' + input.id + '"]');
          if (label && label.scrollIntoView) label.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (history.replaceState) history.replaceState(null, '', location.pathname);
        };
        tx.oncomplete = function () { db.close(); };
      };
    };
    // Wait until the page's own scripts have attached their listeners.
    window.addEventListener('load', function () { setTimeout(takeAudio, 400); });
  }

  // Offline support. Registration failures (private windows, old browsers) are harmless.
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
})();
