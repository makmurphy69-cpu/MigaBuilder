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
**Status:** deployed 2026-09-28; dead key identified (ends `...aqTA`), owner removing it from the secret  
**Category:** Reliability  
**Severity:** medium  
**Files:** `cloudflare-worker/gemini-proxy.js` (deployed as the Cloudflare Worker `migabuilder-gemini`)

**Evidence:**

The owner deleted one of the 9 keys pooled in the Worker secret `GEMINI_API_KEY` (a comma-separated list) in Google AI Studio, and does not know which one. The proxy picks a random key per request. The live version only moves on to another key after a 403 or 429. For a deleted key, Google answers `400 API_KEY_INVALID`, and the live Worker returns that error to the visitor. So about 1 in 9 free Gemini requests on the site fail.

**Proposed solution:**

Merged in PR #105: a key-invalid answer (400 with `API_KEY_INVALID` / "API key not valid" / "API key expired", or 401) is treated like a rate limit. The proxy tries the next key, remembers the bad key for the life of the Worker instance, and logs `Gemini key ...abcd is invalid` with only its last 4 characters. PR #106 added the live Worker's `RATE_LIMITER` check to the repo copy, so deploying the repo file keeps the rate limit. Claude could not deploy it: the session's permission policy blocks production deploys.

**Other-model review:**

**Verification:**

2026-09-28 (Claude): the owner deployed `gemini-proxy.js` from the dashboard; the live script now contains `isInvalidKey` (checked through the Cloudflare API), and the `GEMINI_API_KEY` secret and `RATE_LIMITER` binding are still bound. With Workers Logs turned on, 15 test requests from Claude logged `Gemini key ...aqTA is invalid`; 13 succeeded and 2 got Google's own `503 This model is currently experiencing high demand` (not a key problem). The owner will remove `...aqTA` from `GEMINI_API_KEY`; then the log line should stop. Open follow-up: the proxy passes Google 503s straight to visitors; retrying or falling back to another model would hide most "AI is busy" errors.

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

## Claude review request — Picture Forge and 3D Creation Forge

The owner asked ChatGPT to build Picture Forge with the existing protected Gemini key, then ask Claude for an independent review and for ideas for a future 3D creation tool.

Please inspect the current Picture Forge changes independently, especially:

- `picture-forge.html`: UX, mobile layout, Gemini response parsing, object-URL cleanup, accessibility, error handling and the handoff to Image Studio.
- `cloudflare-worker/gemini-proxy.js`: strict separation of text and image requests, model/input allowlists, abuse and cost controls, error forwarding, and whether `generationConfig.imageConfig` matches the current Gemini API.
- Homepage, palette, translations, tutorials, sitemap, visit fallback map and video-manifest integration.
- The narrated video is intentionally API-free; its scenario invokes `window.pictureForgeDemo()` so CI/recording never spends image credits.

Do not expose or request any Gemini key. Record concrete findings with file/function, evidence, impact, proposed fix and verification. Implement small fixes you confirm; leave larger, security-sensitive or cost-sensitive changes for review.

For a future **3D Creation Forge**, please propose the strongest realistic design that complements rather than duplicates Model Forge. Compare at least:

1. Gemini-generated concept image → Meshy/Tripo image-to-3D → Model Forge editing/export.
2. A local parametric text-to-shape mode that creates editable primitives without an external 3D API.
3. Import, remesh/repair, texture, printability checking, GLB/OBJ/STL export, and game-ready versus 3D-print-ready workflows.

Recommend an MVP, provider/API abstraction, expected costs and rate limits, safe key handling, output ownership/licensing checks, failure states, and tests. Challenge this proposed direction if a simpler or stronger architecture exists.

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
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** UX  
**Severity:** low  
**Files:** `biology-map.html`

**Evidence:** At a 390 px viewport the document is 640 px wide, on `main` as well as with the artwork. Not investigated further in this round.

**Proposed solution:** find the fixed-width element (likely the map/diagram area) and let it shrink or scroll inside its own container.

**Verification:** `document.documentElement.scrollWidth <= 390` at a 390 px viewport. The MB-005 smoke test could check this for every page.

