# MigaBuilder AI Collaboration Protocol

This file is the shared handoff point for Claude, ChatGPT and Gemini when reviewing MigaBuilder.

## Goal

Use independent reviews to improve the code without letting one model merely reinforce another model's assumptions.

## Rules

1. Inspect the current repository code before proposing a change.
2. Separate findings into: Critical bug, Security, Privacy, Reliability, Performance, Maintainability, UX.
3. For every finding include:
   - affected file/function
   - concrete evidence
   - realistic impact
   - proposed fix
   - test that would prove the fix works
4. Do not change unrelated behavior while fixing a finding.
5. Do not weaken MigaBuilder's privacy model.
6. Never put API keys, tokens, passwords, customer data, or secrets in this file, issues, commits, or prompts.
7. Prefer small reviewable commits.
8. If Claude, ChatGPT or Gemini disagree, record every position and resolve the disagreement with code/tests rather than model confidence.
9. Before merging: run existing checks and add a regression test when practical.
10. Human approval remains the final merge decision.

## Handoff format

### Finding ID
**Reviewer:** Claude / ChatGPT / Gemini  
**Status:** proposed / challenged / accepted / fixed / verified  
**Category:**  
**Severity:** critical / high / medium / low  
**Files:**  

**Evidence:**  
...

**Proposed solution:**  
...

**Other-model review:**  
...

**Verification:**  
...

## When this runs: only when the owner asks

Nothing here runs on a schedule or automatically. (The one scheduled exception is the weekly feature scout in `FEATURE-SCOUT.md`; its pull requests stay drafts and only the owner merges them — step 4 below does not apply to them.) A round starts only when the repo owner tells one of us in chat something like "ChatGPT left you a message, check it and implement it if you agree".

When asked, the model:

1. Pulls the latest `main` and reads `AI-REVIEW.md` for findings or replies addressed to it (its **next step** section, and any finding with status `proposed` or `challenged` that it has not answered yet). It also reads new comments on open pull requests.
2. Checks each point against the actual code and records agree, disagree or a better alternative under **Other-model review**.
3. Implements what it agrees with, runs the checks, and opens a pull request with the fix and the updated `AI-REVIEW.md`.
4. Merges it when the checks pass, unless it is large or security-sensitive and the other model has not reviewed it yet. In that case it leaves the pull request open for the other model's review.
5. Writes a short **next step** section addressed to the other model, and tells the owner in plain language what it did and what it is handing back.

### Asking Gemini (`@gemini`)

Gemini takes part through the dispatcher in `scripts/ai-dispatch/` (see its README). Anyone, including Claude and ChatGPT, can ask Gemini by writing `@gemini` in a paragraph of `AI-REVIEW.md` or in an issue/pull request comment:

- **Review log:** the owner runs the *Gemini dispatcher* workflow (Actions → Run workflow, on the branch that holds the question), or runs `node scripts/ai-dispatch/dispatch.mjs log` locally. Gemini's answer is inserted as a quoted `> **Gemini** …` block directly under each unanswered mention and committed to that branch.
- **Comments:** a comment by the owner or a collaborator that tags `@gemini` gets a reply comment from Gemini automatically.

Gemini reviews and answers but does not push code. Treat its replies like any other model's review: verify them against the code before acting on them. When a round's work needs a third opinion, end your **next step** section with an `@gemini` question instead of only addressing the other model.

## Workflow

1. Claude or ChatGPT adds a finding to `AI-REVIEW.md`.
2. The other model independently inspects the cited code.
3. The second model records agreement, disagreement, or a better alternative.
4. Implement only after the solution is concrete enough to test.
5. The other model reviews the diff.
6. Run tests/checks.
7. Mark the finding verified only when evidence supports it.

## Prompt for Claude

> Read `AI-COLLABORATION.md` and `AI-REVIEW.md` first. Independently inspect the cited source code. Do not automatically agree with ChatGPT or Gemini. For each open finding, record whether you confirm it, challenge it, or propose a safer/simpler solution. Include exact files/functions and a verification method. Do not expose secrets or broaden the change beyond the finding.

## Prompt for Gemini

The dispatcher sends Gemini the system instruction in `scripts/ai-dispatch/dispatch.mjs` (`SYSTEM_INSTRUCTION`): follow this file, inspect the evidence it is given, do not automatically agree with Claude or ChatGPT, give file/function, evidence, impact, fix and test for every point, and ask for missing files instead of guessing.

## Prompt for ChatGPT

> Read `AI-COLLABORATION.md` and `AI-REVIEW.md` first. Independently inspect Claude's and Gemini's latest findings or changes. Verify claims against current repository code. Record disagreements and testable alternatives. Prefer the smallest safe fix and verify the resulting diff before recommending merge.
