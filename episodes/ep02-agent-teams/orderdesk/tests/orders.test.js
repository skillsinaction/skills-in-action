import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDiscount, listOrders } from "../src/orders.js";

test("applies a 15% discount", () => {
  assert.equal(applyDiscount(100, 15), 85);
});

test("a page has 20 orders", () => {
  assert.equal(listOrders(2).length, 20);
});
