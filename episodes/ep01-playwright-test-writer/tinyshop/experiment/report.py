#!/usr/bin/env python3
# Summarises the with/without-skill runs (scores.jsonl written by score.py).
import json, statistics as st
rows = {}
for l in open('experiment/scores.jsonl'):
    if l.strip():
        d = json.loads(l); rows[d['ws']] = d
EQUIV = 'M2 free shipping only above 30 (not at 30)'   # no reachable cart totals exactly 30.00
B, G, R, D, X = '\033[1m', '\033[32m', '\033[31m', '\033[2m', '\033[0m'
print(f"{B}Planted bugs caught (out of 6), 5 runs per cell{X}   {D}same prompt, same app{X}\n")
print(f"{'agent':<13}{'skill':<9}{'runs':>5}  {'bugs caught per run':<22}{'avg':>5}  {'tests/run':>9}  {'runs w/ CSS locators':>20}")
print('─' * 92)
for agent in ['claude', 'codex']:
    for cond in ['noskill', 'skill']:
        rs = [v for k, v in sorted(rows.items()) if k.startswith(f'{agent}_{cond}_')]
        sc = [sum(c for m, c in r['caught'].items() if m != EQUIV) for r in rs]
        tw = [r['tests_written'] for r in rs]
        css = sum(1 for r in rs if r['css_locators'] > 0)
        name = 'Claude Code' if agent == 'claude' else 'Codex'
        col = G if cond == 'skill' else ''
        print(f"{name:<13}{col}{('with' if cond == 'skill' else 'without'):<9}{X}{len(rs):>5}  {' '.join(map(str, sc)):<22}{st.mean(sc):>5.1f}  {st.mean(tw):>9.1f}  {css:>14} of {len(rs)}")
    print()
allpass = all(r['tests_failed_real_app'] == 0 and r['tests_passed_real_app'] > 0 for r in rows.values())
print(f"{D}{'Every suite passed on the real app.' if allpass else 'WARNING: some suites failed on the real app.'} Bug M2 (shipping at exactly €30.00) is excluded: no cart can total €30.00.{X}")
