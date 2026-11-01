#!/usr/bin/env python3
"""Mutation score for one Playwright suite: how many planted bugs does it catch?

usage (run from the tinyshop/ folder, after `npm install` and
`npx playwright install chromium`):

    python3 experiment/score.py experiment/suites/codex_skill_1 [port]
    python3 experiment/score.py experiment/suites/codex_skill_1 >> my_scores.jsonl

<suite-dir> is any folder that contains checkout.spec.ts (or a tests/ folder).
The suite is first run on the real app, then on 7 copies of the app with one
planted bug each. A bug counts as "caught" when the suite goes red.
Prints one JSON line in the same shape as experiment/scores.jsonl.

This is the scoring script used for the 20 runs in RESULTS.md, with the
machine-specific paths replaced by the current folder. The bugs and the counting
rules are unchanged.
"""
import json, os, re, shutil, subprocess, sys, tempfile

if len(sys.argv) < 2:
    sys.exit(__doc__)
suite = os.path.abspath(sys.argv[1])
port = sys.argv[2] if len(sys.argv) > 2 else '4400'
BASE = os.getcwd()  # the tinyshop folder

MUTANTS = {
  'M1 SAVE20 gives 2% instead of 20%':        ("value: 0.2 }", "value: 0.02 }"),
  'M2 free shipping only above 30 (not at 30)': ("afterDiscount >= FREE_SHIPPING_FROM", "afterDiscount > FREE_SHIPPING_FROM"),
  'M3 quantity 11 accepted':                   ("q <= MAX_QTY)", "q <= MAX_QTY + 1)"),
  'M4 coupon codes case-sensitive':            (".trim().toUpperCase()", ".trim()"),
  'M5 bad code keeps the old coupon':          ("    coupon = null;\n    msg.textContent = 'Coupon not recognised'", "    msg.textContent = 'Coupon not recognised'"),
  'M6 shipping threshold uses pre-discount subtotal': ("afterDiscount >= FREE_SHIPPING_FROM", "subtotal >= FREE_SHIPPING_FROM"),
  'M7 FREESHIP does nothing':                  ("if (coupon && coupon.type === 'shipping') shipping = 0;", ""),
}

for need in ['site/app.js', 'playwright.config.ts', 'package.json', 'node_modules']:
    if not os.path.exists(os.path.join(BASE, need)):
        sys.exit(f'Run this from the tinyshop folder after `npm install` (missing: {need}).')

app = open(os.path.join(BASE, 'site/app.js')).read()
for k, (a, b) in MUTANTS.items():
    assert a in app, f'{k}: code to mutate not found in site/app.js'

tests_src = os.path.join(suite, 'tests') if os.path.isdir(os.path.join(suite, 'tests')) else suite
tmp = tempfile.mkdtemp(prefix='score_')
try:
    for f in ['site', 'SPEC.md', 'playwright.config.ts', 'package.json']:
        src = os.path.join(BASE, f)
        (shutil.copytree if os.path.isdir(src) else shutil.copy)(src, os.path.join(tmp, f))
    os.symlink(os.path.join(BASE, 'node_modules'), os.path.join(tmp, 'node_modules'))
    os.makedirs(os.path.join(tmp, 'tests'))
    for f in os.listdir(tests_src):
        if f.endswith(('.ts', '.js')):
            shutil.copy(os.path.join(tests_src, f), os.path.join(tmp, 'tests', f))
    env = dict(os.environ, PORT=port, CI='1')

    def run():
        r = subprocess.run(['npx', 'playwright', 'test', '--reporter=json'],
                           cwd=tmp, env=env, capture_output=True, text=True, timeout=300)
        try:
            st = json.loads(r.stdout)['stats']
            return r.returncode, st.get('expected', 0), st.get('unexpected', 0) + st.get('flaky', 0)
        except Exception:
            return r.returncode, 0, -1

    rc, passed, failed = run()
    res = {'ws': os.path.basename(suite.rstrip('/')), 'tests_passed_real_app': passed,
           'tests_failed_real_app': failed, 'caught': {}}
    for k, (a, b) in MUTANTS.items():
        open(os.path.join(tmp, 'site/app.js'), 'w').write(app.replace(a, b, 1))
        rc2, _, _ = run()
        res['caught'][k] = rc2 != 0
    src = ''.join(open(os.path.join(tmp, 'tests', f)).read() for f in os.listdir(os.path.join(tmp, 'tests')))
    res['tests_written'] = len(re.findall(r'\btest\(', src))
    res['hard_waits'] = len(re.findall(r'waitForTimeout\(', src))
    res['css_locators'] = len(re.findall(r'locator\(\s*[\'"`][^\'"`]*(#|\.|>|nth-child)', src))
    res['score'] = sum(res['caught'].values())
    print(json.dumps(res))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
