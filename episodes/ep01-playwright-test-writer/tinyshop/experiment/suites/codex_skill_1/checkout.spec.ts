import { expect, test } from '@playwright/test';

const goToCheckout = async (page: Parameters<(typeof test)['beforeEach']>[0] extends (args: infer T, ...rest: any[]) => any ? T['page'] : never) => {
  await page.goto('/index.html');
};

test('shows the correct default summary', async ({ page }) => {
  await goToCheckout(page);

  await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
  await expect(page.getByRole('alert')).toBeHidden();
});

test('shows validation error and placeholder summary when quantity is below range', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coffee beans quantity').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');
});

test('shows validation error and placeholder summary when quantity is above range', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Mug quantity').fill('11');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('subtotal')).toHaveText('—');
  await expect(page.getByTestId('discount')).toHaveText('—');
  await expect(page.getByTestId('shipping')).toHaveText('—');
  await expect(page.getByTestId('total')).toHaveText('—');
});

test('requires whole number quantities', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coffee beans quantity').fill('1.5');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(page.getByTestId('total')).toHaveText('—');
});

test('accepts boundary quantities 1 and 10', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coffee beans quantity').fill('10');
  await page.getByLabel('Mug quantity').fill('1');

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByTestId('subtotal')).toHaveText('€133.00');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€133.00');
});

test('applies SAVE20 case-insensitively and trims spaces', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(page.getByTestId('discount')).toHaveText('−€4.10');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€21.35');
});

test('replaces the old coupon when applying a new one', async ({ page }) => {
  await goToCheckout(page);

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

test('clears active coupon when an unknown code is applied', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('total')).toHaveText('€21.35');

  await page.getByLabel('Coupon code').fill('NOTREAL');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(page.getByTestId('discount')).toHaveText('€0.00');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€25.45');
});

test('makes shipping free at or above threshold and paid below it after discount', async ({ page }) => {
  await goToCheckout(page);

  await page.getByLabel('Coffee beans quantity').fill('2');
  await page.getByLabel('Mug quantity').fill('1');

  await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('€33.00');

  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('discount')).toHaveText('−€6.60');
  await expect(page.getByTestId('shipping')).toHaveText('€4.95');
  await expect(page.getByTestId('total')).toHaveText('€31.35');
});

