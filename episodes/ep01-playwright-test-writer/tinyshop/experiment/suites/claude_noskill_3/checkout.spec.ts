import { test, expect, Page } from '@playwright/test';

const ERR = 'Quantity must be between 1 and 10';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

const val = (page: Page, id: string) => page.getByTestId(id);
const setQty = async (page: Page, beans: string, mug: string) => {
  await page.getByLabel('Coffee beans quantity').fill(beans);
  await page.getByLabel('Mug quantity').fill(mug);
};
const apply = async (page: Page, code: string) => {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
};
async function expectSummary(page: Page, s: { subtotal: string; discount: string; shipping: string; total: string }) {
  for (const k of ['subtotal', 'discount', 'shipping', 'total'] as const) {
    await expect(val(page, k)).toHaveText(s[k]);
  }
}

test.describe('defaults', () => {
  test('quantities start at 1 and summary is correct', async ({ page }) => {
    await expect(page.getByLabel('Coffee beans quantity')).toHaveValue('1');
    await expect(page.getByLabel('Mug quantity')).toHaveValue('1');
    await expect(page.getByRole('alert')).toBeHidden();
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });
});

test.describe('quantity validation', () => {
  for (const [b, m] of [['1', '1'], ['10', '10'], ['10', '1'], ['1', '10']]) {
    test(`accepts boundary ${b}/${m}`, async ({ page }) => {
      await setQty(page, b, m);
      await expect(page.getByRole('alert')).toBeHidden();
      const sub = Number(b) * 12.5 + Number(m) * 8;
      await expect(val(page, 'subtotal')).toHaveText('€' + sub.toFixed(2));
    });
  }

  for (const bad of ['0', '11', '-1', '1.5', '', '100']) {
    for (const field of ['Coffee beans quantity', 'Mug quantity']) {
      test(`rejects "${bad}" in ${field}`, async ({ page }) => {
        await page.getByLabel(field).fill(bad);
        await expect(page.getByRole('alert')).toHaveText(ERR);
        await expectSummary(page, { subtotal: '—', discount: '—', shipping: '—', total: '—' });
      });
    }
  }

  test('recovers after correcting an invalid quantity', async ({ page }) => {
    await setQty(page, '0', '1');
    await expect(page.getByRole('alert')).toHaveText(ERR);
    await page.getByLabel('Coffee beans quantity').fill('2');
    await expect(page.getByRole('alert')).toBeHidden();
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });
});

// Note: no valid cart (qty 1-10 of €12.50/€8.00) sums to exactly €30.00, so the
// inclusive threshold cannot be hit through the UI; tests cover both sides of it.
test.describe('shipping', () => {
  test('charged below €30', async ({ page }) => {
    await setQty(page, '1', '2'); // 28.50
    await expectSummary(page, { subtotal: '€28.50', discount: '€0.00', shipping: '€4.95', total: '€33.45' });
  });

  test('free above €30', async ({ page }) => {
    await setQty(page, '2', '1');
    await expectSummary(page, { subtotal: '€33.00', discount: '€0.00', shipping: 'Free', total: '€33.00' });
  });
});

test.describe('coupons', () => {
  test('SAVE20 gives 20% off', async ({ page }) => {
    await apply(page, 'SAVE20');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    // 20.50 -> discount 4.10 -> 16.40 + 4.95
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('SAVE20 is case-insensitive and ignores surrounding spaces', async ({ page }) => {
    await apply(page, '  save20 ');
    await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
    await expect(val(page, 'discount')).toHaveText('−€4.10');
  });

  test('FREESHIP makes shipping free', async ({ page }) => {
    await apply(page, 'FreeShip');
    await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('unrecognised code shows message and no discount', async ({ page }) => {
    await apply(page, 'BOGUS');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('empty code is not recognised', async ({ page }) => {
    await apply(page, '');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  });

  test('new coupon replaces old: SAVE20 then FREESHIP', async ({ page }) => {
    await apply(page, 'SAVE20');
    await apply(page, 'FREESHIP');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: 'Free', total: '€20.50' });
  });

  test('new coupon replaces old: FREESHIP then SAVE20', async ({ page }) => {
    await apply(page, 'FREESHIP');
    await apply(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€20.50', discount: '−€4.10', shipping: '€4.95', total: '€21.35' });
  });

  test('invalid code clears an active coupon', async ({ page }) => {
    await apply(page, 'SAVE20');
    await apply(page, 'nope');
    await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
    await expectSummary(page, { subtotal: '€20.50', discount: '€0.00', shipping: '€4.95', total: '€25.45' });
  });

  test('shipping threshold uses subtotal after discount', async ({ page }) => {
    // 2 beans + 1 mug = 33.00; SAVE20 -> 26.40 < 30 -> shipping charged
    await setQty(page, '2', '1');
    await apply(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€33.00', discount: '−€6.60', shipping: '€4.95', total: '€31.35' });
  });

  test('SAVE20 with large cart still gets free shipping', async ({ page }) => {
    // 10 beans + 10 mugs = 205.00; 20% = 41.00 -> 164.00
    await setQty(page, '10', '10');
    await apply(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€205.00', discount: '−€41.00', shipping: 'Free', total: '€164.00' });
  });

  test('free shipping after discount when still above threshold', async ({ page }) => {
    await setQty(page, '3', '1'); // 45.50 -> 36.40
    await apply(page, 'SAVE20');
    await expectSummary(page, { subtotal: '€45.50', discount: '−€9.10', shipping: 'Free', total: '€36.40' });
  });

  test('discount stays correct when quantity changes after applying', async ({ page }) => {
    await apply(page, 'SAVE20');
    await setQty(page, '2', '2'); // 41.00 -> 8.20
    await expectSummary(page, { subtotal: '€41.00', discount: '−€8.20', shipping: 'Free', total: '€32.80' });
  });
});
