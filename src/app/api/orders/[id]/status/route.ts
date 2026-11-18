import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAYMENT_REVIEW",
    "PAID",
    "IN_PROGRESS",
    "DELIVERED",
    "REVISION_REQUESTED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ]),
});

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

const transitions: Record<OrderStatus, OrderStatus[]> = {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "يجب تسجيل الدخول أولاً." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "حسابك غير مفعل." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const parsed = statusSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: "حالة الطلب غير صحيحة." },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.status as OrderStatus;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json(
        { message: "الطلب غير موجود." },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "SUPER_ADMIN";
    const isCustomer = order.customerId === user.id;
    const isProvider = order.providerId === user.id;

    if (!isAdmin && !isCustomer && !isProvider) {
      return NextResponse.json(
        { message: "ليس لديك صلاحية تعديل هذا الطلب." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      if (!transitions[order.status as OrderStatus].includes(newStatus)) {
        return NextResponse.json(
          { message: "لا يمكن تغيير الطلب إلى هذه الحالة." },
          { status: 400 }
        );
      }

      if (
        isCustomer &&
        !["CANCELLED", "REVISION_REQUESTED", "COMPLETED"].includes(newStatus)
      ) {
        return NextResponse.json(
          { message: "لا يمكنك تنفيذ هذا الإجراء." },
          { status: 403 }
        );
      }

      if (
        isProvider &&
        !["IN_PROGRESS", "DELIVERED"].includes(newStatus)
      ) {
        return NextResponse.json(
          { message: "لا يمكنك تنفيذ هذا الإجراء." },
          { status: 403 }
        );
      }
    }

    if (order.status === newStatus) {
      return NextResponse.json(
        { message: "الطلب بالفعل في هذه الحالة." },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Compare-and-set prevents two simultaneous requests from overwriting
      // each other after both read the same previous status.
      const result = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: newStatus },
      });

      if (result.count !== 1) {
        throw new Error("ORDER_STATUS_CONFLICT");
      }

      const updated = await tx.order.findUnique({ where: { id: order.id } });

      if (!updated) {
        throw new Error("ORDER_NOT_FOUND_AFTER_UPDATE");
      }

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

    return NextResponse.json({
      message: "تم تحديث حالة الطلب بنجاح.",
      order: updatedOrder,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_STATUS_CONFLICT") {
      return NextResponse.json(
        { message: "تم تحديث الطلب بالفعل. حدّث الصفحة وحاول مرة أخرى." },
        { status: 409 }
      );
    }

    console.error("Order status update error:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تحديث حالة الطلب." },
      { status: 500 }
    );
  }
}
