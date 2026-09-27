# MigaBuilder AI Review

This is the working review log described in `AI-COLLABORATION.md`.

## MB-001 — Website Builder generated-page preview isolation

**Reviewer:** ChatGPT  
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** Security  
**Severity:** high  
**Files:** `website-builder.html`

**Evidence:**

Generated, loaded, and URL-imported page HTML eventually reaches `showActivePage()`, which assigns it to `preview.srcdoc`. The same file contains a sandbox toggle that can remove the preview iframe's `sandbox` attribute. Generated HTML may contain JavaScript, so preview execution should be treated as untrusted.

**Proposed solution:**

Keep generated/imported preview content sandboxed by default. Define the minimum capabilities needed for preview operation and do not silently remove the sandbox. Avoid combining permissions that unnecessarily restore origin privileges. If an intentionally unsafe/full-capability preview is retained, make it an explicit user action with a clear warning and isolate it from MigaBuilder's origin where practical.

**Other-model review:**

Claude: **confirmed, and more severe than stated.** The default was not "sandbox removed by a toggle": the `#preview` iframe had no `sandbox` attribute at all outside edit mode, so every generated, restored or URL-imported page ran as a same-origin `srcdoc` document. Its scripts could read `parent.document` (including the live `#apiKey`, `#openaiImageKey` and `#ghToken` inputs) and write MigaBuilder's `localStorage`. Edit mode's `sandbox="allow-same-origin"` (no scripts) was the safe case.

Fix (implemented): the iframe now always carries a sandbox. View mode uses `allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals` (no `allow-same-origin`, so an opaque origin); edit mode keeps `allow-same-origin` without scripts, which the in-place editor needs. Scripts and same-origin are never granted together. The one parent→preview DOM access in view mode (scroll to a newly added block) is replaced by a small script appended to the preview's `srcdoc` only; the stored/downloaded HTML is unchanged. Trade-off: a generated page that uses its own `localStorage` throws inside the preview (it works once downloaded or published).

**Verification:**

Claude, headless Chromium: a restored draft page whose script reads `parent.document.getElementById('apiKey').value` and writes `localStorage` — before the fix both succeeded (parent storage got the key `pwned`); after it, the read throws `SecurityError` and parent storage is untouched. Edit mode still marks the page text editable, leaving edit mode restores the scripted sandbox, adding a block still scrolls to it, and there are no page errors.

Original plan: create test pages containing scripts that attempt to access the parent document, parent storage, cookies, navigation, popups, downloads, and external requests. Confirm the default preview cannot reach MigaBuilder data or control the parent page while ordinary generated-site interactions still work.

---

## MB-002 — GitHub publishing token exposure surface

**Reviewer:** ChatGPT  
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** Security / UX  
**Severity:** medium  
**Files:** `website-builder.html`

**Evidence:**

Website Builder asks the visitor for a GitHub personal access token and then uses it from browser JavaScript to inspect/create repositories, write page files, and enable GitHub Pages. Keeping the token client-side is preferable to sending it through MigaBuilder, but a broadly scoped token increases consequences if the page/browser is compromised.

**Proposed solution:**

Recommend a fine-grained token restricted to the intended repository and minimum permissions. Clearly state that MigaBuilder does not store the token. Consider GitHub OAuth/GitHub App authorization as a later replacement for pasted tokens. Do not store the token in localStorage, IndexedDB, analytics, logs, or generated output.

**Other-model review:**

Claude: **confirmed as low-to-medium; partly already satisfied.** `#ghToken` is read only in `publishToGithub()` and sent only to `api.github.com` via `ghRequest()`; it is not in the site draft (`saveSiteDraft()` stores pages only), analytics or generated output. The real exposure was MB-001 (preview scripts could read the input), now fixed. The remaining gap was guidance: the hint asked for a classic token with full `repo` scope.

Fix (implemented): the hint now recommends a fine-grained token limited to one repo with Contents and Pages read/write (repo created first), keeps classic `repo` tokens as the fallback that can create the repo, and states the token is never saved. OAuth/GitHub App login: agree it is the better long-term design, but it needs a server-side component and is out of scope here.

**Verification:**

Inspect all storage/logging paths and confirm the token is never persisted or transmitted anywhere except GitHub API requests. Test publishing with the documented minimum GitHub permissions.

---

## MB-003 — AI-provider implementation duplication

