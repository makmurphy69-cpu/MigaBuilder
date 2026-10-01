# MigaBuilder

Static site (plain HTML/CSS/JS, no build step) served at https://migabuilder.com
from the `main` branch. Each tool is one `*.html` page in the repo root.

## Adding a new tool — required checklist

A tool is not finished until **all** of these are done, in the same pull request:

1. The page itself (`<tool>.html`), loading `local-tools.css`, `tutorials.css`,
   `usage-counter.js`, `web-analytics.js`, `sw-register.js` and `tutorials.js`
   like the other tool pages.
2. Listed everywhere tools are listed: a `tool-card` in `index.html` (and the
   *New* row), `miga-palette.js`, `tutorials.js` (walkthrough entry),
   `sitemap.xml`, the name map in `visits.html`, and `README.md`. Never write
   a total tool count ("63 free tools") in titles, meta tags or copy; it goes
   stale every time a tool is added.
3. **A narrated explanation video — always, for every new tool.** Add a
   scenario to `scripts/tutorial-videos/scenarios.mjs` and record it:

   ```bash
   pip install piper-tts imageio-ffmpeg
   node scripts/tutorial-videos/record.mjs <tool>
   ```

   Commit `videos/<tool>.mp4`, `videos/<tool>.jpg`, `samples/<tool>.*` and the
   updated `videos/manifest.json`. Watch a few frames before committing. See
   `scripts/tutorial-videos/README.md`.
4. Run `node scripts/check-tool-videos.mjs`. It must pass — the
   *Tool explanation videos* GitHub check runs it on every pull request and
   fails when any homepage tool is missing its video.

When a tool changes in a way that makes its video wrong, update the scenario
and record the video again.

## Working with ChatGPT and Gemini

Claude, ChatGPT and Gemini review each other's work through `AI-COLLABORATION.md` and
`AI-REVIEW.md`. This only happens when the owner asks in chat (for example
"ChatGPT left you a message, check it and implement it if you agree"); there
is no scheduled or automatic run. When asked, follow the "When this runs"
steps in `AI-COLLABORATION.md`.

To ask Gemini, write `@gemini` in `AI-REVIEW.md` or in a PR/issue comment. The
dispatcher in `scripts/ai-dispatch/` (workflow `gemini-dispatch.yml`, secret
`GEMINI_API_KEY`) sends it to Gemini and posts the answer back there. Verify
Gemini's replies against the code like any other review.
