# EP01 · One SKILL.md, two agents: a Playwright test writer

📺 Video: coming soon on [youtube.com/@SkillsInAction1](https://www.youtube.com/@SkillsInAction1)

**Goal:** write one agent skill that teaches both Claude Code and Codex to write proper Playwright end-to-end tests, then check whether it actually helps by planting bugs in a small checkout page and counting how many the generated tests catch.

## What's in this folder

| Path | What it is |
|---|---|
| [`GUIDE.md`](GUIDE.md) | Step-by-step guide: every command from the video, every file in full |
| [`tinyshop/`](tinyshop/) | The demo project: a one-page checkout (`site/`), its spec (`SPEC.md`), Playwright config |
| [`tinyshop/skills/playwright-test-writer/`](tinyshop/skills/playwright-test-writer/) | The skill: `SKILL.md`, `scripts/check.mjs` (runs the suite + lints for test smells), `reference/patterns.md` |
| [`tinyshop/tools/bugcheck.mjs`](tinyshop/tools/bugcheck.mjs) | Plants 7 known bugs one at a time and reports which ones your tests catch |
| [`planted-bugs/`](planted-bugs/) | The same 7 bugs as plain patch files, to apply by hand |
| [`tinyshop/examples/`](tinyshop/examples/) | The two suites written in the tutorial run (Claude Code and Codex, both with the skill) |
| [`tinyshop/experiment/`](tinyshop/experiment/) | The 20-run experiment: all 20 generated suites, `scores.jsonl`, `score.py`, `report.py` |
| [`RESULTS.md`](RESULTS.md) | Results, method and caveats |

## Quick start

You need Node.js 20+, Python 3 (only as a tiny local web server), and Claude Code and/or Codex. Linux or macOS; on Windows use WSL.

```bash
git clone https://github.com/skillsinaction/skills-in-action.git
cd skills-in-action/episodes/ep01-playwright-test-writer/tinyshop
npm install
npx playwright install chromium

# install the skill for both agents (one folder, two links)
mkdir -p .claude/skills .agents/skills
ln -s ../../skills/playwright-test-writer .claude/skills/playwright-test-writer
ln -s ../../skills/playwright-test-writer .agents/skills/playwright-test-writer
```

Then start `claude` or `codex` in this folder and ask, without mentioning the skill:

```text
Write Playwright tests for the checkout page in this repo. The page is in site/ and the spec is SPEC.md. Put the tests in tests/checkout.spec.ts and make sure they pass.
```

Check the result and measure it:

```bash
npx playwright test          # the new suite must pass on the real app
node tools/bugcheck.mjs      # plants 7 bugs one by one; restores app.js at the end
```

No agent handy? Try the measuring step with a suite from the tutorial run:

```bash
cp examples/codex/checkout.spec.ts tests/
node tools/bugcheck.mjs
```

Codex note: Codex's sandbox blocks network ports by default, so Playwright's local web server can't start inside it. Codex will ask to run the test command outside the sandbox; read the command, then approve it. Details in [GUIDE.md](GUIDE.md), Step 9.

## Results in one line

Codex caught **4.4 → 5.8** of 6 planted bugs on average with the skill; Claude Code caught **6 → 6** (same score, but more tests and no fragile CSS selectors). That's 20 runs on one small page: a reason to try skills, not a benchmark. Full table and method: [RESULTS.md](RESULTS.md).
