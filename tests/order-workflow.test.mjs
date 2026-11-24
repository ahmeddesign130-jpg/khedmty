import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder } from "../src/lib/order-workflow.mjs";

test("customer can cancel an unpaid order", () => {
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "CANCELLED", "CUSTOMER"), true);
});
test("customer confirms receipt after delivery and cannot request revisions", () => {
  assert.equal(canTransitionOrder("DELIVERED", "COMPLETED", "CUSTOMER"), true);
  assert.equal(canTransitionOrder("DELIVERED", "REVISION_REQUESTED", "CUSTOMER"), false);
});
test("customer cannot mark an order delivered", () => {
  assert.equal(canTransitionOrder("IN_PROGRESS", "DELIVERED", "CUSTOMER"), false);
});
test("provider can start work only after payment", () => {
  assert.equal(canTransitionOrder("PAID", "IN_PROGRESS", "PROVIDER"), true);
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "IN_PROGRESS", "PROVIDER"), false);
});
test("provider cannot approve payment or complete an order", () => {
  assert.equal(canTransitionOrder("PAYMENT_REVIEW", "PAID", "PROVIDER"), false);
  assert.equal(canTransitionOrder("DELIVERED", "COMPLETED", "PROVIDER"), false);
});
test("admin cannot bypass the payment-review flow", () => {
  assert.equal(canTransitionOrder("PAYMENT_REVIEW", "PAID", "SUPER_ADMIN"), false);
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "PAID", "SUPER_ADMIN"), false);
});
test("terminal orders cannot be reopened", () => {
  assert.equal(canTransitionOrder("COMPLETED", "IN_PROGRESS", "PROVIDER"), false);
  assert.equal(canTransitionOrder("CANCELLED", "PAID", "SUPER_ADMIN"), false);
});

test("provider cannot mark delivery complete without the delivery review flow", () => {
  assert.equal(canTransitionOrder("IN_PROGRESS", "DELIVERED", "PROVIDER"), false);
  assert.equal(canTransitionOrder("REVISION_REQUESTED", "DELIVERED", "PROVIDER"), false);
  assert.equal(canTransitionOrder("IN_PROGRESS", "DELIVERY_REVIEW", "PROVIDER"), false);
});
test("provider can resume work after an admin requests delivery changes", () => {
  assert.equal(canTransitionOrder("REVISION_REQUESTED", "IN_PROGRESS", "PROVIDER"), true);
});
