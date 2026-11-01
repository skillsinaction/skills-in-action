# EP01 results: does the skill help?

**Short answer:** for Codex, clearly yes on this page (4.4 → 5.8 of 6 planted bugs caught). For Claude Code the score didn't move (6 → 6), but its tests changed: more of them and no fragile CSS selectors. This is 20 runs on one small page: a direction, not an effect size, and not a benchmark.

## The table

| Agent | Skill | Bugs caught per run (of 6) | Average | Tests per run | Runs using CSS locators |
|---|---|---|---|---|---|
| Claude Code | without | 6 6 6 6 6 | 6.0 | 17.4 | 2 of 5 |
| Claude Code | with | 6 6 6 6 6 | 6.0 | 21.6 | 0 of 5 |
| Codex | without | 5 5 4 4 4 | 4.4 | 5.0 | 2 of 5 |
| Codex | with | 6 5 6 6 6 | 5.8 | 8.0 | 1 of 5 |

Reproduce the table from the raw data (no install needed, just Python 3):

```bash
cd tinyshop
python3 experiment/report.py
```

## Method

- **App:** the one-page checkout in [`tinyshop/site/`](tinyshop/site/) with its rules in [`SPEC.md`](tinyshop/SPEC.md). The runs used the same app logic as this folder; the copy here only has some long lines wrapped for readability.
- **Agents and versions:** Claude Code 2.1.316 with Claude Sonnet 5.5; Codex CLI 0.166.0 with GPT-5.3-Codex (reasoning effort medium). Run headless (`claude -p`, `codex exec`) on Linux, 1 Nov 2026.
- **Prompt:** identical for every run and it never mentions the skill:
  > Write Playwright tests for the checkout page in this repo (the page is in site/, the spec is SPEC.md). Put them in tests/checkout.spec.ts and make sure they pass.
- **Conditions:** each run starts from a fresh copy of the project. "With skill" copies have `skills/playwright-test-writer` linked into `.claude/skills` and `.agents/skills`; "without" copies have no skill at all. 5 runs per agent per condition = 20 runs.
- **Scoring** ([`experiment/score.py`](tinyshop/experiment/score.py)): each generated suite runs on the real app first (all 20 passed), then on 7 copies of the app with one planted bug each. A bug counts as caught when the suite goes red. Also counted: `test(` calls, `waitForTimeout` hard waits, and CSS-style locators.
- **Raw data:** [`experiment/scores.jsonl`](tinyshop/experiment/scores.jsonl) (one line per run) and every generated suite in [`experiment/suites/`](tinyshop/experiment/suites/).

## The planted bugs

| ID | Bug | Patch |
|---|---|---|
| M1 | SAVE20 gives 2% instead of 20% | [patch](planted-bugs/M1-save20-gives-2-percent.patch) |
| M2 | Free shipping only above €30, not at €30 (excluded, see below) | [patch](planted-bugs/M2-free-shipping-only-above-30.patch) |
| M3 | Quantity 11 is accepted | [patch](planted-bugs/M3-quantity-11-accepted.patch) |
| M4 | Coupon codes are case-sensitive | [patch](planted-bugs/M4-coupon-case-sensitive.patch) |
| M5 | An unknown code keeps the previous coupon | [patch](planted-bugs/M5-bad-code-keeps-old-coupon.patch) |
| M6 | Free-shipping threshold uses the pre-discount subtotal | [patch](planted-bugs/M6-shipping-uses-pre-discount-subtotal.patch) |
| M7 | FREESHIP does nothing | [patch](planted-bugs/M7-freeship-does-nothing.patch) |

**Why scores are out of 6:** M2 is an *equivalent mutant*. With prices of €12.50 and €8.00 and whole quantities from 1 to 10, no cart totals exactly €30.00, before or after the 20% discount, so "≥ 30" and "> 30" behave the same and no test can tell them apart. No suite caught it (0 of 20), and it's excluded.

## What the logs showed

- **Claude Code** loaded the skill and ran its check script in 5 of 5 "with skill" runs.
- **Codex** opened `SKILL.md` and ran the check in 3 of 5 "with skill" runs (runs 1, 4 and 5, each catching 6 of 6). Runs 2 and 3 never opened the skill and caught 5 and 6; run 3 is the "with skill" run that still used CSS locators. If Codex ignores a skill, mention it directly: `$playwright-test-writer`.
- **Where Codex improved:** without the skill it missed M3 (quantity 11) in 4 of 5 runs and M6 (threshold after discount) in 4 of 5. With the skill it missed M3 once (run 2) and M6 never. Those are exactly the boundary and rule-interaction cases the skill tells it to cover.

## Caveats

- One small page, one prompt, 5 runs per cell. Agents don't write the same tests twice, so your numbers will differ.
- Models and CLIs update often; a newer version may behave differently with or without the skill.
- Catching planted bugs (mutation score) measures one thing: whether the tests check behaviour precisely. It doesn't measure readability or maintenance cost.
- The raw agent session logs are not published (they contain machine-specific details); the generated suites and the scores are.
