// Tiny Shop checkout logic. Spec: SPEC.md
const PRICES = { beans: 12.5, mug: 8.0 };
const SHIPPING_FEE = 4.95;
const FREE_SHIPPING_FROM = 30; // subtotal after discount, inclusive
const MAX_QTY = 10;
const COUPONS = {
  SAVE20: { type: 'percent', value: 0.2 },
  FREESHIP: { type: 'shipping' },
};
let coupon = null;

const euro = (n) => '€' + n.toFixed(2);

function readQty(id) {
  const n = Number(document.getElementById(id).value);
  return Number.isInteger(n) ? n : NaN;
}

function render() {
  const qb = readQty('qty-beans'), qm = readQty('qty-mug');
  const err = document.getElementById('qty-error');
  const bad = [qb, qm].some((q) => !(q >= 1 && q <= MAX_QTY));
  if (bad) {
    err.textContent = 'Quantity must be between 1 and ' + MAX_QTY;
    err.hidden = false;
    ['subtotal', 'discount', 'shipping', 'total'].forEach((t) =>
      (document.querySelector(`[data-testid="${t}"]`).textContent = '—'));
    return;
  }
  err.hidden = true;
  const subtotal = qb * PRICES.beans + qm * PRICES.mug;
  const isPercent = coupon && coupon.type === 'percent';
  const discount = isPercent ? subtotal * coupon.value : 0;
  const afterDiscount = subtotal - discount;
  let shipping = afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  if (coupon && coupon.type === 'shipping') shipping = 0;
  const total = Math.round((afterDiscount + shipping) * 100) / 100;
  const set = (t, v) =>
    (document.querySelector(`[data-testid="${t}"]`).textContent = v);
  set('subtotal', euro(subtotal));
  set('discount', discount ? '−' + euro(discount) : euro(0));
  set('shipping', shipping ? euro(shipping) : 'Free');
  set('total', euro(total));
}

document.getElementById('coupon-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('coupon').value.trim().toUpperCase();
  const msg = document.getElementById('coupon-msg');
  if (COUPONS[code]) {
    coupon = COUPONS[code];
    msg.textContent = `Coupon ${code} applied`;
    msg.className = 'ok';
  } else {
    coupon = null;
    msg.textContent = 'Coupon not recognised';
    msg.className = '';
  }
  render();
});
['qty-beans', 'qty-mug'].forEach((id) =>
  document.getElementById(id).addEventListener('input', render));
render();

