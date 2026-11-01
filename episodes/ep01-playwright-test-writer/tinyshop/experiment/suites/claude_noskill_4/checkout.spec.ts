import { test, expect, Page } from '@playwright/test';

const beans = (p: Page) => p.getByLabel('Coffee beans quantity');
const mug = (p: Page) => p.getByLabel('Mug quantity');
const cell = (p: Page, id: string) => p.getByTestId(id);

async function setQty(p: Page, b: string, m: string) {
  await beans(p).fill(b);
  await mug(p).fill(m);
}
async function applyCoupon(p: Page, code: string) {
  await p.getByLabel('Coupon code').fill(code);
  await p.getByRole('button', { name: 'Apply' }).click();
}
async function expectSummary(p: Page, s: { subtotal: string; discount: string; shipping: string; total: string }) {
  for (const k of ['subtotal', 'discount', 'shipping', 'total'] as const) {
    await expect(cell(p, k)).toHaveText(s[k]);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('defaults', () => {
  test('quantities start at 1 and summary matches spec example', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
    await expect(page.locator('#qty-error')).toBeHidden();
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });
});

test.describe('quantities', () => {
  test('updates summary when quantities change', async ({ page }) => {
    await setQty(page, '3', '2');
    await expectSummary(page, { subtotal: '€53.50', discount: '€0.00', shipping: 'Free', total: '€53.50' });
  });

  test('accepts boundary values 1 and 10', async ({ page }) => {
    await setQty(page, '10', '10');
    await expect(page.locator('#qty-error')).toBeHidden();
    await expect(cell(page, 'subtotal')).toHaveText('€205.00');
    await setQty(page, '1', '1');
    await expect(cell(page, 'subtotal')).toHaveText('€20.50');
  });

  for (const bad of ['0', '11', '-1', '1.5', '']) {
    test(`rejects beans quantity "${bad}"`, async ({ page }) => {
      await setQty(page, bad, '1');
      await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
      await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
    });
  }

  test('rejects invalid mug quantity and recovers when fixed', async ({ page }) => {
    await setQty(page, '1', '11');
    await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
    await expect(cell(page, 'total')).toHaveText('—');
    await mug(page).fill('2');
    await expect(page.locator('#qty-error')).toBeHidden();
    await expect(cell(page, 'total')).toHaveText('€33.45');
  });
});

test.describe('shipping', () => {
  test('charged below the €30 threshold', async ({ page }) => {
    await setQty(page, '1', '2'); // 28.50
    await expectSummary(page, { subtotal: '€28.50', discount: '€0.00', shipping: '€4.95', total: '€33.45' });
  });

  test('free above the threshold', async ({ page }) => {
    await setQty(page, '2', '1'); // 33.00
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });
});

test.describe('coupons', () => {
  test('SAVE20 gives 20% off', async ({ page }) => {
    await setQty(page, '3', '1'); // 45.50
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expectSummary(page, { subtotal: '€45.50', discount: '−€9.10', shipping: 'Free', total: '€36.40' });
  });

  test('SAVE20 on default cart', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('free-shipping threshold uses subtotal after discount', async ({ page }) => {
    await setQty(page, '2', '1'); // 33.00 -> 26.40 after discount
    await expect(cell(page, 'shipping')).toHaveText('Free');
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€33.00', discount: '−€6.60', shipping: '€4.95', total: '€31.35' });
  });

  test('FREESHIP makes shipping free without discount', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('codes are case-insensitive and trimmed', async ({ page }) => {
    await applyCoupon(page, '  save20 ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(cell(page, 'discount')).toHaveText('−€4.10');
    await applyCoupon(page, ' FreeShip');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(cell(page, 'shipping')).toHaveText('Free');
  });

  test('unknown code shows message and applies nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  });

  test('a new coupon replaces the old one (SAVE20 -> FREESHIP)', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('a new coupon replaces the old one (FREESHIP -> SAVE20)', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('an unrecognised code clears the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'NOPE');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('coupon persists when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, '3', '1');
    await expectSummary(page, { subtotal: '€45.50', discount: '−€9.10', shipping: 'Free', total: '€36.40' });
  });
});
