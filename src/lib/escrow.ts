import type { OrderStatus as DbOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canTransitionOrder,
  type OrderActorRole,
  type OrderStatus as WorkflowOrderStatus,
} from "@/lib/order-workflow.mjs";
import {
  canResolveEscrow,
  ledgerEntriesForResolution,
  type EscrowDecision,
} from "@/lib/escrow-workflow.mjs";

type PaymentReviewStatus = "APPROVED" | "REJECTED";

export async function reviewPayment(
  paymentId: string,
  adminId: string,
  status: PaymentReviewStatus,
  reviewNote?: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status !== "PENDING_REVIEW" || payment.order.status !== "PAYMENT_REVIEW") {
      throw new Error("PAYMENT_REVIEW_CONFLICT");
    }
    if (status === "APPROVED") {
      if (payment.amount !== payment.order.total) throw new Error("PAYMENT_AMOUNT_MISMATCH");
      if (
        payment.order.servicePrice <= 0 ||
        payment.order.commission < 0 ||
        payment.order.servicePrice + payment.order.commission !== payment.order.total
      ) {
        throw new Error("ORDER_TOTAL_INVARIANT");
      }
      const existingEscrow = await tx.orderEscrow.findUnique({ where: { orderId: payment.orderId } });
      if (existingEscrow) throw new Error("ESCROW_ALREADY_EXISTS");
    }

    const paymentUpdate = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING_REVIEW" },
      data: {
        status,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    if (paymentUpdate.count !== 1) throw new Error("PAYMENT_REVIEW_CONFLICT");

    const orderUpdate = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PAYMENT_REVIEW" },
      data: { status: status === "APPROVED" ? "PAID" : "PENDING_PAYMENT" },
    });
    if (orderUpdate.count !== 1) throw new Error("PAYMENT_REVIEW_CONFLICT");

    let escrowId: string | null = null;
    if (status === "APPROVED") {
      const escrow = await tx.orderEscrow.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          amount: payment.order.total,
          providerAmount: payment.order.servicePrice,
          platformFee: payment.order.commission,
          status: "HELD",
        },
      });
      escrowId = escrow.id;
      await tx.escrowLedgerEntry.create({
        data: {
          escrowId: escrow.id,
          orderId: payment.orderId,
          type: "HOLD",
          amount: payment.order.total,
          idempotencyKey: "order:" + payment.orderId + ":HOLD",
          actorId: adminId,
          details: "اعتماد إثبات التحويل وتسجيل إجمالي الطلب كرصيد محجوز محاسبيًا",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: status === "APPROVED" ? "PAYMENT_APPROVED_ESCROW_HELD" : "PAYMENT_REJECTED",
        targetId: payment.id,
        details: status === "APPROVED"
          ? "تم اعتماد إثبات التحويل وإنشاء قيد HOLD للطلب " + payment.order.orderNo
          : (reviewNote?.trim() || "تم رفض إثبات التحويل للطلب " + payment.order.orderNo),
      },
    });

    return { orderId: payment.orderId, escrowId, escrowStatus: status === "APPROVED" ? "HELD" : null };
  }, { isolationLevel: "Serializable" });
}

export async function transitionOrder(
  orderId: string,
  actorId: string,
  role: OrderActorRole,
  nextStatus: DbOrderStatus
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { escrow: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    if (
      (role === "CUSTOMER" && order.customerId !== actorId) ||
      (role === "PROVIDER" && order.providerId !== actorId)
    ) {
      throw new Error("NOT_ORDER_PARTICIPANT");
    }

    if (!canTransitionOrder(
      order.status as WorkflowOrderStatus,
      nextStatus as WorkflowOrderStatus,
      role
    )) {
      throw new Error("ORDER_TRANSITION_FORBIDDEN");
    }

    if (nextStatus === "CANCELLED") {
      const approvedPayments = await tx.payment.count({
        where: { orderId, status: "APPROVED" },
      });
      if (order.escrow || approvedPayments > 0) throw new Error("PAID_ORDER_CANNOT_CANCEL");
    }

    if (nextStatus === "COMPLETED" && order.escrow?.status !== "HELD") {
      throw new Error("ESCROW_NOT_HELD");
    }

    const updated = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: nextStatus },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CONFLICT");

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_STATUS_UPDATED",
        targetId: orderId,
        details: "تغيير حالة الطلب من " + order.status + " إلى " + nextStatus,
      },
    });

    return tx.order.findUnique({ where: { id: orderId } });
  }, { isolationLevel: "Serializable" });
}

