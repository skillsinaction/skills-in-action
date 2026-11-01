# Tiny Shop checkout – spec

- Cart: Coffee beans €12.50, Mug €8.00. Each quantity starts at 1 and must be
  a whole number from 1 to 10. Outside that range the page shows
  "Quantity must be between 1 and 10" and the summary shows "—".
- Coupon codes (case-insensitive, surrounding spaces ignored), one coupon at a
  time; applying a new code replaces the old one:
  - SAVE20: 20% off the subtotal. Message: "Coupon SAVE20 applied".
  - FREESHIP: shipping is free. Message: "Coupon FREESHIP applied".
  - Anything else: message "Coupon not recognised" and no coupon is active.
- Shipping: €4.95, free when the subtotal after discount is €30.00 or more
  (inclusive). Shown as "Free" when free.
- Discount row shows "−€x.xx" when a discount applies, otherwise "€0.00".
- Total = subtotal − discount + shipping, two decimals, e.g. "€25.45".

