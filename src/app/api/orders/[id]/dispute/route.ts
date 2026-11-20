import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(10).max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || !["CUSTOMER", "PROVIDER"].includes(user.role)) {
      return NextResponse.json({ message: "يجب تسجيل الدخول بحساب عميل أو مقدم خدمة." }, { status: 401 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "اكتب سبب النزاع في 10 أحرف على الأقل." }, { status: 400 });
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    if (order.customerId !== user.id && order.providerId !== user.id) {
      return NextResponse.json({ message: "هذا الطلب لا يخص حسابك." }, { status: 403 });
    }
    if (order.escrowStatus !== "HELD" || !["PAID", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED"].includes(order.status)) {
      return NextResponse.json({ message: "لا يمكن فتح نزاع على هذا الطلب في حالته الحالية." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, escrowStatus: "HELD" },
        data: { escrowStatus: "DISPUTED" },
      });
      if (changed.count !== 1) throw new Error("DISPUTE_CONFLICT");
      await tx.dispute.create({ data: { orderId: id, openedById: user.id, reason: parsed.data.reason } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "ESCROW_DISPUTE_OPENED", targetId: id, details: "تم فتح نزاع وإيقاف صرف المبلغ لحين مراجعة الإدارة." },
      });
    });
    return NextResponse.json({ success: true, message: "تم فتح النزاع. سيظل المبلغ معلّقًا لحين قرار الإدارة." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DISPUTE_CONFLICT") return NextResponse.json({ message: "تم تغيير حالة المبلغ بالفعل." }, { status: 409 });
    console.error("OPEN_ESCROW_DISPUTE_ERROR:", error);
    return NextResponse.json({ message: "تعذر فتح النزاع حاليًا." }, { status: 500 });
  }
}
