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

