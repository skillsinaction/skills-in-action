import { test, expect, Page } from '@playwright/test';

const beans = (p: Page) => p.getByLabel('Coffee beans quantity');
const mug = (p: Page) => p.getByLabel('Mug quantity');
const t = (p: Page, id: string) => p.getByTestId(id);

async function setQty(p: Page, b: string, m: string) {
  await beans(p).fill(b);
  await mug(p).fill(m);
}
async function applyCoupon(p: Page, code: string) {
  await p.getByLabel('Coupon code').fill(code);
  await p.getByRole('button', { name: 'Apply' }).click();
}
async function expectSummary(p: Page, s: { subtotal: string; discount: string; shipping: string }) {
  await expect(t(p, 'subtotal')).toHaveText(s.subtotal);
  await expect(t(p, 'discount')).toHaveText(s.discount);
  await expect(t(p, 'shipping')).toHaveText(s.shipping);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('cart and totals', () => {
  test('default cart of one of each shows €25.45 total', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€25.45');
  });

  test('changing quantities updates the summary', async ({ page }) => {
    await setQty(page, '3', '2');
    await expectSummary(page, { subtotal: '€53.50', discount: '€0.00', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€53.50');
  });
});

test.describe('quantity validation', () => {
  for (const [name, value] of [['zero', '0'], ['eleven', '11'], ['negative', '-1'], ['fractional', '1.5'], ['empty', '']]) {
    test(`beans quantity ${name} shows error and dashes`, async ({ page }) => {
      await beans(page).fill(value);
      await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
      await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—' });
    await expect(t(page, 'total')).toHaveText('—');
    });
  }

  test('invalid mug quantity shows error and dashes', async ({ page }) => {
    await mug(page).fill('11');
    await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
    await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—' });
    await expect(t(page, 'total')).toHaveText('—');
  });

  test('quantity 1 and 10 are accepted', async ({ page }) => {
    await setQty(page, '10', '10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expectSummary(page, { subtotal: '€205.00', discount: '€0.00', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€205.00');
  });

  test('error clears once quantity is corrected', async ({ page }) => {
    await beans(page).fill('0');
    await expect(page.getByRole('alert')).toBeVisible();
    await beans(page).fill('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(t(page, 'total')).toHaveText('€25.45');
  });
});

test.describe('shipping threshold', () => {
  test('subtotal just below €30 pays shipping', async ({ page }) => {
    await setQty(page, '1', '2'); // 28.50
    await expectSummary(page, { subtotal: '€28.50', discount: '€0.00', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€33.45');
  });

  test('subtotal just above €30 ships free', async ({ page }) => {
    await setQty(page, '2', '1'); // 33.00
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€33.00');
  });

  test('discounted subtotal below €30 pays shipping', async ({ page }) => {
    await setQty(page, '1', '3'); // 36.50 -> 29.20
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€36.50', discount: '−€7.30', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€34.15');
  });

  test('discounted subtotal above €30 ships free', async ({ page }) => {
    await setQty(page, '2', '2'); // 41.00 -> 32.80
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€41.00', discount: '−€8.20', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€32.80');
  });
});

test.describe('coupons', () => {
  test('SAVE20 takes 20% off the subtotal', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€21.35');
  });

  test('FREESHIP makes shipping free without a discount', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€20.50');
  });

  test('coupon code is case-insensitive and trims spaces', async ({ page }) => {
    await applyCoupon(page, '  save20 ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(t(page, 'discount')).toHaveText('−€4.10');
  });

  test('lowercase freeship is accepted', async ({ page }) => {
    await applyCoupon(page, 'freeship');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(t(page, 'shipping')).toHaveText('Free');
  });

  test('unknown code shows not recognised and changes nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€25.45');
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  });

  test('FREESHIP replaces SAVE20 instead of stacking', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€20.50');
  });

  test('SAVE20 replaces FREESHIP instead of stacking', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€21.35');
  });

  test('an unrecognised code removes the active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'NOPE');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95' });
    await expect(t(page, 'total')).toHaveText('€25.45');
  });

  test('coupon stays applied when quantities change', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await setQty(page, '2', '2');
    await expectSummary(page, { subtotal: '€41.00', discount: '−€8.20', shipping: 'Free' });
    await expect(t(page, 'total')).toHaveText('€32.80');
  });
});
