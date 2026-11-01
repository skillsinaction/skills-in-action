import { test, expect, Page } from '@playwright/test';

const beans = (p: Page) => p.getByLabel('Coffee beans quantity');
const mug = (p: Page) => p.getByLabel('Mug quantity');

async function setQty(page: Page, b: string, m: string) {
  await beans(page).fill(b);
  await mug(page).fill(m);
}
async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('defaults', () => {
  test('quantities start at 1 and summary shows default totals', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });
});

test.describe('quantity validation', () => {
  const error = (p: Page) => p.getByRole('alert');

  test('minimum quantity 1 is accepted', async ({ page }) => {
    await setQty(page, '1', '1');
    await expect(error(page)).toBeHidden();
  });

  test('maximum quantity 10 is accepted and totals are computed', async ({ page }) => {
    await setQty(page, '10', '10');
    await expect(error(page)).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€205.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€205.00');
  });

  test('quantity 0 shows error and dashes', async ({ page }) => {
    await setQty(page, '0', '1');
    await expect(error(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });

  test('quantity 11 shows error and dashes', async ({ page }) => {
    await setQty(page, '1', '11');
    await expect(error(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });

  test('negative quantity shows error', async ({ page }) => {
    await setQty(page, '-1', '1');
    await expect(error(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });

  test('non-whole quantity shows error', async ({ page }) => {
    await setQty(page, '1.5', '1');
    await expect(error(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });

  test('empty quantity shows error', async ({ page }) => {
    await setQty(page, '', '1');
    await expect(error(page)).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });

  test('fixing an invalid quantity restores the summary', async ({ page }) => {
    await setQty(page, '11', '1');
    await expect(error(page)).toBeVisible();
    await beans(page).fill('2');
    await expect(error(page)).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€33.00');
  });
});

test.describe('coupons', () => {
  const status = (p: Page) => p.getByRole('status');

  test('SAVE20 gives 20% off the subtotal', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(status(page)).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('FREESHIP makes shipping free', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(status(page)).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('coupon code is case-insensitive and spaces are ignored', async ({ page }) => {
    await applyCoupon(page, '  save20  ');
    await expect(status(page)).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('lowercase freeship is accepted', async ({ page }) => {
    await applyCoupon(page, 'freeship');
    await expect(status(page)).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
  });

  test('unknown code shows not recognised and no discount', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(status(page)).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(status(page)).toHaveText('Coupon not recognised');
  });

  test('FREESHIP replaces SAVE20 (no discount remains)', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('SAVE20 replaces FREESHIP (shipping charged again)', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('unrecognised code removes the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'NOPE');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('coupon stays applied when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await beans(page).fill('2');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('−€6.60');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€31.35');
  });
});

test.describe('shipping threshold', () => {
  test('subtotal just below €30 pays shipping', async ({ page }) => {
    await setQty(page, '1', '2'); // 28.50
    await expect(page.getByTestId('subtotal')).toHaveText('€28.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€33.45');
  });

  test('subtotal above €30 ships free', async ({ page }) => {
    await setQty(page, '2', '1'); // 33.00
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€33.00');
  });

  test('threshold applies to subtotal after discount: 33.00 − 20% = 26.40 pays shipping', async ({ page }) => {
    await setQty(page, '2', '1');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('−€6.60');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€31.35');
  });

  test('after-discount amount above €30 ships free: 45.50 − 20% = 36.40', async ({ page }) => {
    await setQty(page, '3', '1');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€45.50');
    await expect(page.getByTestId('discount')).toHaveText('−€9.10');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€36.40');
  });
});
