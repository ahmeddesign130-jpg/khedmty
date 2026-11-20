import test from "node:test";
import assert from "node:assert/strict";
import {
  canResolveEscrow,
  ledgerEntriesForResolution,
} from "../src/lib/escrow-workflow.mjs";

test("held funds can be released only after customer completion", () => {
  assert.equal(canResolveEscrow("HELD", "COMPLETED", null, "RELEASE_TO_PROVIDER"), true);
  assert.equal(canResolveEscrow("HELD", "DELIVERED", null, "RELEASE_TO_PROVIDER"), false);
  assert.equal(canResolveEscrow("HELD", "IN_PROGRESS", null, "RELEASE_TO_PROVIDER"), false);
});

test("a held order cannot be refunded without an active dispute", () => {
  assert.equal(canResolveEscrow("HELD", "COMPLETED", null, "REFUND_CUSTOMER"), false);
  assert.equal(canResolveEscrow("HELD", "DISPUTED", "OPEN", "REFUND_CUSTOMER"), false);
});

test("dispute resolution requires the administrator review stage", () => {
  assert.equal(canResolveEscrow("DISPUTED", "DISPUTED", "OPEN", "RELEASE_TO_PROVIDER"), false);
  assert.equal(canResolveEscrow("DISPUTED", "DISPUTED", "OPEN", "REFUND_CUSTOMER"), false);
  assert.equal(canResolveEscrow("DISPUTED", "DISPUTED", "UNDER_REVIEW", "RELEASE_TO_PROVIDER"), true);
  assert.equal(canResolveEscrow("DISPUTED", "DISPUTED", "UNDER_REVIEW", "REFUND_CUSTOMER"), true);
});

test("resolved or inconsistent dispute states cannot be resolved again", () => {
  assert.equal(canResolveEscrow("DISPUTED", "DISPUTED", "RESOLVED", "REFUND_CUSTOMER"), false);
  assert.equal(canResolveEscrow("RELEASED", "COMPLETED", null, "RELEASE_TO_PROVIDER"), false);
  assert.equal(canResolveEscrow("REFUNDED", "REFUNDED", null, "REFUND_CUSTOMER"), false);
});

test("release ledger discharges provider amount plus platform fee exactly once by event type", () => {
  const entries = ledgerEntriesForResolution({ amount: 1100, providerAmount: 1000, platformFee: 100 }, "RELEASE_TO_PROVIDER");
  assert.deepEqual(entries, [
    { type: "PROVIDER_RELEASE", amount: 1000 },
    { type: "PLATFORM_FEE", amount: 100 },
  ]);
  assert.equal(entries.reduce((sum, entry) => sum + entry.amount, 0), 1100);
});

test("refund ledger records the complete customer total", () => {
  assert.deepEqual(
    ledgerEntriesForResolution({ amount: 1100, providerAmount: 1000, platformFee: 100 }, "REFUND_CUSTOMER"),
    [{ type: "CUSTOMER_REFUND", amount: 1100 }]
  );
});

test("invalid escrow amount splits are rejected", () => {
  assert.throws(
    () => ledgerEntriesForResolution({ amount: 1100, providerAmount: 1000, platformFee: 50 }, "RELEASE_TO_PROVIDER"),
    /ESCROW_AMOUNT_INVARIANT/
  );
});
