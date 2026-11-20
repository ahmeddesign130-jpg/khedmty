import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { transitionOrder } from "@/lib/escrow";
import type { OrderStatus } from "@prisma/client";

const statusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (user.status !== "ACTIVE") return NextResponse.json({ message: "حسابك غير مفعل." }, { status: 403 });
    if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") {
      return NextResponse.json({ message: "لا يمكن للإدارة تغيير مراحل التنفيذ من هذا المسار." }, { status: 403 });
    }

    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "حالة الطلب غير صحيحة." }, { status: 400 });

    const { id } = await params;
    const order = await transitionOrder(id, user.id, user.role, parsed.data.status as OrderStatus);
    return NextResponse.json({
      message: parsed.data.status === "COMPLETED"
        ? "تم تأكيد الاستلام. سيظل الرصيد محجوزًا محاسبيًا حتى تسجل الإدارة الصرف اليدوي."
        : "تم تحديث حالة الطلب بنجاح.",
      order: order ? { id: order.id, orderNo: order.orderNo, status: order.status } : null,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    if (code === "NOT_ORDER_PARTICIPANT") return NextResponse.json({ message: "هذا الطلب لا يخص حسابك." }, { status: 403 });
    if (code === "ORDER_TRANSITION_FORBIDDEN" || code === "PAID_ORDER_CANNOT_CANCEL" || code === "ESCROW_NOT_HELD") {
      return NextResponse.json({ message: "هذا الانتقال غير مسموح. لا يمكن إلغاء طلب مدفوع أو تأكيد استلام قبل تسليم العمل وحالة الحجز الصحيحة." }, { status: 403 });
    }
    if (code === "ORDER_STATUS_CONFLICT") return NextResponse.json({ message: "تم تحديث الطلب بالفعل. حدّث الصفحة وحاول مرة أخرى." }, { status: 409 });
    console.error("Order status update error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء تحديث حالة الطلب." }, { status: 500 });
  }
}
