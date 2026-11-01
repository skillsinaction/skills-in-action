# Build a Playwright test-writing skill for Claude Code and Codex: step-by-step guide

Companion to Skills in Action episode 1 (video coming soon). Every command from the video, in the same order, with the same step numbers. Every file is printed in full, so you can copy instead of typing. The finished project is in [`tinyshop/`](tinyshop/) if you'd rather start from the end result.

What you build: a reusable agent skill (`SKILL.md` + a checker script) that teaches Claude Code and Codex to write proper Playwright end-to-end tests, a small checkout page to test, and a script that plants bugs to prove the tests catch them.

Tested with: Node.js 22, npm 10, git 2.39, Python 3.11, Claude Code 2.1.316, Codex CLI 0.166.0, Playwright Test, on Linux. macOS: identical. Windows: install WSL (Ubuntu) and run everything inside it.

---

## Before you start: what you need

| Tool | Check | Notes |
|---|---|---|
| Node.js 20+ (includes npm) | `node -v` · `npm -v` | nodejs.org or nvm |
| git | `git --version` | |
| Python 3 | `python3 --version` | only used as a tiny local web server |
| Claude Code access | | Claude Pro/Max subscription or an Anthropic API key |
| Codex access | | ChatGPT plan or an OpenAI API key |

```bash
node -v
npm -v
git --version
python3 --version
```

If any of these says "command not found", install it first.

---

## Step 1: Install Claude Code and Codex

```bash
npm install -g @anthropic-ai/claude-code @openai/codex
claude --version
codex --version
```

You should see two version numbers. Newer versions are fine.

- Permission error on macOS/Linux? Don't use `sudo`. Use a Node version manager (nvm) or set an npm global prefix in your home folder.
- First run signs you in: `claude` opens a browser login (or uses `ANTHROPIC_API_KEY`); for Codex run `codex login` (or use `OPENAI_API_KEY`).

---

## Step 2: Create the practice project

```bash
mkdir tinyshop && cd tinyshop
git init -b main
npm init -y
npm install -D @playwright/test
npx playwright install chromium
ls
```

You should see `node_modules  package-lock.json  package.json`. Everything from here on runs inside `~/tinyshop`.

Linux: if Playwright later complains about missing system libraries, run `npx playwright install --with-deps chromium`.

---

## Step 3: Add the checkout page and its spec

```bash
mkdir site tests
nano SPEC.md            # any editor works; nano: Ctrl+O, Enter to save, Ctrl+X to exit
```

**SPEC.md**
```markdown
# Tiny Shop checkout – spec

- Cart: Coffee beans €12.50, Mug €8.00. Each quantity starts at 1 and must be
  a whole number from 1 to 10. Outside that range the page shows
  "Quantity must be between 1 and 10" and the summary shows "—".
- Coupon codes (case-insensitive, surrounding spaces ignored), one coupon at a
  time; applying a new code replaces the old one:
  - SAVE20: 20% off the subtotal. Message: "Coupon SAVE20 applied".
  - FREESHIP: shipping is free. Message: "Coupon FREESHIP applied".
  - Anything else: message "Coupon not recognised" and no coupon is active.
- Shipping: €4.95, free when the subtotal after discount is €30.00 or more
  (inclusive). Shown as "Free" when free.
- Discount row shows "−€x.xx" when a discount applies, otherwise "€0.00".
- Total = subtotal − discount + shipping, two decimals, e.g. "€25.45".
```

Now the page: three files in `site/`.

```bash
nano site/index.html
nano site/style.css
nano site/app.js
ls site
```

