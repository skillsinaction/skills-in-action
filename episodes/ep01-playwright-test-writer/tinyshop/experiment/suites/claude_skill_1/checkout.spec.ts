import { test, expect, Page } from '@playwright/test';

const ERR = 'Quantity must be between 1 and 10';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

const beans = (page: Page) => page.getByLabel('Coffee beans quantity');
const mug = (page: Page) => page.getByLabel('Mug quantity');

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.describe('defaults', () => {
  test('both quantities start at 1', async ({ page }) => {
    await expect(beans(page)).toHaveValue('1');
    await expect(mug(page)).toHaveValue('1');
  });

  test('default summary is €25.45 with shipping charged', async ({ page }) => {
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('no quantity error and no coupon message initially', async ({ page }) => {
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByRole('status')).toHaveText('');
  });
});

test.describe('quantity validation', () => {
  for (const [name, getter] of [['Coffee beans', beans], ['Mug', mug]] as const) {
    for (const bad of ['0', '11', '-1', '1.5']) {
      test(`${name} quantity ${bad} shows error and dashes`, async ({ page }) => {
        await getter(page).fill(bad);
        await expect(page.getByRole('alert')).toHaveText(ERR);
        await expect(page.getByTestId('subtotal')).toHaveText('—');
        await expect(page.getByTestId('discount')).toHaveText('—');
        await expect(page.getByTestId('shipping')).toHaveText('—');
        await expect(page.getByTestId('total')).toHaveText('—');
      });
    }

    test(`${name} empty quantity shows error`, async ({ page }) => {
      await getter(page).fill('');
      await expect(page.getByRole('alert')).toHaveText(ERR);
      await expect(page.getByTestId('total')).toHaveText('—');
    });
  }

  test('beans quantity 10 (upper bound) is accepted', async ({ page }) => {
    await beans(page).fill('10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€133.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€133.00');
  });

  test('mug quantity 10 (upper bound) is accepted', async ({ page }) => {
    await mug(page).fill('10');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('subtotal')).toHaveText('€92.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€92.50');
  });

  test('error disappears and totals return once quantity is fixed', async ({ page }) => {
    await beans(page).fill('11');
    await expect(page.getByRole('alert')).toHaveText(ERR);
    await beans(page).fill('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });
});

test.describe('shipping threshold', () => {
  test('subtotal €28.50 (below €30) is charged €4.95 shipping', async ({ page }) => {
    await mug(page).fill('2');
    await expect(page.getByTestId('subtotal')).toHaveText('€28.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€33.45');
  });

  test('subtotal €33.00 (above €30) ships free', async ({ page }) => {
    await beans(page).fill('2');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€33.00');
  });

  test('threshold applies after discount: €33.00 with SAVE20 pays shipping', async ({ page }) => {
    await beans(page).fill('2');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('discount')).toHaveText('−€6.60');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€31.35');
  });

  test('€29.20 after SAVE20 (just below €30) pays shipping', async ({ page }) => {
    await mug(page).fill('3');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€36.50');
    await expect(page.getByTestId('discount')).toHaveText('−€7.30');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€34.15');
  });

  test('€35.60 after SAVE20 (above €30) ships free', async ({ page }) => {
    await mug(page).fill('4');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€44.50');
    await expect(page.getByTestId('discount')).toHaveText('−€8.90');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€35.60');
  });
});

test.describe('coupons', () => {
  test('SAVE20 gives 20% off', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('SAVE20 on a large cart combines with free shipping', async ({ page }) => {
    await beans(page).fill('4');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('subtotal')).toHaveText('€58.00');
    await expect(page.getByTestId('discount')).toHaveText('−€11.60');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€46.40');
  });

  test('FREESHIP makes shipping free on a small cart', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('code is case-insensitive and surrounding spaces are ignored', async ({ page }) => {
    await applyCoupon(page, '  save20  ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('mixed-case FREESHIP is accepted', async ({ page }) => {
    await applyCoupon(page, 'FreeShip');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
  });

  test('unknown code shows message and changes nothing', async ({ page }) => {
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('empty code is not recognised', async ({ page }) => {
    await applyCoupon(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('unknown code removes an active coupon', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
    await applyCoupon(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('FREESHIP replaces SAVE20 (no stacking)', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await applyCoupon(page, 'FREESHIP');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');
  });

  test('SAVE20 replaces FREESHIP (no stacking)', async ({ page }) => {
    await applyCoupon(page, 'FREESHIP');
    await applyCoupon(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('active coupon is recalculated when quantity changes', async ({ page }) => {
    await applyCoupon(page, 'SAVE20');
    await beans(page).fill('4');
    await expect(page.getByTestId('subtotal')).toHaveText('€58.00');
    await expect(page.getByTestId('discount')).toHaveText('−€11.60');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€46.40');
  });
});
