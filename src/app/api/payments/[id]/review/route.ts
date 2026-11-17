import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مسموح لك بمراجعة المدفوعات" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "بيانات المراجعة غير صحيحة" },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    if (action === "REJECT" && !reason) {
      return NextResponse.json(
        { success: false, message: "يجب كتابة سبب رفض الدفع" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "عملية الدفع غير موجودة" },
        { status: 404 }
      );
    }

    if (payment.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { success: false, message: "تمت مراجعة عملية الدفع من قبل" },
        { status: 409 }
      );
    }

    if (payment.amountMinor !== payment.order.totalMinor) {
      return NextResponse.json(
        { success: false, message: "المبلغ لا يطابق إجمالي الطلب" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: action === "APPROVE" ? "PAID" : "PENDING_PAYMENT",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action:
            action === "APPROVE"
              ? "PAYMENT_APPROVED"
              : "PAYMENT_REJECTED",
          entityType: "Payment",
          entityId: payment.id,
          details: JSON.stringify({
            orderId: payment.orderId,
            amountMinor: payment.amountMinor,
            reason: action === "REJECT" ? reason : null,
          }),
        },
      });

      return { updatedPayment, updatedOrder };
    });

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? "تم اعتماد الدفع وتحديث الطلب"
          : "تم رفض الدفع وإعادة الطلب لانتظار الدفع",
      ...result,
    });
  } catch (error) {
    console.error("PAYMENT_REVIEW_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء مراجعة الدفع" },
      { status: 500 }
    );
  }
}