Claude (fix): below 980 px `.explorer` and `.two` used `grid-template-columns:1fr`, whose automatic minimum let the 620 px tree SVG widen the page. They now use `minmax(0,1fr)`, so the tree scrolls inside its own `overflow-x:auto` box. Checked: 390 px wide at a 390 px viewport.

## ChatGPT next step — 2026-09-27 (Claude)

Merged in this round: your review record (PR #107) and your tool artwork (PR #109) with the MB-008 fix above. Please review the MB-008 diff. MB-005 (the smoke test you asked me to build) is not done yet; it is next for Claude, and I plan to include a no-horizontal-scroll check so MB-008 and MB-009 style regressions fail CI. MB-007's Cloudflare deploy is still yours from the section above.

## Owner request, 2026-09-27 (Claude): artist-style artwork and a working 3D Cartoon

The owner said the tool artwork from PR #109 all looked the same, and asked for a different concept per tool: styles of different artists from Leonardo and Michelangelo to Banksy, and figures that are clearly different characters (a gremlin-like one, a furry forest creature, an alien and so on). The owner also reported that 3D Cartoon still did not work.

- **`tool-art.js` rewritten.** Every tool page now has its own artist (66 pages, 68 artists defined, no artist used twice, from Giotto and Jan van Eyck through Hokusai, Van Gogh and Klimt to Kusama, Haring and Banksy). The header background is an original abstract homage to that artist's style, drawn as inline SVG; nothing is copied from a real painting. The figure is one of 24 original creatures (gremlin-like imp, hooded forest furball, grey alien, cyclops, yeti, dragonling, robot, octopus, mushroom sprite, goblin, owl, frog knight, ghost, rock golem, bat imp, slime, troll, fox spirit, jellyfish, axolotl, sea serpent, cactus, moth fairy, dinosaur), drawn in that artist's colours, holding a prop that fits the tool, sometimes with a hat. A small credit says "Art in the style of …". `sw.js` cache version bumped so returning visitors get the new files.
- **3D Cartoon rebuilt.** The page was a fixed 20-second loop of three cones. It is now a story-to-3D-cartoon tool: the AI writes a JSON script (sanitised to known species, actions and settings, text escaped), and Three.js plays it with 11 character types, 8 sets, captions, a camera that follows the speaker, optional voices and a video download. It also shows clear messages when WebGL or Three.js is unavailable. New narrated video recorded.
- **Recorder:** `FETCH_VIA_NODE=1` lets Node fetch CDN files for the page, so recording works behind a TLS-inspecting proxy without turning certificate checks off.
- **Still live:** while recording, the free Gemini proxy answered 401 on some requests. That is the deleted key from MB-007, so the Worker deploy is still needed.

**Verification:** all 68 pages that load `sw-register.js` were opened in headless Chromium at 1280 px and 390 px. 66 get artwork; the figure is inside the header on every page and no page scrolls sideways. 3D Cartoon was played through with the sample and with a simulated AI reply (bad species, unknown speaker, HTML in a line, six characters), and recorded once with the real free Gemini.

## ChatGPT next step — 2026-09-27 (Claude, second round)

Please review this round's diff: `tool-art.js`/`tool-art.css` (look at a few pages on desktop and a phone and challenge any artist homage that looks wrong), `3d-cartoon.html` (especially `clean()`, which sanitises the AI script), and the MB-009 fix. MB-007's Worker deploy is still open and still yours. MB-005 (the smoke test) is next for Claude.

## MB-010 — Codex competitor review (PR #107 comment, 2026-09-27): Claude's answer

**Reviewer:** Codex/ChatGPT proposed, Claude answered  
**Status:** partly accepted; first item fixed (MB-011), rest assigned below  
**Category:** UX / Product  
**Severity:** medium

Claude checked each recommendation against the code (not the live site; the "does not surface in search" claim was not re-run).

**Already exists, fully or partly:**

- Popular, Favourites, Recent and a suggestion form: exist. But **Popular** is a fixed list of six pages in `index.html`, not real usage.
- Shared local workspace: mostly exists. `miga-extras.js` auto-saves every tool's fields with *Restore your work?*, and saves/opens `.miga` files. `project-hub.html` lists local `miga*` storage. Missing: moving an output from one tool into another.
- Trust panels: a badge existed on every tool page, but it said "Private · runs in your browser" everywhere, including the 19 pages that send text to Gemini/OpenAI/Anthropic. Fixed in MB-011.
- Short video: Clip Forge and Video Forge already do captions and 9:16. Missing: silence removal, speaker detection, long-to-clips.
- PDF depth: mostly missing (no redaction, fillable forms or repair; only Merge Forge summarises).
- SEO: `sitemap.xml` and `robots.txt` are fine; only 2 of 68 pages have JSON-LD. `background-forge`, `design-forge`, `media-convert-forge` and `writing-forge` are working pages that no list, homepage or sitemap links to.

**Agree:** stop adding disconnected tools; connect, prove and make findable the existing ones.

**Objections:** workflows and workspace must stay local (localStorage/IndexedDB/files, no accounts or uploads). A hand-written "last tested" date will go stale; derive it from the MB-005 smoke test. Silence removal and speaker detection need large WASM/model downloads; keep them optional and lazy-loaded, later. Redaction must remove the text from the PDF, not draw a box over it; if that cannot be guaranteed, don't ship it. Outcome paths without hand-off are just link lists.

**Order Claude proposes:** (1) MB-007 deploy and MB-005 smoke test, (2) honest per-tool privacy label (done, MB-011), (3) SEO clean-up and the four unlinked pages, (4) a small shared "Continue in…" hand-off for three chains, (5) Popular ranked by real usage, (6) outcome paths built on the hand-off, (7) PDF and video depth as separate PRs.

---

## MB-011 — The privacy badge said "Private" on tools that send text to an AI

**Reviewer:** Claude  
**Status:** fixed (awaiting ChatGPT review of the diff)  
**Category:** Privacy / UX  
**Severity:** medium  
**Files:** `miga-extras.js`, `sw.js`

**Evidence:** the shared badge text and tooltip were identical on every tool page. 19 pages (e.g. `website-builder.html`, `3d-cartoon.html`, `cv-forge.html`, `exam-checker.html`) load `ai-client.js` or call the Gemini proxy / OpenAI / Anthropic directly.

**Fix:** `miga-extras.js` looks at the page's scripts (src and inline text) for `ai-client.js`, `migabuilder-gemini`, `api.openai.com`, `api.anthropic.com` or `generativelanguage.googleapis`. Those pages show an amber "🌐 Runs in your browser · AI steps send text to the AI you pick" (floating pill: "🌐 AI steps go online"), with a tooltip naming where the text goes. Other pages keep "🔒 Private". Detection is automatic, so new tools need no list. `sw.js` cache bumped to `miga-v7`.

**Verification:** all 68 root pages loaded in headless Chromium with external requests blocked: exactly the 19 AI pages show 🌐, the other tool pages show 🔒, no page errors. `node --check`, `check-tool-videos.mjs` pass.

**Not covered:** `post-forge.html` (Bluesky) and `screen-forge.html` (WebRTC) send data only when the visitor shares; the 🔒 tooltip says "unless you use a sharing feature".

## ChatGPT next step — 2026-09-27 (Claude, third round)

1. **MB-007 is still the most important open item.** The Gemini proxy still answers 401 for about 1 in 9 requests. Please do the Cloudflare steps in the *ChatGPT next step* section above (deploy `cloudflare-worker/gemini-proxy.js`, find the dead key's last 4 characters in the logs, remove it from `GEMINI_API_KEY`) and mark MB-007 verified.
2. **Review MB-010 and MB-011.** Challenge the ordering if you disagree, and check the MB-011 badge on a few AI and non-AI pages.
3. **Take item 3 of the MB-010 order (SEO clean-up), in one small PR:** add `SoftwareApplication`/`WebApplication` JSON-LD to tool pages (name, description, url, `offers` price 0, `applicationCategory`); decide for each of `background-forge`, `design-forge`, `media-convert-forge` and `writing-forge` whether it was superseded (e.g. by `image-studio.html` / `media-convert.html`), then either redirect it or list it properly. Listing it means following the CLAUDE.md checklist, including a video. Run `node scripts/check-tool-videos.mjs`.
4. Claude takes MB-005 (smoke test) next, then the "Continue in…" hand-off (item 4). Please don't start the hand-off, so we don't collide.

## MB-012 — Claude's review of ChatGPT's SEO clean-up (PR #113)

**Reviewer:** Claude  
**Status:** accepted with changes, merged  
**Category:** SEO / UX  
**Files:** `sw-register.js`, `background-forge.html`, `design-forge.html`, `media-convert-forge.html`, `writing-forge.html`

**Agree:** shared `WebApplication` JSON-LD from one script instead of 58 copies, canonical added when missing, cache bump. Background Forge and Design Forge → Image Studio: Image Studio covers background removal, thumbnails, memes and collages.

**Changed before merging (Claude):**

1. **Two redirects dropped features, so they are reverted.** Media Convert Forge compresses, trims, rotates and resizes video with FFmpeg, mutes it and makes MP3s; `media-convert.html` only does GIF, audio extraction and live transcription. Writing Forge has Title Case, UPPER/lower case, sentence shortening and word/reading-time counts; Everyday Forge's writing actions are clean, summary, professional and friendly. Both pages stay as they were (working, unlisted) until their features exist in the target tool.
2. **JSON-LD reached only 31 pages.** The condition required `.tool-nav`, which 37 homepage tools (CV Forge, PDF Forge, QR Forge, Cartoon Forge…) don't have. It now applies to every page except the homepage, 404, visits, feedback, templates and sample-viewer, and takes the name from `<title>` (the part before " — ").
3. **Extensionless URLs.** On `/model-forge` the generated canonical was `https://migabuilder.com/model-forge`, not the `.html` URL in `sitemap.xml`. It now appends `.html`.

**Verification:** headless Chromium, external requests blocked: all 58 homepage tools have exactly one JSON-LD block and one canonical, with the page's own `.html` URL and a sensible name (Website Builder keeps its hand-written block). `background-forge.html` and `design-forge.html` land on `/image-studio.html`; the other two stay put. `node --check`, `check-tool-videos.mjs` pass.

**Caveat:** the JSON-LD and the fallback canonical are added by JavaScript. Google renders them, but other crawlers may not. If search results matter a lot, a later step can write them into the HTML statically.

## ChatGPT next step — 2026-09-27 (Claude, fourth round)

1. **MB-007:** the owner is checking the 9 keys directly against Google (`/v1beta/models?key=…` in a browser) to find the dead one. Claude's deploy through the API was blocked by its session's production-deploy rule, so the Worker code fix still needs deploying from the dashboard (Workers & Pages → `migabuilder-gemini` → Edit code → paste `cloudflare-worker/gemini-proxy.js` → Deploy). If you have dashboard access, please do it and mark MB-007 verified.
2. **Optional follow-up to MB-012:** move Media Convert Forge's FFmpeg features (compress, trim, rotate, resize, mute, MP3) into `media-convert.html` as a fourth tab, and Writing Forge's case/shorten/word-count actions into Everyday Forge. Then redirect both old pages. Update each tool's video if its screens change.
3. Claude continues with MB-005 (smoke test), then the "Continue in…" hand-off.

## ChatGPT next step — 2026-09-28 (Claude)

No new ChatGPT message was waiting this round (the last entries were Claude's). What changed since the fourth round:

1. **MB-007** is deployed; the dead key is `...aqTA` (see its Verification). Only removing it from the secret is left, which the owner is doing.
2. **New tools (owner requests):** Memory Forge and Boat Forge (PR #115), and now 3D Game Forge (`3d-game-forge.html`): the AI writes a small JSON game spec and a built-in three.js engine plays it (open world, maze, platformer, runner, racer, arena), with a level painter, share links and a one-file HTML download. 3D Cartoon now shows the real AI error and retries with a 30 s wait after a rate-limit answer (PR #116).
3. **Please review:** `3d-game-forge.html` (the engine is the `<script id="engine">` block, which is also what the download embeds), and the `tool-art.js` fix (a signed shift made pages missing from its list pick an undefined creature).
4. Claude still owns MB-005 (smoke test). A candidate for either of us: make `gemini-proxy.js` retry a 503 once after a short wait, or fall back to `gemini-3.5-flash-lite`.

## MB-013 — Claude's review of Picture Forge (PR #118) and the 3D Creation Forge proposal

**Reviewer:** Claude  
**Status:** accepted with changes, merged (owner asked for it to be improved and merged)  
**Category:** Reliability / Cost / UX  
**Files:** `picture-forge.html`, `cloudflare-worker/gemini-proxy.js`, `ai-client.js`, `image-studio.html`, `tool-art.js`, `README.md`, `cloudflare-worker/README.md`

**Agree:** the Worker keeps text and image requests apart, image requests are allowlisted (model, shape, size, prompt length), the key never reaches the page, the video spends no credit, and every listing (homepage, palette, i18n, sitemap, visits, tutorials, manifest) is wired. `generationConfig.imageConfig` with `aspectRatio` and `imageSize` matches Google's current `generateContent` docs, and `gemini-3.1-flash-image` is the current Nano Banana 2 id.

**Findings (checked against Google's docs and pricing page on 2026-09-28):**

1. **High, reliability: the shared path most likely never makes a picture.** Google's price list shows *no free tier* for any image model (Nano Banana 2 ≈ $0.067 at 1K, $0.101 at 2K, $0.151 at 4K; Pro $0.134–0.24; Lite $0.034). The pooled keys are free-tier keys from separate accounts, so every image request gets 429 "limit: 0" from all 9 keys. The page then showed that raw message with no way forward. **Fix:** a "My own Gemini key" mode that calls Google directly from the browser (key kept in memory, or in localStorage only if the visitor ticks *Remember*; `data-no-autosave` on the key box), a *Test* button, a 3-step guide with a link to `aistudio.google.com/apikey` and a full guide in the page's Help, including billing and a budget alert. Every Worker failure (429/403/400/5xx, or wrong origin) now maps to a plain message pointing to the own-key option.
2. **Medium, cost:** the Worker allowed 4K through the owner's key ($0.15 each) with only the shared 20/min text limiter. **Fix:** the Worker now allows 1K/2K only, Nano Banana 2 or 2 Lite (Lite 1K only), ≤ 3 reference photos of ≤ ~2 MB base64 each (MIME and base64 checked), and an optional stricter `IMAGE_RATE_LIMITER` binding. 4K, Pro, several versions and Google Search grounding need the visitor's own key. The page disables those options in shared mode.
3. **Medium, UX:** the Worker rejected `4:5`/`5:4` which Google supports; added. A picture that Google blocks came back as "Gemini did not return a picture"; the page now reads `promptFeedback.blockReason` and `finishReason` (SAFETY, IMAGE_SAFETY, PROHIBITED_CONTENT, RECITATION, NO_IMAGE) and says why, skips `thought` parts, shows Gemini's own text, retries once on 500/503, and has a Stop button and a 150 s timeout.
4. **Low, handoff:** "Edit in Image Studio" was a plain link, so the picture was lost. It now passes the picture through IndexedDB (`miga-handoff`) and Image Studio loads it once.
5. **Low, downloads:** only PNG. Now PNG/JPG/WebP (converted on a canvas), Copy to clipboard, a readable file name from the description, and a local "recent pictures" gallery (IndexedDB, last 24, never uploaded).

**Additions (owner asked for "as advanced as possible with easy controls"):** 15 looks and 10 shapes as one-tap chips; up to 3 own photos (drop, click or paste; shrunk to 1536 px) to edit a photo or keep a subject; "Change this picture" edits the current picture with plain words; "Use as photo" feeds a result back in; *Improve my words* expands a short idea with the free text model; *Surprise me*; framing, light, colours, "leave out", 1/2/4 versions, model and size under *More options*; Ctrl+Enter. `ai-client.js` gained a **Gemini (your own key)** provider so every AI tool works on a downloaded copy (the proxy refuses other origins). README has a "Download it and use your own Gemini key" section. Picture Forge got its own header art (a new artist, Alphonse Mucha / Art Nouveau). The video was re-recorded for the new screens.

**Verification:** headless Chromium with Google and the Worker mocked: shared success (payload checked), shared 429 (plain message, key guide opens), own key with billing error, own key with Pro/4K/2 versions (URL, `x-goog-api-key` header and `imageConfig` checked), change-with-words sends the current picture, PNG and JPG downloads, gallery, Image Studio hand-off, no page errors, no sideways scroll at 390 px, key not stored unless *Remember* is ticked. `node --check` on the Worker, `ai-client.js`, `tool-art.js`; `check-tool-videos.mjs` passes. **Not verified:** a real image call (no billed key in this session) and the Worker deploy (production deploys are blocked for Claude; the owner or ChatGPT must paste `gemini-proxy.js` into the dashboard).

### 3D Creation Forge — Claude's proposal

**Recommendation: don't start with a paid image-to-3D API.** Build it in two layers behind one small provider interface, and ship layer 1 first.

1. **MVP (free, local, no new key): text → editable parametric model.** Gemini's free text model writes a JSON scene (primitives, CSG unions/subtractions, lathe and extrude profiles, bevels, arrays, materials), sanitised like `3d-cartoon.html`'s `clean()` against a whitelist and size limits. three.js builds it; `three-bvh-csg` does the booleans. Every part stays editable with sliders, so this complements Model Forge instead of duplicating it: Model Forge stays the free-form editor, 3D Creation Forge is "describe it → get a clean, printable starting model". Exports: GLB (game), STL/3MF (print), OBJ. This is what works for most objects people actually print (boxes, holders, brackets, figurines from primitives) and costs nothing.
2. **Printability check (local):** watertight/manifold test, wall thickness by ray sampling, overhang map (> 45°), bounding box vs a chosen printer bed, triangle count; one-click "make printable" (merge vertices, fix normals, add a flat base). Game-ready check: triangle budget, a single material/texture atlas, origin at the base.
3. **Layer 2, optional: concept image → mesh.** Picture Forge makes a clean concept (white background, three-quarter view); the visitor's own Meshy or Tripo key turns it into a textured mesh (roughly $0.10–0.50 per model, 1–3 min, async polling; check current prices before building). The key stays in the browser like Picture Forge's; nothing goes through our Worker (no owner cost, no key custody). Output then opens in Model Forge / the printability check. Provider interface: `create(image, opts) → jobId`, `poll(jobId) → {status, progress, glbUrl}`, `cancel(jobId)`; one adapter per provider, mocked in tests.
4. **Licensing:** show each provider's output terms next to its option (free tiers often give CC BY or restrict commercial use); never upload a photo of a real person without a consent tick.
5. **Tests:** JSON-sanitiser unit tests with hostile specs, a golden-file test that each template exports a manifold STL, printability numbers on known meshes (a cube with a hole, a thin plate), and mocked provider polling (timeout, failure, cancel).

## ChatGPT next step — 2026-09-28 (Claude, Picture Forge round)

1. **Deploy `cloudflare-worker/gemini-proxy.js`** (dashboard → `migabuilder-gemini` → Edit code → paste → Deploy). Until then the shared picture path answers "Unsupported or missing model" and the page sends visitors to the own-key option. Optional: add an `IMAGE_RATE_LIMITER` binding (4 / 60 s).
2. **Owner decision:** image generation through the shared Worker only works if one pooled key's project has billing, and then every shared picture costs the owner about $0.07–0.10. If the owner does not want that cost, remove the two image models from `ALLOWED_MODELS`/`IMAGE_MODELS`; the page already handles that and steers to own keys.
3. **Please review MB-013**, especially the Worker validation and `picture-forge.html`'s `friendly()` error mapping, and challenge the 3D Creation Forge proposal.

## MB-014 — Music Forge: AI songs with singing (owner request, 2026-09-28)

**Reviewer:** Claude  
**Status:** implemented, merged (owner asked for it); ChatGPT review welcome  
**Category:** UX / Feature  
**Files:** `music-forge.html`, `tool-art.js`, listings (`index.html`, `home-i18n.js`, `miga-palette.js`, `tutorials.js`, `README.md`), video

The owner said ChatGPT had left a message about a new Music Forge. Claude found no such message on GitHub (no branch, PR, issue, comment or entry here), so this round follows the owner's own request. **ChatGPT: if you wrote a Music Forge plan somewhere, please add it here; Claude will compare it with this implementation.**

- **New "🎤 AI song with singing" mode** using Google Lyria through the Interactions API (`POST /v1beta/interactions`, `response_format: {type: 'audio'}`, `store: false`) with the visitor's own Gemini key. Lyria has no free tier (Clip ≈ $0.04, Lyria 3.5 ≈ $0.08 per song), so it never goes through the owner's Worker. The key is shared with Picture Forge's *Remember* option (`migaGeminiKey`).
- **Easy controls:** 18 styles and 10 moods as chips, singing (none / AI words / my lyrics with [Verse]/[Chorus]/[Bridge] buttons), voice and 13 languages, 30-second clip or full song. *More options* holds tempo, key, length, song shape, instruments, model, "leave out" and up to 3 inspiration pictures. The free text model (via the proxy, or the own key on a downloaded copy) powers *Improve my words* and *Write them for me*.
- **Result:** clickable waveform, MP3 (or WAV as sent) and WAV download (decoded and re-encoded locally), copy lyrics, and recent songs in IndexedDB. Help covers the key (link to aistudio.google.com/apikey, billing, budget alert, safety), downloading, a downloaded copy, tips, and costs and rules (no artist imitation or copyrighted lyrics).
- The free Quick presets and Tracker are unchanged; `#ai-song` / `#tracker` deep-link to the modes. The header art's frog now holds a microphone. The video was re-recorded; it uses a locally rendered demo tune, so no credit is spent.

**Verification:** headless Chromium with Google mocked. Checked: no-key message, lyrics helper through the proxy, billing error message, full-song request (URL, `x-goog-api-key`, model `lyria-3.5`, prompt contents), response parsing from `steps[].content[]` (audio + lyrics text), download, library, waveform, 390 px without sideways scroll, and that the free preset generator still works. No page errors. **Not verified:** a real Lyria call (no billed key). The response parser follows Google's documented `steps[].content[]` / `output_audio` shapes and falls back to any base64 `audio/*` block.

## MB-015 — Complete review of Music Forge (owner request, 2026-09-28)

**Reviewer:** Claude  
**Status:** fixed and merged (owner asked for improvements); ChatGPT review welcome  
**Category:** Reliability / UX / Cost / Privacy  
**Files:** `music-engine.js` (new), `music-forge.html`, `sw-register.js`, `sw.js`, listings, video

**Tested as a first-time user** (headless Chromium, desktop 1280 px, tablet 820 px, phone 390 px): every tab, button, chip, slider, download and hand-off; audio measured sample by sample (peak, clipped samples, loudness, silence, endings, pitch-class fingerprint for similarity) and viewed as waveforms and spectrograms; downloads decoded with ffmpeg. Lyria calls were mocked, because no billed key was available.

**Found (before this change):**
1. *Quick presets ignored instructions.* Six fixed presets, always in A, two chord progressions; all major presets had pitch fingerprints with similarity 0.87–0.96, and all minor ones 0.94–0.96. No way to describe the music without a paid key.
2. *Regenerate did nothing* for Calm and Cinematic (identical audio, no randomness in the pad style).
3. *Quiet output* (peak 0.3–0.5, no normalisation) and *abrupt endings* (e.g. Chiptune -18 dB in the last 100 ms).
4. *Tracker export clipped* badly with several tracks: 50,608 clipped samples at peak 1.0.
5. Tracker: no drum sounds without uploading files, an empty grid "played" silently, playback kept running after leaving the tab, uploaded samples kept ringing after Stop, and editing notes needed a right-click (not possible on phones).
6. The three mode buttons took a whole phone screen; "View source" appeared twice.
7. AI song: no cost limit, no retry after an error, no artist-imitation check, no 18+ note, AI songs could not be trimmed or passed to other tools.

**Fixed / added:**
- **`music-engine.js`**: describe music in plain words → original track. 14 styles, 10 moods, tempo, exact length, key, 8 instruments, drums on/off, shapes (song with intro/verse/chorus/bridge/ending, seamless loop, intro/jingle, outro, build-up, steady background), seeded variation. It uses several progressions per style, a motif-based melody, and sections with fills and crashes. Mixing: compressor, reverb, loudness levelling (-16 dBFS RMS, -19 for quiet styles), a look-ahead limiter at -1 dBFS, and fade-out endings. Bars are scheduled while rendering (suspend/resume), so render time is linear (90 s pop: 28.6 s → 4.2 s). 13-prompt test: 0 clipped samples, lengths exact (6–90 s), 0.2–3 s per track, pitch-fingerprint similarity median 0.54 (min 0.02).
- **Make music tab** (default, free): description box that shows "I understood: …", quick ideas, optional style/mood/length chips, "Match my video" (reads only the length), one-tap changes (new version, faster, slower, happier, darker, calmer, more energy, drums on/off, shorter, longer), 10 free sound effects.
- **Finish & use** (all tabs): waveform, play/pause/restart/loop/seek, trim start/end, fade in/out, volume, even-out volume. Downloads: WAV, MP3 (lamejs from cdnjs, loaded on demand) and stems as a ZIP. "Use it in" hands the WAV to Clip Forge, Video Forge, Merge Forge, Game Forge or Audio Forge through IndexedDB; `sw-register.js` puts it into that tool's own file input (verified in all five).
- **Beat maker**: built-in drum sounds, example beat, empty-grid hint, compressor on preview, stop on tab change and Stop ends samples, press-and-hold editing on touch screens, export levelled + limited (worst case now 0 clipped samples) and opened in Finish & use.
- **AI song**: price on the button, per-device daily safety limit (default 10 songs ≈ $0.80, counted only after a successful song, numbers only), retry button, a check that blocks real artist/song names (tested against false positives like "sounds like rain"), 18+ note, honest Stop message (Google may still count a started song), "Trim, fade & use" into Finish & use, and an opt-out for keeping AI songs in the browser.
- **Can I use this music?** table: free tracks, sound effects and beats are the visitor's for any use, including commercial, with no credit. AI songs follow the Gemini API terms: Google won't claim ownership, the user is responsible, Google may make similar output for others, there is no indemnity, a SynthID watermark is added, and purely AI output may not be copyrightable in some countries. There is also a note on uploaded samples. Not legal advice.

**Still limited:** Lyria is not verified live. Vocal/instrument separation of AI songs would need a large ML model in the browser. Soundtrack-from-video matches length only, not scene changes. There is no multi-track timeline. The new UI text is English-only (tab names are translated).

**Next version ideas:** music for scenes (read a video's scene cuts and put section changes there); "extend this track"; a lighter AI plan step (free text model → engine spec) for descriptions the word list misses; direct music pickers inside Cartoon Forge, 3D Cartoon and 3D Game Forge (they have no audio input yet); ducking under a voice-over in Clip Forge; translate the new strings.

## MB-016 — Music Forge follow-ups from MB-015 (owner request, 2026-09-28)

**Reviewer:** Claude  
**Status:** implemented and merged; ChatGPT review welcome  
**Files:** `music-engine.js`, `music-forge.html`, `3d-cartoon.html`, `cartoon-forge.html`, `3d-game-forge.html`, `clip-forge.html`, `sw-register.js`

- **Music that follows a video's scenes.** "Match my video" also finds scene changes locally: it samples frames onto a 48×27 canvas and flags differences above mean + 2.2 SD, at most 12 cuts, at least 2.5 s apart. Each cut starts a new section on the nearest bar, with a crash exactly on the cut. It can be turned off. Test video with cuts at 4/9/13 s: found 4 s, 9 s, 13 s; the 18.00 s track changed section at the cuts.
- **"✨ Ask AI to read it"** appears when no style is recognised. Only on that click, the description goes to the free text model through the Worker; the reply is validated against the engine's allowed values and sets the visible chips. The music is still made in the browser. The privacy note says so. Tested: "a dragon flying over a frozen castle at dawn" → Orchestral · Epic · 96 BPM · build-up · strings, flute.
- **3D Cartoon and Cartoon Forge:** background music (file or Music Forge hand-off) plays with the cartoon, pauses/resets with it, and is mixed into the recorded video. Cartoon Forge's own sound is mixed with it, because MediaRecorder keeps only one audio track. Verified: recorder streams have 1 audio + 1 video track.
- **3D Game Forge:** game music starts when the player presses Play (new `hooks.onPlay` in the engine), stops at win/lose, and is embedded in the downloaded HTML game. Music Forge hands games an MP3 (a 20 s loop game file went from 4.75 MB to 0.58 MB). Share links don't carry music, and the page says so. The downloaded game was opened and played its music.
- **Clip Forge auto-duck** (default on when the clip has its own sound): the music drops to about 30% while the clip's audio is loud and recovers in pauses. Render verified to finish with one mixed audio track.
- Music Forge's "Use it in" now lists 8 tools; `sw-register.js` knows the three new inputs.

**Not done:** translating Music Forge's new strings; "extend this track" (Longer keeps key, tempo and melody, but re-arranges); stem separation of AI songs.
