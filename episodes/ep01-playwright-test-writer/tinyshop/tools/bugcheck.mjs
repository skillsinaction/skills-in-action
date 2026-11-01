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

