(function () {
  "use strict";

  // Count anonymous tool opens and tool actions only. No cookies, identifiers,
  // IP hashes, customer content, answers, files, or device details are sent.
  //
  // Not counted, so the Site Visits numbers reflect real visitors:
  // - the owner's own browsers (any browser that has loaded the stats on
  //   visits.html, or set the "don't count me" switch there),
  // - refreshes and back/forward navigations (page views only),
  // - opening the same page again in the same tab session (page views only).
  //
  // An "action" is a real use of a tool: downloading a result, copying it, or
  // sharing it (detected automatically), or a tool calling
  // window.MigaUsage.action("what-happened") itself. Only the page name and the
  // aggregate event type "tool_action" are sent; the label stays in the browser.

  var endpoint = window.__VISITS_URL_OVERRIDE || "https://migabuilder-visits.makmurphy69.workers.dev";
  var page = location.pathname.split("/").pop() || "index.html";

  var excluded = false;
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) excluded = true;
    try {
      if (localStorage.getItem("migabuilderVisitsStatsKey") || localStorage.getItem("migabuilderNoCount")) excluded = true;
    } catch (e) { /* storage blocked: keep counting */ }
  } catch (e) { excluded = true; }

  function send(path, data) {
    var body = JSON.stringify(data);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint + path, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch(endpoint + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* analytics must never interfere with a tool */ }
  }

  // One action per short burst, so a single click that both downloads and
  // calls MigaUsage.action() (or a batch of downloads) counts once.
  var ACTION_GAP_MS = 3000;
  var lastAction = 0;

  function action() {
    try {
      if (excluded) return;
      var now = Date.now();
      if (now - lastAction < ACTION_GAP_MS) return;
      lastAction = now;
      send("/event", { page: page, event: "tool_action" });
    } catch (e) { /* analytics must never interfere with a tool */ }
  }

  window.MigaUsage = { action: action };

  // Page view.
  try {
    if (!excluded) {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      var repeat = nav && (nav.type === "reload" || nav.type === "back_forward");
      if (!repeat) {
        var seen = false;
        try {
          var seenKey = "migabuilderCounted:" + page;
          seen = !!sessionStorage.getItem(seenKey);
          if (!seen) sessionStorage.setItem(seenKey, "1");
        } catch (e) { /* storage blocked: keep counting */ }
        if (!seen) send("/hit", { page: page });
      }
    }
  } catch (e) {
    // Analytics must never interfere with a tool.
  }

  // Automatic action detection. Every wrapper calls the original first-class
  // behaviour unchanged; counting is a side effect that can never throw.
  if (excluded) return;

  try {
    // Downloads started from code: link.download = "x.png"; link.click();
    var anchorProto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    var originalClick = anchorProto && anchorProto.click;
    if (originalClick) {
      anchorProto.click = function () {
        try { if (this.hasAttribute("download")) action(); } catch (e) { /* ignore */ }
        return originalClick.apply(this, arguments);
      };
    }
  } catch (e) { /* ignore */ }

  try {
    // Downloads from a visible <a download> link the visitor taps.
    document.addEventListener("click", function (event) {
      try {
        var link = event.target && event.target.closest && event.target.closest("a[download]");
        if (link) action();
      } catch (e) { /* ignore */ }
    }, true);
  } catch (e) { /* ignore */ }

  try {
    // Copying a result to the clipboard.
    var clipProto = window.Clipboard && Clipboard.prototype;
    ["writeText", "write"].forEach(function (name) {
      var original = clipProto && clipProto[name];
      if (typeof original !== "function") return;
      clipProto[name] = function () {
        action();
        return original.apply(this, arguments);
      };
    });
  } catch (e) { /* ignore */ }

  try {
    // Sharing a result with the system share sheet.
    if (typeof navigator.share === "function") {
      var originalShare = navigator.share;
      navigator.share = function () {
        action();
        return originalShare.apply(navigator, arguments);
      };
    }
  } catch (e) { /* ignore */ }
})();
