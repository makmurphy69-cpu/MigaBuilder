# MigaBuilder Feature Scout

A weekly Claude run that looks for ideas to make MigaBuilder better, reports
them to the owner, and builds at most one of them as a **draft** pull request.
The owner decides what gets built and what gets merged.

It runs as a scheduled Claude Code Routine ("MigaBuilder feature scout"),
not as a GitHub Actions workflow, so it needs no API key in the repository.
The owner can pause, change or delete it from the Routines list in Claude.

## What each run does

1. **Know what exists.** Pull the latest `main`. Read `README.md`, the tool
   cards in `index.html`, open issues and open pull requests, and the previous
   "Feature scout" issues (including the owner's comments on them). Do not
   suggest anything MigaBuilder already has or the owner already turned down.
2. **Act on the owner's replies first.** If the owner commented on an earlier
   "Feature scout" issue asking for an idea to be built (for example
   "build #2"), build that one this run instead of picking a new one.
3. **Research.** Look at comparable free online tool sites, popular related
   open-source projects, and common questions people ask that a browser-based
   tool could answer. Note the source of every idea.
4. **Pick 3–5 ideas.** Prefer, in this order:
   - fixes and improvements to existing tools (speed, file formats, limits,
     usability, accessibility, mobile);
   - features that make many tools better at once;
   - new tools — only when the gap is clear, since every new tool needs the
     full checklist in `CLAUDE.md`, including a narrated video.

   Keep MigaBuilder's privacy model: files are processed in the browser and are
   not uploaded unless the tool already does so and says so.
5. **Report.** Open one GitHub issue titled
   `Feature scout: <YYYY-MM-DD>` with, for each idea: what it is, who it helps
   and why, evidence and links, estimated effort (small / medium / large),
   risks, and which files it would touch. Number the ideas so the owner can
   reply "build #2". Mark the one you are building.
6. **Build at most one idea.** Choose the best value-for-effort idea (or the
   one the owner asked for). Work on a new branch, follow `CLAUDE.md` in full
   (for a new tool that includes the video, smoke test and result test), run
   the checks, and open a **draft** pull request that links the issue.
   Skip building if no idea is clearly worth it; say so in the issue.
7. **Ask Gemini when useful.** For a risky or debatable idea, end the issue
   with an `@gemini` question as described in `AI-COLLABORATION.md`.

## Guardrails

- Scout pull requests stay **drafts** and are **never merged by a model**,
  even when every check passes. Only the owner merges them.
- One build per run. No changes outside the chosen idea.
- Take ideas, not material: never copy another site's code, text, images or
  design.
- Never add tracking, accounts, or uploads of user files that the privacy
  model doesn't already allow.
- Never put secrets in issues, pull requests or commits.
- If the run fails or finds nothing worthwhile, still open the issue and
  explain briefly.
