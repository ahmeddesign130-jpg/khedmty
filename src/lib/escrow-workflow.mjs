/**
 * HELD is an internal accounting state only. A release or refund can be
 * recorded only after a manual external transfer has actually been made.
 */
export function canResolveEscrow(escrowStatus, orderStatus, disputeStatus, decision) {
  const disputedAndReviewed = escrowStatus === "DISPUTED"
    && orderStatus === "DISPUTED"
    && disputeStatus === "UNDER_REVIEW";

  if (decision === "RELEASE_TO_PROVIDER") {
    return (escrowStatus === "HELD" && orderStatus === "COMPLETED" && !disputeStatus) || disputedAndReviewed;
  }

  if (decision === "REFUND_CUSTOMER") {
    return disputedAndReviewed;
  }

  return false;
}

/**
 * Ledger amounts are positive. HOLD is the original incoming amount;
 * PROVIDER_RELEASE + PLATFORM_FEE discharge it, while CUSTOMER_REFUND
 * discharges the full amount back to the customer.
 */
export function ledgerEntriesForResolution(escrow, decision) {
  const amount = Number(escrow.amount);
  const providerAmount = Number(escrow.providerAmount);
  const platformFee = Number(escrow.platformFee);

  if (
    !Number.isSafeInteger(amount) || amount <= 0 ||
    !Number.isSafeInteger(providerAmount) || providerAmount <= 0 ||
    !Number.isSafeInteger(platformFee) || platformFee < 0 ||
    providerAmount + platformFee !== amount
  ) {
    throw new Error("ESCROW_AMOUNT_INVARIANT");
  }

  if (decision === "RELEASE_TO_PROVIDER") {
    const entries = [{ type: "PROVIDER_RELEASE", amount: providerAmount }];
    if (platformFee > 0) entries.push({ type: "PLATFORM_FEE", amount: platformFee });
    return entries;
  }

  if (decision === "REFUND_CUSTOMER") {
    return [{ type: "CUSTOMER_REFUND", amount }];
  }

  throw new Error("INVALID_ESCROW_DECISION");
}
