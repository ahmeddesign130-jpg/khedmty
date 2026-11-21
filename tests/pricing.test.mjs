import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPricing } from "../src/lib/pricing.mjs";

test("splits 100 EG into 20 EG platform share and 80 EG provider net", () => {
  assert.deepEqual(calculateOrderPricing(100), {
    servicePrice: 100,
    commissionRate: 20,
    commission: 20,
    providerNet: 80,
    total: 100,
  });
});

test("keeps the 20/80 split for common whole-EG prices", () => {
  assert.equal(calculateOrderPricing(500).commission, 100);
  assert.equal(calculateOrderPricing(500).providerNet, 400);
  assert.equal(calculateOrderPricing(1000).commission, 200);
  assert.equal(calculateOrderPricing(1000).providerNet, 800);
});

test("preserves the exact total after whole-EG rounding", () => {
  const pricing = calculateOrderPricing(99);
  assert.equal(pricing.commission, 20);
  assert.equal(pricing.providerNet, 79);
  assert.equal(pricing.commission + pricing.providerNet, pricing.total);
});

test("rejects non-positive, fractional, unsafe, or out-of-range prices", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, 100_000_001]) {
    assert.throws(() => calculateOrderPricing(value), { name: "RangeError" });
  }
});
