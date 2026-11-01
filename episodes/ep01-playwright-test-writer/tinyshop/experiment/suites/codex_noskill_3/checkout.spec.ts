import { expect, test } from '@playwright/test';

test.describe('Checkout page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('shows the default cart summary', async ({ page }) => {
    await expect(page.getByTestId('subtotal')).toHaveText('€20.50');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('shows an error and placeholder summary for invalid quantities', async ({ page }) => {
    await page.locator('#qty-beans').fill('0');

    await expect(page.locator('#qty-error')).toHaveText('Quantity must be between 1 and 10');
    await expect(page.getByTestId('subtotal')).toHaveText('—');
    await expect(page.getByTestId('discount')).toHaveText('—');
    await expect(page.getByTestId('shipping')).toHaveText('—');
    await expect(page.getByTestId('total')).toHaveText('—');

    await page.locator('#qty-beans').fill('1');

    await expect(page.locator('#qty-error')).toBeHidden();
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });

  test('applies free shipping when subtotal after discount is at least €30.00', async ({ page }) => {
    await page.locator('#qty-beans').fill('2');

    await expect(page.getByTestId('subtotal')).toHaveText('€33.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€33.00');
  });

  test('applies SAVE20 case-insensitively and trims surrounding spaces', async ({ page }) => {
    await page.locator('#coupon').fill('  save20  ');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.locator('#coupon-msg')).toHaveText('Coupon SAVE20 applied');
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€21.35');
  });

  test('replaces active coupon and clears it for invalid codes', async ({ page }) => {
    await page.locator('#coupon').fill('save20');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('discount')).toHaveText('−€4.10');

    await page.locator('#coupon').fill('freeship');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.locator('#coupon-msg')).toHaveText('Coupon FREESHIP applied');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveText('€20.50');

    await page.locator('#coupon').fill('not-a-code');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.locator('#coupon-msg')).toHaveText('Coupon not recognised');
    await expect(page.getByTestId('discount')).toHaveText('€0.00');
    await expect(page.getByTestId('shipping')).toHaveText('€4.95');
    await expect(page.getByTestId('total')).toHaveText('€25.45');
  });
});
