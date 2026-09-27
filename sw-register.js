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
  // Offline support. Registration failures (private windows, old browsers) are harmless.
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
})();
