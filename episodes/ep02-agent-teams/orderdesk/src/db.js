// In-memory data store (stands in for a real database)
export const customers = [];
export const orders = [];

for (let c = 1; c <= 500; c++) {
  customers.push({ id: c, name: `Customer ${c}`, email: `c${c}@example.com` });
}
for (let o = 1; o <= 5000; o++) {
  orders.push({
    id: o,
    customerId: (o % 500) + 1,
    total: Math.round(((o * 37) % 20000)) / 100,
    status: o % 7 === 0 ? "refunded" : "paid",
  });
}
