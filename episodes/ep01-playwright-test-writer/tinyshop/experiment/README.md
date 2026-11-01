# The 20-run experiment

- `suites/<agent>_<skill|noskill>_<run>/checkout.spec.ts`: the test file each run produced, unedited.
- `scores.jsonl`: one line per run, written by `score.py`.
- `report.py`: prints the summary table from `scores.jsonl`: `python3 experiment/report.py` (run from `tinyshop/`).
- `score.py`: scores any suite against the 7 planted bugs: `python3 experiment/score.py experiment/suites/codex_skill_1` (run from `tinyshop/` after `npm install` and `npx playwright install chromium`).

Method and caveats: [RESULTS.md](../../RESULTS.md).
