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
| `videos/<tool>.mp4` | The narrated video (1280×720, H.264 + AAC) |
| `videos/<tool>.jpg` | Poster frame |
| `videos/manifest.json` | Title, length, transcript and sample for every tool |
| `samples/<tool>.*` | What the tool made in the video (website, game, PDF, image, audio…) |

## Re-recording

```bash
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
Then run the script for that tool, and commit the new files in `videos/` and
`samples/`.

**Every new tool must have a video.** `node scripts/check-tool-videos.mjs`
fails when a tool card on the homepage has no scenario, manifest entry, video
or poster, and the *Tool explanation videos* GitHub check runs it on every
pull request.

## Posting to YouTube

`youtube-publish.mjs` posts each tool's video to your YouTube channel. The
title and description come from `manifest.json` and the scenario subtitle:
what the tool does, a link to it on migabuilder.com, and the steps shown in
the video. The poster frame is used as the thumbnail. Posted videos are
recorded in `videos/youtube.json`, so nothing is posted twice.

```bash
node scripts/tutorial-videos/youtube-publish.mjs preview        # see every post in videos/youtube-posts.md
node scripts/tutorial-videos/youtube-publish.mjs upload         # post the next 6 not yet posted
node scripts/tutorial-videos/youtube-publish.mjs upload qr-forge --privacy=unlisted
```

### One-time setup

1. In the [Google Cloud console](https://console.cloud.google.com/), create a
   project and enable **YouTube Data API v3**.
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in the
   app name and your email, add yourself as a *Test user*, then **Publish
   app** (in testing mode the refresh token expires after 7 days).
3. **Credentials → Create credentials → OAuth client ID → Desktop app**.
   Copy the client ID and secret.
4. On your own computer, in this repository:
   ```bash
   YT_CLIENT_ID=… YT_CLIENT_SECRET=… node scripts/tutorial-videos/youtube-publish.mjs auth
   ```
   Open the link and sign in with the Google account that owns or manages
   the MigaBuilder channel. If it asks you to choose an account or channel,
   pick **MigaBuilder**. The script prints the channel it connected to;
   check that it says MigaBuilder, then copy the `YT_REFRESH_TOKEN`.
5. In GitHub: **Settings → Secrets and variables → Actions**, add the secrets
   `YT_CLIENT_ID`, `YT_CLIENT_SECRET` and `YT_REFRESH_TOKEN`. Optionally add
   a variable `YT_PLAYLIST` with a playlist ID to collect the videos.

The **Post videos to YouTube** workflow then posts up to 6 videos a day until
all of them are up (run it by hand from the Actions tab to start now).

**Limits.** The API's default quota allows about 6 uploads a day. Videos
uploaded by an API project that Google has not audited are locked to
*private*: make them public in YouTube Studio, or request an audit with the
[YouTube API audit form](https://support.google.com/youtube/contact/yt_api_form).
Custom thumbnails need a phone-verified channel.
