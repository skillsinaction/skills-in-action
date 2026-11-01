import { test, expect, type Page } from '@playwright/test';

async function expectSummary(
  page: Page,
  values: { subtotal: string; discount: string; shipping: string; total: string }
) {
  await expect(page.getByTestId('subtotal')).toHaveText(values.subtotal);
  await expect(page.getByTestId('discount')).toHaveText(values.discount);
  await expect(page.getByTestId('shipping')).toHaveText(values.shipping);
  await expect(page.getByTestId('total')).toHaveText(values.total);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows the default checkout summary', async ({ page }) => {
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('updates summary when quantities change and toggles free shipping at €30+', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('2');
  await page.getByLabel('Mug quantity').fill('1');

  await expectSummary(page, {
    subtotal: '€33.00',
    discount: '€0.00',
    shipping: 'Free',
    total: '€33.00',
  });

  await page.getByLabel('Coffee beans quantity').fill('1');

  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('shows quantity validation error and summary placeholders outside 1..10', async ({ page }) => {
  await page.getByLabel('Mug quantity').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expectSummary(page, {
    subtotal: '—',
    discount: '—',
    shipping: '—',
    total: '—',
  });

  await page.getByLabel('Mug quantity').fill('10');
  await expect(page.getByRole('alert')).toBeHidden();
  await expectSummary(page, {
    subtotal: '€92.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€92.50',
  });
});

test('applies SAVE20 case-insensitively and trims surrounding spaces', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });
});

test('replaces existing coupon and clears coupon state on invalid code', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');

  await page.getByLabel('Coupon code').fill('FREESHIP');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });

  await page.getByLabel('Coupon code').fill('NOPE');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});