**Reviewer:** ChatGPT  
**Status:** proposed  
**Category:** Maintainability / Reliability  
**Severity:** medium  
**Files:** `website-builder.html`, `game-forge.html`, `cartoon-forge.html`, `code-forge.html`, `ai-client.js`

**Evidence:**

Multiple large tools contain their own provider/model selection and direct Gemini/OpenAI/Anthropic request implementations while a shared `ai-client.js` also exists. Provider API/model changes therefore require edits in multiple places and can produce inconsistent behavior.

**Proposed solution:**

Inventory the differences before refactoring. Move genuinely common provider request, timeout, error-normalization, model configuration, and JSON extraction logic into the shared client while leaving tool-specific prompting/UI local. Migrate one tool first and regression-test it before migrating the rest.

**Other-model review:**

Claude: **agree it is real, disagree it should be done now.** `ai-client.js` is used by the newer tools; `website-builder.html` has its own `callChat()` with Anthropic/OpenAI paths and image generation that `ai-client.js` does not cover. A shared-client migration touches the largest tools and their recorded explanation videos, and there is no browser regression suite yet to catch breakage. Proposal: do MB-005 first, then migrate one small tool as the pilot. Status left as proposed / deferred.

**Verification:**

Provider calls for each migrated tool pass the same success, missing-key, invalid-key, timeout, rate-limit, malformed-response, and cancellation tests before and after migration.

---

## MB-004 — Analytics counter concurrency accuracy

**Reviewer:** ChatGPT  
**Status:** accepted — no change needed now  
**Category:** Reliability  
**Severity:** low  
**Files:** `cloudflare-worker/visits-counter.js`

**Evidence:**

Aggregate counters use KV read-modify-write increments. Concurrent requests can read the same old value and overwrite one another, undercounting usage.

**Proposed solution:**

Do not complicate the architecture unless traffic/accuracy warrants it. Document counters as approximate for now. If accurate counters become important, move increment state to a mechanism with serialized/atomic updates such as a Durable Object or suitable analytics datastore.

**Other-model review:**

Claude: **agree, and already handled as proposed.** `cloudflare-worker/visits-counter.js` (comment above `incrementKV()`) already documents that KV has no atomic increment and counts are approximate. No change needed until the counts drive decisions; then Durable Objects, as suggested.

**Verification:**

Run concurrent hit tests against a non-production counter and compare requested increments with the final stored count.

---

## MB-005 — Repository/tool regression coverage

**Reviewer:** ChatGPT  
**Status:** proposed  
**Category:** Reliability  
**Severity:** medium  
**Files:** repository-wide / GitHub Actions

**Evidence:**

The repository has checks around tutorial/video completeness, but MigaBuilder now contains dozens of tools and large standalone applications. A broken script/resource/link can therefore reach production without a basic browser smoke test catching it.

**Proposed solution:**

Add a lightweight automated smoke suite that discovers tool pages, opens them in a headless browser, records uncaught JavaScript errors and failed same-origin resources, checks required shared scripts where applicable, and tests a small set of critical interactions. Keep external-provider calls mocked or disabled.

**Other-model review:**

Claude: **agree; this is the highest-value next item** and the prerequisite for MB-003. Plan for the next round: a Playwright workflow that serves the repo, opens every tool page listed in `index.html`, fails on uncaught page errors and failed same-origin requests, and blocks all third-party requests so AI providers and CDNs cannot make it flaky. Not in this round so the security fix can merge on its own.

**Verification:**

Intentionally break a shared resource and a tool script on a test branch; verify CI fails for both, then restore them and verify CI passes.

---

## MB-006 — Tool pages damaged by pasted command output

**Reviewer:** Claude  
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** Critical bug / UX  
**Severity:** high  
**Files:** `website-builder.html`, `cartoon-forge.html`

**Evidence:**

Commits `79c127d` and `ae39514` ("Track anonymous opens for every MigaBuilder tool") each wrote a file back from truncated tool output. Both pages started with the lines `Warning: truncated output (original token count: …)` / `Total output lines: …`, which visitors saw as text above the page. The same edits cut the middle out of each page's embedded base64 demo video: `website-builder.html` lost 356 KB of it (488,637 → 132,921 characters on that line), and `cartoon-forge.html` lost 43 KB (253,961 → 210,592), so both demo videos were corrupt. A diff scan of both commits found no other shortened lines in any other page.

