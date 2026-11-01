import { test, expect, Page } from '@playwright/test';

const beans = (p: Page) => p.getByLabel('Coffee beans quantity');
const mug = (p: Page) => p.getByLabel('Mug quantity');
const row = (p: Page, id: string) => p.getByTestId(id);

async function expectSummary(
  p: Page,
  s: { subtotal: string; discount: string; shipping: string; total: string },
) {
  await expect(row(p, 'subtotal')).toHaveText(s.subtotal);
  await expect(row(p, 'discount')).toHaveText(s.discount);
  await expect(row(p, 'shipping')).toHaveText(s.shipping);
  await expect(row(p, 'total')).toHaveText(s.total);
}

async function applyCoupon(p: Page, code: string) {
  await p.getByLabel('Coupon code').fill(code);
  await p.getByRole('button', { name: 'Apply' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('defaults', () => {
  test('quantities start at 1 and summary is correct', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });
});

test.describe('quantity validation', () => {
  for (const bad of ['0', '11', '-1', '1.5', '']) {
    test(`beans quantity "${bad}" is rejected`, async ({ page }) => {
      await beans(page).fill(bad);
      await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
      await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
    });
  }

  test('mug quantity out of range is rejected', async ({ page }) => {
    await mug(page).fill('11');
    await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
    await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
  });

  for (const ok of ['1', '10']) {
    test(`boundary quantity ${ok} is accepted`, async ({ page }) => {
      await beans(page).fill(ok);
      await expect(page.getByRole('alert')).toBeHidden();
      await expect(row(page, 'subtotal')).toHaveText(`€${(12.5 * Number(ok) + 8).toFixed(2)}`);
    });
  }

  test('recovers after correcting an invalid quantity', async ({ page }) => {
    await beans(page).fill('0');
    await expect(page.getByRole('alert')).toBeVisible();
    await beans(page).fill('2');
    await expect(page.getByRole('alert')).toBeHidden();
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });

  test('invalid quantity hides totals even with a coupon active', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await mug(page).fill('99');
    await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
  });
});

test.describe('shipping', () => {
  test('charged below €30', async ({ page }) => {
    await expect(row(page, 'shipping')).toHaveText('€4.95');
  });

  test('free at/above €30 subtotal', async ({ page }) => {
    await beans(page).fill('2'); // 25 + 8 = 33
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });

  test('threshold uses subtotal after discount', async ({ page }) => {
    await beans(page).fill('2'); // 33 -> 26.40 after SAVE20
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€33.00', discount: '−€6.60', shipping: '€4.95', total: '€31.35' });
  });

  test('discounted subtotal still ≥ €30 ships free', async ({ page }) => {
    await beans(page).fill('4'); // 50 + 8 = 58 -> 46.40
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€58.00', discount: '−€11.60', shipping: 'Free', total: '€46.40' });
  });
});

test.describe('coupons', () => {
  test('SAVE20 gives 20% off', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('FREESHIP removes shipping', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('codes are case-insensitive and trimmed', async ({ page }) => {
    await applyCoupon(page, '  save20 ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(row(page, 'discount')).toHaveText('−€4.10');
    await applyCoupon(page, ' FreeShip');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(row(page, 'shipping')).toHaveText('Free');
  });

  test('unknown code is rejected', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  });

  test('new coupon replaces the old one (SAVE20 -> FREESHIP)', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('new coupon replaces the old one (FREESHIP -> SAVE20)', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('unrecognised code removes the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'NOPE');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('coupon is recalculated when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await mug(page).fill('3'); // 12.5 + 24 = 36.5 -> 29.20 -> shipping charged
    await expectSummary(page, { subtotal: '€36.50', discount: '−€7.30', shipping: '€4.95', total: '€34.15' });
  });
});
