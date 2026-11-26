import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional(),
  transferReference: z.string().trim().max(120).optional(),
  transferDate: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!enforceSameOrigin(request)) return NextResponse.json({ message: "الطلب غير مسموح." }, { status: 403 });
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "هذه العملية متاحة للإدارة فقط." }, { status: 403 });
    }

    if (!await enforceRateLimit(request, "payment-review-admin", user.id, 60, 60)) return NextResponse.json({ message: "طلبات مراجعة كثيرة جدًا. حاول لاحقًا." }, { status: 429 });
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "بيانات المراجعة غير صحيحة." }, { status: 400 });
    }

    const { status, reviewNote, transferReference, transferDate } = parsed.data;
    if (status === "REJECTED" && !reviewNote) {
      return NextResponse.json({ message: "اكتب سبب رفض الإيصال أولاً." }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) return NextResponse.json({ message: "عملية الدفع غير موجودة." }, { status: 404 });
    if (payment.status !== "PENDING_REVIEW" || payment.order.status !== "PAYMENT_REVIEW") {
      return NextResponse.json({ message: "عملية الدفع لم تعد قيد المراجعة." }, { status: 409 });
    }
    if (status === "APPROVED" && payment.amount !== payment.order.total) {
      return NextResponse.json({ message: "المبلغ لا يطابق إجمالي الطلب، لا يمكن اعتماد الدفع." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.updateMany({
        where: { id, status: "PENDING_REVIEW" },
        data: {
          status,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
          transferReference: transferReference || null,
          transferDate: transferDate ? new Date(transferDate) : null,
        },
      });
      if (paymentUpdate.count !== 1) throw new Error("REVIEW_CONFLICT");

      const orderUpdate = await tx.order.updateMany({
        where: { id: payment.orderId, status: "PAYMENT_REVIEW" },
        data: { status: status === "APPROVED" ? "PAID" : "PENDING_PAYMENT" },
      });
      if (orderUpdate.count !== 1) throw new Error("REVIEW_CONFLICT");

      await tx.notification.create({
        data: {
          userId: payment.order.customerId,
          title: status === "APPROVED" ? "تم اعتماد الدفع" : "تم رفض إثبات الدفع",
          body: status === "APPROVED"
            ? `تم تأكيد استلام مبلغ الطلب ${payment.order.orderNo}. يمكنك متابعة حالة الطلب من حسابك.`
            : `تم رفض إثبات الدفع للطلب ${payment.order.orderNo}. السبب: ${reviewNote}`,
          href: `/orders/${payment.orderId}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: status === "APPROVED" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
          targetId: payment.id,
          details: reviewNote || `تمت مراجعة الدفع للطلب ${payment.order.orderNo}`,
        },
      });
    });

    return NextResponse.json({
      message: status === "APPROVED"
        ? "تم اعتماد الدفع وتأكيد استلام المبلغ."
        : "تم رفض الدفع وإعادة الطلب إلى انتظار الدفع.",
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_CONFLICT") {
      return NextResponse.json({ message: "تمت مراجعة عملية الدفع بالفعل بواسطة مسؤول آخر." }, { status: 409 });
    }
    console.error("Payment review error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء مراجعة الدفع." }, { status: 500 });
  }
}
