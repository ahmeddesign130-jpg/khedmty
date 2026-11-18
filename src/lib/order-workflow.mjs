const transitions = {
  PENDING_PAYMENT: ["PAYMENT_REVIEW", "CANCELLED"],
  PAYMENT_REVIEW: [],
  PAID: ["IN_PROGRESS"],
  IN_PROGRESS: ["DELIVERED"],
  DELIVERED: ["REVISION_REQUESTED", "COMPLETED"],
  REVISION_REQUESTED: ["IN_PROGRESS", "DELIVERED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Enforces role-specific order transitions.
 * Payment approval is deliberately excluded: only the payment-review flow may mark an order PAID.
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
