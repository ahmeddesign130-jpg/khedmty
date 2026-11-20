export type EscrowDecision = "RELEASE_TO_PROVIDER" | "REFUND_CUSTOMER";
export type EscrowLedgerType = "HOLD" | "PROVIDER_RELEASE" | "PLATFORM_FEE" | "CUSTOMER_REFUND";
export function canResolveEscrow(
  escrowStatus: "HELD" | "DISPUTED" | "RELEASED" | "REFUNDED",
  orderStatus: string,
  disputeStatus: string | null,
  decision: EscrowDecision
): boolean;
export function ledgerEntriesForResolution(
  escrow: { amount: number; providerAmount: number; platformFee: number },
  decision: EscrowDecision
): Array<{ type: Exclude<EscrowLedgerType, "HOLD">; amount: number }>;
