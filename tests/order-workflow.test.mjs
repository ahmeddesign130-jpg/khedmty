import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder } from "../src/lib/order-workflow.mjs";

test("customer can cancel only an unpaid order", () => {
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "CANCELLED", "CUSTOMER"), true);
  assert.equal(canTransitionOrder("PAID", "CANCELLED", "CUSTOMER"), false);
  assert.equal(canTransitionOrder("IN_PROGRESS", "CANCELLED", "CUSTOMER"), false);
});

test("customer can confirm receipt only after delivery", () => {
  assert.equal(canTransitionOrder("DELIVERED", "COMPLETED", "CUSTOMER"), true);
  assert.equal(canTransitionOrder("IN_PROGRESS", "COMPLETED", "CUSTOMER"), false);
});

test("customer can request a revision only after delivery", () => {
  assert.equal(canTransitionOrder("DELIVERED", "REVISION_REQUESTED", "CUSTOMER"), true);
  assert.equal(canTransitionOrder("IN_PROGRESS", "REVISION_REQUESTED", "CUSTOMER"), false);
  assert.equal(canTransitionOrder("COMPLETED", "REVISION_REQUESTED", "CUSTOMER"), false);
});

test("provider starts or resumes work only from PAID or REVISION_REQUESTED", () => {
  assert.equal(canTransitionOrder("PAID", "IN_PROGRESS", "PROVIDER"), true);
  assert.equal(canTransitionOrder("REVISION_REQUESTED", "IN_PROGRESS", "PROVIDER"), true);
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "IN_PROGRESS", "PROVIDER"), false);
});

test("provider can deliver only work that is in progress", () => {
  assert.equal(canTransitionOrder("IN_PROGRESS", "DELIVERED", "PROVIDER"), true);
  assert.equal(canTransitionOrder("REVISION_REQUESTED", "DELIVERED", "PROVIDER"), false);
});

test("participants cannot approve payment or change dispute and refund states", () => {
  assert.equal(canTransitionOrder("PAYMENT_REVIEW", "PAID", "PROVIDER"), false);
  assert.equal(canTransitionOrder("DELIVERED", "COMPLETED", "PROVIDER"), false);
  assert.equal(canTransitionOrder("DISPUTED", "COMPLETED", "CUSTOMER"), false);
  assert.equal(canTransitionOrder("REFUNDED", "PAID", "SUPER_ADMIN"), false);
});

test("terminal orders cannot be reopened", () => {
  for (const status of ["COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED", "REJECTED"]) {
    assert.equal(canTransitionOrder(status, "IN_PROGRESS", "PROVIDER"), false);
    assert.equal(canTransitionOrder(status, "PAID", "SUPER_ADMIN"), false);
  }
});
