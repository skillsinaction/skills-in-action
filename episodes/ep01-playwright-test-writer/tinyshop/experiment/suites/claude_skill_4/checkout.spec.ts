import { test, expect, Page } from '@playwright/test';

const QTY_ERROR = 'Quantity must be between 1 and 10';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

async function setQty(page: Page, item: 'Coffee beans' | 'Mug', value: string) {
  await page.getByLabel(`${item} quantity`).fill(value);
}

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

function summary(page: Page) {
  return page.getByLabel('Summary').getByRole('definition'); // subtotal, discount, shipping, total
}

test.describe('default cart', () => {
  test('starts with quantity 1 for each item and the default summary', async ({ page }) => {
    await expect(page.getByLabel('Coffee beans quantity')).toHaveValue('1');
    await expect(page.getByLabel('Mug quantity')).toHaveValue('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });
});

test.describe('quantity validation', () => {
  for (const [label, value] of [
    ['zero', '0'],
    ['above the maximum', '11'],
    ['negative', '-1'],
    ['fractional', '1.5'],
    ['empty', ''],
  ]) {
    test(`beans quantity ${label} shows the error and dashes`, async ({ page }) => {
      await setQty(page, 'Coffee beans', value);
      await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
      await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
    });
  }

  test('mug quantity above the maximum shows the error and dashes', async ({ page }) => {
    await setQty(page, 'Mug', '11');
    await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
    await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
  });

  test('mug quantity zero shows the error and dashes', async ({ page }) => {
    await setQty(page, 'Mug', '0');
    await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
    await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
  });

  test('maximum quantity of 10 for both items is accepted', async ({ page }) => {
    await setQty(page, 'Coffee beans', '10');
    await setQty(page, 'Mug', '10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(summary(page)).toHaveText(['€205.00', '€0.00', 'Free', '€205.00']);
  });

  test('error clears once the quantity is valid again', async ({ page }) => {
    await setQty(page, 'Coffee beans', '0');
    await expect(page.getByRole('alert')).toHaveText(QTY_ERROR);
    await setQty(page, 'Coffee beans', '1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('coupon stays applied after recovering from an invalid quantity', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, 'Mug', '11');
    await expect(summary(page)).toHaveText(['—', '—', '—', '—']);
    await setQty(page, 'Mug', '1');
    await expect(summary(page)).toHaveText(['€20.50', '−€4.10', '€4.95', '€21.35']);
  });
});

test.describe('shipping threshold', () => {
  test('subtotal below €30 charges €4.95 shipping', async ({ page }) => {
    await setQty(page, 'Mug', '2'); // 12.50 + 16.00 = 28.50
    await expect(summary(page)).toHaveText(['€28.50', '€0.00', '€4.95', '€33.45']);
  });

  test('subtotal above €30 ships free', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2'); // 25.00 + 8.00 = 33.00
    await expect(summary(page)).toHaveText(['€33.00', '€0.00', 'Free', '€33.00']);
  });
});

test.describe('SAVE20 coupon', () => {
  test('applies 20% off the subtotal', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(summary(page)).toHaveText(['€20.50', '−€4.10', '€4.95', '€21.35']);
  });

  test('is case-insensitive and ignores surrounding spaces', async ({ page }) => {
    await applyCoupon(page, '  save20 ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
  });

  test('shipping threshold uses the subtotal after discount (below €30)', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2'); // 33.00 -> 26.40 after discount
    await applyCoupon(page, 'SAVE20');
    await expect(summary(page)).toHaveText(['€33.00', '−€6.60', '€4.95', '€31.35']);
  });

  test('shipping is free when subtotal after discount is above €30', async ({ page }) => {
    await setQty(page, 'Coffee beans', '2');
    await setQty(page, 'Mug', '2'); // 41.00 -> 32.80
    await applyCoupon(page, 'SAVE20');
    await expect(summary(page)).toHaveText(['€41.00', '−€8.20', 'Free', '€32.80']);
  });

  test('discount is recalculated when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, 'Coffee beans', '3');
    await setQty(page, 'Mug', '1'); // 45.50 -> 36.40
    await expect(summary(page)).toHaveText(['€45.50', '−€9.10', 'Free', '€36.40']);
  });
});

test.describe('FREESHIP coupon', () => {
  test('makes shipping free without any discount', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', 'Free', '€20.50']);
  });

  test('is case-insensitive and ignores surrounding spaces', async ({ page }) => {
    await applyCoupon(page, ' freeship  ');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
  });
});

test.describe('unknown coupons and replacement', () => {
  test('unrecognised code shows the message and changes nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  });

  test('unrecognised code removes the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', '€4.95', '€25.45']);
  });

  test('FREESHIP replaces SAVE20 (discount no longer applies)', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(summary(page)).toHaveText(['€20.50', '€0.00', 'Free', '€20.50']);
  });

  test('SAVE20 replaces FREESHIP (shipping is charged again)', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(summary(page)).toHaveText(['€20.50', '−€4.10', '€4.95', '€21.35']);
  });
});
