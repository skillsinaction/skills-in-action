import { test, expect, Page } from '@playwright/test';

const beans = (p: Page) => p.getByLabel('Coffee beans quantity');
const mug = (p: Page) => p.getByLabel('Mug quantity');
const t = (p: Page, id: string) => p.getByTestId(id);

async function setQty(p: Page, b: string, m: string) {
  await beans(p).fill(b);
  await mug(p).fill(m);
}
async function apply(p: Page, code: string) {
  await p.getByLabel('Coupon code').fill(code);
  await p.getByRole('button', { name: 'Apply' }).click();
}
async function expectSummary(p: Page, s: { subtotal: string; discount: string; shipping: string; total: string }) {
  for (const k of ['subtotal', 'discount', 'shipping', 'total'] as const) {
    await expect(t(p, k)).toHaveText(s[k]);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('initial state: quantities 1, default summary', async ({ page }) => {
  await expect(beans(page)).toHaveValue('1');
  await expect(mug(page)).toHaveValue('1');
  await expect(page.locator('#qty-error')).toBeHidden();
  await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
});

test('quantity change updates summary and free shipping at €30+', async ({ page }) => {
  await setQty(page, '2', '1'); // 33.00
  await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  await setQty(page, '1', '2'); // 28.50
  await expectSummary(page, { subtotal: '€28.50', discount: '€0.00', shipping: '€4.95', total: '€33.45' });
});

test('max quantities are accepted', async ({ page }) => {
  await setQty(page, '10', '10');
  await expect(page.locator('#qty-error')).toBeHidden();
  await expectSummary(page, { subtotal: '€205.00', discount: '€0.00', shipping: 'Free', total: '€205.00' });
});

for (const [name, b, m] of [
  ['zero beans', '0', '1'],
  ['eleven beans', '11', '1'],
  ['negative mug', '1', '-1'],
  ['mug above max', '1', '11'],
  ['fractional qty', '1.5', '1'],
  ['empty qty', '', '1'],
] as const) {
  test(`invalid quantity (${name}) shows error and dashes`, async ({ page }) => {
    await setQty(page, b, m);
    await expect(page.locator('#qty-error')).toHaveText('Quantity must be between 1 and 10');
    await expect(page.locator('#qty-error')).toBeVisible();
    await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
  });
}

test('error clears when quantity is corrected', async ({ page }) => {
  await setQty(page, '0', '1');
  await expect(page.locator('#qty-error')).toBeVisible();
  await beans(page).fill('1');
  await expect(page.locator('#qty-error')).toBeHidden();
  await expect(t(page, 'total')).toHaveText('€25.45');
});

test('SAVE20 gives 20% off', async ({ page }) => {
  await apply(page, 'SAVE20');
  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
});

test('SAVE20 makes shipping free only if subtotal after discount ≥ €30', async ({ page }) => {
  await setQty(page, '2', '2'); // 41.00 -> 32.80 after discount
  await apply(page, 'SAVE20');
  await expectSummary(page, { subtotal: '€41.00', discount: '−€8.20', shipping: 'Free', total: '€32.80' });
  await setQty(page, '2', '1'); // 33.00 -> 26.40 after discount, below threshold
  await expectSummary(page, { subtotal: '€33.00', discount: '−€6.60', shipping: '€4.95', total: '€31.35' });
});

test('FREESHIP makes shipping free', async ({ page }) => {
  await apply(page, 'FREESHIP');
  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
});

test('coupon codes are case-insensitive and trim spaces', async ({ page }) => {
  await apply(page, '  save20 ');
  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(t(page, 'discount')).toHaveText('−€4.10');
  await apply(page, ' FreeShip');
  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expect(t(page, 'shipping')).toHaveText('Free');
});

test('applying a new coupon replaces the old one', async ({ page }) => {
  await apply(page, 'SAVE20');
  await apply(page, 'FREESHIP');
  await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  await apply(page, 'SAVE20');
  await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
});

test('unrecognised code shows message and removes active coupon', async ({ page }) => {
  await apply(page, 'SAVE20');
  await apply(page, 'BOGUS');
  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
});

test('empty coupon is not recognised', async ({ page }) => {
  await apply(page, '');
  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
});

test('coupon persists across quantity changes', async ({ page }) => {
  await apply(page, 'SAVE20');
  await setQty(page, '10', '10');
  await expectSummary(page, { subtotal: '€205.00', discount: '−€41.00', shipping: 'Free', total: '€164.00' });
});
