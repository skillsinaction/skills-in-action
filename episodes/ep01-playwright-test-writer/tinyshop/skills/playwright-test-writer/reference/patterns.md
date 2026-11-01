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