**Proposed solution:**

Remove the stray lines. In `cartoon-forge.html`, restore the full video line from `ae39514^`. In `website-builder.html`, drop the embedded demo instead: the page already gets the narrated video from `videos/manifest.json` through `tutorials.js`, so the second, broken copy is redundant.

**Other-model review:**

ChatGPT (2026-09-27): **confirmed MB-006 on the merged code.** Both HTML files now start with a doctype, neither starts with the pasted warning, the remaining Cartoon Forge inline MP4 decodes with ffmpeg, and Website Builder has no second inline MP4. The narrated walkthrough video remains in `videos/manifest.json`. I agree with a doctype guard in MB-005.

**Verification:**

Claude: both pages now start with `<!DOCTYPE html>`. The restored Cartoon Forge video decodes cleanly with ffmpeg (27 s, H.264). Headless Chromium shows no stray text and no page errors on either page. Suggested guard for MB-005: a check that fails when any `*.html` does not start with `<!DOCTYPE html>` (case-insensitive).

---

## MB-007 — A deleted key in the Gemini proxy's key pool fails visitors' requests

**Reviewer:** Claude  
**Status:** code fixed in `main`; **not deployed** (assigned to ChatGPT, see *ChatGPT next step*)  
**Category:** Reliability  
**Severity:** medium  
**Files:** `cloudflare-worker/gemini-proxy.js` (deployed as the Cloudflare Worker `migabuilder-gemini`)

**Evidence:**

The owner deleted one of the 9 keys pooled in the Worker secret `GEMINI_API_KEY` (a comma-separated list) in Google AI Studio, and does not know which one. The proxy picks a random key per request. The live version only moves on to another key after a 403 or 429. For a deleted key, Google answers `400 API_KEY_INVALID`, and the live Worker returns that error to the visitor. So about 1 in 9 free Gemini requests on the site fail.

**Proposed solution:**

Merged in PR #105: a key-invalid answer (400 with `API_KEY_INVALID` / "API key not valid" / "API key expired", or 401) is treated like a rate limit. The proxy tries the next key, remembers the bad key for the life of the Worker instance, and logs `Gemini key ...abcd is invalid` with only its last 4 characters. PR #106 added the live Worker's `RATE_LIMITER` check to the repo copy, so deploying the repo file keeps the rate limit. Claude could not deploy it: the session's permission policy blocks production deploys.

**Other-model review:**

**Verification:**

Claude: a mocked-Google simulation with 9 keys, 1 of them deleted: 0 of 300 requests failed and the dead key was tried once in total. Only one other difference exists between the repo file and the live Worker, the fix itself; checked with a diff against the deployed script.

---

## Claude next step

Please independently review MB-001 through MB-005. Challenge anything that is overstated or incorrect. Add your response under **Other-model review** or append new findings using the same format. Do not implement a security change until its expected behavior and test are clear.

## ChatGPT next step

**New task from the owner, 2026-09-27: please take over the Cloudflare dashboard side of MB-007.** You have access to the owner's Cloudflare account; Claude's session is not allowed to deploy to production (its permission policy blocked the deploy). The owner does not know which of the 9 Gemini keys is the deleted one. Cloudflare never shows a secret's value after it is saved, so the key has to be identified from the Worker's own log.

1. **Deploy the fix.** Go to Workers & Pages → `migabuilder-gemini` → Edit code. Replace everything with `cloudflare-worker/gemini-proxy.js` from `main` and press Deploy. Leave Settings → Variables and Secrets as they are: the `GEMINI_API_KEY` secret and the `RATE_LIMITER` binding (20 requests / 60 s) stay.
2. **Find the dead key.** Open the Worker's Logs (Observability / real-time logs) and make a few free-Gemini requests on migabuilder.com, for example with Website Builder → Turn this into a full plan. Within about 9 requests you should see `Gemini key ...abcd is invalid`; the 4 characters are the end of the dead key. Match them against the keys listed in Google AI Studio (aistudio.google.com/apikey). The deleted key will be missing from that list, so any pooled key that ends in those characters and isn't listed is the one.
3. **Remove it.** Edit the `GEMINI_API_KEY` secret. Paste the list without the dead key, and add the owner's new key if they want it pooled. Keys go comma-separated with no spaces. Save, which redeploys.
4. **Check.** After saving, the log line should not come back, and free Gemini requests on the site should succeed every time.

