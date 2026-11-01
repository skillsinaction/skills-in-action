import { expect, test } from '@playwright/test';

const subtotal = () => page.getByTestId('subtotal');
const discount = () => page.getByTestId('discount');
const shipping = () => page.getByTestId('shipping');
const total = () => page.getByTestId('total');

let page: import('@playwright/test').Page;

test.beforeEach(async ({ page: p }) => {
  page = p;
  await page.goto('/index.html');
});

test('shows correct default summary', async () => {
  await expect(subtotal()).toHaveText('€20.50');
  await expect(discount()).toHaveText('€0.00');
  await expect(shipping()).toHaveText('€4.95');
  await expect(total()).toHaveText('€25.45');
});

test('shows validation message and dashes when quantity is out of range', async () => {
  await page.locator('#qty-beans').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(subtotal()).toHaveText('—');
  await expect(discount()).toHaveText('—');
  await expect(shipping()).toHaveText('—');
  await expect(total()).toHaveText('—');

  await page.locator('#qty-beans').fill('2');

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(subtotal()).toHaveText('€33.00');
  await expect(discount()).toHaveText('€0.00');
  await expect(shipping()).toHaveText('Free');
  await expect(total()).toHaveText('€33.00');
});

test('applies SAVE20 case-insensitively and trims spaces', async () => {
  await page.locator('#qty-beans').fill('2');
  await page.locator('#qty-mug').fill('1');

  await page.locator('#coupon').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(discount()).toHaveText('−€6.60');
  await expect(shipping()).toHaveText('€4.95');
  await expect(total()).toHaveText('€31.35');
});

test('applies FREESHIP below threshold and replaces existing coupon', async () => {
  await page.locator('#coupon').fill('save20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(discount()).toHaveText('−€4.10');

  await page.locator('#coupon').fill('freeship');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expect(discount()).toHaveText('€0.00');
  await expect(shipping()).toHaveText('Free');
  await expect(total()).toHaveText('€20.50');
});

test('invalid coupon clears active coupon', async () => {
  await page.locator('#coupon').fill('save20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(discount()).toHaveText('−€4.10');

  await page.locator('#coupon').fill('NOTREAL');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(discount()).toHaveText('€0.00');
  await expect(shipping()).toHaveText('€4.95');
  await expect(total()).toHaveText('€25.45');
});