**site/index.html**
```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Tiny Shop – Checkout</title>
<link rel="stylesheet" href="style.css"></head>
<body>
<main>
  <h1>Checkout</h1>
  <table aria-label="Cart">
    <thead><tr><th>Item</th><th>Price</th><th>Qty</th></tr></thead>
    <tbody>
      <tr><td>Coffee beans</td><td>€12.50</td>
        <td><label for="qty-beans" class="sr">Coffee beans quantity</label>
        <input id="qty-beans" type="number" value="1" min="1" max="10"></td></tr>
      <tr><td>Mug</td><td>€8.00</td>
        <td><label for="qty-mug" class="sr">Mug quantity</label>
        <input id="qty-mug" type="number" value="1" min="1" max="10"></td></tr>
    </tbody>
  </table>
  <p id="qty-error" role="alert" hidden></p>
  <form id="coupon-form">
    <label for="coupon">Coupon code</label>
    <input id="coupon" name="coupon" autocomplete="off">
    <button type="submit">Apply</button>
  </form>
  <p id="coupon-msg" role="status"></p>
  <dl aria-label="Summary">
    <dt>Subtotal</dt><dd data-testid="subtotal"></dd>
    <dt>Discount</dt><dd data-testid="discount"></dd>
    <dt>Shipping</dt><dd data-testid="shipping"></dd>
    <dt>Total</dt><dd data-testid="total"></dd>
  </dl>
</main>
<script src="app.js"></script>
</body></html>
```

**site/style.css**
```css
body { font-family: system-ui, sans-serif; background: #f6f7f9; margin: 0; }
main { max-width: 520px; margin: 40px auto; background: #fff; padding: 28px 32px;
  border-radius: 12px; box-shadow: 0 2px 12px #0001; }
table { width: 100%; border-collapse: collapse; }
td, th { text-align: left; padding: 6px 4px; }
input { font-size: 15px; padding: 4px 6px; }
input[type=number] { width: 60px; }
.sr { position: absolute; left: -9999px; }
dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; }
dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
#coupon-msg, #qty-error { min-height: 1.2em; color: #b00020; }
#coupon-msg.ok { color: #0a7a34; }
button { font-size: 15px; padding: 4px 12px; }
```

**site/app.js**
```js
// Tiny Shop checkout logic. Spec: SPEC.md
const PRICES = { beans: 12.5, mug: 8.0 };
const SHIPPING_FEE = 4.95;
const FREE_SHIPPING_FROM = 30; // subtotal after discount, inclusive
const MAX_QTY = 10;
const COUPONS = {
  SAVE20: { type: 'percent', value: 0.2 },
  FREESHIP: { type: 'shipping' },
};
let coupon = null;

const euro = (n) => '€' + n.toFixed(2);

function readQty(id) {
  const n = Number(document.getElementById(id).value);
  return Number.isInteger(n) ? n : NaN;
}

function render() {
  const qb = readQty('qty-beans'), qm = readQty('qty-mug');
  const err = document.getElementById('qty-error');
  const bad = [qb, qm].some((q) => !(q >= 1 && q <= MAX_QTY));
  if (bad) {
    err.textContent = 'Quantity must be between 1 and ' + MAX_QTY;
    err.hidden = false;
    ['subtotal', 'discount', 'shipping', 'total'].forEach((t) =>
      (document.querySelector(`[data-testid="${t}"]`).textContent = '—'));
    return;
  }
  err.hidden = true;
  const subtotal = qb * PRICES.beans + qm * PRICES.mug;
  const isPercent = coupon && coupon.type === 'percent';
  const discount = isPercent ? subtotal * coupon.value : 0;
  const afterDiscount = subtotal - discount;
  let shipping = afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  if (coupon && coupon.type === 'shipping') shipping = 0;
  const total = Math.round((afterDiscount + shipping) * 100) / 100;
  const set = (t, v) =>
    (document.querySelector(`[data-testid="${t}"]`).textContent = v);
  set('subtotal', euro(subtotal));
  set('discount', discount ? '−' + euro(discount) : euro(0));
  set('shipping', shipping ? euro(shipping) : 'Free');
  set('total', euro(total));
}

document.getElementById('coupon-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('coupon').value.trim().toUpperCase();
  const msg = document.getElementById('coupon-msg');
  if (COUPONS[code]) {
    coupon = COUPONS[code];
    msg.textContent = `Coupon ${code} applied`;
    msg.className = 'ok';
  } else {
    coupon = null;
    msg.textContent = 'Coupon not recognised';
    msg.className = '';
  }
  render();
});
['qty-beans', 'qty-mug'].forEach((id) =>
  document.getElementById(id).addEventListener('input', render));
render();
```

