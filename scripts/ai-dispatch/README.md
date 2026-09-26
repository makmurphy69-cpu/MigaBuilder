# AI dispatcher: `@gemini`

Makes Gemini the third reviewer next to Claude and ChatGPT (see
`AI-COLLABORATION.md`). Anything that tags `@gemini` is sent to Gemini
(`gemini-2.5-flash` through the `@google/genai` SDK), and the answer is posted
back where the question was asked.

| Where you tag `@gemini` | How it runs | Where the answer goes |
| --- | --- | --- |
| A paragraph in `AI-REVIEW.md` | Actions → *Gemini dispatcher* → **Run workflow** (pick the branch), or locally | Quoted `> **Gemini** …` block right under that paragraph, committed to the branch |
| A comment on an issue or pull request | Automatically, but only for comments by the owner, members or collaborators | Reply comment in the same thread |

Gemini gets `AI-COLLABORATION.md`, `AI-REVIEW.md`, the section or thread that
tagged it, any repo files cited in backticks (for example `` `website-builder.html` ``),
and for pull requests the diff. It cannot push code; Claude, ChatGPT or the owner
implement what is agreed.

## Setup

Add the `GEMINI_API_KEY` repository secret (Settings → Secrets and variables →
Actions). Optional: set `GEMINI_MODEL` to use a different model.

## Local use

```bash
cd scripts/ai-dispatch && npm install
node dispatch.mjs log --dry-run          # list unanswered @gemini mentions
GEMINI_API_KEY=... node dispatch.mjs log # answer them in AI-REVIEW.md
npm test
```

Each reply carries a `<!-- gemini-reply:<id> -->` marker tied to the text of the
message that asked, so a mention is answered once. If you edit that message, it
counts as a new question. Replies never contain `@gemini`, so they can't trigger
the dispatcher again.
