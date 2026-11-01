import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows correct default summary values', async ({ page }) => {
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('updates totals when quantities change and grants free shipping at threshold', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('2');

  await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€33.00');
});

test('handles SAVE20 coupon with case-insensitive trimmed input', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€21.35');
});

test('applies FREESHIP and replacing with invalid code clears active coupon', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('freeship');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€20.50');

  await page.getByLabel('Coupon code').fill('nope');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('shows validation error and placeholder summary when quantity is out of range', async ({ page }) => {
  await page.getByLabel('Mug quantity').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');

  await page.getByLabel('Mug quantity').fill('1');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});
