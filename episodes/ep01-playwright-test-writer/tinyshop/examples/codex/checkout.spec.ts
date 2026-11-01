import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows correct default summary totals', async ({ page }) => {
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('accepts quantity boundaries 1 and 10', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('10');
  await page.getByLabel('Mug quantity').fill('1');

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByTestId('subtotal')).toHaveText('€133.00');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€133.00');
});

test('shows quantity error and dashes when quantity is below range', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');
});

test('shows quantity error and dashes when quantity is above range', async ({ page }) => {
  await page.getByLabel('Mug quantity').fill('11');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');
});

test('applies SAVE20 case-insensitively and trims spaces', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€21.35');
});

test('replaces SAVE20 with FREESHIP when applying a new coupon', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');

  await page.getByLabel('Coupon code').fill('FREESHIP');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€20.50');
});

test('clears active coupon when an unrecognised code is applied', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await page.getByLabel('Coupon code').fill('not-a-code');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('makes shipping free at or above threshold after SAVE20 discount', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('2');
  await page.getByLabel('Mug quantity').fill('2');

  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('subtotal')).toHaveText('€41.00');
  await expect(page.getByTestId('discount')).toHaveText('−€8.20');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€32.80');
});