Look at it in a browser:

```bash
python3 -m http.server 4173 --directory site
# open http://localhost:4173 , then press Ctrl+C here to stop the server
```

You should see: 1 × beans + 1 × mug = €20.50, shipping €4.95, total €25.45. Two bags of beans: €33.00 with free shipping. Then SAVE20: −€6.60, which drops the subtotal under €30, so shipping comes back.

---

## Step 4: Configure Playwright

```bash
nano playwright.config.ts
```

**playwright.config.ts**
```ts
import { defineConfig } from '@playwright/test';
const port = Number(process.env.PORT || 4173);
export default defineConfig({
  testDir: './tests',
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory site`,
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: false,
    stderr: 'ignore',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

```bash
npx playwright test
```

You should see `Error: No tests found`. That's expected: the tests folder is still empty.

---

## Step 5: Write the skill (SKILL.md)

```bash
mkdir -p skills/playwright-test-writer/{scripts,reference}
nano skills/playwright-test-writer/SKILL.md
cat skills/playwright-test-writer/SKILL.md
```

**skills/playwright-test-writer/SKILL.md**
```markdown
---
name: playwright-test-writer
description: Write or extend Playwright end-to-end tests for a web page or feature. Use when the user asks to add, write, improve or fix Playwright, e2e or browser tests.
---

# Playwright test writer

## Workflow
1. Read the spec first (SPEC.md, README, ticket), then the page. Expected values come
   from the spec, never from whatever the page shows today.
2. List every rule as a behaviour before writing code. For each rule cover:
   - the happy path,
   - each boundary (just below, exactly at, just above),
   - invalid input and the exact error text,
   - interactions between rules (e.g. two discounts, replace vs. stack).
3. Write tests in tests/*.spec.ts:
   - locators: getByRole, getByLabel, getByText, or getByTestId. No CSS or XPath chains.
   - assertions: web-first only, e.g. `await expect(locator).toHaveText('€25.45')`.
   - assert exact values (full strings, two decimals), not "contains a number".
   - no waitForTimeout, no test.only, one behaviour per test, clear names.
4. Run `node .claude/skills/playwright-test-writer/scripts/check.mjs`
   (or the same path under .agents/skills). It runs the suite and lints for smells.
   Fix until it reports PASS.
5. Finish with a short table: rule -> test names.

See reference/patterns.md for locator and assertion examples.
```

- `name` must match the folder name.
- `description` decides **when** the agent loads the skill. Say what it does and when to use it, in the words a user would type.

---

## Step 6: Add the checker script and examples

```bash
nano skills/playwright-test-writer/scripts/check.mjs
nano skills/playwright-test-writer/reference/patterns.md
tree skills        # no tree? use: find skills
```

