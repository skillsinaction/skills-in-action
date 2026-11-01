import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

async function expectSummary(page: Parameters<typeof test>[0]['page'], values: {
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

async function applyCoupon(page: Parameters<typeof test>[0]['page'], code: string) {
  await page.getByLabel('Coupon code').fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test('shows default summary values', async ({ page }) => {
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('validates quantities and shows em dash summary when out of range', async ({ page }) => {
  const qtyError = page.getByRole('alert');

  await page.getByLabel('Coffee beans quantity').fill('11');
  await expect(qtyError).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');

  await page.getByLabel('Coffee beans quantity').fill('2');
  await expect(qtyError).toBeHidden();
  await expectSummary(page, {
    subtotal: '€33.00',
    discount: '€0.00',
    shipping: 'Free',
    total: '€33.00',
  });
});

test('applies SAVE20 with case-insensitive and trimmed input', async ({ page }) => {
  await applyCoupon(page, '  save20  ');
  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });
});

test('applies FREESHIP and replaces previous coupon', async ({ page }) => {
  await applyCoupon(page, 'SAVE20');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });

  await applyCoupon(page, 'freeship');
  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });
});

test('invalid coupon clears active coupon and discount', async ({ page }) => {
  await applyCoupon(page, 'save20');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '−€4.10',
    shipping: '€4.95',
    total: '€21.35',
  });

  await applyCoupon(page, 'nope');
  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

