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

