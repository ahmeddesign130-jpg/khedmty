import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const statusSchema = z.object({
  status: z.enum([
    "IN_PROGRESS",
    "DELIVERED",
    "REVISION_REQUESTED",
    "COMPLETED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = statusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "حالة الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const { status, note } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "SUPER_ADMIN";
    const isCustomer = user.id === order.customerId;
    const isProvider = user.id === order.providerId;

    if (!isAdmin && !isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, message: "غير مسموح لك بتعديل هذا الطلب" },
        { status: 403 }
      );
    }

    if (
      status === "IN_PROGRESS" &&
      !isAdmin
    ) {
      return NextResponse.json(
        { success: false, message: "بدء العمل يحتاج إلى إجراء إداري" },
        { status: 403 }
      );
    }

    if (status === "DELIVERED" && !isProvider && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "مقدم الخدمة فقط يمكنه تسليم العمل" },
        { status: 403 }
      );
    }

    if (
      (status === "REVISION_REQUESTED" || status === "COMPLETED") &&
      !isCustomer &&
      !isAdmin
    ) {
      return NextResponse.json(
        { success: false, message: "هذا الإجراء متاح للعميل فقط" },
        { status: 403 }
      );
    }

    if (
      status === "CANCELLED" &&
      !isAdmin &&
      !isCustomer
    ) {
      return NextResponse.json(
        { success: false, message: "لا تملك صلاحية إلغاء الطلب" },
        { status: 403 }
      );
    }

    const allowedTransitions: Record<string, string[]> = {
      PENDING_PAYMENT: ["CANCELLED"],
      PAYMENT_REVIEW: ["CANCELLED"],
      PAID: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["REVISION_REQUESTED", "COMPLETED"],
      REVISION_REQUESTED: ["IN_PROGRESS", "DELIVERED", "CANCELLED"],
    };

    if (
      !isAdmin &&
      !(allowedTransitions[order.status] || []).includes(status)
    ) {
      return NextResponse.json(
        { success: false, message: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية" },
        { status: 409 }
      );
    }

    if (isAdmin && order.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "الطلب مكتمل بالفعل" },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث حالة الطلب",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("UPDATE_ORDER_STATUS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث الطلب" },
      { status: 500 }
    );
  }
        }
