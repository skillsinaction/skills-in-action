import { test, expect, Page } from '@playwright/test';

const beans = (page: Page) => page.getByLabel('Coffee beans quantity');
const mug = (page: Page) => page.getByLabel('Mug quantity');
const qtyError = (page: Page) => page.getByRole('alert');
const summary = (page: Page) => page.getByRole('definition');
const couponMsg = (page: Page) => page.getByRole('status');

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('cart and totals', () => {
  test('default cart of one of each shows €25.45 total', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
    await expect(qtyError(page)).toBeHidden();
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('changing quantities updates subtotal and total', async ({ page }) => {
    await beans(page).fill('2');
    await mug(page).fill('3');
    // 25.00 + 24.00 = 49.00, free shipping
    await expect(summary(page)).toHaveText(['€49.00', '€0.00', 'Free', '€49.00']);
  });
});

test.describe('quantity validation', () => {
  test('minimum quantity of 1 and maximum of 10 are accepted', async ({ page }) => {
    await beans(page).fill('10');
    await mug(page).fill('10');
    await expect(qtyError(page)).toBeHidden();
    await expect(summary(page)).toHaveText(['€205.00', '€0.00', 'Free', '€205.00']);
  });

  for (const [label, value] of [
    ['0', '0'],
    ['11', '11'],
    ['negative', '-1'],
    ['non-whole', '1.5'],
    ['empty', ''],
  ]) {
    test(`beans quantity ${label} shows error and dashes`, async ({ page }) => {
      await beans(page).fill(value);
      await expect(qtyError(page)).toHaveText('Quantity must be between 1 and 10');
      await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
    });
  }

  test('mug quantity 11 shows error and dashes', async ({ page }) => {
    await mug(page).fill('11');
    await expect(qtyError(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
  });

  test('correcting an invalid quantity restores the summary and hides the error', async ({ page }) => {
    await mug(page).fill('0');
    await expect(qtyError(page)).toBeVisible();
    await mug(page).fill('1');
    await expect(qtyError(page)).toBeHidden();
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });
});

test.describe('shipping threshold', () => {
  test('subtotal just below €30.00 is charged €4.95 shipping', async ({ page }) => {
    await mug(page).fill('2'); // 12.50 + 16.00 = 28.50
    await expect(summary(page)).toHaveText(['€28.50', '€0.00', '€4.95', '€33.45']);
  });

  test('subtotal above €30.00 ships free', async ({ page }) => {
    await beans(page).fill('2'); // 25.00 + 8.00 = 33.00
    await expect(summary(page)).toHaveText(['€33.00', '€0.00', 'Free', '€33.00']);
  });

  // Exactly €30.00 is not reachable with these prices (12.5a + 8b = 30 has no
  // integer solution), so the threshold is checked on both sides via discounts.
  test('discounted subtotal just below €30.00 is charged shipping', async ({ page }) => {
    await mug(page).fill('3'); // 36.50 -> 29.20 after SAVE20
    await applyCoupon(page, 'SAVE20');
    await expect(summary(page)).toHaveText(['€36.50', '−€7.30', '€4.95', '€34.15']);
  });

  test('discounted subtotal above €30.00 ships free', async ({ page }) => {
    await beans(page).fill('3'); // 45.50 -> 36.40 after SAVE20
    await applyCoupon(page, 'SAVE20');
    await expect(summary(page)).toHaveText(['€45.50', '−€9.10', 'Free', '€36.40']);
  });
});

test.describe('coupons', () => {
  test('SAVE20 takes 20% off the subtotal', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(couponMsg(page)).toHaveText('Coupon SAVE20 applied');
    await expect(summary(page)).toHaveText(['€20.50', '−€4.10', '€4.95', '€21.35']);
  });

  test('FREESHIP makes shipping free without a discount', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(couponMsg(page)).toHaveText('Coupon FREESHIP applied');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', 'Free', '€20.50']);
  });

  test('coupon code is case-insensitive', async ({ page }) => {
    await applyCoupon(page, 'save20');
    await expect(couponMsg(page)).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('surrounding spaces in the coupon code are ignored', async ({ page }) => {
    await applyCoupon(page, '  freeship  ');
    await expect(couponMsg(page)).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
  });

  test('unknown coupon shows not-recognised message and changes nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(couponMsg(page)).toHaveText('Coupon not recognised');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('unknown coupon deactivates a previously applied coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'BOGUS');
    await expect(couponMsg(page)).toHaveText('Coupon not recognised');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('FREESHIP replaces SAVE20 rather than stacking', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', 'Free', '€20.50']);
  });

  test('SAVE20 replaces FREESHIP rather than stacking', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expect(summary(page)).toHaveText(['€20.50', '−€4.10', '€4.95', '€21.35']);
  });

  test('applied coupon is recalculated when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await beans(page).fill('2'); // 33.00 -> 26.40 after discount, shipping charged
    await expect(summary(page)).toHaveText(['€33.00', '−€6.60', '€4.95', '€31.35']);
  });

  test('coupon stays active while quantity is invalid and applies once corrected', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await beans(page).fill('0');
    await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
    await beans(page).fill('1');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', 'Free', '€20.50']);
  });
});