**skills/playwright-test-writer/scripts/check.mjs**
```js
#!/usr/bin/env node
// Runs the Playwright suite, then lints the specs for common test smells.
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const dir = 'tests';
const specs = readdirSync(dir).filter((f) => /\.spec\.(ts|js)$/.test(f));
const smells = [];
for (const f of specs) {
  const src = readFileSync(join(dir, f), 'utf8');
  const rules = [
    [/waitForTimeout\(/g, 'hard wait (waitForTimeout)'],
    [/test\.only\(/g, 'test.only left in'],
    [/expect\(\s*await\s/g, 'non-retrying assertion (expect(await ...))'],
    [/page\.(\$|\$\$)\(/g, 'page.$ query'],
    [/locator\(\s*['"`][^'"`]*(#|\.|>|nth-child|xpath=|\/\/)/g, 'CSS/XPath locator'],
  ];
  for (const [re, name] of rules) {
    const n = (src.match(re) || []).length;
    if (n) smells.push(`${f}: ${name} x${n}`);
  }
  const blocks = src.split(/\btest\(/).slice(1);
  blocks.forEach((b, i) => {
    if (!/expect\(/.test(b)) smells.push(`${f}: test #${i + 1} has no assertion`);
  });
}
const run = spawnSync('npx', ['playwright', 'test', '--reporter=line'], {
  stdio: 'inherit',
});
console.log('\n── test smells ──');
console.log(smells.length ? smells.join('\n') : 'none');
const ok = run.status === 0 && smells.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
```

**skills/playwright-test-writer/reference/patterns.md**
```markdown
# Patterns

Good:
```ts
await page.getByLabel('Coupon code').fill('save20');
await page.getByRole('button', { name: 'Apply' }).click();
await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
await expect(page.getByTestId('total')).toHaveText('€20.40');
```

Avoid:
```ts
await page.waitForTimeout(1000);                  // flaky
expect(await page.textContent('#total')).toContain('€'); // not web-first, weak
page.locator('main > dl dd:nth-child(8)');        // brittle CSS
```

Boundaries: if a rule says "from 30 inclusive", test 29.99-ish, exactly 30.00 and above.
```

You should see the finished folder: `SKILL.md`, `reference/patterns.md`, `scripts/check.mjs`.

---

## Step 7: Install the skill for both agents

Claude Code reads project skills from `.claude/skills/`, Codex from `.agents/skills/`. One folder, two symlinks:

```bash
mkdir -p .claude/skills .agents/skills
ln -s ../../skills/playwright-test-writer .claude/skills/playwright-test-writer
ln -s ../../skills/playwright-test-writer .agents/skills/playwright-test-writer
ls -l .claude/skills .agents/skills
git add -A && git commit -m "Add tinyshop and the playwright-test-writer skill"
```

If git says "Please tell me who you are", set your identity once and run the commit again:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git add -A && git commit -m "Add tinyshop and the playwright-test-writer skill"
```

Check that each agent sees the skill:

```text
claude            # trust the folder → type /skills → playwright-test-writer (project) → Esc → /exit
codex             # trust the folder → type /skills → List skills → playwright-test-writer → Esc → /quit
```

- Windows: create the links inside WSL (or copy the folder into both places).
- Global install (every project): copy the folder to `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Codex).

---

## Step 8: Let Claude Code write the tests

Make a branch so each agent's tests stay separate, then start Claude Code:

```bash
git switch -c claude-tests
claude --model sonnet        # any recent model works
```

Type this request. It never mentions the skill:

```text
Write Playwright tests for the checkout page in this repo. The page is in site/ and the spec is SPEC.md. Put the tests in tests/checkout.spec.ts and make sure they pass.
```

What happens (real run, 58 seconds):
- The first thing Claude does is `Skill(playwright-test-writer)`, "Successfully loaded skill". It matched the request to the skill's `description`.
- It reads SPEC.md, the page and `reference/patterns.md`, writes `tests/checkout.spec.ts`, runs `scripts/check.mjs`, and fixes a line it didn't like.
- It finishes with a rule → test table. It also notes that a total of exactly €30.00 can't be tested, because no cart can reach it with these prices.

Leave Claude and check its work yourself:

```text
/exit
```

```bash
npx playwright test
git add tests && git commit -m "Playwright tests written by Claude Code"
```

You should see `30 passed`. (Your count can differ: agents don't write the same tests every run.)

---

## Step 9: Same job, with Codex

```bash
git switch main
git switch -c codex-tests
codex
```

Paste the same request:

```text
Write Playwright tests for the checkout page in this repo. The page is in site/ and the spec is SPEC.md. Put the tests in tests/checkout.spec.ts and make sure they pass.
```

What happens (real run, 48 seconds):
- Codex explores the project and opens `.agents/skills/playwright-test-writer/SKILL.md`.
- Its first test run fails with `Error: Process from config.webServer was not able to start`. That's Codex's sandbox: by default it blocks network ports, so the local web server can't start.
- Codex asks to run the command outside the sandbox. Read the command (it's our own `check.mjs`), then press **Enter** for "Yes, proceed".
- It finishes with a rule → test list.

If Codex ever ignores the skill, name it in your request: `$playwright-test-writer write Playwright tests for …`

```text
/quit
```

```bash
npx playwright test
git add tests && git commit -m "Playwright tests written by Codex"
```

You should see `8 passed`. Both suites are green. Steps 10 and 11 show whether they would catch a real bug.

---

## Step 10: Break the app on purpose

```bash
git switch claude-tests
sed -i 's/value: 0.2 }/value: 0.02 }/' site/app.js
# macOS: sed -i '' 's/value: 0.2 }/value: 0.02 }/' site/app.js
git diff
```

SAVE20 now takes 2% instead of 20%. `git diff` shows the one changed number.

Keep test output out of git (recommended): Playwright rewrites `test-results/` on every run. Add a `.gitignore`:

```bash
echo 'test-results/' >> .gitignore
echo 'playwright-report/' >> .gitignore
git rm -r --cached test-results    # only if it was already committed
```

Run the suite:

```bash
npx playwright test
```

You should see red: `8 failed`, `22 passed`, and every failure involves SAVE20. The run is slow (about 45 s) because each failing check waits 5 s for the right value.

Read one failure in full:

```bash
npx playwright test -g "SAVE20 takes"
```

```text
Expected: "−€4.10"
Received: "−€0.41"
```

Put the real code back and check that everything is green:

```bash
git checkout -- site/app.js
npx playwright test --reporter=dot
```

You should see `30 passed`.

---

## Step 11: Measure: plant 7 bugs automatically

```bash
mkdir tools
nano tools/bugcheck.mjs
```

**tools/bugcheck.mjs**
```js
#!/usr/bin/env node
// Plants known bugs in site/app.js one at a time and checks whether
// the test suite catches each one (caught = at least one test fails).
// The original app.js is always restored at the end.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILE = 'site/app.js';
const BUGS = [
  ['SAVE20 gives 2% instead of 20%', 'value: 0.2 }', 'value: 0.02 }'],
  ['Free shipping only above 30, not at 30',
    'afterDiscount >= FREE_SHIPPING_FROM', 'afterDiscount > FREE_SHIPPING_FROM'],
  ['Quantity 11 is accepted', 'q <= MAX_QTY)', 'q <= MAX_QTY + 1)'],
  ['Coupon codes are case-sensitive', '.trim().toUpperCase()', '.trim()'],
  ['A bad code keeps the old coupon', 'coupon = null;\n    msg', 'msg'],
  ['Shipping uses the pre-discount subtotal',
    'afterDiscount >= FREE_SHIPPING_FROM', 'subtotal >= FREE_SHIPPING_FROM'],
  ['FREESHIP does nothing', "if (coupon && coupon.type === 'shipping')", 'if (false)'],
];

function runSuite() {
  const r = spawnSync('npx', ['playwright', 'test', '--reporter=json'],
    { encoding: 'utf8', maxBuffer: 64e6 });
  try {
    const s = JSON.parse(r.stdout).stats;
    return { ok: r.status === 0, failed: s.unexpected + s.flaky, passed: s.expected };
  } catch {
    return { ok: false, failed: -1, passed: 0 };
  }
}

const original = readFileSync(FILE, 'utf8');
const restore = () => writeFileSync(FILE, original);
process.on('SIGINT', () => { restore(); process.exit(130); });

const base = runSuite();
if (!base.ok) {
  console.log('Fix the suite first: it must pass on the real app.');
  process.exit(1);
}
console.log(`Real app: ${base.passed} tests pass\n`);

let caught = 0;
try {
  BUGS.forEach(([name, from, to], i) => {
    if (!original.includes(from)) throw new Error(`bug ${i + 1}: code not found`);
    writeFileSync(FILE, original.replace(from, to));
    const r = runSuite();
    if (!r.ok) caught++;
    const result = r.ok ? '\x1b[31mMISSED\x1b[0m  all tests pass'
                        : `\x1b[32mCAUGHT\x1b[0m  ${r.failed} failing`;
    console.log(`${String(i + 1).padStart(2)}  ${name.padEnd(42)} ${result}`);
  });
} finally {
  restore();
}
console.log(`\nCaught ${caught} of ${BUGS.length} planted bugs`);
```

```bash
node tools/bugcheck.mjs            # on claude-tests
git switch codex-tests
node tools/bugcheck.mjs            # same script, Codex tests
```

What we got:

| # | Planted bug | Claude's 30 tests | Codex's 8 tests |
|---|---|---|---|
| 1 | SAVE20 gives 2% instead of 20% | caught | caught |
| 2 | Free shipping only above €30, not at €30 | missed | missed |
| 3 | Quantity 11 is accepted | caught | caught |
| 4 | Coupon codes are case-sensitive | caught | caught |
| 5 | A bad code keeps the old coupon | caught | caught |
| 6 | Shipping uses the pre-discount subtotal | caught | **missed** |
| 7 | FREESHIP does nothing | caught | caught |
| | **Total** | **6 of 7** | **5 of 7** |

Bug 2 can't be caught on this page. Prices are €12.50 and €8.00, so no cart totals exactly €30.00 (before or after SAVE20), and "≥ 30" and "> 30" behave the same. That's why the experiment scores out of 6.

---

## Results: the 20-run experiment

Before recording, the same experiment ran 20 times: Claude Code and Codex, each with and without the skill, 5 runs per cell, same prompt and same page. For the "without" runs, the project had no `.claude/skills` or `.agents/skills` folders. Each suite was scored with the same 7 planted bugs, with bug 2 excluded.

```bash
python3 experiment/report.py
```

| Agent | Skill | Bugs caught per run (of 6) | Average | Tests per run | Runs with CSS locators |
|---|---|---|---|---|---|
| Claude Code | without | 6 6 6 6 6 | 6.0 | 17.4 | 2 of 5 |
| Claude Code | with | 6 6 6 6 6 | 6.0 | 21.6 | 0 of 5 |
| Codex | without | 5 5 4 4 4 | 4.4 | 5.0 | 2 of 5 |
| Codex | with | 6 5 6 6 6 | 5.8 | 8.0 | 1 of 5 |

- Codex: 4.4 → 5.8 bugs caught with the skill.
- Claude Code: 6 → 6. The skill didn't change the score, but it did change the tests: more of them, and no fragile CSS selectors.
- This is 20 runs on one small page. It's a reason to try skills, not a benchmark.

**experiment/report.py**
```python
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
```

`experiment/scores.jsonl` has one JSON object per run, for example `claude_noskill_1`: tests passing on the real app, `caught` (bug → true/false), `tests_written`, `hard_waits`, `css_locators` and `score`. All 20 lines are in [`tinyshop/experiment/scores.jsonl`](tinyshop/experiment/scores.jsonl), and the 20 generated suites are in [`tinyshop/experiment/suites/`](tinyshop/experiment/suites/).

---

## What to try next

- **Make the skill global** (every project): copy `skills/playwright-test-writer` into `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Codex).
- **Run the bug check on your own app**: swap in the bugs you're most afraid of.
- **Write a second skill** for something you keep explaining to agents. Start with the `description`, because it decides when the skill loads.

## Recap checklist

- [ ] Installed Claude Code and Codex (Step 1)
- [ ] Built tinyshop with SPEC.md and the checkout page (Steps 2–3)
- [ ] Configured Playwright (Step 4)
- [ ] Wrote SKILL.md, check.mjs and patterns.md (Steps 5–6)
- [ ] Linked the skill for both agents and checked that each one sees it (Step 7)
- [ ] Both agents wrote passing tests without being told about the skill (Steps 8–9)
- [ ] Broke the app by hand and read the failure (Step 10)
- [ ] Planted bugs to measure the tests (Step 11)
