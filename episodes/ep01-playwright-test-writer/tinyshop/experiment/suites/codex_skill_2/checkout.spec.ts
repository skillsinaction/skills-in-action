import { expect, test } from '@playwright/test';

const subtotal = (page) => page.getByTestId('subtotal');
const discount = (page) => page.getByTestId('discount');
const shipping = (page) => page.getByTestId('shipping');
const total = (page) => page.getByTestId('total');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('shows correct default summary values', async ({ page }) => {
  await expect(subtotal(page)).toHaveText('€20.50');
  await expect(discount(page)).toHaveText('€0.00');
  await expect(shipping(page)).toHaveText('€4.95');
  await expect(total(page)).toHaveText('€25.45');
});

test('applies SAVE20 coupon case-insensitively with trimmed whitespace', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('  save20  ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon SAVE20 applied');
  await expect(discount(page)).toHaveText('−€4.10');
  await expect(shipping(page)).toHaveText('€4.95');
  await expect(total(page)).toHaveText('€21.35');
});

test('replaces previous coupon when a new valid one is applied', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(discount(page)).toHaveText('−€4.10');

  await page.getByLabel('Coupon code').fill('FREESHIP');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon FREESHIP applied');
  await expect(discount(page)).toHaveText('€0.00');
  await expect(shipping(page)).toHaveText('Free');
  await expect(total(page)).toHaveText('€20.50');
});

test('invalid coupon removes active coupon and shows not recognised message', async ({ page }) => {
  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(discount(page)).toHaveText('−€4.10');

  await page.getByLabel('Coupon code').fill('nope');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('status')).toHaveText('Coupon not recognised');
  await expect(discount(page)).toHaveText('€0.00');
  await expect(shipping(page)).toHaveText('€4.95');
  await expect(total(page)).toHaveText('€25.45');
});

test('shows validation error and blanks summary when quantity is outside 1-10', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be between 1 and 10');
  await expect(subtotal(page)).toHaveText('—');
  await expect(discount(page)).toHaveText('—');
  await expect(shipping(page)).toHaveText('—');
  await expect(total(page)).toHaveText('—');
});

test('applies free shipping when subtotal is at least €30 after discount', async ({ page }) => {
  await page.getByLabel('Coffee beans quantity').fill('2');
  await page.getByLabel('Mug quantity').fill('1');
  await expect(subtotal(page)).toHaveText('€33.00');
  await expect(shipping(page)).toHaveText('Free');

  await page.getByLabel('Coupon code').fill('SAVE20');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(discount(page)).toHaveText('−€6.60');
  await expect(shipping(page)).toHaveText('€4.95');
  await expect(total(page)).toHaveText('€31.35');
});
