import { expect, test, type Page } from '@playwright/test';

const beansQty = 'Coffee beans quantity';
const mugQty = 'Mug quantity';

async function setQty(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

async function expectSummary(
  page: Page,
  values: { subtotal: string; discount: string; shipping: string; total: string },
) {
  await expect(page.getByTestId('subtotal')).toHaveText(values.subtotal);
  await expect(page.getByTestId('discount')).toHaveText(values.discount);
  await expect(page.getByTestId('shipping')).toHaveText(values.shipping);
  await expect(page.getByTestId('total')).toHaveText(values.total);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows the default summary values', async ({ page }) => {
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('applies SAVE20 ignoring case and surrounding spaces', async ({ page }) => {
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

test('applies FREESHIP and sets shipping to Free', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('freeship');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });
});

test('rejects unknown coupon and clears any active coupon', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');

  await page.getByLabel('Coupon code').fill('BADCODE');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: '€4.95',
    total: '€25.45',
  });
});

test('uses only one coupon at a time when replacing with a new code', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');

  await page.getByLabel('Coupon code').fill('FREESHIP');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expectSummary(page, {
    subtotal: '€20.50',
    discount: '€0.00',
    shipping: 'Free',
    total: '€20.50',
  });
});

test('shows an error and dashes when quantity is below the minimum', async ({ page }) => {
  await setQty(page, beansQty, '0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expectSummary(page, {
    subtotal: '—',
    discount: '—',
    shipping: '—',
    total: '—',
  });
});

test('shows an error and dashes when quantity is above the maximum', async ({ page }) => {
  await setQty(page, mugQty, '11');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expectSummary(page, {
    subtotal: '—',
    discount: '—',
    shipping: '—',
    total: '—',
  });
});

test('shows an error and dashes when quantity is not a whole number', async ({ page }) => {
  await setQty(page, beansQty, '1.5');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expectSummary(page, {
    subtotal: '—',
    discount: '—',
    shipping: '—',
    total: '—',
  });
});

test('keeps shipping paid at subtotal after discount just below the free threshold', async ({ page }) => {
  await setQty(page, beansQty, '2');
  await setQty(page, mugQty, '1');
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expectSummary(page, {
    subtotal: '€33.00',
    discount: '−€6.60',
    shipping: '€4.95',
    total: '€31.35',
  });
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
});

test('makes shipping free at the €30.00 threshold after discount', async ({ page }) => {
  await setQty(page, beansQty, '3');
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expectSummary(page, {
    subtotal: '€45.50',
    discount: '−€9.10',
    shipping: 'Free',
    total: '€36.40',
  });
  await expect(page.getByTestId('shipping')).toHaveText('Free');
});

test('keeps shipping free above the threshold after discount', async ({ page }) => {
  await setQty(page, beansQty, '3');
  await setQty(page, mugQty, '2');
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expectSummary(page, {
    subtotal: '€53.50',
    discount: '−€10.70',
    shipping: 'Free',
    total: '€42.80',
  });
  await expect(page.getByTestId('shipping')).toHaveText('Free');
});

