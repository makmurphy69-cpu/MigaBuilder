(function () {
  "use strict";

  // Count anonymous tool opens only. No cookies, identifiers, IP hashes,
  // customer content, answers, files, or device details are sent.
  try {
    var endpoint = window.__VISITS_URL_OVERRIDE || "https://migabuilder-visits.makmurphy69.workers.dev";
    var page = location.pathname.split("/").pop() || "index.html";
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
