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

  // Offline support. Registration failures (private windows, old browsers) are harmless.
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
})();
