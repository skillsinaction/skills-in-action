import { expect, test } from '@playwright/test';

const beansQty = 'Coffee beans quantity';
const mugQty = 'Mug quantity';

async function setQuantities(page: import('@playwright/test').Page, beans: string, mug: string) {
  await page.getByLabel(beansQty).fill(beans);
  await page.getByLabel(mugQty).fill(mug);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows the default summary values', async ({ page }) => {
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('accepts quantity boundaries 1 and 10', async ({ page }) => {
  await setQuantities(page, '10', '10');

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByTestId('subtotal')).toHaveText('€205.00');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€205.00');

  await setQuantities(page, '1', '1');

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('shows an error and placeholder summary when quantity is below or above range', async ({ page }) => {
  await setQuantities(page, '0', '1');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');

  await setQuantities(page, '11', '1');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
});

test('applies SAVE20 with case-insensitive trimmed input', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€21.35');
});

test('replaces a coupon when a different valid code is applied', async ({ page }) => {
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

test('clears an active coupon when an invalid code is applied', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('total')).toHaveText('€21.35');

  await page.getByLabel('Coupon code').fill('not-a-code');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('uses subtotal after discount when deciding free shipping threshold', async ({ page }) => {
  await setQuantities(page, '2', '1');
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
  await expect(page.getByTestId('discount')).toHaveText('−€6.60');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€31.35');

  await setQuantities(page, '3', '1');

  await expect(page.getByTestId('subtotal')).toHaveText('€45.50');
  await expect(page.getByTestId('discount')).toHaveText('−€9.10');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€36.40');
});
