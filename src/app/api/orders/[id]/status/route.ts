import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canTransitionOrder, type OrderStatus } from "@/lib/order-workflow.mjs";

const statusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "IN_PROGRESS", "DELIVERED",
    "REVISION_REQUESTED", "COMPLETED", "CANCELLED", "REJECTED",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ message: "حسابك غير مفعل." }, { status: 403 });
    }

    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "حالة الطلب غير صحيحة." }, { status: 400 });
    }

    // Admin payment approval is only possible through the dedicated receipt-review endpoint.
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "تغيير حالة الدفع يتم فقط بعد مراجعة الإيصال من لوحة المدفوعات." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }
    if (order.customerId !== user.id && order.providerId !== user.id) {
      return NextResponse.json({ message: "ليس لديك صلاحية تعديل هذا الطلب." }, { status: 403 });
    }

    const newStatus = parsed.data.status as OrderStatus;
    if (!canTransitionOrder(order.status as OrderStatus, newStatus, user.role)) {
      return NextResponse.json({ message: "لا يمكنك تغيير الطلب إلى هذه الحالة." }, { status: 403 });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: newStatus },
      });
      if (result.count !== 1) throw new Error("ORDER_STATUS_CONFLICT");

      const updated = await tx.order.findUnique({ where: { id: order.id } });
      if (!updated) throw new Error("ORDER_NOT_FOUND_AFTER_UPDATE");

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ORDER_STATUS_UPDATED",
          targetId: order.id,
          details: `تغيير حالة الطلب من ${order.status} إلى ${newStatus}`,
        },
      });
      return updated;
    });

    return NextResponse.json({ message: "تم تحديث حالة الطلب بنجاح.", order: updatedOrder });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_STATUS_CONFLICT") {
      return NextResponse.json(
        { message: "تم تحديث الطلب بالفعل. حدّث الصفحة وحاول مرة أخرى." },
        { status: 409 }
      );
    }
    console.error("Order status update error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء تحديث حالة الطلب." }, { status: 500 });
  }
}
