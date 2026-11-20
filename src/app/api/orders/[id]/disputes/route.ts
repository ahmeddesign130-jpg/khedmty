import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { openOrderDispute } from "@/lib/escrow";

const disputeSchema = z.object({
  reason: z.string().trim().min(10).max(1500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (user.status !== "ACTIVE") return NextResponse.json({ message: "حسابك غير مفعل." }, { status: 403 });
    if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") {
      return NextResponse.json({ message: "فتح النزاع متاح لطرفي الطلب فقط." }, { status: 403 });
    }

    const parsed = disputeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "اكتب سبب النزاع في 10 أحرف على الأقل." }, { status: 400 });

    const { id } = await params;
    const dispute = await openOrderDispute(id, user.id, user.role, parsed.data.reason);
    return NextResponse.json({
      message: "تم فتح النزاع وتحويله إلى مراجعة الإدارة. لن يُسجل أي صرف أثناء النزاع.",
      dispute: { id: dispute.id, status: dispute.status, createdAt: dispute.createdAt },
    }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    if (code === "NOT_ORDER_PARTICIPANT") return NextResponse.json({ message: "هذا الطلب لا يخص حسابك." }, { status: 403 });
    if (code === "DISPUTE_ROLE_FORBIDDEN") return NextResponse.json({ message: "فتح النزاع متاح لطرفي الطلب فقط." }, { status: 403 });
    if (["DISPUTE_ORDER_STATE_INVALID", "ESCROW_NOT_HELD", "DISPUTE_ALREADY_EXISTS", "DISPUTE_CONFLICT"].includes(code)) {
      return NextResponse.json({ message: "لا يمكن فتح نزاع جديد على حالة الطلب الحالية." }, { status: 409 });
    }
    console.error("Open dispute error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء فتح النزاع." }, { status: 500 });
  }
}
