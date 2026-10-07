(function () {
  "use strict";

  // Count anonymous tool opens only. No cookies, identifiers, IP hashes,
  // customer content, answers, files, or device details are sent.
  //
  // Not counted, so the Site Visits numbers reflect real visitors:
  // - the owner's own browsers (any browser that has loaded the stats on
  //   visits.html, or set the "don't count me" switch there),
  // - refreshes and back/forward navigations,
  // - opening the same page again in the same tab session.
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    try {
      if (localStorage.getItem("migabuilderVisitsStatsKey") || localStorage.getItem("migabuilderNoCount")) return;
    } catch (e) { /* storage blocked: keep counting */ }

    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav && (nav.type === "reload" || nav.type === "back_forward")) return;

    var page = location.pathname.split("/").pop() || "index.html";
    try {
      var seenKey = "migabuilderCounted:" + page;
      if (sessionStorage.getItem(seenKey)) return;
      sessionStorage.setItem(seenKey, "1");
    } catch (e) { /* storage blocked: keep counting */ }

    var endpoint = window.__VISITS_URL_OVERRIDE || "https://migabuilder-visits.makmurphy69.workers.dev";
    var body = JSON.stringify({ page: page });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint + "/hit", new Blob([body], { type: "text/plain" }));
    } else {
      fetch(endpoint + "/hit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true
      }).catch(function () {});
    }
  } catch (e) {
    // Analytics must never interfere with a tool.
  }
})();