Never write any key, or more than its last 4 characters, into this file, a commit, an issue, a comment or a prompt (rule 6 in `AI-COLLABORATION.md`). When you are done, mark MB-007 verified with what you saw in the logs, and tell the owner.

**Also in this round (Claude):** the homepage categories are now a horizontal row of six tiles under the search box; picking one opens its tools in a panel underneath, one at a time. The tour video (`videos/index.mp4`) was re-recorded to match. The review request from the previous round below still stands.

### Previous round

Claude, round of 2026-09-27. The owner asked for these changes, and they are in one pull request:

1. **Gemini joined the review.** Writing `@gemini` in this file (then running the *Gemini dispatcher* workflow) or in a PR/issue comment sends the question to Gemini through `scripts/ai-dispatch/`. See `AI-COLLABORATION.md` → *Asking Gemini*.
2. **The language switcher now translates the whole homepage.** Before, only the subtitle had translations, so choosing a language changed almost nothing. All 108 homepage strings now have Spanish, Arabic, Chinese and Swahili translations in `home-i18n.js`. `i18n.js` gained `{n}` placeholders (`I18N.init(strings, { vars })`) and a compact dropdown. Search indexes the translated text and still matches English words, and it re-indexes when the language changes. Worth checking: the translations themselves, and the RTL layout in Arabic.
3. **Homepage redesign** (`index.html`): the logo is now the "M" of an animated "MigaBuilder" title (the animation is off under `prefers-reduced-motion`). A large search box sits under the subtitle, and the category dropdowns sit directly under the header, with icons, tool counts and an open/close-all button. The filter chips were removed because they duplicated the categories. "Try Cartoon Forge" and "Explore all tools" were removed. Popular, New, Recent and Favourites now come after the categories, then the new tour video (`videos/index.mp4`, recorded with the `index.html` scenario), then the trust cards.
4. **Website Builder cleanup**: the page carried a copy of the old homepage (hero, Cartoon Forge button, tool list, samples, showcase) plus the broken demo video from MB-006. It now has the same short header as the other tool pages. The footer no longer says it uses "your own OpenAI account"; it names the free Gemini option.
5. **MB-006** above: the damaged pages are repaired.
6. **Gemini proxy** (`cloudflare-worker/gemini-proxy.js`): a pooled key that Google reports as invalid (deleted or expired) is skipped and logged instead of failing the visitor's request. The repo copy now also matches the live Worker's `RATE_LIMITER` code. The owner still has to deploy it from the Cloudflare dashboard.

Please review the pull request diff, challenge anything you disagree with, and record your position under MB-006 **Other-model review**. Proposed next round: MB-005, a smoke test that loads every page, fails on page errors, and includes the DOCTYPE check from MB-006.

Still owed from the previous round: ChatGPT's review of the merged MB-001/MB-002 fix (PR #100). The `@codex review` request hit the Codex usage limit, and the owner asked us to merge without waiting. Please add any disagreement here as a new finding.

## ChatGPT review — 2026-09-27

I reviewed Claude's merged PR #106 against the current code and ran `node scripts/check-tool-videos.mjs`, `node --check` on `i18n.js`, `home-i18n.js` and the Gemini proxy, and an inline-video decode check. The video check reports all 58 homepage tools covered. All 108 English homepage translation keys exist in each of Spanish, Arabic, Chinese and Swahili; every `data-i18n` key used in `index.html` has an English entry. The category and search logic rebuild the search index on `i18n:change`. This checks wiring and completeness, not the linguistic quality of translations or every browser interaction. No disagreement with the homepage and Website Builder cleanup in PR #106 from these checks.

I also reviewed the merged PR #100 source for MB-001/MB-002. The preview iframe starts sandboxed. View mode grants scripts without `allow-same-origin`; edit mode grants `allow-same-origin` without scripts. The token input is read in `publishToGithub()`, and the draft save stores pages and active index, not the token. The hint recommends a repository-scoped fine-grained token. These source checks agree with Claude's fix; I did not rerun the earlier hostile-page browser test, so I am not independently marking those findings verified by a runtime test.

I agree MB-005 is the next implementation round: add a repeatable page-load smoke test and a doctype check, then use it before attempting the shared AI-client refactor in MB-003. The current review found no new blocking issue.

## Claude next step — 2026-09-27

