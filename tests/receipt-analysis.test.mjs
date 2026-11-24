import test from "node:test";
import assert from "node:assert/strict";
import { classifyReceiptResult } from "../src/lib/receipt-analysis.mjs";

const receipt = { isTransferReceipt: true, amount: 100, currency: "EGP", confidence: 95 };
test("matches a clear Egyptian pound receipt for the exact amount", () => {
  assert.equal(classifyReceiptResult(receipt, 100), "MATCH");
});
test("flags a clear receipt with a different amount", () => {
  assert.equal(classifyReceiptResult({ ...receipt, amount: 99 }, 100), "MISMATCH");
});
test("does not treat non-receipts as valid proof", () => {
  assert.equal(classifyReceiptResult({ ...receipt, isTransferReceipt: false }, 100), "NOT_RECEIPT");
});
test("keeps unclear currency, low confidence, and unreadable amounts for manual review", () => {
  assert.equal(classifyReceiptResult({ ...receipt, currency: null }, 100), "UNCLEAR");
  assert.equal(classifyReceiptResult({ ...receipt, currency: "USD" }, 100), "UNCLEAR");
  assert.equal(classifyReceiptResult({ ...receipt, confidence: 60 }, 100), "UNCLEAR");
  assert.equal(classifyReceiptResult({ ...receipt, amount: null }, 100), "UNCLEAR");
});
