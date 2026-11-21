import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPricing } from "../src/lib/pricing.mjs";

test("splits 100 EG into 20 EG platform share and 80 EG provider net", () => {
  assert.deepEqual(calculateOrderPricing(100), {
    servicePrice: 100,
    commissionRate: 20,
    commission: "20.00",
    providerNet: "80.00",
    total: 100,
  });
});

test("keeps the 20/80 split exact for common whole-EG prices", () => {
  assert.equal(calculateOrderPricing(500).commission, "100.00");
  assert.equal(calculateOrderPricing(500).providerNet, "400.00");
  assert.equal(calculateOrderPricing(1000).commission, "200.00");
  assert.equal(calculateOrderPricing(1000).providerNet, "800.00");
});

test("preserves an exact 20/80 split for prices that produce piastres", () => {
  const pricing = calculateOrderPricing(99);
  assert.equal(pricing.commission, "19.80");
  assert.equal(pricing.providerNet, "79.20");
  assert.equal(Number(pricing.commission) + Number(pricing.providerNet), pricing.total);
});

test("rejects non-positive, fractional, unsafe, or out-of-range prices", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, 100_000_001]) {
    assert.throws(() => calculateOrderPricing(value), { name: "RangeError" });
  }
});