export async function openOrderDispute(
  orderId: string,
  actorId: string,
  role: OrderActorRole,
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    if (role !== "CUSTOMER" && role !== "PROVIDER") throw new Error("DISPUTE_ROLE_FORBIDDEN");

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { escrow: true, dispute: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.customerId !== actorId && order.providerId !== actorId) {
      throw new Error("NOT_ORDER_PARTICIPANT");
    }
    if (!["PAID", "IN_PROGRESS", "DELIVERED"].includes(order.status)) {
      throw new Error("DISPUTE_ORDER_STATE_INVALID");
    }
    if (!order.escrow || order.escrow.status !== "HELD") throw new Error("ESCROW_NOT_HELD");
    if (order.dispute) throw new Error("DISPUTE_ALREADY_EXISTS");

    const escrowUpdate = await tx.orderEscrow.updateMany({
      where: { id: order.escrow.id, status: "HELD" },
      data: { status: "DISPUTED" },
    });
    if (escrowUpdate.count !== 1) throw new Error("DISPUTE_CONFLICT");

    const orderUpdate = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "DISPUTED" },
    });
    if (orderUpdate.count !== 1) throw new Error("DISPUTE_CONFLICT");

    const dispute = await tx.orderDispute.create({
      data: { orderId, openedById: actorId, reason: reason.trim(), status: "OPEN" },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_DISPUTE_OPENED",
        targetId: dispute.id,
        details: "تم فتح نزاع للطلب " + order.orderNo + " وتجميد أي إجراء صرف داخلي",
      },
    });
    return dispute;
  }, { isolationLevel: "Serializable" });
}

export async function markDisputeUnderReview(disputeId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.orderDispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
    const updated = await tx.orderDispute.updateMany({
      where: { id: disputeId, status: "OPEN" },
      data: { status: "UNDER_REVIEW" },
    });
    if (updated.count !== 1) throw new Error("DISPUTE_REVIEW_CONFLICT");
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "ORDER_DISPUTE_UNDER_REVIEW",
        targetId: disputeId,
        details: "بدأت الإدارة مراجعة النزاع للطلب " + dispute.orderId,
      },
    });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function resolveEscrow(
  orderId: string,
  adminId: string,
  decision: EscrowDecision,
  resolutionNote: string,
  externalReference: string
) {
  return prisma.$transaction(async (tx) => {
    const escrow = await tx.orderEscrow.findUnique({
      where: { orderId },
      include: { order: { include: { dispute: true } } },
    });
    if (!escrow) throw new Error("ESCROW_NOT_FOUND");

    const disputeStatus = escrow.order.dispute?.status ?? null;
    if (!canResolveEscrow(escrow.status, escrow.order.status, disputeStatus, decision)) {
      throw new Error("ESCROW_RESOLUTION_FORBIDDEN");
    }

    const ledgerEntries = ledgerEntriesForResolution({
      amount: escrow.amount,
      providerAmount: escrow.providerAmount,
      platformFee: escrow.platformFee,
    }, decision);

    const nextEscrowStatus = decision === "RELEASE_TO_PROVIDER" ? "RELEASED" : "REFUNDED";
    const escrowUpdate = await tx.orderEscrow.updateMany({
      where: { id: escrow.id, status: escrow.status },
      data: {
        status: nextEscrowStatus,
        resolutionNote: resolutionNote.trim(),
        externalReference: externalReference.trim(),
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });
    if (escrowUpdate.count !== 1) throw new Error("ESCROW_RESOLUTION_CONFLICT");

    const nextOrderStatus = decision === "RELEASE_TO_PROVIDER" ? "COMPLETED" : "REFUNDED";
    const orderUpdate = await tx.order.updateMany({
      where: { id: orderId, status: escrow.order.status },
      data: { status: nextOrderStatus },
    });
    if (orderUpdate.count !== 1) throw new Error("ESCROW_RESOLUTION_CONFLICT");

    if (escrow.order.dispute) {
      const disputeUpdate = await tx.orderDispute.updateMany({
        where: { id: escrow.order.dispute.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
        data: {
          status: "RESOLVED",
          resolution: decision,
          resolutionNote: resolutionNote.trim(),
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });
      if (disputeUpdate.count !== 1) throw new Error("ESCROW_RESOLUTION_CONFLICT");
    }

    for (const entry of ledgerEntries) {
      await tx.escrowLedgerEntry.create({
        data: {
          escrowId: escrow.id,
          orderId,
          type: entry.type,
          amount: entry.amount,
          idempotencyKey: "order:" + orderId + ":" + entry.type,
          actorId: adminId,
          externalReference: externalReference.trim(),
          details: resolutionNote.trim(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: decision === "RELEASE_TO_PROVIDER" ? "ESCROW_PROVIDER_RELEASE_RECORDED" : "ESCROW_CUSTOMER_REFUND_RECORDED",
        targetId: escrow.id,
        details: "تسجيل " + (decision === "RELEASE_TO_PROVIDER" ? "صرف مستحق مقدم الخدمة" : "استرداد العميل") +
          " يدويًا للطلب " + orderId + " بمرجع " + externalReference.trim(),
      },
    });

    return { orderId, escrowStatus: nextEscrowStatus, orderStatus: nextOrderStatus };
  }, { isolationLevel: "Serializable" });
}
