# Tutorial videos and samples

`record.mjs` makes the narrated video guide and the sample for each tool. It
opens the real tool page in Chromium, uses it on an example with a visible
pointer and highlights, shows captions, speaks each caption with a Piper
neural voice, and cuts out long waits (for example while the AI writes a
website). The result shows up on the tool page automatically: `tutorials.js`
reads `videos/manifest.json` and adds the video, the transcript and a
**See the sample made in this video** button (`sample-viewer.html`).

## Output

| File | What it is |
| --- | --- |
| `<tool>.mp4` in the videos repository | The narrated video (1280×720, H.264 + AAC) |
| `<tool>.jpg` in the videos repository | Poster frame |
| `videos/manifest.json` (this repository) | Title, length, transcript, sample, and the links to the video and poster |

The videos and posters live in their own repository,
[makmurphy69-cpu/migabuilder-videos](https://github.com/makmurphy69-cpu/migabuilder-videos),
served at `https://videos.migabuilder.com/` by the `migabuilder-videos`
Cloudflare Worker, which deploys automatically on every push to that repository.
That keeps this repository small when videos are recorded again.
| `samples/<tool>.*` | What the tool made in the video (website, game, PDF, image, audio…) |

## Re-recording

```bash
git clone https://github.com/makmurphy69-cpu/migabuilder-videos ../migabuilder-videos   # once; or set VIDEOS_REPO=/path
pip install piper-tts imageio-ffmpeg        # voice + ffmpeg
npm install -g playwright                   # or a local install; Chromium is required
node scripts/tutorial-videos/record.mjs                      # every tool
node scripts/tutorial-videos/record.mjs bug-scanner qr-forge # just these
```

The voice model (about 110 MB) is downloaded into `.cache/` on the first run.
Behind a proxy, set `BROWSER_PROXY=http://host:port` (and `IGNORE_CERTS=1` if it
uses its own certificate) so pages can load their CDN scripts and fonts. If Node
already trusts that proxy (for example through `NODE_EXTRA_CA_CERTS`), set
`FETCH_VIA_NODE=1` instead: Node then fetches the CDN files for the page and
certificate checks stay on.
AI requests go to the site's own Gemini proxy and are cached in
`.cache/ai/`, so recording again does not use the free daily quota.

## Adding a video for a new tool

Add a scenario to `scenarios.mjs`:

```js
S('my-tool.html', {
  title: 'My Tool', subtitle: 'One line about it',
  intro: 'Welcome to My Tool. …',                      // spoken over the title card
  async run(h, page) {
    await h.step('Type your text here.', () => h.type('#input', 'Hello'));
    await h.step('Press Go.', () => h.click('#go'));
    await h.skip('Skipping ahead while it works', () => page.waitForSelector('#result'));
    await h.sampleDownload('#download', 'File made in this video');
  }
});
```

Each `h.step(text, action)` speaks and captions `text` while running
`action`. Helpers: `click`, `type`, `fill`, `select`, `check`, `upload`
(files from `assets/`), `point` (move the pointer and highlight),
`scroll`, `scrollBy`, `wait`, `skip` (cut a wait from the video),
`sampleDownload`, `sampleShot` (screenshot of an element) and `sampleFile`.
Then run the script for that tool. Commit and push the new `<tool>.mp4` and
`<tool>.jpg` in the videos repository first (wait a minute or two for Cloudflare to
deploy them), then commit `videos/manifest.json` and `samples/` here.

**Every new tool must have a video.** `node scripts/check-tool-videos.mjs`
fails when a tool card on the homepage has no scenario, manifest entry, video
or poster, and the *Tool explanation videos* GitHub check runs it on every
pull request.
