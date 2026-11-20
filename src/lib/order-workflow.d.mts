export type OrderStatus =
  | "PENDING_PAYMENT" | "PAYMENT_REVIEW" | "PAID" | "IN_PROGRESS"
  | "DELIVERED" | "REVISION_REQUESTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type OrderActorRole = "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
export function canTransitionOrder(from: OrderStatus, to: OrderStatus, role: OrderActorRole): boolean;
