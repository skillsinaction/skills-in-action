# EP02 — Agent Teams in Claude Code and Codex

Video: *(link added at publish)* · Recorded 1 Nov 2026 with Claude Code 2.1.316 and codex-cli 0.166.0.

## What's here
- `orderdesk/` — the practice repo: a tiny Node order API with 2 passing tests and **6 planted bugs** (`bench/planted.json`).
- `orderdesk/.claude/agents/*.md` — the three Claude Code subagents (security-reviewer on Opus/high, bug-hunter and perf-reviewer on Sonnet/medium; tools `Read, Grep, Glob`).
- `orderdesk/.codex/agents/*.toml` — the same three as Codex custom agents (`name`, `description`, `developer_instructions`; `model`, `model_reasoning_effort`).
- `orderdesk/bench/run.sh` — runs every setup N times on a fresh `git archive` copy: `claude -p --output-format json --json-schema …` and `codex exec -s read-only --output-schema …`.
- `orderdesk/bench/score.mjs` — scores each run against the planted bugs; time, $ (Claude, API pricing) and tokens.

## Run it
```bash
cd orderdesk && npm test
bench/run.sh 5        # needs claude and codex logged in
node bench/score.mjs
```

## Our results (5 runs each, on camera)
| setup | planted bugs found | findings | time | cost / tokens |
|---|---|---|---|---|
| Claude Code solo | 6/6 in 5 of 5 | 14.8 | 37 s | $0.16 · 102k |
| Claude Code team | 6/6 in 5 of 5 | 19.6 | 60 s | $0.39 · 237k |
| Codex solo | 6/6 in 4 of 5 (missed the blocking read once) | 8.8 | 13 s | 59k tokens |
| Codex team | 6/6 in 5 of 5 | 8.2 | 22 s | 337k tokens |

An earlier batch of 5 runs per setup: Codex solo missed the blocking `readFileSync` in 5 of 5; the other setups found 6/6 every time.
Codex has no $ figure: subscription usage isn't priced per call, so we report tokens.

## Docs
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Codex subagents / custom agents: https://learn.chatgpt.com/docs/agent-configuration/subagents
