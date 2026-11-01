import { test, expect, Page } from '@playwright/test';

const QTY_ERROR = 'Quantity must be between 1 and 10';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

async function setQty(page: Page, item: 'Coffee beans' | 'Mug', qty: string) {
  await page.getByLabel(`${item} quantity`).fill(qty);
}

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.describe('cart and totals', () => {
  test('default cart of one coffee beans and one mug totals €25.45', async ({ page }) => {
    await expect(page.getByLabel('Coffee beans quantity')).toHaveValue('1');
    await expect(page.getByLabel('Mug quantity')).toHaveValue('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('changing quantities updates the subtotal and total', async ({ page }) => {
    await setQty(page, 'Coffee beans', '3');
    await setQty(page, 'Mug', '2');
    await expect(page.getByTestId('subtotal')).toHaveText('€53.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€53.50');
  });
});

test.describe('quantity validation', () => {
  test('maximum quantity of 10 for both items is accepted', async ({ page }) => {
    await setQty(page, 'Coffee beans', '10');
    await setQty(page, 'Mug', '10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€205.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€205.00');
  });

  for (const [item, qty] of [
    ['Coffee beans', '11'],
    ['Coffee beans', '0'],
    ['Coffee beans', '-1'],
    ['Coffee beans', '1.5'],
    ['Coffee beans', ''],
    ['Mug', '11'],
    ['Mug', '0'],
    ['Mug', '-1'],
    ['Mug', '1.5'],
    ['Mug', ''],
  ] as const) {
    test(`${item} quantity "${qty}" shows the error and dashes`, async ({ page }) => {
      await setQty(page, item, qty);
      await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
      await expect(page.getByTestId('subtotal')).toHaveText('—');
      await expect(page.getByTestId('discount')).toHaveText('—');
      await expect(page.getByTestId('shipping')).toHaveText('—');
      await expect(page.getByTestId('total')).toHaveText('—');
    });
  }

  test('correcting an invalid quantity clears the error and restores the summary', async ({ page }) => {
    await setQty(page, 'Mug', '11');
    await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
    await setQty(page, 'Mug', '10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€92.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€92.50');
  });
});

test.describe('coupons', () => {
  test('SAVE20 takes 20% off the subtotal', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('FREESHIP makes shipping free', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('coupon code is case-insensitive', async ({ page }) => {
    await applyCoupon(page, 'save20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('surrounding spaces around the coupon code are ignored', async ({ page }) => {
    await applyCoupon(page, '  freeship  ');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
  });

  test('unknown coupon shows "Coupon not recognised" and changes nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('empty coupon code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('an unknown code after a valid one removes the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
    await applyCoupon(page, 'NOPE');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('applying FREESHIP replaces SAVE20 instead of stacking', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('applying SAVE20 replaces FREESHIP instead of stacking', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('SAVE20 stays active when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, 'Coffee beans', '2');
    await setQty(page, 'Mug', '2');
    await expect(page.getByTestId('subtotal')).toHaveText('€41.00');
    await expect(page.getByTestId('discount')).toHaveText('−€8.20');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€32.80');
  });

  test('quantity error hides coupon-adjusted values too', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, 'Mug', '0');
    await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');
  });
});

test.describe('shipping threshold (€30.00 after discount, inclusive)', () => {
  test('subtotal €28.50 pays €4.95 shipping', async ({ page }) => {
    await setQty(page, 'Mug', '2');
    await expect(page.getByTestId('subtotal')).toHaveText('€28.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€33.45');
  });

  test('subtotal €33.00 ships free', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€33.00');
  });

  test('discounted amount €29.20 (subtotal €36.50) still pays shipping', async ({ page }) => {
    await setQty(page, 'Mug', '3');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€36.50');
    await expect(page.getByTestId('discount')).toHaveText('−€7.30');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€34.15');
  });

  test('discount that drops a €33.00 subtotal to €26.40 brings shipping back', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('−€6.60');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€31.35');
  });

  test('discounted amount €32.80 is above the threshold and ships free', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2');
    await setQty(page, 'Mug', '2');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€41.00');
    await expect(page.getByTestId('discount')).toHaveText('−€8.20');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€32.80');
  });
});
