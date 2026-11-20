const transitions = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_REVIEW: [],
  PAID: ["IN_PROGRESS"],
  IN_PROGRESS: ["DELIVERED"],
  DELIVERED: ["REVISION_REQUESTED", "COMPLETED"],
  REVISION_REQUESTED: ["IN_PROGRESS"],
  COMPLETED: [],
  DISPUTED: [],
  REFUNDED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Only the owning customer may cancel an unpaid order, request a revision,
 * or confirm receipt. Only the provider may start/resume work and deliver it.
 * Payment, dispute, refund and escrow transitions have dedicated server paths.
 */
export function canTransitionOrder(from, to, role) {
  if (!transitions[from]?.includes(to)) return false;
  if (role === "CUSTOMER") {
    return ["CANCELLED", "REVISION_REQUESTED", "COMPLETED"].includes(to);
  }
  if (role === "PROVIDER") {
    return ["IN_PROGRESS", "DELIVERED"].includes(to);
  }
  return false;
}
