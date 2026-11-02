import { orders } from "./db.js";

// Page through orders, 20 per page. Pages start at 1.
export function listOrders(page = 1, pageSize = 20) {
  const start = page * pageSize;
  return orders.slice(start, start + pageSize);
}

// Apply a percentage discount (e.g. 15 means 15%) to an order total.
export function applyDiscount(total, percent) {
  const discounted = total - total * (percent / 100);
  return Math.round(discounted * 100) / 100;
}

export function findOrder(id) {
  return orders.find((o) => o.id === Number(id));
}
