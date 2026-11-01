import { test, expect, Page } from '@playwright/test';

const val = (page: Page, id: string) => page.getByTestId(id);

async function setQty(page: Page, beans: string, mug: string) {
  await page.getByLabel('Coffee beans quantity').fill(beans);
  await page.getByLabel('Mug quantity').fill(mug);
}

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

async function expectSummary(
  page: Page,
  s: { subtotal: string; discount: string; shipping: string; total: string },
) {
  await expect(val(page, 'subtotal')).toHaveText(s.subtotal);
  await expect(val(page, 'discount')).toHaveText(s.discount);
  await expect(val(page, 'shipping')).toHaveText(s.shipping);
  await expect(val(page, 'total')).toHaveText(s.total);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('defaults', () => {
  test('quantities start at 1 and summary is computed', async ({ page }) => {
    await expect(page.getByLabel('Coffee beans quantity')).toHaveValue('1');
    await expect(page.getByLabel('Mug quantity')).toHaveValue('1');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
    await expect(page.getByRole('alert')).toBeHidden();
  });
});

test.describe('quantities', () => {
  test('updates totals as quantity changes', async ({ page }) => {
    await setQty(page, '2', '3');
    await expectSummary(page, { subtotal: '€49.00', discount: '€0.00', shipping: 'Free', total: '€49.00' });
  });

  test('accepts boundary values 1 and 10', async ({ page }) => {
    await setQty(page, '10', '10');
    await expectSummary(page, { subtotal: '€205.00', discount: '€0.00', shipping: 'Free', total: '€205.00' });
    await expect(page.getByRole('alert')).toBeHidden();
    await setQty(page, '1', '1');
    await expect(val(page, 'total')).toHaveText('€25.45');
  });

  for (const [beans, mug] of [['0', '1'], ['11', '1'], ['1', '0'], ['1', '11'], ['-1', '1'], ['1.5', '1'], ['', '1']]) {
    test(`rejects invalid quantity beans="${beans}" mug="${mug}"`, async ({ page }) => {
      await setQty(page, beans, mug);
      await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
      await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
    });
  }

  test('recovers after an invalid quantity is corrected', async ({ page }) => {
    await setQty(page, '11', '1');
    await expect(page.getByRole('alert')).toBeVisible();
    await setQty(page, '1', '1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(val(page, 'total')).toHaveText('€25.45');
  });
});

test.describe('shipping threshold', () => {
  test('charged just below €30.00', async ({ page }) => {
    await setQty(page, '1', '2'); // 28.50
    await expectSummary(page, { subtotal: '€28.50', discount: '€0.00', shipping: '€4.95', total: '€33.45' });
  });

  test('free at or above €30.00', async ({ page }) => {
    await setQty(page, '2', '1'); // 33.00
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });

  test('threshold applies to subtotal after discount', async ({ page }) => {
    // 33.00 subtotal -> 26.40 after SAVE20 -> shipping charged
    await setQty(page, '2', '1');
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€33.00', discount: '−€6.60', shipping: '€4.95', total: '€31.35' });
  });

  test('free shipping when discounted subtotal is still ≥ €30', async ({ page }) => {
    await setQty(page, '3', '1'); // 45.50 -> 36.40
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€45.50', discount: '−€9.10', shipping: 'Free', total: '€36.40' });
  });
});

test.describe('coupons', () => {
  test('SAVE20 gives 20% off', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('FREESHIP makes shipping free', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('codes are case-insensitive and trimmed', async ({ page }) => {
    await applyCoupon(page, '  save20  ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(val(page, 'discount')).toHaveText('−€4.10');
    await applyCoupon(page, ' FreeShip ');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(val(page, 'shipping')).toHaveText('Free');
  });

  test('unknown code is rejected', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(val(page, 'total')).toHaveText('€25.45');
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

  test('unrecognised code clears an active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'NOPE');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('active coupon follows quantity changes', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, '4', '2'); // 66.00 -> 52.80
    await expectSummary(page, { subtotal: '€66.00', discount: '−€13.20', shipping: 'Free', total: '€52.80' });
  });

  test('pressing Enter in the coupon field applies it', async ({ page }) => {
    await page.getByLabel('Coupon code').fill('SAVE20');
    await page.getByLabel('Coupon code').press('Enter');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  });
});
