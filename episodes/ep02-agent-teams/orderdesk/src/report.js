import { customers, orders } from "./db.js";

// Monthly report: revenue per customer, highest first.
export function customerReport() {
  return customers
    .map((c) => {
      const mine = orders.filter((o) => o.customerId === c.id && o.status === "paid");
      const revenue = mine.reduce((sum, o) => sum + o.total, 0);
      return { customer: c.name, orders: mine.length, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
