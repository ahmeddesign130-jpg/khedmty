const transitions = {
  PENDING_PAYMENT: ["PAYMENT_REVIEW", "CANCELLED"],
  PAYMENT_REVIEW: [],
  PAID: ["IN_PROGRESS"],
  IN_PROGRESS: [],
  DELIVERY_REVIEW: [],
  DELIVERED: ["COMPLETED"],
  REVISION_REQUESTED: ["IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Enforces role-specific order transitions.
 * Provider delivery is recorded only by the authenticated file-upload endpoint;
 * this prevents bypassing the admin's delivery review.
 */
export function canTransitionOrder(from, to, role) {
  if (!transitions[from]?.includes(to)) return false;
  if (role === "CUSTOMER") {
    return ["CANCELLED", "COMPLETED"].includes(to);
  }
  if (role === "PROVIDER") {
    return to === "IN_PROGRESS";
  }
  return false;
}
