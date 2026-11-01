# Skills library

Every skill here is a folder with a `SKILL.md` that works in both **Claude Code** (`.claude/skills/`) and **Codex** (`.agents/skills/`). How to install one: see the [main README](../README.md#using-a-skill).

Status: ✅ ready (with an episode) · 🔜 coming (planned, not written yet)

## Testing

| Skill | What it does | Episode | Status |
|---|---|---|---|
| [`playwright-test-writer`](playwright-test-writer/) | Writes Playwright end-to-end tests from a spec: every rule, boundaries, exact values, accessible locators, no hard waits; runs a checker until it passes | [EP01](../episodes/ep01-playwright-test-writer/) | ✅ ready |
| api-test-writer | Tests for an HTTP API from its spec or OpenAPI file | — | 🔜 coming |

## Code review

| Skill | What it does | Episode | Status |
|---|---|---|---|
| code-review | Reviews a diff against your team's rules and flags real bugs, not style nits | — | 🔜 coming |

## Data and Databricks

| Skill | What it does | Episode | Status |
|---|---|---|---|
| data-analysis | Loads a dataset, checks its quality, answers a question with a chart and states its assumptions | — | 🔜 coming |
| databricks-pipeline | Builds and checks a Databricks pipeline step (notebook/job) the same way every time | — | 🔜 coming |

## Security

| Skill | What it does | Episode | Status |
|---|---|---|---|
| security-review | Reviews code for common vulnerabilities (injection, secrets, auth gaps) and explains each finding | — | 🔜 coming |

## Docs

| Skill | What it does | Episode | Status |
|---|---|---|---|
| docs-writer | Writes and updates README and usage docs from the code as it really is | — | 🔜 coming |

## Release

| Skill | What it does | Episode | Status |
|---|---|---|---|
| release-notes | Turns merged changes into release notes and a version bump checklist | — | 🔜 coming |

"Coming" skills are plans, not promises; the order follows the [roadmap](../ROADMAP.md). Want one sooner, or a different one? [Request a skill](https://github.com/skillsinaction/skills-in-action/issues/new/choose).
