import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "هذه العملية متاحة للإدارة فقط." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "بيانات المراجعة غير صحيحة." },
        { status: 400 }
      );
    }

    const { status, reviewNote } = parsed.data;

    if (status === "REJECTED" && !reviewNote?.trim()) {
      return NextResponse.json(
        { message: "يرجى كتابة سبب رفض الدفع." },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "عملية الدفع غير موجودة." },
        { status: 404 }
      );
    }

    if (payment.status !== "PENDING_REVIEW" || payment.order.status !== "PAYMENT_REVIEW") {
      return NextResponse.json(
        { message: "تمت مراجعة عملية الدفع من قبل." },
        { status: 409 }
      );
    }

    if (status === "APPROVED" && payment.amount !== payment.order.total) {
      return NextResponse.json(
        { message: "المبلغ لا يطابق إجمالي الطلب، لا يمكن اعتماد الدفع." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status,
          reviewNote: reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: status === "APPROVED" ? "PAID" : "PENDING_PAYMENT",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action:
            status === "APPROVED"
              ? "PAYMENT_APPROVED"
              : "PAYMENT_REJECTED",
          targetId: payment.id,
          details:
            reviewNote?.trim() ||
            `تمت مراجعة الدفع للطلب ${payment.order.orderNo}`,
        },
      });

      return { payment: updatedPayment, order: updatedOrder };
    });

    return NextResponse.json({
      message:
        status === "APPROVED"
          ? "تم اعتماد الدفع وتأكيد استلام المبلغ."
          : "تم رفض الدفع وإعادة الطلب إلى انتظار الدفع.",
      ...result,
    });
  } catch (error) {
    console.error("Payment review error:", error);

    return NextResponse.json(
      { message: "حدث خطأ أثناء مراجعة الدفع." },
      { status: 500 }
    );
  }
}
