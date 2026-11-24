import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPricing } from "../src/lib/pricing.mjs";

test("splits a 100 EG final price into 20 EG platform share and 80 EG provider net", () => {
  assert.deepEqual(calculateOrderPricing(100, 20), {
    servicePrice: 100, commissionRate: 20, commission: 20, providerNet: 80, total: 100,
  });
});

test("uses the administrator's current percentage for new orders", () => {
  assert.deepEqual(calculateOrderPricing(1000, 10), {
    servicePrice: 1000, commissionRate: 10, commission: 100, providerNet: 900, total: 1000,
  });
});

test("rounds the platform share to whole EG and preserves the exact total", () => {
  const pricing = calculateOrderPricing(99, 20);
  assert.equal(pricing.commission, 20);
  assert.equal(pricing.providerNet, 79);
  assert.equal(pricing.commission + pricing.providerNet, pricing.total);
});

test("rejects invalid final prices and commission rates", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, 100_000_001]) {
    assert.throws(() => calculateOrderPricing(value, 20), { name: "RangeError" });
  }
  for (const rate of [-1, 51, 1.5, Number.NaN]) {
    assert.throws(() => calculateOrderPricing(100, rate), { name: "RangeError" });
  }
});
