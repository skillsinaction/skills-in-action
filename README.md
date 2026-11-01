# Skills in Action

**AI in Action — hands-on tutorials for agent skills in Claude Code, Codex, Databricks, data and security.**

📺 YouTube: [youtube.com/@SkillsInAction1](https://www.youtube.com/@SkillsInAction1)

Every episode builds one working agent skill step by step, runs it in Claude Code and Codex, and checks honestly whether it helps. This repo holds everything you need to follow along: the skill files, the demo projects, the scripts, the measured results and a written guide with every command.

## What's here

| Folder | What's inside |
|---|---|
| [`episodes/`](episodes/) | One folder per episode: the skill, the demo app, the scripts, the results and a step-by-step guide |
| [`skills/`](skills/) | The skills library, sorted by area (testing, code review, data, security, docs, release) |
| [`ROADMAP.md`](ROADMAP.md) | Upcoming episodes |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to request a skill or report a problem in a tutorial |

## Episodes

| # | Episode | Skill | Video |
|---|---|---|---|
| 01 | [One SKILL.md, two agents: a Playwright test writer](episodes/ep01-playwright-test-writer/) | [`playwright-test-writer`](skills/playwright-test-writer/) | video coming soon |

## Using a skill

A skill is a folder with a `SKILL.md` file (YAML front matter with `name` and `description`, then instructions), plus optional `scripts/` and `reference/` files. The agent reads every skill's name and description at startup and loads the full `SKILL.md` when your request matches the description. The folder name must match `name`.

### Claude Code

| Scope | Location |
|---|---|
| This project | `.claude/skills/<name>/SKILL.md` (commit it so your team gets it) |
| All your projects | `~/.claude/skills/<name>/SKILL.md` |

```bash
# from your project root, using a skill from this repo
mkdir -p .claude/skills
cp -r path/to/skills-in-action/skills/playwright-test-writer .claude/skills/
claude          # then type /skills to check it's listed
```

### Codex

| Scope | Location |
|---|---|
| This repository | `.agents/skills/<name>/SKILL.md` (Codex scans `.agents/skills` from the current folder up to the repo root) |
| All your repositories | `~/.agents/skills/<name>/SKILL.md` |

```bash
mkdir -p .agents/skills
cp -r path/to/skills-in-action/skills/playwright-test-writer .agents/skills/
codex           # then type /skills to check it's listed; mention it directly with $playwright-test-writer
```

Codex skills are not the same as `AGENTS.md`: `AGENTS.md` is always-on project guidance, while a skill loads only when the task needs it.

One skill folder can serve both agents: keep it in one place (e.g. `skills/<name>`) and symlink it into `.claude/skills/` and `.agents/skills/` (on Windows, copy it instead or work inside WSL).

Paths checked against the official docs on 1 Nov 2026: [Claude Code skills](https://code.claude.com/docs/en/skills) · [Codex skills](https://developers.openai.com/codex/skills). Tools change quickly; if something moved, the docs win (and please [open an issue](https://github.com/skillsinaction/skills-in-action/issues/new/choose)).

## Contact

skillsinaction@mail.tab.bot

## License and disclaimer

Code and skills are [MIT licensed](LICENSE).

Independent channel, not affiliated with Anthropic or OpenAI. Claude and Claude Code are trademarks of Anthropic; Codex and ChatGPT are trademarks of OpenAI.