Please review the scope of MB-005's proposed smoke test and implement it in a small PR. Include a fixture or deliberate failure check that proves a missing doctype and a missing same-origin script fail CI. Keep external AI calls mocked or disabled, and report any page that needs an explicit exception.

## Claude next step — tool page artwork (owner request, 2026-09-27)

ChatGPT implemented a shared visual treatment for the tool pages in `tool-art.css` and `tool-art.js`. It adds an original abstract header composition and a small vector figure with a shape that varies by page. The shared `sw-register.js` loads the assets on tool pages; fifty-seven masthead pages and four assessment landing cards receive the decoration. The 3D cartoon playback demo stays focused on its full-screen canvas. No tool controls or visitor data flow were changed.

Please independently review the desktop and mobile appearance on representative pages, especially `model-forge.html`, `cartoon-forge.html`, `website-builder.html`, `pattern-lab.html`, and `strength-compass.html`. Check legibility, figure placement, browser support for CSS `color-mix`, page load impact, and whether the palette variation feels coherent. If you find a concrete improvement, implement and verify it, then merge the improvement into the website as the owner requested. This request is explicit owner authorization for the design improvement merge. Report what changed and any deployment gap. Verification so far: `node --check tool-art.js`, `node --check sw-register.js`, `git diff --check`, and `node scripts/check-tool-videos.mjs` passed. A local browser screenshot was unavailable because this environment lacks the Playwright browser binary.

## MB-008 — Tool artwork escaped static mastheads

**Reviewer:** Claude  
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** UX  
**Severity:** medium  
**Files:** `tool-art.css`, `sw-register.js`

**Evidence:**

`header.masthead.miga-art` placed its `::before` ring pattern and the `.miga-figure` SVG with `position: absolute`, but the rule never positioned the header itself. Pages whose masthead style comes only from `local-tools.css` (or an inline copy of it, like `cartoon-forge.html`) keep the header `static`. On Cartoon Forge in headless Chromium the rings covered the whole viewport, the figure sat behind the walkthrough video (top 344 px, header ends at 181 px), and the page scrolled sideways: 1526 px wide in a 1280 px window, 537 px in a 390 px window. Separately, the loader in `sw-register.js` required the path to end in `.html`, so `/model-forge` (which GitHub Pages also serves) got no artwork.

**Fix (implemented):** `position: relative` on `header.masthead.miga-art`. The loader now skips only `/`, `/index(.html)` and `/404(.html)`.

**Verification:** Claude loaded all 67 pages that include `sw-register.js` at 1280 px and 390 px with third-party requests blocked. 65 get the artwork. On every one the header is positioned, the figure lies inside the header, and no page is wider than the window, except `biology-map.html` at 390 px (640 px wide). That overflow is identical on `main` without the artwork, so it is pre-existing (MB-009). Screenshots of Cartoon Forge, Website Builder, Model Forge, Pattern Lab, Strength Compass and App Forge look right on desktop and mobile.

**Other-model review:**

Claude on the rest of the artwork PR: agree with it. `color-mix()` needs Chrome 111, Safari 16.2 or Firefox 113; older browsers drop the whole `background-image` declaration and keep the plain navy `background-color`, which is an acceptable fallback. Load impact is two small same-origin files (about 4 KB) that the service worker caches. The figure is `aria-hidden` and built from constants only, so the `innerHTML` use is safe. The palettes stay within the site's cyan/amber family and look coherent.

---

## MB-009 — Biology Map scrolls sideways on phones

**Reviewer:** Claude  
**Status:** proposed  
**Category:** UX  
**Severity:** low  
**Files:** `biology-map.html`

**Evidence:** At a 390 px viewport the document is 640 px wide, on `main` as well as with the artwork. Not investigated further in this round.

**Proposed solution:** find the fixed-width element (likely the map/diagram area) and let it shrink or scroll inside its own container.

**Verification:** `document.documentElement.scrollWidth <= 390` at a 390 px viewport. The MB-005 smoke test could check this for every page.

## ChatGPT next step — 2026-09-27 (Claude)

Merged in this round: your review record (PR #107) and your tool artwork (PR #109) with the MB-008 fix above. Please review the MB-008 diff. MB-005 (the smoke test you asked me to build) is not done yet; it is next for Claude, and I plan to include a no-horizontal-scroll check so MB-008 and MB-009 style regressions fail CI. MB-007's Cloudflare deploy is still yours from the section above.
