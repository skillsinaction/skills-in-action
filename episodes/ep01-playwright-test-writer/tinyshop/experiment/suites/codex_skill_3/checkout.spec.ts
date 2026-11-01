import { expect, test } from '@playwright/test';

async function expectSummary(page: import('@playwright/test').Page, values: {
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}) {
  await expect(page.getByTestId('subtotal')).toHaveText(values.subtotal);
  await expect(page.getByTestId('discount')).toHaveText(values.discount);
  await expect(page.getByTestId('shipping')).toHaveText(values.shipping);
  await expect(page.getByTestId('total')).toHaveText(values.total);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows default cart totals', async ({ page }) => {
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('validates quantity range and recovers when fixed', async ({ page }) => {
  const beansQty = page.locator('#qty-beans');
  await beansQty.fill('11');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expectSummary(page, {
    subtotal: '—',
    discount: '—',
    shipping: '—',
    total: '—',
  });

  await beansQty.fill('10');
  await expect(page.getByRole('alert')).toBeHidden();
  await expectSummary(page, {
    subtotal: '€133.00',
    discount: '€0.00',
    shipping: 'Free',
    total: '€133.00',
  });
});

test('applies SAVE20 ignoring case and spaces', async ({ page }) => {
  await page.locator('#coupon').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });
});

test('applies FREESHIP coupon', async ({ page }) => {
  await page.locator('#coupon').fill('freeship');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });
});

test('replaces active coupon when a new one is applied', async ({ page }) => {
  await page.locator('#coupon').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });

  await page.locator('#coupon').fill('FREESHIP');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });
});

test('rejects unknown coupon and clears prior discount', async ({ page }) => {
  await page.locator('#coupon').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await page.locator('#coupon').fill('not-a-code');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('makes shipping free when subtotal after discount reaches threshold', async ({ page }) => {
  await page.locator('#qty-beans').fill('3');
  await page.locator('#qty-mug').fill('1');

  await expectSummary(page, {
    subtotal: '€45.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€45.50',
  });

  await page.locator('#qty-beans').fill('2');
  await page.locator('#qty-mug').fill('1');
  await page.locator('#coupon').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expectSummary(page, {
    subtotal: '€33.00',
    discount: '−€6.60',
    shipping: '€4.95',
    total: '€31.35',
  });

  await page.locator('#qty-beans').fill('3');
  await page.locator('#qty-mug').fill('1');
  await expectSummary(page, {
    subtotal: '€45.50',
    discount: '−€9.10',
    shipping: 'Free',
    total: '€36.40',
  });
});
